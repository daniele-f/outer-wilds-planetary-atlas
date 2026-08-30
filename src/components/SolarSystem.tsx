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
import type { Camera } from '../lib/camera';
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
import {
  BODY_HIT_RADII,
  CelestialBody,
  CelestialHitArea,
  type ActivationSource,
} from './CelestialBody';
import { Moon } from './Moon';
import { Orbit } from './Orbit';
import { Starfield } from './Starfield';
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
const ASH_TWIN = requireBody('ash-twin');
const EMBER_TWIN = requireBody('ember-twin');
const INTERLOPER = requireBody('interloper');
const QUANTUM_MOON = requireBody('quantum-moon');
const SPECIAL_BODY_IDS = [ASH_TWIN.id, EMBER_TWIN.id, INTERLOPER.id] as const;
const QUANTUM_ORBIT_RADIUS = 48;
const QUANTUM_PROXIMITY_PIXELS = 34;
const QUANTUM_COOLDOWN_MILLISECONDS = 450;
const FOCUS_TRANSITION_MILLISECONDS = 220;

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
  onRegistryReady?: (registry: WorldPositionRegistry) => void;
  onQuantumStatusChange?: (message: string) => void;
  /** Horizontal CSS-pixel shift that centers a focused body in visible map space. */
  focusViewportOffsetX?: number;
  /** Vertical CSS-pixel shift that centers a focused body above a mobile bottom sheet. */
  focusViewportOffsetY?: number;
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
    onRegistryReady,
    onQuantumStatusChange,
    focusViewportOffsetX = 0,
    focusViewportOffsetY = 0,
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
  const selectableRadiiRef = useRef<Partial<Record<BodyId, number>>>({});
  const gestureRef = useRef<Gesture | null>(null);
  const pointerMovementRef = useRef(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const cameraWorldRef = useRef<SVGGElement | null>(null);
  const focusedBodyRef = useRef<BodyId | null>('sun');
  const displayedCameraRef = useRef<Camera>(camera.camera);
  const cameraTransitionRef = useRef<CameraTransition | null>(null);
  const [viewport, setViewport] = useState<Size>({
    width: ATLAS_VIEW_BOX.width,
    height: ATLAS_VIEW_BOX.height,
  });
  const [hoveredId, setHoveredId] = useState<BodyId | null>(null);
  const [quantumState, setQuantumState] = useState<QuantumState>(() =>
    createQuantumState(chooseQuantumHost(), clock.getTime()),
  );
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
    twinsRef.current?.renderAtTime(time);
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
          selectableRadiiRef.current[QUANTUM_MOON.id] ?? BODY_HIT_RADII[QUANTUM_MOON.id],
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
  }, [applyCameraTransform, focusedCamera, registry, selectableRegistry]);

  useEffect(() => {
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
      phaseEpoch: clock.getTime(),
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
        if (isPointerNear(
          { x: event.clientX, y: event.clientY },
          moonClientPosition,
          QUANTUM_PROXIMITY_PIXELS,
        )) {
          const nextQuantumState = attemptQuantumEscape(activeQuantumState, {
            now: performance.now(),
            simulationTime: clock.getTime(),
            pointerMovement: pointerMovementRef.current,
            cooldown: QUANTUM_COOLDOWN_MILLISECONDS,
          });
          if (nextQuantumState !== activeQuantumState) {
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
  };
  ORDINARY_WORLDS.forEach(({ body, moon }) => {
    effectiveRadii[body.id] = selectableRadius(body.id);
    if (moon !== undefined) effectiveRadii[moon.id] = selectableRadius(moon.id);
  });
  SPECIAL_BODY_IDS.forEach((id) => {
    effectiveRadii[id] = selectableRadius(id);
  });
  effectiveRadii[QUANTUM_MOON.id] = selectableRadius(QUANTUM_MOON.id);
  selectableRadiiRef.current = effectiveRadii;

  useLayoutEffect(() => {
    Object.entries(effectiveRadii).forEach(([id, radius]) => {
      if (radius !== undefined) selectableRegistry.updateRadius(id as BodyId, radius);
    });
  }, [camera.camera.scale, selectableRegistry, viewport.height, viewport.width]);

  const viewBox = `${ATLAS_VIEW_BOX.x} ${ATLAS_VIEW_BOX.y} ${ATLAS_VIEW_BOX.width} ${ATLAS_VIEW_BOX.height}`;

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
      <svg
        ref={svgRef}
        className={`solar-system${showOrbits ? '' : ' solar-system--orbits-hidden'}${showLabels ? '' : ' solar-system--labels-hidden'}`}
        viewBox={viewBox}
        role="group"
        aria-label="Animated map of the Outer Wilds solar system"
        preserveAspectRatio="xMidYMid meet"
      >
        <Starfield idPrefix={`${sceneId}-stars`} />
        <g ref={cameraWorldRef} className="camera-world" transform={displayedCameraTransform}>
          <g className="ordinary-orbits">
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
                selected={selectedId === ASH_TWIN.id || selectedId === EMBER_TWIN.id}
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
          />

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
          <QuantumMoon
            // Each escape changes the key, restarting the single CSS-defined teleport animation.
            key={quantumState.escapeCount}
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
          />
        </g>
      </svg>
      <p className="map-hint">Drag to pan · scroll to zoom · select a world to learn more</p>
    </div>
  );
});
