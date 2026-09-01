import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import type {
  BodyId,
  CelestialBody as CelestialBodyRecord,
} from '../data/celestialBodies';
import {
  circularPosition,
  composePoint,
  hourglassTwinState,
  type HourglassTwinState,
} from '../lib/orbits';
import type { OrbitConfig, Point } from '../types/celestial';
import type { ActivationSource } from './CelestialBody';

const TWIN_CONFIG = Object.freeze({
  separation: 58,
  binaryPeriod: 18,
  transferPeriod: 44,
  minimumRadius: 13,
  maximumRadius: 23,
});
const BASE_RADIUS = 18;
const GRAIN_COUNT = 6;

type Curve = Readonly<{ start: Point; control: Point; end: Point }>;

function curveFor(state: HourglassTwinState): Curve {
  const start = state.firstPosition;
  const end = state.secondPosition;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(Number.EPSILON, Math.hypot(dx, dy));
  return Object.freeze({
    start,
    control: Object.freeze({
      x: (start.x + end.x) / 2 - dy / length * 16,
      y: (start.y + end.y) / 2 + dx / length * 16,
    }),
    end,
  });
}

function pointOnCurve(curve: Curve, amount: number): Point {
  const inverse = 1 - amount;
  return Object.freeze({
    x: inverse * inverse * curve.start.x + 2 * inverse * amount * curve.control.x + amount * amount * curve.end.x,
    y: inverse * inverse * curve.start.y + 2 * inverse * amount * curve.control.y + amount * amount * curve.end.y,
  });
}

function curvePath(curve: Curve): string {
  return `M${curve.start.x.toFixed(3)},${curve.start.y.toFixed(3)} Q${curve.control.x.toFixed(3)},${curve.control.y.toFixed(3)} ${curve.end.x.toFixed(3)},${curve.end.y.toFixed(3)}`;
}

type AttributeTarget = Readonly<{
  setAttribute: (name: string, value: string) => void;
}>;

type HourglassStreamFrame = Readonly<{
  time: number;
  state: HourglassTwinState;
  stream: AttributeTarget | null;
  gradient: AttributeTarget | null;
  grains: readonly (AttributeTarget | null)[];
  animateGrains?: boolean;
}>;

const GRAIN_TRAVERSALS_PER_HALF_CYCLE = 3;

function grainProgress(time: number, index: number): number {
  const period = TWIN_CONFIG.transferPeriod;
  const halfPeriod = period / 2;
  const wrappedTime = ((time % period) + period) % period;
  const reflectedTime = wrappedTime <= halfPeriod ? wrappedTime : period - wrappedTime;
  const travel = reflectedTime * GRAIN_TRAVERSALS_PER_HALF_CYCLE / halfPeriod;
  const offset = (index + 0.5) / GRAIN_COUNT;
  const progress = travel + offset;
  return progress - Math.floor(progress);
}

/** Applies one continuous stream frame to the same SVG attribute targets used by the component. */
export function renderHourglassStreamFrame({
  time,
  state,
  stream,
  gradient,
  grains,
  animateGrains = true,
}: HourglassStreamFrame): void {
  const curve = curveFor(state);
  const source = state.direction === 1 ? curve.start : curve.end;
  const destination = state.direction === 1 ? curve.end : curve.start;

  stream?.setAttribute('d', curvePath(curve));
  stream?.setAttribute(
    'data-sand-stream',
    state.direction === 1 ? 'ash-twin-to-ember-twin' : 'ember-twin-to-ash-twin',
  );
  gradient?.setAttribute('x1', source.x.toFixed(3));
  gradient?.setAttribute('y1', source.y.toFixed(3));
  gradient?.setAttribute('x2', destination.x.toFixed(3));
  gradient?.setAttribute('y2', destination.y.toFixed(3));
  if (!animateGrains) return;
  grains.forEach((grain, index) => {
    if (grain === null) return;
    const grainPoint = pointOnCurve(curve, grainProgress(time, index));
    grain.setAttribute('cx', grainPoint.x.toFixed(3));
    grain.setAttribute('cy', grainPoint.y.toFixed(3));
  });
}

