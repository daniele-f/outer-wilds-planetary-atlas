import { useId } from 'react';

type Star = Readonly<{ x: number; y: number; radius: number; opacity: number; delay: number }>;

function seededValues(seed: number, count: number): readonly number[] {
  const values: number[] = [];
  let state = seed >>> 0;
  for (let index = 0; index < count; index += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    values.push(state / 4_294_967_296);
  }
  return values;
}

const random = seededValues(0x4f575641, 540);
const STARS: readonly Star[] = Array.from({ length: 108 }, (_, index) => ({
  x: -720 + random[index * 5]! * 1_440,
  y: -430 + random[index * 5 + 1]! * 860,
  radius: 0.55 + random[index * 5 + 2]! * 1.45,
  opacity: 0.28 + random[index * 5 + 3]! * 0.67,
  delay: random[index * 5 + 4]! * -7,
}));

type StarfieldProps = Readonly<{ idPrefix?: string | undefined }>;

export function Starfield({ idPrefix }: StarfieldProps = {}) {
  const reactId = useId();
  const prefix = idPrefix ?? `starfield-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const blueGradientId = `${prefix}-nebula-blue`;
  const amberGradientId = `${prefix}-nebula-amber`;
  const softFilterId = `${prefix}-nebula-soft`;

  return (
    <g className="starfield" aria-hidden="true">
      <defs>
        <radialGradient id={blueGradientId}>
          <stop offset="0" stopColor="#294b72" stopOpacity=".24" />
          <stop offset=".55" stopColor="#162d4e" stopOpacity=".1" />
          <stop offset="1" stopColor="#08101f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={amberGradientId}>
          <stop offset="0" stopColor="#895a38" stopOpacity=".14" />
          <stop offset="1" stopColor="#1c1730" stopOpacity="0" />
        </radialGradient>
        <filter id={softFilterId}><feGaussianBlur stdDeviation="24" /></filter>
      </defs>
      <ellipse className="nebula" cx="-310" cy="-95" rx="360" ry="210" fill={`url(#${blueGradientId})`} filter={`url(#${softFilterId})`} />
      <ellipse className="nebula" cx="390" cy="165" rx="300" ry="180" fill={`url(#${amberGradientId})`} filter={`url(#${softFilterId})`} />
      {STARS.map((star, index) => (
        <circle
          key={index}
          className="atlas-star"
          cx={star.x}
          cy={star.y}
          r={star.radius}
          opacity={star.opacity}
          style={{ animationDelay: `${star.delay}s` }}
        />
      ))}
    </g>
  );
}
