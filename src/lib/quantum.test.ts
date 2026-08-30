import { describe, expect, it } from 'vitest';
import type { Camera } from './camera';
import { ATLAS_VIEW_BOX } from './svgViewport';
import {
  QUANTUM_HOSTS,
  attemptQuantumEscape,
  chooseQuantumHost,
  createQuantumState,
  isPointerNear,
  quantumMoonClientPosition,
  quantumMoonWorldPosition,
  renderQuantumMoonFrame,
  type QuantumHostId,
} from './quantum';
import type { WorldPositionSnapshot } from './worldPositions';

function sequenceRng(...values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++] ?? values.at(-1) ?? 0;
}

const positions: WorldPositionSnapshot = {
  'timber-hearth': { x: 100, y: -40 },
  'brittle-hollow': { x: -210, y: 35 },
  'giants-deep': { x: 310, y: 75 },
  'ash-twin': { x: -30, y: 400 },
  'ember-twin': { x: 30, y: 400 },
  'dark-bramble': { x: 510, y: -120 },
};

describe('Quantum Moon host selection', () => {
  it('contains only the five eligible planetary systems', () => {
    expect(QUANTUM_HOSTS).toEqual([
      'timber-hearth',
      'brittle-hollow',
      'giants-deep',
      'hourglass-twins',
      'dark-bramble',
    ]);
  });

  it('chooses hosts deterministically from an injected random source', () => {
    expect(chooseQuantumHost(undefined, () => 0)).toBe('timber-hearth');
    expect(chooseQuantumHost(undefined, () => 0.999)).toBe('dark-bramble');
  });

  it('does not choose the current host while alternatives exist', () => {
    const choices = Array.from({ length: 8 }, (_, index) =>
      chooseQuantumHost('timber-hearth', () => index / 8),
    );

    expect(choices).not.toContain('timber-hearth');
    expect(new Set(choices).size).toBeGreaterThan(1);
  });
});

describe('Quantum Moon screen-space proximity', () => {
  it('includes the threshold boundary and rejects points beyond it', () => {
    const moon = { x: 320, y: 240 };

    expect(isPointerNear({ x: 350, y: 240 }, moon, 30)).toBe(true);
    expect(isPointerNear({ x: 350.01, y: 240 }, moon, 30)).toBe(false);
  });

  it('composes host orbit, camera, SVG scaling, and viewport offset', () => {
    const camera: Camera = { offset: { x: 25, y: -15 }, scale: 1.5 };
    const client = quantumMoonClientPosition({
      hostId: 'timber-hearth',
      positions,
      simulationTime: 8,
      phaseEpoch: 8,
      orbitRadius: 40,
      orbitPeriod: 20,
      camera,
      viewport: { width: 720, height: 430 },
      viewBox: ATLAS_VIEW_BOX,
      viewportOffset: { x: 80, y: 120 },
    });

    // At a reset phase the local point is (40, 0), so world (140, -40),
    // then camera -> (235, -75), half-scale viewBox -> (477.5, 177.5), plus offset.
    expect(client).toEqual({ x: 557.5, y: 297.5 });
    expect(isPointerNear({ x: 557.5, y: 297.5 }, client, 28)).toBe(true);
  });

  it('follows its host while retaining the same local orbital phase', () => {
    const first = quantumMoonWorldPosition({
      hostId: 'giants-deep',
      positions,
      simulationTime: 6,
      phaseEpoch: 2,
      orbitRadius: 45,
      orbitPeriod: 16,
    });
    const movedPositions: WorldPositionSnapshot = {
      ...positions,
      'giants-deep': { x: 330, y: 45 },
    };
    const moved = quantumMoonWorldPosition({
      hostId: 'giants-deep',
      positions: movedPositions,
      simulationTime: 6,
      phaseEpoch: 2,
      orbitRadius: 45,
      orbitPeriod: 16,
    });

    expect({ x: moved.x - first.x, y: moved.y - first.y }).toEqual({ x: 20, y: -30 });
  });

  it('uses the Hourglass Twins barycenter as the shared host position', () => {
    const world = quantumMoonWorldPosition({
      hostId: 'hourglass-twins',
      positions,
      simulationTime: 4,
      phaseEpoch: 4,
      orbitRadius: 50,
      orbitPeriod: 20,
    });

    expect(world).toEqual({ x: 50, y: 400 });
  });

  it('writes a controllable frame transform and reports the identical live world position', () => {
    const attributes = new Map<string, string>();
    const updates: Array<Readonly<{ x: number; y: number }>> = [];

    renderQuantumMoonFrame({
      hostId: 'dark-bramble',
      positions,
      simulationTime: 6,
      phaseEpoch: 5,
      orbitRadius: 42,
      orbitPeriod: 8,
      target: {
        setAttribute: (name, value) => attributes.set(name, value),
      },
      onPositionUpdate: (position) => updates.push(position),
    });

    expect(attributes.get('transform')).toBe('translate(539.698 -90.302)');
    expect(updates[0]?.x).toBeCloseTo(539.6984848, 6);
    expect(updates[0]?.y).toBeCloseTo(-90.3015152, 6);
  });
});