type HourglassTwinsFrameTargets = Readonly<{
  barycenter: AttributeTarget | null;
  ashPosition: AttributeTarget | null;
  emberPosition: AttributeTarget | null;
  ashVisual: AttributeTarget | null;
  emberVisual: AttributeTarget | null;
  stream: AttributeTarget | null;
  gradient: AttributeTarget | null;
  grains: readonly (AttributeTarget | null)[];
}>;

type HourglassTwinsFrame = Readonly<{
  time: number;
  sharedOrbit: OrbitConfig;
  ashId: BodyId;
  emberId: BodyId;
  targets: HourglassTwinsFrameTargets;
  onPositionUpdate: (id: BodyId, position: Point) => void;
  reducedMotion?: boolean;
}>;

/** Applies one complete Hourglass Twins frame to SVG refs and live position consumers. */
export function renderHourglassTwinsFrame({
  time,
  sharedOrbit,
  ashId,
  emberId,
  targets,
  onPositionUpdate,
  reducedMotion = false,
}: HourglassTwinsFrame): void {
  const barycenter = circularPosition(sharedOrbit, time);
  const state = hourglassTwinState(TWIN_CONFIG, time);
  const ashWorldPosition = composePoint(barycenter, state.firstPosition);
  const emberWorldPosition = composePoint(barycenter, state.secondPosition);

  targets.barycenter?.setAttribute(
    'transform',
    `translate(${barycenter.x.toFixed(3)} ${barycenter.y.toFixed(3)})`,
  );
  targets.ashPosition?.setAttribute(
    'transform',
    `translate(${state.firstPosition.x.toFixed(3)} ${state.firstPosition.y.toFixed(3)})`,
  );
  targets.emberPosition?.setAttribute(
    'transform',
    `translate(${state.secondPosition.x.toFixed(3)} ${state.secondPosition.y.toFixed(3)})`,
  );
  targets.ashVisual?.setAttribute(
    'transform',
    `scale(${(state.firstRadius / BASE_RADIUS).toFixed(4)})`,
  );
  targets.emberVisual?.setAttribute(
    'transform',
    `scale(${(state.secondRadius / BASE_RADIUS).toFixed(4)})`,
  );
  renderHourglassStreamFrame({
    time,
    state,
    stream: targets.stream,
    gradient: targets.gradient,
    grains: targets.grains,
    animateGrains: !reducedMotion,
  });
  onPositionUpdate(ashId, ashWorldPosition);
  onPositionUpdate(emberId, emberWorldPosition);
}

export type HourglassTwinsHandle = Readonly<{
  renderAtTime: (time: number) => void;
}>;

type TwinHitRadii = Readonly<{ ash: number; ember: number }>;

export type HourglassTwinsProps = Readonly<{
  ashTwin: CelestialBodyRecord;
  emberTwin: CelestialBodyRecord;
  selectedId: BodyId | null;
  hoveredId: BodyId | null;
  hitRadii: TwinHitRadii;
  idPrefix: string;
  onActivate: (id: BodyId, source: ActivationSource, clientPoint?: Point) => void;
  onPositionUpdate: (id: BodyId, position: Point) => void;
  labelFontSize?: number | undefined;
}>;

type TwinEntityProps = Readonly<{
  body: CelestialBodyRecord;
  variant: 'ash' | 'ember';
  selected: boolean;
  hovered: boolean;
  hitRadius: number;
  visualScale: number;
  clipId: string;
  position: Point;
  positionRef: React.RefObject<SVGGElement | null>;
  visualRef: React.RefObject<SVGGElement | null>;
  onActivate: HourglassTwinsProps['onActivate'];
  labelFontSize: number;
}>;

