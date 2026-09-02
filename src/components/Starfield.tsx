import { useEffect, useId, useState } from 'react';

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
type StarBox = Readonly<{ x: number; y: number; width: number; height: number; anchor: number; stars: readonly Star[] }>;
const BOX_LAYOUTS: Record<BackgroundPreset, readonly Omit<StarBox, 'stars'>[]> = {
  'deep-space': [{ x: -650, y: -330, width: 250, height: 180, anchor: -2 }, { x: -355, y: -250, width: 210, height: 150, anchor: -1 }, { x: -120, y: -360, width: 240, height: 190, anchor: 0 }, { x: 155, y: -230, width: 220, height: 160, anchor: 1 }, { x: 410, y: -325, width: 250, height: 190, anchor: 2 }, { x: -520, y: 80, width: 180, height: 130, anchor: -1.5 }, { x: 300, y: 130, width: 200, height: 150, anchor: 1.5 }],
  'amber-drift': [{ x: -680, y: -300, width: 280, height: 170, anchor: -2.5 }, { x: -370, y: 90, width: 170, height: 120, anchor: -1.5 }, { x: -130, y: -350, width: 260, height: 180, anchor: 0 }, { x: 190, y: 80, width: 180, height: 130, anchor: 1.5 }, { x: 430, y: -280, width: 250, height: 180, anchor: 2.5 }],
  'violet-frontier': [{ x: -700, y: -280, width: 220, height: 150, anchor: -2.5 }, { x: -430, y: 80, width: 190, height: 120, anchor: -1.5 }, { x: -160, y: -330, width: 250, height: 170, anchor: 0 }, { x: 120, y: 95, width: 175, height: 125, anchor: 1.5 }, { x: 365, y: -300, width: 280, height: 190, anchor: 2.5 }, { x: -40, y: 230, width: 130, height: 90, anchor: 0 }],
  'teal-clouds': [{ x: -690, y: -340, width: 240, height: 160, anchor: -2.5 }, { x: -390, y: 120, width: 150, height: 100, anchor: -1.5 }, { x: -145, y: -270, width: 230, height: 170, anchor: 0 }, { x: 130, y: 160, width: 150, height: 100, anchor: 1.5 }, { x: 380, y: -300, width: 270, height: 180, anchor: 2.5 }, { x: 40, y: 20, width: 120, height: 85, anchor: 0 }],
};
function boxStars(preset: BackgroundPreset, boxIndex: number, box: Omit<StarBox, 'stars'>): readonly Star[] {
  const count = 5 + ((boxIndex * 3 + preset.length) % 8);
  return Array.from({ length: count }, (_, index) => ({ x: ((index * 47 + boxIndex * 23) % 100) / 100 * box.width, y: ((index * 71 + boxIndex * 31) % 100) / 100 * box.height, radius: .55 + ((index * 13 + boxIndex) % 12) / 10, opacity: .3 + ((index * 17 + boxIndex) % 65) / 100, delay: -((index + boxIndex) % 9) }));
}

type StarfieldProps = Readonly<{ idPrefix?: string | undefined }>;
export type BackgroundPreset = 'deep-space' | 'amber-drift' | 'violet-frontier' | 'teal-clouds';
export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = ['deep-space', 'amber-drift', 'violet-frontier', 'teal-clouds'];

const PRESET_LABELS: Record<BackgroundPreset, string> = {
  'deep-space': 'Deep Space', 'amber-drift': 'Amber Drift', 'violet-frontier': 'Violet Frontier', 'teal-clouds': 'Teal Clouds',
};

export function backgroundPresetLabel(preset: BackgroundPreset): string { return PRESET_LABELS[preset]; }

