import {
  forwardRef,
  useId,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import type { BodyId, CelestialBody as CelestialBodyRecord } from '../data/celestialBodies';
import type { SelectableActivationSource } from '../lib/selectableTargets';
import type { Point } from '../types/celestial';

export type ActivationSource = SelectableActivationSource;

type CelestialBodyProps = Readonly<{
  body: CelestialBodyRecord;
  selected: boolean;
  hovered?: boolean;
  onActivate: (id: BodyId, source: ActivationSource, clientPoint?: Point) => void;
  compact?: boolean;
  idPrefix?: string | undefined;
  hitRadius?: number | undefined;
  labelFontSize?: number | undefined;
}>;

export const BODY_VISUAL_RADII: Readonly<Record<BodyId, number>> = {
  sun: 43,
  'hourglass-twins': 0,
  'timber-hearth': 19,
  attlerock: 8,
  'brittle-hollow': 23,
  'hollows-lantern': 9,
  'giants-deep': 28,
  'ash-twin': 18,
  'ember-twin': 18,
  'dark-bramble': 26,
  interloper: 12,
  'quantum-moon': 10,
};

export const BODY_HIT_RADII: Readonly<Record<BodyId, number>> = {
  sun: 56,
  'hourglass-twins': 64,
  'timber-hearth': 30,
  attlerock: 23,
  'brittle-hollow': 32,
  'hollows-lantern': 23,
  'giants-deep': 37,
  'ash-twin': 30,
  'ember-twin': 30,
  'dark-bramble': 35,
  interloper: 23,
  'quantum-moon': 23,
};

type CelestialHitAreaProps = Readonly<{
  body: CelestialBodyRecord;
  radius: number;
  onActivate: (id: BodyId, source: ActivationSource, clientPoint?: Point) => void;
  onHoverChange: (id: BodyId | null, clientPoint?: Point) => void;
}>;

export function CelestialHitArea({ body, radius, onActivate, onHoverChange }: CelestialHitAreaProps) {
  const onClick = (event: MouseEvent<SVGCircleElement>) => {
    onActivate(body.id, 'hit-area', { x: event.clientX, y: event.clientY });
  };
  const onPointerHover = (event: PointerEvent<SVGCircleElement>) => {
    onHoverChange(body.id, { x: event.clientX, y: event.clientY });
  };

  return (
    <circle
      className="body-hit-area"
      data-hit-body-id={body.id}
      r={radius}
      aria-hidden="true"
      style={{ cursor: 'pointer' }}
      onClick={onClick}
      onPointerEnter={onPointerHover}
      onPointerMove={onPointerHover}
      onPointerLeave={() => onHoverChange(null)}
    />
  );
}

function BodyArtwork({ id, radius, idPrefix }: Readonly<{ id: BodyId; radius: number; idPrefix: string }>) {
  const clipId = `${idPrefix}-clip`;

  if (id === 'sun') {
    return (
      <g className="sun-art">
        <circle className="sun-corona sun-corona--outer" r={radius + 19} />
        <circle className="sun-corona sun-corona--inner" r={radius + 10} />
        <circle className="sun-surface" r={radius} />
        <path className="sun-current" d="M-31,-8 C-15,-20 3,-17 29,-29 M-35,12 C-10,1 8,10 34,-2 M-24,28 C-5,19 13,25 27,15" />
        <circle className="sun-flare" cx="-12" cy="-18" r="4" />
        <circle className="sun-flare" cx="19" cy="13" r="3" />
      </g>
    );
  }

  return (
    <g className={`body-art body-art--${id}`}>
      <defs>
        <clipPath id={clipId}><circle r={radius} /></clipPath>
      </defs>
      {(id === 'timber-hearth' || id === 'giants-deep') && (
        <circle className="body-atmosphere" r={radius + 3.5} />
      )}
      <circle className="body-sphere" r={radius} />
      <g clipPath={`url(#${clipId})`}>
        {id === 'timber-hearth' && (
          <>
            <path className="terrain terrain--water" d="M-24,-5 C-9,-13 -2,-3 10,-8 C19,-12 24,-3 27,5 L27,25 L-27,25 Z" />
            <path className="terrain terrain--land" d="M-24,-2 C-14,-12 -6,-7 -4,1 C-1,10 10,4 15,10 C20,15 11,23 3,23 L-24,23 Z" />
            <path className="terrain terrain--river" d="M-8,-8 C-10,1 3,5 -2,17" />
            <circle className="terrain terrain--crater" cx="8" cy="-8" r="4.2" />
          </>
        )}
        {id === 'attlerock' && (
          <>
            <circle className="moon-crater" cx="-3" cy="-2" r="2.2" />
            <circle className="moon-crater" cx="3" cy="3" r="1.5" />
          </>
        )}
        {id === 'brittle-hollow' && (
          <>
            <circle className="brittle-core" r={radius * 0.48} />
            <path className="brittle-crack" d="M-21,-7 L-9,-4 L-4,5 L-13,18 M7,-21 L5,-9 L13,-2 L8,13 L18,20 M-18,-15 L-8,-9 L2,-13" />
          </>
        )}
        {id === 'hollows-lantern' && (
          <>
            <path className="lava-field" d="M-10,-5 L-2,-9 L3,-2 L10,-5 L12,4 L5,9 L-3,6 L-9,10 Z" />
            <path className="lava-channel" d="M-7,-7 L-2,0 L-5,8 M5,-8 L2,0 L8,5" />
          </>
        )}
        {id === 'giants-deep' && (
          <>
            <path className="storm-band storm-band--one" d="M-32,-14 C-14,-20 11,-7 33,-14 L33,-5 C13,1 -12,-10 -32,-3 Z" />
            <path className="storm-band storm-band--two" d="M-32,5 C-8,-2 10,13 33,4 L33,14 C11,22 -10,8 -32,16 Z" />
            <path className="storm-vortex" d="M-12,3 C-6,-5 8,-4 11,3 C14,10 4,15 -5,11 C-11,8 -7,2 0,3 C5,4 5,8 1,9" />
          </>
        )}
        {id === 'dark-bramble' && (
          <>
            <circle className="bramble-fog" cx="5" cy="-3" r={radius * 0.72} />
            <path className="bramble-fracture" d="M-25,-9 L-8,-5 L2,4 L18,1 L27,10 M-17,21 L-8,7 L-14,-7 M8,-25 L5,-9 L15,-1 L12,18" />
          </>
        )}
      </g>
      {id === 'dark-bramble' && (
        <g className="bramble-thorns">
          <path d="M-18,-19 L-28,-31 L-23,-20 M18,-18 L30,-27 L23,-15 M-25,8 L-38,14 L-25,14 M23,13 L36,20 L22,20 M-5,25 L-10,38 L1,27" />
        </g>
      )}
      <path className="body-shadow" d={`M0,-${radius} A${radius},${radius} 0 0 1 0,${radius} A${radius * 0.72},${radius} 0 0 0 0,-${radius} Z`} />
      <circle className="body-rim" r={radius} />
    </g>
  );
}

export const CelestialBody = forwardRef<SVGGElement, CelestialBodyProps>(function CelestialBody(
  { body, selected, hovered = false, onActivate, compact = false, idPrefix, hitRadius, labelFontSize },
  ref,
) {
  const reactId = useId();
  const definitionPrefix = idPrefix ?? `body-${body.id}-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const radius = BODY_VISUAL_RADII[body.id];
  const resolvedHitRadius = hitRadius ?? BODY_HIT_RADII[body.id];
  const labelOffset = Math.max(compact ? 9 : 20, (labelFontSize ?? 10) * 0.9);
  const labelY = compact ? -radius - labelOffset : radius + labelOffset;

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onActivate(body.id, 'keyboard');
  };

  return (
    <g
      ref={ref}
      className={`celestial-entity${selected ? ' celestial-entity--selected' : ''}${hovered ? ' celestial-entity--hovered' : ''}`}
      data-body-id={body.id}
      role="button"
      tabIndex={0}
      aria-label={`${body.name}, ${body.classification}`}
      aria-pressed={selected}
      onKeyDown={onKeyDown}
    >
      <g className="body-visual" pointerEvents="none">
        <BodyArtwork id={body.id} radius={radius} idPrefix={definitionPrefix} />
      </g>
      <text
        className="body-label"
        y={labelY}
        textAnchor="middle"
        style={labelFontSize === undefined ? undefined : { fontSize: labelFontSize }}
        onClick={(event) => onActivate(body.id, 'label', { x: event.clientX, y: event.clientY })}
      >
        {body.name}
      </text>
    </g>
  );
});