function TwinEntity({
  body,
  variant,
  selected,
  hovered,
  hitRadius,
  visualScale,
  clipId,
  position,
  positionRef,
  visualRef,
  onActivate,
  labelFontSize,
}: TwinEntityProps) {
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onActivate(body.id, 'keyboard');
  };

  return (
    <g
      ref={positionRef}
      className={`hourglass-twin hourglass-twin--${variant} celestial-entity${selected ? ' celestial-entity--selected' : ''}${hovered ? ' celestial-entity--hovered' : ''}`}
      data-body-id={body.id}
      role="button"
      tabIndex={0}
      aria-label={`${body.name}, ${body.classification}`}
      aria-pressed={selected}
      transform={`translate(${position.x} ${position.y})`}
      onKeyDown={onKeyDown}
    >
      <g className="body-visual twin-visual" pointerEvents="none">
        <g ref={visualRef} className="twin-radius" transform={`scale(${visualScale})`}>
          <circle className="twin-sphere" r={BASE_RADIUS} />
          <g clipPath={`url(#${clipId})`}>
          {variant === 'ash' ? (
            <>
              <path className="ash-dune ash-dune--back" d="M-21,-5 Q-8,-15 2,-6 T22,-7 L22,21 L-22,21 Z" />
              <path className="ash-dune ash-dune--front" d="M-22,7 Q-8,-2 3,8 T23,5 L23,22 L-23,22 Z" />
              <path className="ash-ripple" d="M-15,-2 Q-7,-7 1,-2 M-11,8 Q-2,3 8,8 M2,-10 Q9,-13 15,-9" />
            </>
          ) : (
            <>
              <path className="ember-canyon" d="M-16,-21 L-8,-8 L-13,2 L-4,21 M8,-21 L5,-7 L14,1 L9,22" />
              <path className="ember-shelf" d="M-21,7 L-11,3 L-3,7 L5,2 L14,7 L22,5 L22,22 L-22,22 Z" />
              <circle className="ember-crater" cx="-7" cy="-8" r="3.2" />
            </>
          )}
          </g>
          <path className="twin-shadow" d="M0,-18 A18,18 0 0 1 0,18 A13,18 0 0 0 0,-18 Z" />
          <circle className="twin-rim" r={BASE_RADIUS} />
        </g>
      </g>
      <text
        className="body-label twin-label"
        y={Math.max(39, labelFontSize * 0.9)}
        textAnchor="middle"
        style={{ fontSize: labelFontSize }}
        onClick={(event: MouseEvent<SVGTextElement>) => onActivate(body.id, 'label', { x: event.clientX, y: event.clientY })}
      >
        {body.name}
      </text>
    </g>
  );
}

