import { describe, expect, it } from 'vitest';
import { hourglassTwinState } from '../lib/orbits';
import {
  renderHourglassStreamFrame,
  renderHourglassTwinsFrame,
} from './HourglassTwins';
import { renderInterloperFrame } from './Interloper';

class AttributeTarget {
  private readonly attributes = new Map<string, string>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | undefined {
    return this.attributes.get(name);
  }
}

function coordinates(target: AttributeTarget): Readonly<{ x: number; y: number }> {
  return {
    x: Number(target.getAttribute('cx')),
    y: Number(target.getAttribute('cy')),
  };
}

function controlPoint(path: string | undefined): Readonly<{ x: number; y: number }> {
  const match = path?.match(/Q(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error(`Missing quadratic control point in path: ${path}`);
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

function scale(target: AttributeTarget): number {
  const match = target.getAttribute('transform')?.match(/scale\((-?\d+\.\d+)\)/);
  if (match?.[1] === undefined) throw new Error('Missing scale transform.');
  return Number(match[1]);
}

const twinConfig = {
  separation: 58,
  binaryPeriod: 18,
  transferPeriod: 44,
  minimumRadius: 13,
  maximumRadius: 23,
} as const;

describe('HourglassTwins controllable stream frames', () => {
  it('reverses flow at the half-cycle endpoint without jumping the curve or grains', () => {
    const stream = new AttributeTarget();
    const gradient = new AttributeTarget();
    const grains = Array.from({ length: 6 }, () => new AttributeTarget());

    renderHourglassStreamFrame({
      time: 21.999,
      state: hourglassTwinState(twinConfig, 21.999),
      stream,
      gradient,
      grains,
    });
    const directionBefore = stream.getAttribute('data-sand-stream');
    const controlBefore = controlPoint(stream.getAttribute('d'));
    const grainsBefore = grains.map(coordinates);

    renderHourglassStreamFrame({
      time: 22.001,
      state: hourglassTwinState(twinConfig, 22.001),
      stream,
      gradient,
      grains,
    });
    const directionAfter = stream.getAttribute('data-sand-stream');
    const controlAfter = controlPoint(stream.getAttribute('d'));
    const grainsAfter = grains.map(coordinates);

    expect(directionBefore).toBe('ash-twin-to-ember-twin');
    expect(directionAfter).toBe('ember-twin-to-ash-twin');
    expect(Math.hypot(
      controlAfter.x - controlBefore.x,
      controlAfter.y - controlBefore.y,
    )).toBeLessThan(0.1);
    grainsAfter.forEach((grain, index) => {
      const before = grainsBefore[index];
      if (before === undefined) throw new Error(`Missing grain fixture ${index}`);
      expect(Math.hypot(grain.x - before.x, grain.y - before.y)).toBeLessThan(0.1);
    });
  });

  it('moves both twins, updates opposite apparent sizes, and reports distinct world positions', () => {
    const barycenter = new AttributeTarget();
    const ashPosition = new AttributeTarget();
    const emberPosition = new AttributeTarget();
    const ashVisual = new AttributeTarget();
    const emberVisual = new AttributeTarget();
    const stream = new AttributeTarget();
    const gradient = new AttributeTarget();
    const grains = Array.from({ length: 6 }, () => new AttributeTarget());
    const updates: Array<Readonly<{ id: string; x: number; y: number }>> = [];
    const targets = {
      barycenter,
      ashPosition,
      emberPosition,
      ashVisual,
      emberVisual,
      stream,
      gradient,
      grains,
    } as const;
    const sharedOrbit = { radius: 455, period: 92, phase: 3.8 } as const;

    renderHourglassTwinsFrame({
      time: 5,
      sharedOrbit,
      ashId: 'ash-twin',
      emberId: 'ember-twin',
      targets,
      onPositionUpdate: (id, position) => updates.push({ id, ...position }),
    });
    const ashTransformAtFive = ashPosition.getAttribute('transform');
    const emberTransformAtFive = emberPosition.getAttribute('transform');
    const ashScaleAtFive = scale(ashVisual);
    const emberScaleAtFive = scale(emberVisual);

    renderHourglassTwinsFrame({
      time: 10,
      sharedOrbit,
      ashId: 'ash-twin',
      emberId: 'ember-twin',
      targets,
      onPositionUpdate: (id, position) => updates.push({ id, ...position }),
    });
    const ashScaleAtTen = scale(ashVisual);
    const emberScaleAtTen = scale(emberVisual);

    expect(ashPosition.getAttribute('transform')).not.toBe(ashTransformAtFive);
    expect(emberPosition.getAttribute('transform')).not.toBe(emberTransformAtFive);
    expect(ashScaleAtTen).toBeLessThan(ashScaleAtFive);
    expect(emberScaleAtTen).toBeGreaterThan(emberScaleAtFive);
    expect(ashScaleAtTen + emberScaleAtTen).toBeCloseTo(2, 4);
    expect(updates).toHaveLength(4);
    expect(updates[2]?.id).toBe('ash-twin');
    expect(updates[3]?.id).toBe('ember-twin');
    expect(updates[2]?.x).not.toBeCloseTo(updates[3]?.x ?? 0, 6);
    expect(updates[2]?.y).not.toBeCloseTo(updates[3]?.y ?? 0, 6);
  });

  it('preserves transfer and size updates but stops decorative grains for reduced motion', () => {
    const barycenter = new AttributeTarget();
    const ashPosition = new AttributeTarget();
    const emberPosition = new AttributeTarget();
    const ashVisual = new AttributeTarget();
    const emberVisual = new AttributeTarget();
    const stream = new AttributeTarget();
    const gradient = new AttributeTarget();
    const grains = Array.from({ length: 6 }, () => new AttributeTarget());
    const targets = {
      barycenter,
      ashPosition,
      emberPosition,
      ashVisual,
      emberVisual,
      stream,
      gradient,
      grains,
    } as const;
    const frame = {
      sharedOrbit: { radius: 455, period: 92, phase: 3.8 },
      ashId: 'ash-twin' as const,
      emberId: 'ember-twin' as const,
      targets,
      onPositionUpdate: () => {},
    } as const;

    renderHourglassTwinsFrame({ ...frame, time: 5 });
    const grainsBefore = grains.map(coordinates);
    const ashTransformBefore = ashPosition.getAttribute('transform');
    const ashScaleBefore = scale(ashVisual);
    const streamBefore = stream.getAttribute('d');

    renderHourglassTwinsFrame({ ...frame, time: 10, reducedMotion: true });

    expect(grains.map(coordinates)).toEqual(grainsBefore);
    expect(ashPosition.getAttribute('transform')).not.toBe(ashTransformBefore);
    expect(scale(ashVisual)).not.toBe(ashScaleBefore);
    expect(stream.getAttribute('d')).not.toBe(streamBefore);
  });
});

describe('Interloper controllable frames', () => {
  it('leaves image artwork at its fixed local flip while the wrapper follows the anti-solar direction', () => {
    const position = new AttributeTarget();
    const tail = new AttributeTarget();
    const orientation = new AttributeTarget();
    const image = new AttributeTarget();
    image.setAttribute('transform', 'rotate(180)');
    const orbit = { radius: 690, period: 160, phase: 0.25, eccentricity: 0.68 } as const;

    renderInterloperFrame({
      time: 10,
      orbit,
      bodyId: 'interloper',
      position,
      tail,
      orientation,
      image,
      onPositionUpdate: () => {},
    });

    expect(orientation.getAttribute('transform')).toMatch(/^rotate\(/);
    expect(image.getAttribute('transform')).toBe('rotate(180)');
  });

  it('updates its live position and anti-solar tail transform beyond time zero', () => {
    const position = new AttributeTarget();
    const tail = new AttributeTarget();
    const updates: Array<Readonly<{ x: number; y: number }>> = [];
    const orbit = { radius: 690, period: 160, phase: 0.25, eccentricity: 0.68 } as const;

    renderInterloperFrame({
      time: 5,
      orbit,
      bodyId: 'interloper',
      position,
      tail,
      onPositionUpdate: (_id, point) => updates.push(point),
    });
    const positionAtFive = position.getAttribute('transform');
    const tailAtFive = tail.getAttribute('transform');

    renderInterloperFrame({
      time: 10,
      orbit,
      bodyId: 'interloper',
      position,
      tail,
      onPositionUpdate: (_id, point) => updates.push(point),
    });
    const latest = updates[1];
    if (latest === undefined) throw new Error('Missing live Interloper position.');
    const rotation = Number(tail.getAttribute('transform')?.match(/rotate\((-?\d+\.\d+)\)/)?.[1]);
    const expectedRotation = Math.atan2(latest.y, latest.x) * 180 / Math.PI;

    expect(position.getAttribute('transform')).not.toBe(positionAtFive);
    expect(tail.getAttribute('transform')).not.toBe(tailAtFive);
    expect(updates).toHaveLength(2);
    expect(rotation).toBeCloseTo(expectedRotation, 2);
  });
});