export function Starfield({ idPrefix, preset = 'deep-space', starsOnly = false }: StarfieldProps & { preset?: BackgroundPreset; starsOnly?: boolean } = {}) {
  const reactId = useId();
  const prefix = idPrefix ?? `starfield-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const blueGradientId = `${prefix}-nebula-blue`;
  const amberGradientId = `${prefix}-nebula-amber`;
  const softFilterId = `${prefix}-nebula-soft`;
  const stars = preset === 'deep-space' ? STARS : ALT_STARS[preset];
  const [viewportRatio, setViewportRatio] = useState(1.8);
  useEffect(() => {
    if (!starsOnly) return undefined;
    const update = () => setViewportRatio(window.innerWidth / Math.max(1, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [starsOnly]);
  const boxSpread = (viewportRatio - 1.67) * 170;
  const starBoxes = BOX_LAYOUTS[preset];

  return (
    <g className={preset === 'deep-space' ? 'starfield' : `starfield starfield--${preset}`} transform={starsOnly ? undefined : 'scale(1.15)'} aria-hidden="true">
      {starsOnly ? null : <rect x="-2000" y="-1200" width="4000" height="2400" fill="#070c19" />}
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
      {!starsOnly && preset === 'deep-space' ? <>
        <path className="nebula" d="M-760 -80 C-530 -300 -250 -250 -40 -110 S380 70 760 -130 V180 C410 330 190 170 -80 40 S-480 -10 -760 190Z" fill={`url(#${blueGradientId})`} filter={`url(#${softFilterId})`} />
        <ellipse className="nebula nebula--deep-pocket" cx="-330" cy="-85" rx="300" ry="155" fill={`url(#${blueGradientId})`} filter={`url(#${softFilterId})`} />
        <ellipse className="nebula nebula--deep-pocket" cx="390" cy="165" rx="255" ry="135" fill={`url(#${amberGradientId})`} filter={`url(#${softFilterId})`} />
        <path className="nebula nebula--deep-trace" d="M-720 285 Q-350 60 0 230 T760 145" fill="none" stroke="#42698a" strokeOpacity=".09" strokeWidth="34" filter={`url(#${softFilterId})`} />
      </> : null}
      {!starsOnly && preset === 'amber-drift' ? <g className="nebula nebula--amber-drift" filter={`url(#${softFilterId})`}><path d="M-760 250 C-420 40 -180 160 40 -40 S460 -220 760 -90 L760 170 C430 20 220 120 -10 180 S-450 410 -760 430Z" fill={`url(#${amberGradientId})`} /><path d="M-760 330 C-420 130 -230 220 30 30 S480 -140 760 -40" fill="none" stroke="#d88b4c" strokeOpacity=".16" strokeWidth="48" /></g> : null}
      {!starsOnly && preset === 'violet-frontier' ? <g className="nebula nebula--violet-frontier" filter={`url(#${softFilterId})`}><path d="M-1100 -330 Q-650 -80 -300 -210 T300 -150 T1100 -300 V120 Q650 40 300 160 T-500 110 T-1100 260Z" fill="#4f3976" fillOpacity=".3" /><circle cx="-360" cy="-40" r="170" fill="#a56bc4" fillOpacity=".16" /><circle cx="420" cy="160" r="220" fill="#5d76c7" fillOpacity=".14" /></g> : null}
      {!starsOnly && preset === 'teal-clouds' ? <g className="nebula nebula--teal-clouds" filter={`url(#${softFilterId})`}><ellipse cx="-420" cy="120" rx="300" ry="100" transform="rotate(-24 -420 120)" fill="#2b9da8" fillOpacity=".2" /><ellipse cx="260" cy="-120" rx="420" ry="115" transform="rotate(18 260 -120)" fill="#286c9a" fillOpacity=".2" /><path d="M-700 -20 Q-370 -180 -40 -30 T700 -110" fill="none" stroke="#58c4c1" strokeOpacity=".12" strokeWidth="70" /></g> : null}
      {starsOnly ? starBoxes.map((box, boxIndex) => <g key={boxIndex} transform={`translate(${box.x + box.anchor * boxSpread} ${box.y})`}><rect className="star-box-debug" x="0" y="0" width={box.width} height={box.height} fill="none" />{boxStars(preset, boxIndex, box).map((star, index) => (
        <circle
          key={index}
          className="atlas-star"
          cx={star.x}
          cy={star.y}
          r={star.radius}
          opacity={star.opacity}
          style={{ animationDelay: `${star.delay}s` }}
        />
      ))}</g>) : null}
    </g>
  );
}
