import { describe, expect, it } from 'vitest';
import {
  clampZoom,
  resetCamera,
  screenToWorld,
  worldToScreen,
  zoomAtPoint,
  type Camera,
} from './camera';

const precision = 10;

describe('camera coordinate transforms', () => {
  it('round-trips a world point through screen space with translation and zoom', () => {
    const camera: Camera = { offset: { x: 317, y: -149 }, scale: 1.75 };
    const world = { x: -42.5, y: 88.25 };

    const screen = worldToScreen(world, camera);
    const restored = screenToWorld(screen, camera);

    expect(restored.x).toBeCloseTo(world.x, precision);
    expect(restored.y).toBeCloseTo(world.y, precision);
  });
});

describe('zoomAtPoint', () => {
  it('keeps the world point under the cursor fixed while scaling', () => {
    const camera: Camera = { offset: { x: 120, y: 80 }, scale: 1.2 };
    const cursor = { x: 413, y: 277 };
    const worldBefore = screenToWorld(cursor, camera);

    const zoomed = zoomAtPoint(camera, cursor, 2.1);
    const worldAfter = screenToWorld(cursor, zoomed);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, precision);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, precision);
  });
});

describe('clampZoom', () => {
  it('clamps scale exactly to the supported 0.45 to 2.8 range', () => {
    expect(clampZoom(0.1)).toBe(0.45);
    expect(clampZoom(1.25)).toBe(1.25);
    expect(clampZoom(9)).toBe(2.8);
  });
});

describe('resetCamera', () => {
  it('restores the configured initial camera', () => {
    const initial: Camera = { offset: { x: 512, y: 324 }, scale: 0.9 };

    expect(resetCamera(initial)).toEqual(initial);
  });
});
