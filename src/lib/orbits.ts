import type { OrbitConfig, Point } from '../types/celestial';

export type BinaryPositions = Readonly<{
  first: Point;
  second: Point;
}>;

export type SandTransfer = Readonly<{
  amount: number;
  direction: 1 | -1;
  sourceRadius: number;
  destinationRadius: number;
}>;

export type HourglassTwinConfig = Readonly<{
  separation: number;
  binaryPeriod: number;
  transferPeriod: number;
  minimumRadius: number;
  maximumRadius: number;
}>;

export type HourglassTwinState = Readonly<{
  firstPosition: Point;
  secondPosition: Point;
  firstRadius: number;
  secondRadius: number;
  direction: 1 | -1;
}>;

export type CometOrbitState = Readonly<{
  position: Point;
  distance: number;
  tail: Point;
  tailRotationDegrees: number;
}>;

const TAU = Math.PI * 2;

function point(x: number, y: number): Point {
  return Object.freeze({ x, y });
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function cycleFraction(time: number, period: number): number {
  if (period <= 0) {
    return 0;
  }

  const fraction = time / period;
  return fraction - Math.floor(fraction);
}

function phaseOf(orbit: OrbitConfig, time: number): number {
  return (orbit.phase ?? 0)
    + (orbit.direction ?? 1) * TAU * cycleFraction(time, orbit.period);
}

/** Returns a point at an orbit's radius for the supplied simulation time. */
export function circularPosition(orbit: OrbitConfig, time: number): Point {
  const angle = phaseOf(orbit, time);
  return point(orbit.radius * Math.cos(angle), orbit.radius * Math.sin(angle));
}

/** Returns an eccentric-orbit point using a solved eccentric anomaly and true anomaly. */
export function ellipticalPosition(orbit: OrbitConfig, time: number): Point {
  const eccentricity = clamp(orbit.eccentricity ?? 0, 0, 0.999999);
  const meanAnomaly = phaseOf(orbit, time);
  let eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(meanAnomaly);

  for (let iteration = 0; iteration < 6; iteration += 1) {
    eccentricAnomaly -=
      (eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
  }

  const trueAnomaly =
    2 *
    Math.atan(
      Math.sqrt((1 + eccentricity) / (1 - eccentricity)) * Math.tan(eccentricAnomaly / 2),
    );
  const radius = orbit.radius * (1 - eccentricity * Math.cos(eccentricAnomaly));

  return point(radius * Math.cos(trueAnomaly), radius * Math.sin(trueAnomaly));
}

/** Gives equal-radius points on opposing sides of a binary system's barycenter. */
export function binaryPositions(radius: number, angle: number): BinaryPositions {
  const first = point(radius * Math.cos(angle), radius * Math.sin(angle));
  const second = point(-first.x, -first.y);
  return Object.freeze({ first, second });
}

/** Models the Hourglass Twins' reversible triangular sand-transfer cycle. */
export function sandTransfer(
  fraction: number,
  minimumRadius: number,
  maximumRadius: number,
): SandTransfer {
  const clampedFraction = clamp(fraction, 0, 1);
  const direction: 1 | -1 = clampedFraction < 0.5 ? 1 : -1;
  const amount = clampedFraction <= 0.5 ? clampedFraction * 2 : (1 - clampedFraction) * 2;
  const range = maximumRadius - minimumRadius;
  const sourceRadius = maximumRadius - amount * range;
  const destinationRadius = minimumRadius + amount * range;

  return Object.freeze({ amount, direction, sourceRadius, destinationRadius });
}

/** Produces a unit comet-tail vector pointing away from the sun at the origin. */
export function tailVector(position: Point): Point {
  const length = Math.hypot(position.x, position.y);
  return length === 0 ? point(0, 0) : point(position.x / length, position.y / length);
}

/** Derives opposing local positions and reversible visual radii for the Hourglass Twins. */
export function hourglassTwinState(
  config: HourglassTwinConfig,
  time: number,
): HourglassTwinState {
  const positions = binaryPositions(
    config.separation / 2,
    TAU * cycleFraction(time, config.binaryPeriod),
  );
  const transfer = sandTransfer(
    cycleFraction(time, config.transferPeriod),
    config.minimumRadius,
    config.maximumRadius,
  );

  return Object.freeze({
    firstPosition: positions.first,
    secondPosition: positions.second,
    firstRadius: transfer.sourceRadius,
    secondRadius: transfer.destinationRadius,
    direction: transfer.direction,
  });
}

/** Derives the live eccentric position and anti-solar tail transform for a comet. */
export function cometOrbitState(orbit: OrbitConfig, time: number): CometOrbitState {
  const position = ellipticalPosition(orbit, time);
  const tail = tailVector(position);

  return Object.freeze({
    position,
    distance: Math.hypot(position.x, position.y),
    tail,
    tailRotationDegrees: Math.atan2(tail.y, tail.x) * 180 / Math.PI,
  });
}

/** Converts a child point from its host's local space into world space. */
export function composePoint(parent: Point, local: Point): Point {
  return point(parent.x + local.x, parent.y + local.y);
}
