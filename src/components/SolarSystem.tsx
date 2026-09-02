import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import {
  getBody,
  type BodyId,
  type CelestialBody as CelestialBodyRecord,
} from '../data/celestialBodies';
import { useAnimationClock } from '../hooks/useAnimationClock';
import { MAP_DRAG_THRESHOLD, useMapCamera } from '../hooks/useMapCamera';
import { MIN_ZOOM, type Camera } from '../lib/camera';
import { circularPosition, composePoint } from '../lib/orbits';
import {
  attemptQuantumEscape,
  chooseQuantumHost,
  chooseQuantumOrbitDirection,
  createQuantumState,
  isPointerNear,
  renderQuantumMoonFrame,
  QUANTUM_ORBIT_PERIOD,
  type QuantumState,
} from '../lib/quantum';
import {
  createSelectableTargetRegistry,
  type SelectableTargetRegistry,
} from '../lib/selectableTargets';
import {
  ATLAS_VIEW_BOX,
  clientPointToSvg,
  clientPointToWorld,
  hitRadiusForMinimumPixels,
  labelFontSizeForMinimumPixels,
  svgViewportScale,
  worldPointToClient,
  type Size,
} from '../lib/svgViewport';
import type { Point } from '../types/celestial';
import {
  createWorldPositionRegistry,
  type WorldPositionRegistry,
  type WorldPositionSnapshot,
} from '../lib/worldPositions';
import { placeOffscreenIndicator } from '../lib/offscreenIndicator';
import { applyLabelCollisionOffsets, syncForegroundLabels } from '../lib/labelCollisions';
import {
  BODY_HIT_RADII,
  CelestialBody,
  ImageArtworkContext,
  CelestialHitArea,
  type ActivationSource,
} from './CelestialBody';
import { Moon } from './Moon';
import { Orbit } from './Orbit';
import { Starfield, type BackgroundPreset } from './Starfield';
import { HourglassTwins, type HourglassTwinsHandle } from './HourglassTwins';
import { Interloper, type InterloperHandle } from './Interloper';
import { QuantumMoon } from './QuantumMoon';
import '../styles/atlas.css';

type OrdinaryWorld = Readonly<{
  body: CelestialBodyRecord;
  moon?: CelestialBodyRecord;
}>;

function requireBody(id: BodyId): CelestialBodyRecord {
  const body = getBody(id);
  if (body === undefined) throw new Error(`Missing catalog body: ${id}`);
  return body;
}

const ORDINARY_WORLDS: readonly OrdinaryWorld[] = [
  { body: requireBody('timber-hearth'), moon: requireBody('attlerock') },
  { body: requireBody('brittle-hollow'), moon: requireBody('hollows-lantern') },
  { body: requireBody('giants-deep') },
  { body: requireBody('dark-bramble') },
];
const SUN = requireBody('sun');
const SUN_STATION = requireBody('sun-station');
const WHITE_HOLE_STATION = requireBody('white-hole-station');
const WHITE_HOLE = requireBody('white-hole');
const ORBITAL_PROBE_CANNON = requireBody('orbital-probe-cannon');
const WHITE_HOLE_POSITION = Object.freeze({ x: -1150, y: 0 });
const WHITE_HOLE_STATION_POSITION = Object.freeze({ x: -1050, y: 0 });
const HOURGLASS_TWINS = requireBody('hourglass-twins');
const ASH_TWIN = requireBody('ash-twin');
const EMBER_TWIN = requireBody('ember-twin');
const INTERLOPER = requireBody('interloper');
const QUANTUM_MOON = requireBody('quantum-moon');
const SPECIAL_BODY_IDS = [ASH_TWIN.id, EMBER_TWIN.id, INTERLOPER.id] as const;
const QUANTUM_ORBIT_RADIUS = 64;
const QUANTUM_PROXIMITY_PIXELS = 34;
const QUANTUM_COOLDOWN_MILLISECONDS = 450;
const FOCUS_TRANSITION_MILLISECONDS = 220;

function randomQuantumPhaseEpoch(simulationTime: number): number {
  return simulationTime - Math.random() * QUANTUM_ORBIT_PERIOD;
}

export type SolarSystemHandle = Readonly<{
  zoomIn: () => void;
  zoomOut: () => void;
  resetCamera: () => void;
  focusBody: (id: BodyId) => void;
  unfocusBody: () => boolean;
  getWorldPositions: () => WorldPositionSnapshot;
  screenToWorld: (clientPoint: Point) => Point;
  worldToScreen: (worldPoint: Point) => Point;
}>;

export type SolarSystemProps = Readonly<{
  selectedId: BodyId | null;
  onSelect: (id: BodyId) => void;
  speed?: number;
  showOrbits?: boolean;
  showLabels?: boolean;
  showQuantumMoon?: boolean;
  /** Whether the soundtrack is currently playing. */
  musicPlaying?: boolean;
  onRegistryReady?: (registry: WorldPositionRegistry) => void;
  onQuantumStatusChange?: (message: string) => void;
  /** Horizontal CSS-pixel shift that centers a focused body in visible map space. */
  focusViewportOffsetX?: number;
  /** Vertical CSS-pixel shift that centers a focused body above a mobile bottom sheet. */
  focusViewportOffsetY?: number;
  /** CSS pixels occupied by overlays that should not contain an indicator. */
  offscreenInsets?: Readonly<{ right: number; bottom: number }>;
  imageArtworkEnabled?: boolean;
  backgroundPreset?: BackgroundPreset;
}>;

type Gesture = {
  startX: number;
  startY: number;
  dragged: boolean;
  candidateId: BodyId | undefined;
};

type CameraTransition = {
  from: Camera;
  startedAt: number | null;
  frameId: number | null;
};

function cameraFocusedOn(
  camera: Camera,
  position: Point | undefined,
  focusOffsetX = 0,
  focusOffsetY = 0,
): Camera {
  if (position === undefined) return camera;
  return {
    ...camera,
    offset: {
      x: camera.offset.x - position.x * camera.scale + focusOffsetX,
      y: camera.offset.y - position.y * camera.scale + focusOffsetY,
    },
  };
}

