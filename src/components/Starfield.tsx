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
const ALT_STARS: Readonly<Record<Exclude<BackgroundPreset, 'deep-space'>, readonly Star[]>> = {
  'amber-drift': Array.from({ length: 92 }, (_, index) => ({ x: -720 + ((index * 83) % 1440), y: -430 + ((index * 137) % 860), radius: .6 + ((index * 17) % 13) / 10, opacity: .3 + ((index * 7) % 65) / 100, delay: -(index % 9) })),
  'violet-frontier': Array.from({ length: 126 }, (_, index) => ({ x: -720 + ((index * 113) % 1440), y: -430 + ((index * 71) % 860), radius: .5 + ((index * 11) % 16) / 10, opacity: .25 + ((index * 19) % 70) / 100, delay: -(index % 11) })),
  'teal-clouds': Array.from({ length: 148 }, (_, index) => ({ x: -720 + ((index * 47) % 1440), y: -430 + ((index * 173) % 860), radius: .55 + ((index * 5) % 14) / 10, opacity: .25 + ((index * 13) % 72) / 100, delay: -(index % 13) })),
};

type StarfieldProps = Readonly<{ idPrefix?: string | undefined }>;
export type BackgroundPreset = 'deep-space' | 'amber-drift' | 'violet-frontier' | 'teal-clouds';
export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = ['deep-space', 'amber-drift', 'violet-frontier', 'teal-clouds'];

const PRESET_LABELS: Record<BackgroundPreset, string> = {
  'deep-space': 'Deep Space', 'amber-drift': 'Amber Drift', 'violet-frontier': 'Violet Frontier', 'teal-clouds': 'Teal Clouds',
};

export function backgroundPresetLabel(preset: BackgroundPreset): string { return PRESET_LABELS[preset]; }

export function Starfield({ idPrefix, preset = 'deep-space' }: StarfieldProps & { preset?: BackgroundPreset } = {}) {
  const reactId = useId();
  const prefix = idPrefix ?? `starfield-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const blueGradientId = `${prefix}-nebula-blue`;
  const amberGradientId = `${prefix}-nebula-amber`;
  const softFilterId = `${prefix}-nebula-soft`;
  const stars = preset === 'deep-space' ? STARS : ALT_STARS[preset];

  return (
    <g className={`starfield starfield--${preset}`} aria-hidden="true">
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
      {preset === 'deep-space' ? <>
        <path className="nebula nebula--deep-ribbon" d="M-760 -80 C-530 -300 -250 -250 -40 -110 S380 70 760 -130 V180 C410 330 190 170 -80 40 S-480 -10 -760 190Z" fill={`url(#${blueGradientId})`} filter={`url(#${softFilterId})`} />
        <ellipse className="nebula nebula--deep-pocket" cx="-330" cy="-85" rx="300" ry="155" fill={`url(#${blueGradientId})`} filter={`url(#${softFilterId})`} />
        <ellipse className="nebula nebula--deep-pocket" cx="390" cy="165" rx="255" ry="135" fill={`url(#${amberGradientId})`} filter={`url(#${softFilterId})`} />
        <path className="nebula nebula--deep-trace" d="M-720 285 Q-350 60 0 230 T760 145" fill="none" stroke="#42698a" strokeOpacity=".09" strokeWidth="34" filter={`url(#${softFilterId})`} />
      </> : null}
      {preset === 'amber-drift' ? <g className="nebula nebula--amber-drift" filter={`url(#${softFilterId})`}><path d="M-760 250 C-420 40 -180 160 40 -40 S460 -220 760 -90 L760 170 C430 20 220 120 -10 180 S-450 410 -760 430Z" fill={`url(#${amberGradientId})`} /><path d="M-760 330 C-420 130 -230 220 30 30 S480 -140 760 -40" fill="none" stroke="#d88b4c" strokeOpacity=".16" strokeWidth="48" /></g> : null}
      {preset === 'violet-frontier' ? <g className="nebula nebula--violet-frontier" filter={`url(#${softFilterId})`}><path d="M-720 -330 Q-420 -80 -180 -210 T250 -150 T720 -300 V120 Q430 40 160 160 T-300 110 T-720 260Z" fill="#4f3976" fillOpacity=".3" /><circle cx="-360" cy="-40" r="170" fill="#a56bc4" fillOpacity=".16" /><circle cx="420" cy="160" r="220" fill="#5d76c7" fillOpacity=".14" /></g> : null}
      {preset === 'teal-clouds' ? <g className="nebula nebula--teal-clouds" filter={`url(#${softFilterId})`}><ellipse cx="-420" cy="120" rx="300" ry="100" transform="rotate(-24 -420 120)" fill="#2b9da8" fillOpacity=".2" /><ellipse cx="260" cy="-120" rx="420" ry="115" transform="rotate(18 260 -120)" fill="#286c9a" fillOpacity=".2" /><path d="M-700 -20 Q-370 -180 -40 -30 T700 -110" fill="none" stroke="#58c4c1" strokeOpacity=".12" strokeWidth="70" /></g> : null}
      {stars.map((star, index) => (
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
