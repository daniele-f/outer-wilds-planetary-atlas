import type { Camera } from './camera';
import { circularPosition, composePoint } from './orbits';
import {
  worldPointToClient,
  type Size,
  type SvgViewBox,
} from './svgViewport';
import type { WorldPositionSnapshot } from './worldPositions';
import type { Point } from '../types/celestial';

export const QUANTUM_HOSTS = [
  'timber-hearth',
  'brittle-hollow',
  'giants-deep',
  'hourglass-twins',
  'dark-bramble',
] as const;

export type QuantumHostId = (typeof QUANTUM_HOSTS)[number];

export type QuantumState = Readonly<{
  hostId: QuantumHostId;
  escapeCount: number;
  phaseEpoch: number;
  cooldownUntil: number;
  lastEscapeMovement: number | null;
}>;

export type QuantumEscapeOptions = Readonly<{
  now: number;
  simulationTime: number;
  pointerMovement: number;
  cooldown: number;
  rng?: (() => number) | undefined;
}>;

function point(x: number, y: number): Point {
  return Object.freeze({ x, y });
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Selects one eligible host, excluding the current host whenever alternatives exist. */
export function chooseQuantumHost(
  currentHost?: QuantumHostId,
  rng: () => number = Math.random,
): QuantumHostId {
  const eligible = currentHost === undefined
    ? QUANTUM_HOSTS
    : QUANTUM_HOSTS.filter((hostId) => hostId !== currentHost);
  const random = Math.min(1 - Number.EPSILON, Math.max(0, finiteOrZero(rng())));
  const chosen = eligible[Math.floor(random * eligible.length)];
  if (chosen === undefined) throw new Error('Quantum Moon has no eligible host.');
  return chosen;
}

/** Uses physical client pixels so the configured threshold is inclusive and zoom independent. */
export function isPointerNear(pointer: Point, moon: Point, radius: number): boolean {
  const threshold = Math.max(0, finiteOrZero(radius));
  return Math.hypot(pointer.x - moon.x, pointer.y - moon.y) <= threshold;
}

/** Creates the event-driven state without coupling it to React render frequency. */
export function createQuantumState(hostId: QuantumHostId, phaseEpoch: number): QuantumState {
  return Object.freeze({
    hostId,
    escapeCount: 0,
    phaseEpoch,
    cooldownUntil: Number.NEGATIVE_INFINITY,
    lastEscapeMovement: null,
  });
}

/** Guards cooldown and fresh-movement invariants for indefinite relocation. */
export function canQuantumEscape(
  state: QuantumState,
  now: number,
  pointerMovement: number,
): boolean {
  return now >= state.cooldownUntil
    && pointerMovement !== state.lastEscapeMovement;
}

/** Applies one escape atomically, including host switch, phase reset, and flicker window. */
export function attemptQuantumEscape(
  state: QuantumState,
  options: QuantumEscapeOptions,
): QuantumState {
  if (!canQuantumEscape(state, options.now, options.pointerMovement)) return state;
  const escapeCount = state.escapeCount + 1;

  return Object.freeze({
    hostId: chooseQuantumHost(state.hostId, options.rng),
    escapeCount,
    phaseEpoch: options.simulationTime,
    cooldownUntil: options.now + Math.max(0, finiteOrZero(options.cooldown)),
    lastEscapeMovement: options.pointerMovement,
  });
}

function requiredPosition(
  positions: WorldPositionSnapshot,
  hostId: Exclude<QuantumHostId, 'hourglass-twins'>,
): Point {
  const position = positions[hostId];
  if (position === undefined) throw new Error(`Missing live Quantum Moon host position: ${hostId}`);
  return position;
}

/** Reads the accepted live position registry, including the twins' actual barycenter. */
export function quantumHostPosition(
  hostId: QuantumHostId,
  positions: WorldPositionSnapshot,
): Point {
  if (hostId !== 'hourglass-twins') return requiredPosition(positions, hostId);
  const ash = positions['ash-twin'];
  const ember = positions['ember-twin'];
  if (ash === undefined || ember === undefined) {
    throw new Error('Missing live Hourglass Twins positions for Quantum Moon host.');
  }
  return point((ash.x + ember.x) / 2, (ash.y + ember.y) / 2);
}

type QuantumWorldPositionOptions = Readonly<{
  hostId: QuantumHostId;
  positions: WorldPositionSnapshot;
  simulationTime: number;
  phaseEpoch: number;
  orbitRadius: number;
  orbitPeriod: number;
}>;

/** Composes a live host position with a phase-reset local circular orbit. */
export function quantumMoonWorldPosition(options: QuantumWorldPositionOptions): Point {
  const host = quantumHostPosition(options.hostId, options.positions);
  const local = circularPosition({
    radius: options.orbitRadius,
    period: options.orbitPeriod,
  }, options.simulationTime - options.phaseEpoch);
  return composePoint(host, local);
}

type AttributeTarget = Readonly<{
  setAttribute: (name: string, value: string) => void;
}>;

type QuantumMoonFrameOptions = QuantumWorldPositionOptions & Readonly<{
  target: AttributeTarget | null;
  onPositionUpdate: (position: Point) => void;
}>;

/** Writes the same computed world position to the SVG frame and live-position consumer. */
export function renderQuantumMoonFrame(options: QuantumMoonFrameOptions): void {
  const position = quantumMoonWorldPosition(options);
  options.target?.setAttribute(
    'transform',
    `translate(${position.x.toFixed(3)} ${position.y.toFixed(3)})`,
  );
  options.onPositionUpdate(position);
}

type QuantumClientPositionOptions = QuantumWorldPositionOptions & Readonly<{
  camera: Camera;
  viewport: Size;
  viewBox: SvgViewBox;
  viewportOffset: Point;
}>;

/** Reuses the atlas' canonical camera/viewBox transform and then applies the SVG client offset. */
export function quantumMoonClientPosition(options: QuantumClientPositionOptions): Point {
  const localClient = worldPointToClient(
    quantumMoonWorldPosition(options),
    options.camera,
    options.viewport,
    options.viewBox,
  );
  return point(
    localClient.x + options.viewportOffset.x,
    localClient.y + options.viewportOffset.y,
  );
}