function cameraTransform(camera: Camera): string {
  return `translate(${camera.offset.x} ${camera.offset.y}) scale(${camera.scale})`;
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

function interpolateCamera(from: Camera, to: Camera, progress: number): Camera {
  const eased = easeOutCubic(progress);
  return {
    offset: {
      x: from.offset.x + (to.offset.x - from.offset.x) * eased,
      y: from.offset.y + (to.offset.y - from.offset.y) * eased,
    },
    scale: from.scale + (to.scale - from.scale) * eased,
  };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const SolarSystem = forwardRef<SolarSystemHandle, SolarSystemProps>(function SolarSystem(
  {
    selectedId,
    onSelect,
    speed = 1,
    showOrbits = true,
    showLabels = true,
    showQuantumMoon = true,
    musicPlaying = false,
    onRegistryReady,
    onQuantumStatusChange,
    focusViewportOffsetX = 0,
    focusViewportOffsetY = 0,
    offscreenInsets = { right: 0, bottom: 0 },
    imageArtworkEnabled = false,
    backgroundPreset = 'deep-space',
  },
  ref,
) {
  const reactId = useId();
  const sceneId = `solar-system-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const clock = useAnimationClock(speed);
  const mapClientPoint = useCallback(
    (clientPoint: Point, viewport: Size) => clientPointToSvg(clientPoint, viewport, ATLAS_VIEW_BOX),
    [],
  );
  const camera = useMapCamera({ mapClientPoint });
  const cameraStateRef = useRef(camera.camera);
  cameraStateRef.current = camera.camera;
  const registryRef = useRef<WorldPositionRegistry | null>(null);
  if (registryRef.current === null) registryRef.current = createWorldPositionRegistry();
  const registry = registryRef.current;
  const selectableRegistryRef = useRef<SelectableTargetRegistry | null>(null);
  if (selectableRegistryRef.current === null) {
    selectableRegistryRef.current = createSelectableTargetRegistry();
  }
  const selectableRegistry = selectableRegistryRef.current;
  const bodyRefs = useRef<Partial<Record<BodyId, SVGGElement | null>>>({});
  const moonRefs = useRef<Partial<Record<BodyId, SVGGElement | null>>>({});
  const hitRefs = useRef<Partial<Record<BodyId, SVGGElement | null>>>({});
  const twinsRef = useRef<HourglassTwinsHandle | null>(null);
  const interloperRef = useRef<InterloperHandle | null>(null);
  const quantumMoonRef = useRef<SVGGElement | null>(null);
  const hourglassCompositeHitRef = useRef<SVGGElement | null>(null);
  const sunStationPositionRef = useRef<SVGGElement | null>(null);
  const sunStationArtworkRef = useRef<SVGGElement | null>(null);
  const sunStationHitRef = useRef<SVGGElement | null>(null);
  const whiteHoleStationPositionRef = useRef<SVGGElement | null>(null);
  const whiteHoleStationHitRef = useRef<SVGGElement | null>(null);
  const whiteHoleHitRef = useRef<SVGGElement | null>(null);
  const probeCannonPositionRef = useRef<SVGGElement | null>(null);
  const probeCannonHitRef = useRef<SVGGElement | null>(null);
  const probeCannonArtworkRef = useRef<SVGGElement | null>(null);
  const selectableRadiiRef = useRef<Partial<Record<BodyId, number>>>({});
  const gestureRef = useRef<Gesture | null>(null);
  const pointerMovementRef = useRef(0);
  const quantumHoverArmedRef = useRef(true);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraWorldRef = useRef<SVGGElement | null>(null);
  const labelLayerRef = useRef<SVGGElement | null>(null);
  const offscreenIndicatorRef = useRef<HTMLDivElement | null>(null);
  const offscreenIndicatorLabelRef = useRef<HTMLSpanElement | null>(null);
  const offscreenIndicatorDistanceRef = useRef<HTMLSpanElement | null>(null);
  const campfireBackgroundRef = useRef<HTMLImageElement | null>(null);
  const focusedBodyRef = useRef<BodyId | null>('sun');
  const displayedCameraRef = useRef<Camera>(camera.camera);
  const cameraTransitionRef = useRef<CameraTransition | null>(null);
  const [viewport, setViewport] = useState<Size>({
    width: ATLAS_VIEW_BOX.width,
    height: ATLAS_VIEW_BOX.height,
  });
  const [hoveredId, setHoveredId] = useState<BodyId | null>(null);
  const [sunMusicPulseKey, setSunMusicPulseKey] = useState<number | null>(null);
  const [quantumState, setQuantumState] = useState<QuantumState>(() =>
    createQuantumState(chooseQuantumHost(), clock.getTime()),
  );

  useEffect(() => {
    if (!musicPlaying || prefersReducedMotion()) {
      setSunMusicPulseKey(null);
      return undefined;
    }
    let timeout: number | null = null;
    const scheduleBeat = () => {
      setSunMusicPulseKey((current) => (current ?? 0) + 1);
      timeout = window.setTimeout(scheduleBeat, 600 + Math.random() * 120);
    };
    scheduleBeat();
    return () => {
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, [musicPlaying]);
  const quantumStateRef = useRef(quantumState);
  quantumStateRef.current = quantumState;

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (svg === null) return;
    const updateViewport = () => {
      const bounds = svg.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      setViewport((current) =>
        current.width === bounds.width && current.height === bounds.height
          ? current
          : { width: bounds.width, height: bounds.height },
      );
    };
    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const focusedCamera = useCallback(() => cameraFocusedOn(
    cameraStateRef.current,
    focusedBodyRef.current === null ? undefined : registry.get(focusedBodyRef.current),
    focusViewportOffsetX / svgViewportScale(viewport, ATLAS_VIEW_BOX),
    focusViewportOffsetY / svgViewportScale(viewport, ATLAS_VIEW_BOX),
  ), [focusViewportOffsetX, focusViewportOffsetY, registry, viewport]);
  const getDisplayedCamera = useCallback(() => displayedCameraRef.current, []);
  const applyCameraTransform = useCallback(() => {
    cameraWorldRef.current?.setAttribute('transform', cameraTransform(getDisplayedCamera()));
  }, [getDisplayedCamera]);

  const cancelCameraTransition = useCallback(() => {
    const transition = cameraTransitionRef.current;
    if (transition !== null && transition.frameId !== null) cancelAnimationFrame(transition.frameId);
    cameraTransitionRef.current = null;
  }, []);

  const transitionToFocusedCamera = useCallback(() => {
    const start = getDisplayedCamera();
    cancelCameraTransition();
    const target = focusedCamera();
    if (start.offset.x === target.offset.x
      && start.offset.y === target.offset.y
      && start.scale === target.scale) return;
    if (prefersReducedMotion()) {
      displayedCameraRef.current = target;
      applyCameraTransform();
      return;
    }
    const transition: CameraTransition = { from: start, startedAt: null, frameId: null };
    const animate = (timestamp: number) => {
      if (cameraTransitionRef.current !== transition) return;
      transition.startedAt ??= timestamp;
      const progress = Math.min(1, Math.max(0, (timestamp - transition.startedAt) / FOCUS_TRANSITION_MILLISECONDS));
      displayedCameraRef.current = interpolateCamera(transition.from, focusedCamera(), progress);
      applyCameraTransform();
      if (progress < 1) transition.frameId = requestAnimationFrame(animate);
      else cameraTransitionRef.current = null;
    };
    cameraTransitionRef.current = transition;
    transition.frameId = requestAnimationFrame(animate);
  }, [applyCameraTransform, cancelCameraTransition, focusedCamera, getDisplayedCamera]);

  const focusBody = useCallback((id: BodyId, resetView = false) => {
    focusedBodyRef.current = id;
    if (resetView) camera.reset();
    else camera.rebaseOffset({ x: 0, y: 0 });
    transitionToFocusedCamera();
  }, [camera, transitionToFocusedCamera]);

  useLayoutEffect(() => {
    if (focusedBodyRef.current !== null) transitionToFocusedCamera();
  }, [focusViewportOffsetX, focusViewportOffsetY, transitionToFocusedCamera]);

  const unfocusBody = useCallback(() => {
    if (focusedBodyRef.current === null) return false;
    const displayedCamera = getDisplayedCamera();
    cancelCameraTransition();
    focusedBodyRef.current = null;
    camera.rebaseOffset(displayedCamera.offset);
    cameraWorldRef.current?.setAttribute('transform', cameraTransform(displayedCamera));
    return true;
  }, [camera, cancelCameraTransition, getDisplayedCamera]);

  useEffect(() => cancelCameraTransition, [cancelCameraTransition]);

  useLayoutEffect(() => {
    if (cameraTransitionRef.current !== null) return;
    displayedCameraRef.current = focusedCamera();
    applyCameraTransform();
  }, [applyCameraTransform, camera.camera, focusedCamera]);

  useImperativeHandle(ref, () => ({
    zoomIn: camera.zoomIn,
    zoomOut: camera.zoomOut,
    resetCamera: () => {
      focusBody('sun', true);
    },
    focusBody,
    unfocusBody,
    getWorldPositions: registry.snapshot,
    screenToWorld: (clientPoint) => clientPointToWorld(
      clientPoint,
      getDisplayedCamera(),
      viewport,
      ATLAS_VIEW_BOX,
    ),
    worldToScreen: (worldPoint) => worldPointToClient(
      worldPoint,
      getDisplayedCamera(),
      viewport,
      ATLAS_VIEW_BOX,
    ),
  }), [camera, focusBody, getDisplayedCamera, registry, unfocusBody, viewport]);

  useEffect(() => {
    onRegistryReady?.(registry);
  }, [onRegistryReady, registry]);

  const updateSpecialPosition = useCallback((id: BodyId, position: Point) => {
    registry.update(id, position);
    selectableRegistry.update(
      id,
      position,
      selectableRadiiRef.current[id] ?? BODY_HIT_RADII[id],
    );
    hitRefs.current[id]?.setAttribute(
      'transform',
      `translate(${position.x.toFixed(3)} ${position.y.toFixed(3)})`,
    );
  }, [registry, selectableRegistry]);

  const renderAtTime = useCallback((time: number) => {
    const sunPosition = { x: 0, y: 0 };
    registry.update('sun', sunPosition);
    selectableRegistry.update(
      'sun',
      sunPosition,
      selectableRadiiRef.current.sun ?? BODY_HIT_RADII.sun,
    );
    registry.update(WHITE_HOLE.id, WHITE_HOLE_POSITION);
    whiteHoleHitRef.current?.setAttribute('transform', `translate(${WHITE_HOLE_POSITION.x} ${WHITE_HOLE_POSITION.y})`);
    if (showQuantumMoon) {
      registry.update(WHITE_HOLE_STATION.id, WHITE_HOLE_STATION_POSITION);
      selectableRegistry.update(WHITE_HOLE.id, WHITE_HOLE_POSITION, selectableRadiiRef.current[WHITE_HOLE.id] ?? 0);
      whiteHoleStationHitRef.current?.setAttribute('transform', `translate(${WHITE_HOLE_STATION_POSITION.x} ${WHITE_HOLE_STATION_POSITION.y})`);
      whiteHoleStationPositionRef.current?.setAttribute('transform', `translate(${WHITE_HOLE_STATION_POSITION.x} ${WHITE_HOLE_STATION_POSITION.y})`);
      selectableRegistry.update(WHITE_HOLE_STATION.id, WHITE_HOLE_STATION_POSITION, selectableRadiiRef.current[WHITE_HOLE_STATION.id] ?? 0);
    } else {
      selectableRegistry.remove(WHITE_HOLE.id);
      selectableRegistry.remove(WHITE_HOLE_STATION.id);
    }
    if (showQuantumMoon && SUN_STATION.orbit !== undefined) {
      const stationPosition = circularPosition(SUN_STATION.orbit, time);
      const inwardAngle = Math.atan2(-stationPosition.y, -stationPosition.x) * 180 / Math.PI;
      const stationRotation = inwardAngle - 90;
      registry.update(SUN_STATION.id, stationPosition);
      selectableRegistry.update(SUN_STATION.id, stationPosition, selectableRadiiRef.current[SUN_STATION.id] ?? 0);
      const stationTransform = `translate(${stationPosition.x.toFixed(3)} ${stationPosition.y.toFixed(3)})`;
      sunStationPositionRef.current?.setAttribute('transform', stationTransform);
      sunStationHitRef.current?.setAttribute('transform', stationTransform);
      sunStationArtworkRef.current?.setAttribute('transform', `rotate(${stationRotation.toFixed(3)})`);
    }

    ORDINARY_WORLDS.forEach(({ body, moon }) => {
      if (body.orbit === undefined) return;
      const bodyPosition = circularPosition(body.orbit, time);
      registry.update(body.id, bodyPosition);
      selectableRegistry.update(
        body.id,
        bodyPosition,
        selectableRadiiRef.current[body.id] ?? BODY_HIT_RADII[body.id],
      );
      bodyRefs.current[body.id]?.setAttribute(
        'transform',
        `translate(${bodyPosition.x.toFixed(3)} ${bodyPosition.y.toFixed(3)})`,
      );
      hitRefs.current[body.id]?.setAttribute(
        'transform',
        `translate(${bodyPosition.x.toFixed(3)} ${bodyPosition.y.toFixed(3)})`,
      );

      if (moon?.orbit === undefined) return;
      const localPosition = circularPosition(moon.orbit, time);
      const moonWorldPosition = composePoint(bodyPosition, localPosition);
      registry.update(moon.id, moonWorldPosition);
      selectableRegistry.update(
        moon.id,
        moonWorldPosition,
        selectableRadiiRef.current[moon.id] ?? BODY_HIT_RADII[moon.id],
      );
      moonRefs.current[moon.id]?.setAttribute(
        'transform',
        `translate(${localPosition.x.toFixed(3)} ${localPosition.y.toFixed(3)})`,
      );
      hitRefs.current[moon.id]?.setAttribute(
        'transform',
        `translate(${moonWorldPosition.x.toFixed(3)} ${moonWorldPosition.y.toFixed(3)})`,
      );
    });
    if (showQuantumMoon && ORBITAL_PROBE_CANNON.orbit !== undefined) {
      const giantPosition = registry.get('giants-deep');
      if (giantPosition !== undefined) {
        const localPosition = circularPosition(ORBITAL_PROBE_CANNON.orbit, time);
        const probePosition = composePoint(giantPosition, localPosition);
        const travelAngle = Math.atan2(localPosition.y, localPosition.x) * 180 / Math.PI + 90 + 12;
        registry.update(ORBITAL_PROBE_CANNON.id, probePosition);
        selectableRegistry.update(ORBITAL_PROBE_CANNON.id, probePosition, selectableRadiiRef.current[ORBITAL_PROBE_CANNON.id] ?? 0);
        const transform = `translate(${probePosition.x.toFixed(3)} ${probePosition.y.toFixed(3)})`;
        probeCannonPositionRef.current?.setAttribute('transform', transform);
        probeCannonHitRef.current?.setAttribute('transform', transform);
        probeCannonArtworkRef.current?.setAttribute('transform', `rotate(${travelAngle.toFixed(3)})`);
      }
    } else selectableRegistry.remove(ORBITAL_PROBE_CANNON.id);
    twinsRef.current?.renderAtTime(time);
    const ashPosition = registry.get(ASH_TWIN.id);
    const emberPosition = registry.get(EMBER_TWIN.id);
    if (ashPosition !== undefined && emberPosition !== undefined) {
      const barycenter = {
        x: (ashPosition.x + emberPosition.x) / 2,
        y: (ashPosition.y + emberPosition.y) / 2,
      };
      registry.update(HOURGLASS_TWINS.id, barycenter);
      selectableRegistry.update(
        HOURGLASS_TWINS.id,
        barycenter,
        selectableRadiiRef.current[HOURGLASS_TWINS.id] ?? BODY_HIT_RADII[HOURGLASS_TWINS.id],
      );
      hourglassCompositeHitRef.current?.setAttribute(
        'transform',
        `translate(${barycenter.x.toFixed(3)} ${barycenter.y.toFixed(3)})`,
      );
    }
    interloperRef.current?.renderAtTime(time);
    const activeQuantumState = quantumStateRef.current;
    renderQuantumMoonFrame({
      hostId: activeQuantumState.hostId,
      positions: registry.snapshot(),
      simulationTime: time,
      phaseEpoch: activeQuantumState.phaseEpoch,
      orbitRadius: QUANTUM_ORBIT_RADIUS,
      orbitPeriod: QUANTUM_ORBIT_PERIOD,
      orbitDirection: activeQuantumState.orbitDirection,
      target: quantumMoonRef.current,
      onPositionUpdate: (position) => {
        registry.update(QUANTUM_MOON.id, position);
        selectableRegistry.update(
          QUANTUM_MOON.id,
          position,
          selectableRadiiRef.current[QUANTUM_MOON.id] ?? 0,
        );
        hitRefs.current[QUANTUM_MOON.id]?.setAttribute(
          'transform',
          `translate(${position.x.toFixed(3)} ${position.y.toFixed(3)})`,
        );
      },
    });
    if (cameraTransitionRef.current === null) {
      displayedCameraRef.current = focusedCamera();
    }
    applyCameraTransform();
    const svg = svgRef.current;
    const labelLayer = labelLayerRef.current;
    if (svg !== null && labelLayer !== null) {
      syncForegroundLabels(svg, labelLayer);
      applyLabelCollisionOffsets(svg);
    }
    const indicator = offscreenIndicatorRef.current;
    if (svg !== null && indicator !== null) {
      const bounds = svg.getBoundingClientRect();
      const panel = document.querySelector<HTMLElement>('.info-panel');
      const panelRect = panel?.getBoundingClientRect();
      const measuredInsets = panelRect === undefined ? offscreenInsets : (() => {
        const mobilePanel = panelRect.width >= bounds.width * .7;
        return mobilePanel
          ? { right: 0, bottom: Math.max(0, bounds.bottom - panelRect.top) }
          : { right: Math.max(0, bounds.right - panelRect.left), bottom: 0 };
      })();
      const windowMargin = 34;
      const windowVerticalMargin = 85;
      const indicatorWindow = {
        left: windowMargin,
        top: windowVerticalMargin,
        right: Math.max(windowMargin, bounds.width - measuredInsets.right - windowMargin),
        bottom: Math.max(windowVerticalMargin, bounds.height - measuredInsets.bottom - windowVerticalMargin),
      };
      const targetId = selectedId ?? SUN.id;
      const target = registry.get(targetId);
      const targetScreen = target === undefined ? undefined : worldPointToClient(
        target,
        getDisplayedCamera(),
        { width: bounds.width, height: bounds.height },
        ATLAS_VIEW_BOX,
      );
      const placement = targetScreen === undefined ? null : placeOffscreenIndicator(
        targetScreen,
        selectedId === null ? 'Solar System' : (getBody(selectedId)?.name ?? 'Solar System'),
        indicatorWindow,
      );
      indicator.hidden = placement === null;
      const campfire = campfireBackgroundRef.current;
      if (campfire !== null && placement === null) campfire.style.opacity = '0';
      if (placement !== null) {
        const angleRadians = placement.angle * Math.PI / 180;
        const tipInset = 13.6;
        const indicatorX = placement.x - Math.sin(angleRadians) * tipInset;
        const indicatorY = placement.y + Math.cos(angleRadians) * tipInset;
        indicator.style.left = `${indicatorX}px`;
        indicator.style.right = 'auto';
        indicator.style.top = `${indicatorY}px`;
        indicator.style.setProperty('--offscreen-angle', `${placement.angle}deg`);
        const horizontalEdge = placement.x <= indicatorWindow.left ? 'left-edge' : placement.x >= indicatorWindow.right ? 'right-edge' : '';
        indicator.className = `offscreen-indicator offscreen-indicator--${placement.edge}${horizontalEdge === '' ? '' : ` offscreen-indicator--${placement.edge}-${horizontalEdge}`}`;
        // Measure against a virtual camera fixed at the minimum zoom. This keeps
        // the displayed distance tied to the fully zoomed-out view, regardless of
        // the user's current zoom level.
        const displayedCamera = getDisplayedCamera();
        const referenceCamera: Camera = {
          scale: MIN_ZOOM,
          offset: {
            x: displayedCamera.offset.x * MIN_ZOOM / Math.max(displayedCamera.scale, Number.EPSILON),
            y: displayedCamera.offset.y * MIN_ZOOM / Math.max(displayedCamera.scale, Number.EPSILON),
          },
        };
        const referenceTarget = worldPointToClient(
          target!,
          referenceCamera,
          { width: bounds.width, height: bounds.height },
          ATLAS_VIEW_BOX,
        );
        const distance = Math.round(Math.hypot(referenceTarget.x - bounds.width / 2, referenceTarget.y - bounds.height / 2));
        if (campfire !== null) campfire.style.opacity = distance >= 1989 ? '1' : '0';
        indicator.setAttribute('aria-label', `${placement.label} is offscreen, ${distance} kilometers away`);
        if (offscreenIndicatorLabelRef.current !== null) offscreenIndicatorLabelRef.current.textContent = placement.label;
        if (offscreenIndicatorDistanceRef.current !== null) offscreenIndicatorDistanceRef.current.textContent = `${distance} km`;
      }
    }
  }, [applyCameraTransform, focusedCamera, getDisplayedCamera, offscreenInsets, registry, selectedId, selectableRegistry, showQuantumMoon]);

  useLayoutEffect(() => {
    renderAtTime(clock.getTime());
    return clock.subscribe(renderAtTime);
  }, [clock, renderAtTime]);

  const resolvePointerTarget = useCallback((id: BodyId, source: Exclude<ActivationSource, 'keyboard'>, clientPoint?: Point) => {
    let worldPoint: Point | undefined;
    if (clientPoint !== undefined) {
      const bounds = svgRef.current?.getBoundingClientRect();
      if (bounds !== undefined) {
        worldPoint = clientPointToWorld(
          { x: clientPoint.x - bounds.left, y: clientPoint.y - bounds.top },
          getDisplayedCamera(),
          { width: bounds.width, height: bounds.height },
          ATLAS_VIEW_BOX,
        );
      }
    }
    return selectableRegistry.resolve(id, source, worldPoint);
  }, [getDisplayedCamera, selectableRegistry]);

  const jumpQuantumMoon = useCallback(() => {
    const active = quantumStateRef.current;
    const nextState: QuantumState = Object.freeze({
      ...active,
      hostId: chooseQuantumHost(active.hostId),
      escapeCount: active.escapeCount + 1,
      phaseEpoch: randomQuantumPhaseEpoch(clock.getTime()),
      cooldownUntil: performance.now() + QUANTUM_COOLDOWN_MILLISECONDS,
      lastEscapeMovement: pointerMovementRef.current,
      orbitDirection: chooseQuantumOrbitDirection(),
    });
    quantumStateRef.current = nextState;
    setQuantumState(nextState);
    onQuantumStatusChange?.('Quantum Moon jumped to a different orbit.');
    renderAtTime(clock.getTime());
  }, [clock, onQuantumStatusChange, renderAtTime]);

  const activate = useCallback((id: BodyId, source: ActivationSource, clientPoint?: Point) => {
    if (source !== 'keyboard' && gestureRef.current?.dragged === true) return;
    if (id === QUANTUM_MOON.id) {
      jumpQuantumMoon();
      return;
    }
    const resolvedId = source === 'keyboard'
      ? selectableRegistry.resolve(id, source)
      : resolvePointerTarget(id, source, clientPoint);
    if (resolvedId !== undefined) onSelect(resolvedId);
  }, [jumpQuantumMoon, onSelect, resolvePointerTarget, selectableRegistry]);

  const updateHitAreaHover = useCallback((id: BodyId | null, clientPoint?: Point) => {
    if (id === null) {
      setHoveredId(null);
      return;
    }
    setHoveredId(resolvePointerTarget(id, 'hit-area', clientPoint) ?? id);
  }, [resolvePointerTarget]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const targetElement = event.target instanceof Element
      ? event.target.closest<SVGElement>('[data-hit-body-id], [data-body-id]')
      : null;
    const targetId = targetElement?.getAttribute('data-hit-body-id')
      ?? targetElement?.getAttribute('data-body-id');
    const requestedId = (targetId ?? SUN.id) as BodyId;
    const resolvedCandidate = resolvePointerTarget(
      requestedId,
      'hit-area',
      { x: event.clientX, y: event.clientY },
    ) ?? (targetId === null || targetId === undefined ? undefined : requestedId);
    gestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
      candidateId:
        resolvedCandidate === QUANTUM_MOON.id
          ? undefined
          : resolvedCandidate,
    };
    camera.handlers.onPointerDown(event);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    pointerMovementRef.current += 1;
    const activeQuantumState = quantumStateRef.current;
    {
      const bounds = svgRef.current?.getBoundingClientRect();
      const moonWorldPosition = registry.get(QUANTUM_MOON.id);
      if (bounds !== undefined && moonWorldPosition !== undefined) {
        const moonLocalClient = worldPointToClient(
          moonWorldPosition,
          getDisplayedCamera(),
          { width: bounds.width, height: bounds.height },
          ATLAS_VIEW_BOX,
        );
        const moonClientPosition = {
          x: moonLocalClient.x + bounds.left,
          y: moonLocalClient.y + bounds.top,
        };
        const pointerNearMoon = isPointerNear(
          { x: event.clientX, y: event.clientY },
          moonClientPosition,
          QUANTUM_PROXIMITY_PIXELS,
        );
        if (!pointerNearMoon) quantumHoverArmedRef.current = true;
        if (pointerNearMoon && quantumHoverArmedRef.current) {
          const escapedState = attemptQuantumEscape(activeQuantumState, {
            now: performance.now(),
            simulationTime: clock.getTime(),
            pointerMovement: pointerMovementRef.current,
            cooldown: QUANTUM_COOLDOWN_MILLISECONDS,
          });
          const nextQuantumState = escapedState === activeQuantumState
            ? escapedState
            : Object.freeze({ ...escapedState, phaseEpoch: randomQuantumPhaseEpoch(clock.getTime()) });
          if (nextQuantumState !== activeQuantumState) {
            quantumHoverArmedRef.current = false;
            quantumStateRef.current = nextQuantumState;
            setQuantumState(nextQuantumState);
            onQuantumStatusChange?.(`Quantum Moon escaped ${nextQuantumState.escapeCount} times.`);
            renderAtTime(clock.getTime());
          }
        }
      }
    }
    const gesture = gestureRef.current;
    if (gesture !== null && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= MAP_DRAG_THRESHOLD) {
      if (!gesture.dragged && focusedBodyRef.current !== null) {
        const displayedCamera = getDisplayedCamera();
        cancelCameraTransition();
        focusedBodyRef.current = null;
        camera.rebaseOffset(displayedCamera.offset);
        cameraWorldRef.current?.setAttribute('transform', cameraTransform(displayedCamera));
      }
      gesture.dragged = true;
    }
    camera.handlers.onPointerMove(event);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (gesture !== null && !gesture.dragged && gesture.candidateId !== undefined) {
      onSelect(gesture.candidateId);
    }
    camera.handlers.onPointerUp(event);
  };
  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    gestureRef.current = null;
    camera.handlers.onPointerCancel(event);
  };
  const onDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const targetElement = event.target instanceof Element
      ? event.target.closest<SVGElement>('[data-hit-body-id], [data-body-id]')
      : null;
    const targetId = targetElement?.getAttribute('data-hit-body-id')
      ?? targetElement?.getAttribute('data-body-id');
    if (targetId === null || targetId === undefined) return;
    const id = targetId as BodyId;
    if (id === QUANTUM_MOON.id) {
      jumpQuantumMoon();
      return;
    }
    onSelect(id);
    focusBody(id);
  };

  const displayedCamera = getDisplayedCamera();
  const displayedCameraTransform = cameraTransform(displayedCamera);
  const interactionRadius = (id: BodyId) => hitRadiusForMinimumPixels({
    minimumPixels: 22,
    visualRadius: BODY_HIT_RADII[id],
    visualPadding: 0,
    cameraScale: camera.camera.scale,
    viewport,
    viewBox: ATLAS_VIEW_BOX,
  });
  const selectableRadius = (id: BodyId) => interactionRadius(id);
  const labelFontSize = labelFontSizeForMinimumPixels({
    minimumPixels: 14,
    cameraScale: camera.camera.scale,
    viewport,
    viewBox: ATLAS_VIEW_BOX,
  });
  const effectiveRadii: Partial<Record<BodyId, number>> = {
    sun: selectableRadius('sun'),
    'sun-station': showQuantumMoon ? selectableRadius('sun-station') : 0,
    'white-hole-station': showQuantumMoon ? selectableRadius('white-hole-station') : 0,
    'white-hole': showQuantumMoon ? selectableRadius('white-hole') : 0,
    'orbital-probe-cannon': showQuantumMoon ? selectableRadius('orbital-probe-cannon') : 0,
    'hourglass-twins': selectableRadius('hourglass-twins'),
  };
  ORDINARY_WORLDS.forEach(({ body, moon }) => {
    effectiveRadii[body.id] = selectableRadius(body.id);
    if (moon !== undefined) effectiveRadii[moon.id] = selectableRadius(moon.id);
  });
  SPECIAL_BODY_IDS.forEach((id) => {
    effectiveRadii[id] = selectableRadius(id);
  });
  effectiveRadii[QUANTUM_MOON.id] = showQuantumMoon ? selectableRadius(QUANTUM_MOON.id) : 0;
  selectableRadiiRef.current = effectiveRadii;

  useLayoutEffect(() => {
    Object.entries(effectiveRadii).forEach(([id, radius]) => {
      if (radius !== undefined) selectableRegistry.updateRadius(id as BodyId, radius);
    });
  }, [camera.camera.scale, selectableRegistry, showQuantumMoon, viewport.height, viewport.width]);

  const viewBox = `${ATLAS_VIEW_BOX.x} ${ATLAS_VIEW_BOX.y} ${ATLAS_VIEW_BOX.width} ${ATLAS_VIEW_BOX.height}`;
  const panDistance = Math.hypot(camera.camera.offset.x, camera.camera.offset.y) / Math.max(camera.camera.scale, 0.001);
  const voidOpacity = Math.min(1, Math.max(0, (panDistance - 1100) / 900));

  return (
    <div
      className="atlas-map-surface"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDoubleClick={onDoubleClick}
      onLostPointerCapture={(event) => {
        gestureRef.current = null;
        camera.handlers.onLostPointerCapture(event);
      }}
      onWheel={camera.handlers.onWheel}
      onDragStart={camera.handlers.onDragStart}
    >
      <ImageArtworkContext.Provider value={imageArtworkEnabled}>
      <svg className="atlas-background" viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true">
        <Starfield idPrefix={`${sceneId}-background`} preset={backgroundPreset} />
      </svg>
      <svg className="atlas-background-stars" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <Starfield idPrefix={`${sceneId}-background-stars`} preset={backgroundPreset} starsOnly />
      </svg>
      <div className="void-overlay" aria-hidden="true" style={{ opacity: voidOpacity }} />
      <svg
        ref={svgRef}
        className={`solar-system${showOrbits ? '' : ' solar-system--orbits-hidden'}${showLabels ? '' : ' solar-system--labels-hidden'}`}
        viewBox={viewBox}
        role="group"
        aria-label="Animated map of the Outer Wilds solar system"
        preserveAspectRatio="xMidYMid meet"
      >
        <g ref={cameraWorldRef} className="camera-world" transform={displayedCameraTransform}>
          <g className="ordinary-orbits">
            {showQuantumMoon && SUN_STATION.orbit !== undefined ? <Orbit orbit={SUN_STATION.orbit} selected={selectedId === SUN_STATION.id} /> : null}
            {ORDINARY_WORLDS.map(({ body }) => body.orbit === undefined ? null : (
              <Orbit
                key={body.id}
                orbit={body.orbit}
                selected={selectedId === body.id || (selectedId !== null && body.satelliteIds.includes(selectedId))}
              />
            ))}
            {ASH_TWIN.orbit === undefined ? null : (
              <Orbit
                orbit={ASH_TWIN.orbit}
                selected={selectedId === ASH_TWIN.id || selectedId === EMBER_TWIN.id || selectedId === HOURGLASS_TWINS.id}
              />
            )}
          </g>

          <g className="body-hit-layer" aria-hidden="true">
            <CelestialHitArea
              body={SUN}
              radius={selectableRadius(SUN.id)}
              onActivate={activate}
              onHoverChange={updateHitAreaHover}
            />
            {showQuantumMoon ? (
              <g ref={sunStationHitRef}>
                <CelestialHitArea body={SUN_STATION} radius={selectableRadius(SUN_STATION.id)} onActivate={activate} onHoverChange={updateHitAreaHover} />
              </g>
            ) : null}
            {showQuantumMoon ? <g ref={probeCannonHitRef}><CelestialHitArea body={ORBITAL_PROBE_CANNON} radius={selectableRadius(ORBITAL_PROBE_CANNON.id)} onActivate={activate} onHoverChange={updateHitAreaHover} /></g> : null}
            <g ref={whiteHoleHitRef} transform={`translate(${WHITE_HOLE_POSITION.x} ${WHITE_HOLE_POSITION.y})`}>
              {showQuantumMoon ? <CelestialHitArea body={WHITE_HOLE} radius={selectableRadius(WHITE_HOLE.id)} onActivate={activate} onHoverChange={updateHitAreaHover} /> : null}
            </g>
            {showQuantumMoon ? (
              <g ref={whiteHoleStationHitRef} transform={`translate(${WHITE_HOLE_STATION_POSITION.x} ${WHITE_HOLE_STATION_POSITION.y})`}>
                <CelestialHitArea body={WHITE_HOLE_STATION} radius={selectableRadius(WHITE_HOLE_STATION.id)} onActivate={activate} onHoverChange={updateHitAreaHover} />
              </g>
            ) : null}
            <g ref={hourglassCompositeHitRef}>
              <CelestialHitArea
                body={HOURGLASS_TWINS}
                radius={selectableRadius(HOURGLASS_TWINS.id)}
                onActivate={activate}
                onHoverChange={updateHitAreaHover}
              />
            </g>
            {ORDINARY_WORLDS.flatMap(({ body, moon }) => {
              const targets = [
                <g key={body.id} ref={(node) => { hitRefs.current[body.id] = node; }}>
                  <CelestialHitArea
                    body={body}
                    radius={selectableRadius(body.id)}
                    onActivate={activate}
                    onHoverChange={updateHitAreaHover}
                  />
                </g>,
              ];
              if (moon !== undefined) {
                targets.push(
                  <g key={moon.id} ref={(node) => { hitRefs.current[moon.id] = node; }}>
                    <CelestialHitArea
                      body={moon}
                      radius={selectableRadius(moon.id)}
                      onActivate={activate}
                      onHoverChange={updateHitAreaHover}
                    />
                  </g>,
                );
              }
              return targets;
            })}
            {SPECIAL_BODY_IDS.map((id) => {
              const body = requireBody(id);
              return (
                <g key={id} ref={(node) => { hitRefs.current[id] = node; }}>
                  <CelestialHitArea
                    body={body}
                    radius={selectableRadius(id)}
                    onActivate={activate}
                    onHoverChange={updateHitAreaHover}
                  />
                </g>
              );
            })}
            <g ref={(node) => { hitRefs.current[QUANTUM_MOON.id] = node; }}>
              <CelestialHitArea
                body={QUANTUM_MOON}
                radius={selectableRadius(QUANTUM_MOON.id)}
                onActivate={activate}
                onHoverChange={updateHitAreaHover}
              />
            </g>
          </g>

          <CelestialBody
            body={SUN}
            selected={selectedId === SUN.id}
            hovered={hoveredId === SUN.id}
            onActivate={activate}
            idPrefix={`${sceneId}-${SUN.id}`}
            hitRadius={selectableRadius(SUN.id)}
            labelFontSize={labelFontSize}
            musicPulseKey={musicPlaying && sunMusicPulseKey !== null ? sunMusicPulseKey : undefined}
          />
          {showQuantumMoon ? (
            <g ref={sunStationPositionRef} className="sun-station-position" data-body-id={SUN_STATION.id}>
              <CelestialBody artworkRef={sunStationArtworkRef} body={SUN_STATION} selected={selectedId === SUN_STATION.id} hovered={hoveredId === SUN_STATION.id} onActivate={activate} idPrefix={`${sceneId}-${SUN_STATION.id}`} hitRadius={selectableRadius(SUN_STATION.id)} labelFontSize={labelFontSize} />
            </g>
          ) : null}
          {showQuantumMoon ? <g className="white-hole-position" transform={`translate(${WHITE_HOLE_POSITION.x} ${WHITE_HOLE_POSITION.y})`} data-body-id={WHITE_HOLE.id}>
            <CelestialBody body={WHITE_HOLE} selected={selectedId === WHITE_HOLE.id} hovered={hoveredId === WHITE_HOLE.id} onActivate={activate} idPrefix={`${sceneId}-${WHITE_HOLE.id}`} hitRadius={selectableRadius(WHITE_HOLE.id)} labelFontSize={labelFontSize} />
          </g> : null}
          {showQuantumMoon ? <g ref={whiteHoleStationPositionRef} className="white-hole-station-position" transform={`translate(${WHITE_HOLE_STATION_POSITION.x} ${WHITE_HOLE_STATION_POSITION.y})`} data-body-id={WHITE_HOLE_STATION.id}><CelestialBody body={WHITE_HOLE_STATION} selected={selectedId === WHITE_HOLE_STATION.id} hovered={hoveredId === WHITE_HOLE_STATION.id} onActivate={activate} idPrefix={`${sceneId}-${WHITE_HOLE_STATION.id}`} hitRadius={selectableRadius(WHITE_HOLE_STATION.id)} labelFontSize={labelFontSize} /></g> : null}
          {showQuantumMoon ? <g ref={probeCannonPositionRef} className="orbital-probe-cannon-position" data-body-id={ORBITAL_PROBE_CANNON.id}><CelestialBody artworkRef={probeCannonArtworkRef} body={ORBITAL_PROBE_CANNON} selected={selectedId === ORBITAL_PROBE_CANNON.id} hovered={hoveredId === ORBITAL_PROBE_CANNON.id} onActivate={activate} idPrefix={`${sceneId}-${ORBITAL_PROBE_CANNON.id}`} hitRadius={selectableRadius(ORBITAL_PROBE_CANNON.id)} labelFontSize={labelFontSize} /></g> : null}

          {ORDINARY_WORLDS.map(({ body, moon }) => (
            <g
              key={body.id}
              ref={(node) => { bodyRefs.current[body.id] = node; }}
              className="planet-position"
            >
              <CelestialBody
                body={body}
                selected={selectedId === body.id}
                hovered={hoveredId === body.id}
                onActivate={activate}
                idPrefix={`${sceneId}-${body.id}`}
                hitRadius={selectableRadius(body.id)}
                labelFontSize={labelFontSize}
              />
              {moon === undefined ? null : (
                <Moon
                  ref={(node) => { moonRefs.current[moon.id] = node; }}
                  body={moon}
                  selected={selectedId === moon.id}
                  hovered={hoveredId === moon.id}
                  onActivate={activate}
                  idPrefix={`${sceneId}-${moon.id}`}
                  hitRadius={selectableRadius(moon.id)}
                  labelFontSize={labelFontSize}
                />
              )}
            </g>
          ))}

          <HourglassTwins
            ref={twinsRef}
            ashTwin={ASH_TWIN}
            emberTwin={EMBER_TWIN}
            selectedId={selectedId}
            hoveredId={hoveredId}
            hitRadii={{
              ash: selectableRadius(ASH_TWIN.id),
              ember: selectableRadius(EMBER_TWIN.id),
            }}
            idPrefix={`${sceneId}-hourglass`}
            onActivate={activate}
            onPositionUpdate={updateSpecialPosition}
            labelFontSize={labelFontSize}
          />
          <Interloper
            ref={interloperRef}
            body={INTERLOPER}
            selected={selectedId === INTERLOPER.id}
            hovered={hoveredId === INTERLOPER.id}
            hitRadius={selectableRadius(INTERLOPER.id)}
            idPrefix={`${sceneId}-${INTERLOPER.id}`}
            onActivate={activate}
            onPositionUpdate={updateSpecialPosition}
            labelFontSize={labelFontSize}
          />
          {showQuantumMoon ? <QuantumMoon
            ref={quantumMoonRef}
            body={QUANTUM_MOON}
            hostId={quantumState.hostId}
            flickering={quantumState.escapeCount > 0}
            selected={selectedId === QUANTUM_MOON.id}
            hovered={hoveredId === QUANTUM_MOON.id}
            hitRadius={selectableRadius(QUANTUM_MOON.id)}
            idPrefix={`${sceneId}-${QUANTUM_MOON.id}`}
            onActivate={activate}
            labelFontSize={labelFontSize}
          /> : null}
        </g>
        <g
          ref={labelLayerRef}
          className="body-label-layer"
          aria-hidden="true"
          onClick={(event) => {
            const label = (event.target as Element).closest<SVGTextElement>('.body-label--foreground');
            const bodyId = label?.dataset.bodyId as BodyId | undefined;
            if (bodyId !== undefined) activate(bodyId, 'label', { x: event.clientX, y: event.clientY });
          }}
        />
      </svg>
      </ImageArtworkContext.Provider>
      <img
        ref={campfireBackgroundRef}
        className="campfire-background"
        src={`${import.meta.env.BASE_URL}images/campfire-background.png`}
        alt=""
        aria-hidden="true"
      />
      <div ref={offscreenIndicatorRef} className="offscreen-indicator" hidden aria-hidden="true">
        <span className="offscreen-indicator__chevron" aria-hidden="true" />
        <span className="offscreen-indicator__labels">
          <span ref={offscreenIndicatorLabelRef} className="offscreen-indicator__label" />
          <span ref={offscreenIndicatorDistanceRef} className="offscreen-indicator__distance" aria-hidden="true" />
        </span>
      </div>
      <p className="map-hint">Drag to pan · scroll to zoom · select a world to learn more</p>
    </div>
  );
});
