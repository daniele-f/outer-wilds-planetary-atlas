import { describe, expect, it } from 'vitest';
import {
  binaryPositions,
  circularPosition,
  cometOrbitState,
  composePoint,
  ellipticalPosition,
  hourglassTwinState,
  sandTransfer,
  tailVector,
} from './orbits';

const precision = 10;

describe('circularPosition', () => {
  it.each([
    [0, { x: 10, y: 0 }],
    [Math.PI / 2, { x: 0, y: 10 }],
    [Math.PI, { x: -10, y: 0 }],
    [(3 * Math.PI) / 2, { x: 0, y: -10 }],
  ])('places a radius-ten body at the cardinal angle %s', (phase, expected) => {
    const point = circularPosition({ radius: 10, period: 1, phase }, 0);

    expect(point.x).toBeCloseTo(expected.x, precision);
    expect(point.y).toBeCloseTo(expected.y, precision);
  });
});

describe('composePoint', () => {
  it('adds a local moon position to its moving host position', () => {
    expect(composePoint({ x: 23, y: -7 }, { x: -5, y: 11 })).toEqual({ x: 18, y: 4 });
  });
});

describe('binaryPositions', () => {
  it('places twins on opposite sides of their barycenter', () => {
    const positions = binaryPositions(8, Math.PI / 6);

    expect(positions.first.x).toBeCloseTo(6.9282032303, precision);
    expect(positions.first.y).toBeCloseTo(4, precision);
    expect(positions.second.x).toBeCloseTo(-6.9282032303, precision);
    expect(positions.second.y).toBeCloseTo(-4, precision);
  });
});

describe('sandTransfer', () => {
  it('moves sand from source to destination on the outbound half-cycle', () => {
    expect(sandTransfer(0.25, 12, 30)).toEqual({
      amount: 0.5,
      direction: 1,
      sourceRadius: 21,
      destinationRadius: 21,
    });
  });

  it('reverses the same transfer and radii on the return half-cycle', () => {
    expect(sandTransfer(0.75, 12, 30)).toEqual({
      amount: 0.5,
      direction: -1,
      sourceRadius: 21,
      destinationRadius: 21,
    });
  });

  it('clamps cycle fractions beyond both ends', () => {
    expect(sandTransfer(-2, 12, 30)).toEqual({
      amount: 0,
      direction: 1,
      sourceRadius: 30,
      destinationRadius: 12,
    });
    expect(sandTransfer(2, 12, 30)).toEqual({
      amount: 0,
      direction: -1,
      sourceRadius: 30,
      destinationRadius: 12,
    });
  });
});

describe('ellipticalPosition', () => {
  it('covers more angular distance near periapsis than near apoapsis over equal time', () => {
    const orbit = { radius: 100, period: 100, eccentricity: 0.6 };
    const nearPeriapsis = ellipticalPosition(orbit, 1);
    const nearApoapsis = ellipticalPosition(orbit, 51);

    expect(Math.abs(Math.atan2(nearPeriapsis.y, nearPeriapsis.x))).toBeGreaterThan(0.24);
    expect(Math.abs(Math.abs(Math.atan2(nearApoapsis.y, nearApoapsis.x)) - Math.PI)).toBeLessThan(0.03);
  });
});

describe('tailVector', () => {
  it('returns a unit vector that points directly away from the origin', () => {
    const tail = tailVector({ x: -3, y: 4 });

    expect(tail.x).toBeCloseTo(-0.6, precision);
    expect(tail.y).toBeCloseTo(0.8, precision);
    expect(Math.hypot(tail.x, tail.y)).toBeCloseTo(1, precision);
  });
});

