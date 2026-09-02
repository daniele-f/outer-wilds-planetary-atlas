import {
  forwardRef,
  useContext,
  useCallback,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import type { BodyId, CelestialBody as CelestialBodyRecord } from '../data/celestialBodies';
import { cometOrbitState } from '../lib/orbits';
import type { OrbitConfig, Point } from '../types/celestial';
import type { ActivationSource } from './CelestialBody';
import { IMAGE_ARTWORK_SCALE, ImageArtworkContext, imageAssetUrl } from './CelestialBody';

export type InterloperHandle = Readonly<{
  renderAtTime: (time: number) => void;
}>;

type AttributeTarget = Readonly<{
  setAttribute: (name: string, value: string) => void;
}>;

type InterloperFrame = Readonly<{
  time: number;
  orbit: OrbitConfig;
  bodyId: BodyId;
  position: AttributeTarget | null;
  tail: AttributeTarget | null;
  /** Image artwork is locally flipped once in JSX; frame updates must not rotate it again. */
  image?: AttributeTarget | null;
  orientation?: AttributeTarget | null;
  onPositionUpdate: (id: BodyId, position: Point) => void;
}>;

/** Applies one live eccentric position and anti-solar tail frame to the component refs. */
export function renderInterloperFrame({
  time,
  orbit,
  bodyId,
  position,
  tail,
  orientation,
  onPositionUpdate,
}: InterloperFrame): void {
  const state = cometOrbitState(orbit, time);
  position?.setAttribute(
    'transform',
    `translate(${state.position.x.toFixed(3)} ${state.position.y.toFixed(3)})`,
  );
  tail?.setAttribute('transform', `rotate(${state.tailRotationDegrees.toFixed(3)})`);
  orientation?.setAttribute('transform', `rotate(${state.tailRotationDegrees.toFixed(3)})`);
  onPositionUpdate(bodyId, state.position);
}

export type InterloperProps = Readonly<{
  body: CelestialBodyRecord;
  selected: boolean;
  hovered: boolean;
  hitRadius: number;
  idPrefix: string;
  onActivate: (id: BodyId, source: ActivationSource, clientPoint?: Point) => void;
  onPositionUpdate: (id: BodyId, position: Point) => void;
  labelFontSize?: number | undefined;
}>;

export const Interloper = forwardRef<InterloperHandle, InterloperProps>(function Interloper(
  { body, selected, hovered, hitRadius, idPrefix, onActivate, onPositionUpdate, labelFontSize = 10 },
  ref,
) {
  const imageArtwork = useContext(ImageArtworkContext);
  if (body.orbit === undefined) throw new Error('Interloper requires an eccentric orbit.');
  const orbit = body.orbit;
  const rootRef = useRef<SVGGElement | null>(null);
  const tailRef = useRef<SVGGElement | null>(null);
  const orientationRef = useRef<SVGGElement | null>(null);
  const initialState = cometOrbitState(orbit, 0);
  const eccentricity = orbit.eccentricity ?? 0;
  const semiMinor = orbit.radius * Math.sqrt(1 - eccentricity * eccentricity);

  const renderAtTime = useCallback((time: number) => {
    renderInterloperFrame({
      time,
      orbit,
      bodyId: body.id,
      position: rootRef.current,
      tail: tailRef.current,
      orientation: orientationRef.current,
      onPositionUpdate,
    });
  }, [body.id, onPositionUpdate, orbit]);

  useImperativeHandle(ref, () => Object.freeze({ renderAtTime }), [renderAtTime]);

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onActivate(body.id, 'keyboard');
  };
  const tailGradientId = `${idPrefix}-tail-gradient`;

  return (
    <>
      <g
        className={`atlas-eccentric-orbit${selected ? ' atlas-eccentric-orbit--selected' : ''}`}
        aria-hidden="true"
      >
        <ellipse
          className="atlas-eccentric-orbit__line"
          cx={-orbit.radius * eccentricity}
          rx={orbit.radius}
          ry={semiMinor}
        />
      </g>
      <g
        ref={rootRef}
        className={`interloper-position celestial-entity${selected ? ' celestial-entity--selected' : ''}${hovered ? ' celestial-entity--hovered' : ''}${imageArtwork ? ' interloper-position--image-artwork' : ''}`}
        data-body-id={body.id}
        role="button"
        tabIndex={0}
        aria-label={`${body.name}, ${body.classification}`}
        aria-pressed={selected}
        transform={`translate(${initialState.position.x} ${initialState.position.y})`}
        onKeyDown={onKeyDown}
      >
        <defs>
          <linearGradient id={tailGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" className="comet-tail-gradient comet-tail-gradient--nucleus" />
            <stop offset=".5" className="comet-tail-gradient comet-tail-gradient--middle" />
            <stop offset="1" className="comet-tail-gradient comet-tail-gradient--end" />
          </linearGradient>
        </defs>
        <g
          ref={tailRef}
          className="comet-tail"
          data-comet-tail="anti-solar"
          transform={`rotate(${initialState.tailRotationDegrees})`}
          aria-hidden="true"
        >
          {imageArtwork ? <image className="body-image interloper-tail-image" href={imageAssetUrl('the_interloper_tail.png')} x={-8} y={-30} width={190} height={95} preserveAspectRatio="xMidYMid meet" transform="rotate(-20)" /> : null}
          <path className="comet-tail__plume" d="M4,-7 C50,-17 118,-13 190,0 C118,13 50,17 4,7 Z" fill={`url(#${tailGradientId})`} />
          <path className="comet-tail__filament" d="M7,0 Q78,-7 166,2" />
        </g>
        <g ref={orientationRef} className="comet-orientation" pointerEvents="none" transform={`rotate(${initialState.tailRotationDegrees})`}>
        <g className="body-visual comet-visual" pointerEvents="none">
          {imageArtwork ? <image className="body-image" href={imageAssetUrl('the_interloper.png')} x={-24 * IMAGE_ARTWORK_SCALE} y={-24 * IMAGE_ARTWORK_SCALE} width={48 * IMAGE_ARTWORK_SCALE} height={48 * IMAGE_ARTWORK_SCALE} transform="rotate(180)" /> : null}
          <circle className="comet-coma comet-coma--outer" r="21" />
          <circle className="comet-coma comet-coma--inner" r="15" />
          <path className="comet-nucleus" d="M-10,-4 L-5,-10 L4,-9 L11,-2 L8,8 L-1,11 L-10,5 Z" />
          <path className="comet-ice" d="M-5,-6 L1,-7 L5,-3 L1,0 Z M-4,4 L2,2 L6,6 L-1,8 Z" />
          <path className="comet-shadow" d="M0,-10 Q12,-5 8,8 Q2,13 -2,9 Q4,2 0,-10 Z" />
          <path className="comet-rim" d="M-10,-4 L-5,-10 L4,-9 L11,-2 L8,8 L-1,11 L-10,5 Z" />
        </g>
        </g>
        <text
          className="body-label comet-label"
          y={Math.max(34, labelFontSize * 0.9)}
          textAnchor="middle"
          style={{ fontSize: labelFontSize }}
          onClick={(event: MouseEvent<SVGTextElement>) => onActivate(body.id, 'label', { x: event.clientX, y: event.clientY })}
        >
          {body.name}
        </text>
      </g>
    </>
  );
});