describe('Quantum Moon escape state machine', () => {
  it('blocks escape during cooldown and until a fresh pointer movement arrives', () => {
    const initial = createQuantumState('timber-hearth', 0);
    const escaped = attemptQuantumEscape(initial, {
      now: 1_000,
      simulationTime: 12,
      pointerMovement: 3,
      cooldown: 400,
      rng: () => 0,
    });

    expect(attemptQuantumEscape(escaped, {
      now: 1_399,
      simulationTime: 13,
      pointerMovement: 4,
      cooldown: 400,
      rng: () => 0,
    })).toBe(escaped);
    expect(attemptQuantumEscape(escaped, {
      now: 1_500,
      simulationTime: 13,
      pointerMovement: 3,
      cooldown: 400,
      rng: () => 0,
    })).toBe(escaped);
  });

  it('escapes while simulation time is paused and resets local phase to that time', () => {
    const initial = createQuantumState('timber-hearth', 7.5);
    const escaped = attemptQuantumEscape(initial, {
      now: 1_000,
      simulationTime: 7.5,
      pointerMovement: 1,
      cooldown: 300,
      rng: () => 0,
    });

    expect(escaped.hostId).toBe('brittle-hollow');
    expect(escaped.escapeCount).toBe(1);
    expect(escaped.phaseEpoch).toBe(7.5);
    expect(quantumMoonWorldPosition({
      hostId: escaped.hostId,
      positions,
      simulationTime: 7.5,
      phaseEpoch: escaped.phaseEpoch,
      orbitRadius: 40,
      orbitPeriod: 20,
    })).toEqual({ x: -170, y: 35 });
  });

  it('continues escaping past the former fifth-jump limit without repeating a host', () => {
    let state = createQuantumState('timber-hearth', 0);
    const rng = sequenceRng(0, 0, 0, 0, 0, 0, 0);

    for (let escape = 1; escape <= 6; escape += 1) {
      const previousHost = state.hostId;
      state = attemptQuantumEscape(state, {
        now: escape * 1_000,
        simulationTime: escape * 2,
        pointerMovement: escape,
        cooldown: 100,
        rng,
      });
      expect(state.hostId).not.toBe(previousHost);
    }

    expect(state.escapeCount).toBe(6);
  });

  it('resets phase and increments exactly once for one pointer movement', () => {
    const initial = createQuantumState('dark-bramble', 2);
    const once = attemptQuantumEscape(initial, {
      now: 2_000,
      simulationTime: 17,
      pointerMovement: 9,
      cooldown: 0,
      rng: () => 0,
    });
    const chained = attemptQuantumEscape(once, {
      now: 2_000,
      simulationTime: 17,
      pointerMovement: 9,
      cooldown: 0,
      rng: () => 0,
    });

    expect(once.escapeCount).toBe(1);
    expect(once.phaseEpoch).toBe(17);
    expect(chained).toBe(once);
  });
});

// Keeps the host union exercised as a public, finite contract.
const _eligibleHost: QuantumHostId = 'hourglass-twins';
void _eligibleHost;
