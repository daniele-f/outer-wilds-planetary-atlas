import type { OrbitConfig } from '../types/celestial';

type OrbitProps = Readonly<{
  orbit: OrbitConfig;
  selected?: boolean;
  moon?: boolean;
  hovered?: boolean;
}>;

export function Orbit({ orbit, selected = false, moon = false, hovered = false }: OrbitProps) {
  const className = [
    'atlas-orbit',
    moon ? 'atlas-orbit--moon' : '',
    selected ? 'atlas-orbit--selected' : '',
    hovered ? 'atlas-orbit--hovered' : '',
  ].filter(Boolean).join(' ');

  return (
    <g className={className} aria-hidden="true">
      <circle className="atlas-orbit__line" r={orbit.radius} />
    </g>
  );
}
