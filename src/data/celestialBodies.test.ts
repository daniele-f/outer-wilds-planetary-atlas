import { describe, expect, it } from 'vitest';
import { BODY_IDS, celestialBodies, getBody, NAVIGATION_BODY_IDS } from './celestialBodies';

const requiredIds = [
  'sun',
  'hourglass-twins',
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

  it('includes a composite Hourglass Twins destination before the individual twins', () => {
    expect(getBody('hourglass-twins')?.name).toBe('Hourglass Twins');
    expect(NAVIGATION_BODY_IDS.slice(0, 4)).toEqual([
      'sun', 'hourglass-twins', 'ash-twin', 'ember-twin',
    ]);
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

  it('places the planets in their correct outward order from the Sun', () => {
    const orderedPlanetIds = [
      'ash-twin',
      'timber-hearth',
      'brittle-hollow',
      'giants-deep',
      'dark-bramble',
    ] as const;
    const radii = orderedPlanetIds.map((id) => getBody(id)?.orbit?.radius);

    expect(radii.every((radius) => radius !== undefined)).toBe(true);
    for (let index = 1; index < radii.length; index += 1) {
      expect(radii[index]).toBeGreaterThan(radii[index - 1] as number);
    }
  });

  it('keeps planetary orbit periods increasing with distance from the Sun', () => {
    const orderedPlanetIds = [
      'ash-twin',
      'timber-hearth',
      'brittle-hollow',
      'giants-deep',
      'dark-bramble',
    ] as const;
    const periods = orderedPlanetIds.map((id) => getBody(id)?.orbit?.period);

    expect(periods.every((period) => period !== undefined)).toBe(true);
    for (let index = 1; index < periods.length; index += 1) {
      expect(periods[index]).toBeGreaterThan(periods[index - 1] as number);
    }
  });

  it('assigns the requested on-screen direction to planets and regular moons', () => {
    const counterclockwiseIds = [
      'ash-twin',
      'ember-twin',
      'timber-hearth',
      'attlerock',
      'brittle-hollow',
      'hollows-lantern',
      'giants-deep',
      'dark-bramble',
    ] as const;

    for (const id of counterclockwiseIds) {
      expect(getBody(id)?.orbit?.direction).toBe(-1);
    }
    expect(getBody('interloper')?.orbit?.direction ?? 1).toBe(1);
  });

  it('spaces the inner planets outward without moving Dark Bramble or the Interloper', () => {
    const twins = getBody('ash-twin')?.orbit?.radius;
    const timber = getBody('timber-hearth')?.orbit?.radius;
    const brittle = getBody('brittle-hollow')?.orbit?.radius;
    const giant = getBody('giants-deep')?.orbit?.radius;
    const darkBramble = getBody('dark-bramble')?.orbit?.radius;
    const interloper = getBody('interloper')?.orbit?.radius;

    expect(twins).toBeGreaterThanOrEqual(160);
    expect((timber as number) - (twins as number)).toBeGreaterThanOrEqual(80);
    expect((brittle as number) - (timber as number)).toBeGreaterThanOrEqual(100);
    expect((giant as number) - (brittle as number)).toBeGreaterThanOrEqual(100);
    expect(darkBramble).toBe(570);
    expect(interloper).toBe(690);
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
