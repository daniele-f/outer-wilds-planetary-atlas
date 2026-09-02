import { forwardRef, useContext, type KeyboardEvent, type MouseEvent } from 'react';
import type {
  BodyId,
  CelestialBody as CelestialBodyRecord,
} from '../data/celestialBodies';
import type { QuantumHostId } from '../lib/quantum';
import type { Point } from '../types/celestial';
import { BODY_VISUAL_RADII, type ActivationSource } from './CelestialBody';
import { ImageArtworkContext, imageAssetUrl } from './CelestialBody';

export type QuantumMoonProps = Readonly<{
  body: CelestialBodyRecord;
  hostId: QuantumHostId;
  flickering: boolean;
  selected: boolean;
  hovered: boolean;
  hitRadius: number;
  idPrefix: string;
  onActivate: (id: BodyId, source: ActivationSource, clientPoint?: Point) => void;
  labelFontSize?: number | undefined;
}>;

/** Renders the moon's procedural artwork as an always-elusive relocation target. */
export const QuantumMoon = forwardRef<SVGGElement, QuantumMoonProps>(function QuantumMoon(
  {
    body,
    hostId,
    flickering,
    selected,
    hovered,
    hitRadius,
    idPrefix,
    onActivate,
    labelFontSize = 10,
  },
  ref,
) {
  const imageArtwork = useContext(ImageArtworkContext);
  const radius = BODY_VISUAL_RADII['quantum-moon'];
  const clipId = `${idPrefix}-clip`;
  const textureId = `${idPrefix}-texture`;
  const distortionId = `${idPrefix}-distortion`;
  const selectedClass = selected ? ' celestial-entity--selected' : '';
  const hoveredClass = hovered ? ' celestial-entity--hovered' : '';
  const flickerClass = flickering ? ' quantum-moon--flickering' : '';

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onActivate(body.id, 'keyboard');
  };

  return (
    <g
      ref={ref}
      className={`quantum-moon celestial-entity${selectedClass}${hoveredClass}${flickerClass}`}
      data-body-id={body.id}
      data-quantum-host={hostId}
      data-quantum-state="unstable"
      role="button"
      tabIndex={0}
      aria-label={`${body.name}, ${body.classification}, elusive`}
      aria-pressed={selected}
      onKeyDown={onKeyDown}
    >
      <defs>
        <clipPath id={clipId}><circle r={radius} /></clipPath>
        <radialGradient id={textureId} cx="35%" cy="28%" r="72%">
          <stop offset="0" className="quantum-gradient quantum-gradient--light" />
          <stop offset=".58" className="quantum-gradient quantum-gradient--middle" />
          <stop offset="1" className="quantum-gradient quantum-gradient--dark" />
        </radialGradient>
        <filter id={distortionId} x="-35%" y="-35%" width="170%" height="170%">
          <feTurbulence type="fractalNoise" baseFrequency=".055" numOctaves="2" seed="17" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.3" />
        </filter>
      </defs>
      <g className="body-visual quantum-visual" pointerEvents="none" filter={`url(#${distortionId})`}>
        {imageArtwork ? <image className="body-image" href={imageAssetUrl('quantum_moon.png')} x={-radius} y={-radius} width={radius * 2} height={radius * 2} /> : null}
        <circle className="quantum-sphere" r={radius} fill={`url(#${textureId})`} />
        <g clipPath={`url(#${clipId})`}>
          <path className="quantum-mottle quantum-mottle--one" d="M-11,-1 Q-5,-8 1,-5 T11,-7 L12,1 Q5,4 0,2 T-11,5 Z" />
          <path className="quantum-mottle quantum-mottle--two" d="M-9,7 Q-3,2 2,7 T10,5 L12,13 L-11,13 Z" />
        </g>
        <path className="quantum-shadow" d={`M0,-${radius} A${radius},${radius} 0 0 1 0,${radius} A${radius * 0.7},${radius} 0 0 0 0,-${radius} Z`} />
        <circle className="quantum-rim" r={radius} />
      </g>
      <text
        className="body-label quantum-label"
        y={radius + Math.max(18, labelFontSize * 0.9)}
        textAnchor="middle"
        style={{ fontSize: labelFontSize }}
        pointerEvents="visiblePainted"
        onClick={(event: MouseEvent<SVGTextElement>) => onActivate(
          body.id,
          'label',
          { x: event.clientX, y: event.clientY },
        )}
      >
        {body.name}
      </text>
    </g>
  );
});
