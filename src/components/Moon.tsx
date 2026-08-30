import { forwardRef } from 'react';
import type { BodyId, CelestialBody as CelestialBodyRecord } from '../data/celestialBodies';
import type { Point } from '../types/celestial';
import { CelestialBody, type ActivationSource } from './CelestialBody';
import { Orbit } from './Orbit';

type MoonProps = Readonly<{
  body: CelestialBodyRecord;
  selected: boolean;
  hovered?: boolean;
  onActivate: (id: BodyId, source: ActivationSource, clientPoint?: Point) => void;
  idPrefix?: string | undefined;
  hitRadius?: number | undefined;
  labelFontSize?: number | undefined;
}>;

export const Moon = forwardRef<SVGGElement, MoonProps>(function Moon(
  { body, selected, hovered = false, onActivate, idPrefix, hitRadius, labelFontSize },
  ref,
) {
  if (body.orbit === undefined) return null;

  return (
    <>
      <Orbit orbit={body.orbit} selected={selected} moon />
      <g ref={ref} className="moon-position">
        <CelestialBody
          body={body}
          selected={selected}
          hovered={hovered}
          onActivate={onActivate}
          compact
          idPrefix={idPrefix}
          hitRadius={hitRadius}
          labelFontSize={labelFontSize}
        />
      </g>
    </>
  );
});