describe('hourglassTwinState', () => {
  const config = {
    separation: 52,
    binaryPeriod: 20,
    transferPeriod: 40,
    minimumRadius: 12,
    maximumRadius: 30,
  } as const;

  it.each([
    [0, 30, 12, 1],
    [10, 21, 21, 1],
    [20, 12, 30, -1],
    [30, 21, 21, -1],
    [40, 30, 12, 1],
  ] as const)(
    'keeps opposite apparent radii in bounds at time %s',
    (time, expectedAshRadius, expectedEmberRadius, expectedDirection) => {
      const state = hourglassTwinState(config, time);

      expect(state.firstRadius).toBe(expectedAshRadius);
      expect(state.secondRadius).toBe(expectedEmberRadius);
      expect(state.firstRadius).toBeGreaterThanOrEqual(12);
      expect(state.firstRadius).toBeLessThanOrEqual(30);
      expect(state.secondRadius).toBeGreaterThanOrEqual(12);
      expect(state.secondRadius).toBeLessThanOrEqual(30);
      expect(state.firstRadius + state.secondRadius).toBe(42);
      expect(state.direction).toBe(expectedDirection);
    },
  );

  it.each([
    [0, { x: 26, y: 0 }, { x: -26, y: 0 }],
    [5, { x: 0, y: 26 }, { x: 0, y: -26 }],
  ] as const)('keeps local positions opposite at time %s', (time, first, second) => {
    const state = hourglassTwinState(config, time);

    expect(state.firstPosition.x).toBeCloseTo(first.x, precision);
    expect(state.firstPosition.y).toBeCloseTo(first.y, precision);
    expect(state.secondPosition.x).toBeCloseTo(second.x, precision);
    expect(state.secondPosition.y).toBeCloseTo(second.y, precision);
    expect(state.firstPosition.x + state.secondPosition.x).toBeCloseTo(0, precision);
    expect(state.firstPosition.y + state.secondPosition.y).toBeCloseTo(0, precision);
  });
});

describe('cometOrbitState', () => {
  const orbit = { radius: 600, period: 100, phase: 0, eccentricity: 0.6 } as const;

  it('reaches its hand-derived inner and outer bounds over one cycle', () => {
    const periapsis = cometOrbitState(orbit, 0);
    const apoapsis = cometOrbitState(orbit, 50);
    const nextPeriapsis = cometOrbitState(orbit, 100);

    expect(periapsis.distance).toBeCloseTo(240, precision);
    expect(apoapsis.distance).toBeCloseTo(960, precision);
    expect(nextPeriapsis.distance).toBeCloseTo(240, precision);
  });

  it('moves farther and through a larger angle near the Sun for equal time steps', () => {
    const nearStart = cometOrbitState(orbit, 0);
    const nearEnd = cometOrbitState(orbit, 1);
    const farStart = cometOrbitState(orbit, 50);
    const farEnd = cometOrbitState(orbit, 51);
    const nearLinearMovement = Math.hypot(
      nearEnd.position.x - nearStart.position.x,
      nearEnd.position.y - nearStart.position.y,
    );
    const farLinearMovement = Math.hypot(
      farEnd.position.x - farStart.position.x,
      farEnd.position.y - farStart.position.y,
    );
    const angularMovement = (start: Readonly<{ x: number; y: number }>, end: Readonly<{ x: number; y: number }>) => Math.abs(Math.atan2(
      start.x * end.y - start.y * end.x,
      start.x * end.x + start.y * end.y,
    ));
    const nearAngularMovement = angularMovement(nearStart.position, nearEnd.position);
    const farAngularMovement = angularMovement(farStart.position, farEnd.position);

    expect(nearLinearMovement).toBeGreaterThan(farLinearMovement);
    expect(nearAngularMovement).toBeGreaterThan(farAngularMovement);
  });

  it('produces an anti-solar tail transform at a hand-checked phase', () => {
    const state = cometOrbitState({ ...orbit, phase: Math.PI }, 0);
    const sunToComet = state.position;
    const dotProduct = state.tail.x * sunToComet.x + state.tail.y * sunToComet.y;

    expect(dotProduct).toBeGreaterThan(0);
    expect(Math.abs(state.tailRotationDegrees)).toBeCloseTo(180, precision);
  });
});