export const HourglassTwins = forwardRef<HourglassTwinsHandle, HourglassTwinsProps>(
  function HourglassTwins(
    {
      ashTwin,
      emberTwin,
      selectedId,
      hoveredId,
      hitRadii,
      idPrefix,
      onActivate,
      onPositionUpdate,
      labelFontSize = 10,
    },
    ref,
  ) {
    if (ashTwin.orbit === undefined) throw new Error('Ash Twin requires a shared barycenter orbit.');
    const sharedOrbit = ashTwin.orbit;
    const barycenterRef = useRef<SVGGElement | null>(null);
    const ashPositionRef = useRef<SVGGElement | null>(null);
    const emberPositionRef = useRef<SVGGElement | null>(null);
    const ashVisualRef = useRef<SVGGElement | null>(null);
    const emberVisualRef = useRef<SVGGElement | null>(null);
    const streamRef = useRef<SVGPathElement | null>(null);
    const gradientRef = useRef<SVGLinearGradientElement | null>(null);
    const grainRefs = useRef<Array<SVGCircleElement | null>>([]);
    const reducedMotionQueryRef = useRef<MediaQueryList | null>(null);
    if (reducedMotionQueryRef.current === null && typeof window !== 'undefined') {
      reducedMotionQueryRef.current = window.matchMedia('(prefers-reduced-motion: reduce)');
    }
    const initialState = hourglassTwinState(TWIN_CONFIG, 0);
    const initialBarycenter = circularPosition(sharedOrbit, 0);
    const initialCurve = curveFor(initialState);

    const renderAtTime = useCallback((time: number) => {
      renderHourglassTwinsFrame({
        time,
        sharedOrbit,
        ashId: ashTwin.id,
        emberId: emberTwin.id,
        targets: {
          barycenter: barycenterRef.current,
          ashPosition: ashPositionRef.current,
          emberPosition: emberPositionRef.current,
          ashVisual: ashVisualRef.current,
          emberVisual: emberVisualRef.current,
          stream: streamRef.current,
          gradient: gradientRef.current,
          grains: grainRefs.current,
        },
        onPositionUpdate,
        reducedMotion: reducedMotionQueryRef.current?.matches ?? false,
      });
    }, [ashTwin.id, emberTwin.id, onPositionUpdate, sharedOrbit]);

    useImperativeHandle(ref, () => Object.freeze({ renderAtTime }), [renderAtTime]);

    const gradientId = `${idPrefix}-sand-gradient`;
    const ashClipId = `${idPrefix}-ash-clip`;
    const emberClipId = `${idPrefix}-ember-clip`;

    return (
      <g
        ref={barycenterRef}
        className={`hourglass-system${hoveredId === 'hourglass-twins' || selectedId === 'hourglass-twins' ? ' hourglass-system--hovered' : ''}`}
        transform={`translate(${initialBarycenter.x} ${initialBarycenter.y})`}
      >
        <circle
          className="hourglass-binary-orbit"
          data-orbit="hourglass-binary"
          r={29}
          aria-hidden="true"
        />
        <defs>
          <linearGradient
            ref={gradientRef}
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={initialCurve.start.x}
            y1={initialCurve.start.y}
            x2={initialCurve.end.x}
            y2={initialCurve.end.y}
          >
            <stop offset="0" className="sand-gradient sand-gradient--source" />
            <stop offset=".55" className="sand-gradient sand-gradient--middle" />
            <stop offset="1" className="sand-gradient sand-gradient--destination" />
          </linearGradient>
          <clipPath id={ashClipId}><circle r={BASE_RADIUS} /></clipPath>
          <clipPath id={emberClipId}><circle r={BASE_RADIUS} /></clipPath>
        </defs>
        <g className="sand-transfer" aria-hidden="true">
          <path
            ref={streamRef}
            className="sand-stream"
            data-sand-stream="ash-twin-to-ember-twin"
            d={curvePath(initialCurve)}
            stroke={`url(#${gradientId})`}
          />
          {Array.from({ length: GRAIN_COUNT }, (_, index) => {
            const grainPoint = pointOnCurve(initialCurve, grainProgress(0, index));
            return (
              <circle
                key={index}
                ref={(node) => { grainRefs.current[index] = node; }}
                className="sand-grain"
                cx={grainPoint.x}
                cy={grainPoint.y}
                r={index % 2 === 0 ? 1.25 : 0.8}
              />
            );
          })}
        </g>
        <TwinEntity
          body={ashTwin}
          variant="ash"
          selected={selectedId === ashTwin.id}
          hovered={hoveredId === ashTwin.id}
          hitRadius={hitRadii.ash}
          visualScale={initialState.firstRadius / BASE_RADIUS}
          clipId={ashClipId}
          position={initialState.firstPosition}
          positionRef={ashPositionRef}
          visualRef={ashVisualRef}
          onActivate={onActivate}
          labelFontSize={labelFontSize}
        />
        <TwinEntity
          body={emberTwin}
          variant="ember"
          selected={selectedId === emberTwin.id}
          hovered={hoveredId === emberTwin.id}
          hitRadius={hitRadii.ember}
          visualScale={initialState.secondRadius / BASE_RADIUS}
          clipId={emberClipId}
          position={initialState.secondPosition}
          positionRef={emberPositionRef}
          visualRef={emberVisualRef}
          onActivate={onActivate}
          labelFontSize={labelFontSize}
        />
      </g>
    );
  },
);
