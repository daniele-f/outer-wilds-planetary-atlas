import { describe, expect, it } from 'vitest';
import { BODY_IDS, celestialBodies, getBody } from './celestialBodies';

const requiredIds = [
  'sun',
  'timber-hearth',
  'attlerock',
  'brittle-hollow',
  'hollows-lantern',
  'giants-deep',
  'ash-twin',
  'ember-twin',
  'dark-bramble',
  'interloper',
  'quantum-moon',
] as const;

const spoilerTerms = /eye of the universe|nomai|stranger|prisoner|ash twin project|ending/i;

describe('celestial body catalog', () => {
  it('makes every atlas entity discoverable by its stable identifier', () => {
    expect([...BODY_IDS]).toEqual(expect.arrayContaining([...requiredIds]));
    expect(BODY_IDS).toHaveLength(requiredIds.length);

    for (const id of requiredIds) {
      expect(getBody(id)?.id).toBe(id);
    }
  });

  it('does not allow duplicate IDs to make selection ambiguous', () => {
    const ids = celestialBodies.map((body) => body.id);

    expect(new Set(ids)).toHaveLength(ids.length);
  });

  it('provides complete spoiler-free travel-pamphlet copy for every body', () => {
    for (const body of celestialBodies) {
      expect(body.classification).not.toHaveLength(0);
      expect(body.type).not.toHaveLength(0);
      expect(body.tagline).toMatch(/^Go for .+, stay for .+\.$/i);
      expect(body.pitch).not.toHaveLength(0);
      expect(body.attractions.length).toBeGreaterThan(0);
      expect(body.travelTips.length).toBeGreaterThan(0);

      expect(
        [body.tagline, body.pitch, ...body.attractions, ...body.travelTips].join(' '),
      ).not.toMatch(spoilerTerms);
    }
  });

  it('only links satellites that the atlas can resolve', () => {
    const knownIds = new Set(BODY_IDS);

    for (const body of celestialBodies) {
      for (const satelliteId of body.satelliteIds) {
        expect(knownIds.has(satelliteId)).toBe(true);
      }
    }
  });

  it('gives ordinary orbiting bodies usable starting orbits', () => {
    const ordinaryOrbiters = celestialBodies.filter(
      (body) => body.id !== 'sun' && body.id !== 'quantum-moon',
    );

    for (const body of ordinaryOrbiters) {
      expect(body.orbit?.radius).toBeGreaterThan(0);
      expect(body.orbit?.period).toBeGreaterThan(0);
      expect(Number.isFinite(body.orbit?.phase)).toBe(true);
    }
  });

  it('places both Hourglass Twins on one shared barycenter orbit', () => {
    const ashOrbit = getBody('ash-twin')?.orbit;
    const emberOrbit = getBody('ember-twin')?.orbit;

    expect(ashOrbit).toBeDefined();
    expect(emberOrbit).toEqual(ashOrbit);
  });

  it('brings the Interloper inside Timber Hearth orbit at periapsis', () => {
    const interloperOrbit = getBody('interloper')?.orbit;
    const timberOrbit = getBody('timber-hearth')?.orbit;
    if (interloperOrbit === undefined || timberOrbit === undefined) {
      throw new Error('Missing orbit fixture.');
    }
    const periapsis = interloperOrbit.radius * (1 - (interloperOrbit.eccentricity ?? 0));

    expect(periapsis).toBeGreaterThan(0);
    expect(periapsis).toBeLessThan(timberOrbit.radius);
  });
});
