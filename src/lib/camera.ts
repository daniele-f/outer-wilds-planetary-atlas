import type { Point } from '../types/celestial';

export const MIN_ZOOM = 0.45;
export const MAX_ZOOM = 2.8;

export type Camera = Readonly<{
  offset: Point;
  scale: number;
}>;

function point(x: number, y: number): Point {
  return Object.freeze({ x, y });
}

/** Converts a world coordinate into its corresponding screen coordinate. */
export function worldToScreen(world: Point, camera: Camera): Point {
  return point(world.x * camera.scale + camera.offset.x, world.y * camera.scale + camera.offset.y);
}

/** Converts a screen coordinate into its corresponding world coordinate. */
export function screenToWorld(screen: Point, camera: Camera): Point {
  return point(
    (screen.x - camera.offset.x) / camera.scale,
    (screen.y - camera.offset.y) / camera.scale,
  );
}

/** Restricts a camera scale to the supported atlas zoom range. */
export function clampZoom(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** Zooms around a screen point without moving the world point beneath it. */
export function zoomAtPoint(camera: Camera, screenPoint: Point, scale: number): Camera {
  const nextScale = clampZoom(scale);
  const worldPoint = screenToWorld(screenPoint, camera);

  return Object.freeze({
    offset: point(
      screenPoint.x - worldPoint.x * nextScale,
      screenPoint.y - worldPoint.y * nextScale,
    ),
    scale: nextScale,
  });
}

/** Returns a value copy of the supplied initial camera for interaction resets. */
export function resetCamera(initialCamera: Camera): Camera {
  return Object.freeze({
    offset: point(initialCamera.offset.x, initialCamera.offset.y),
    scale: clampZoom(initialCamera.scale),
  });
}
