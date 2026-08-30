import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getBody } from '../data/celestialBodies';
import { CelestialBody } from './CelestialBody';
import { Starfield } from './Starfield';

describe('reusable SVG definition IDs', () => {
  it('renders unique IDs and keeps every URL reference instance-scoped', () => {
    const timberHearth = getBody('timber-hearth');
    if (timberHearth === undefined) throw new Error('Timber Hearth fixture is missing.');

    const markup = renderToStaticMarkup(
      <svg>
        <CelestialBody body={timberHearth} selected={false} onActivate={() => {}} />
        <CelestialBody body={timberHearth} selected={false} onActivate={() => {}} />
        <Starfield />
        <Starfield />
      </svg>,
    );
    const ids = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const references = [...markup.matchAll(/url\(#([^\)]+)\)/g)].map((match) => match[1]);

    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(references.length).toBeGreaterThan(0);
    expect(references.every((reference) => ids.includes(reference))).toBe(true);
  });
});
