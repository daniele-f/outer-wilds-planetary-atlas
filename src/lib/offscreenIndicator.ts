import type { Point } from '../types/celestial';

export type OffscreenBounds = Readonly<{
  width: number;
  height: number;
  rightInset?: number;
  bottomInset?: number;
  margin?: number;
}>;

export type OffscreenIndicatorPlacement = Readonly<{
  x: number;
  y: number;
  angle: number;
  label: string;
}>;

/** Returns an edge-clamped indicator for a target outside the usable map area. */
export function placeOffscreenIndicator(
  target: Point,
  label: string,
  bounds: OffscreenBounds,
): OffscreenIndicatorPlacement | null {
  const margin = bounds.margin ?? 34;
  const minX = margin;
  const maxX = Math.max(minX, bounds.width - (bounds.rightInset ?? 0) - margin);
  const minY = margin;
  const maxY = Math.max(minY, bounds.height - (bounds.bottomInset ?? 0) - margin);
  if (target.x >= minX && target.x <= maxX && target.y >= minY && target.y <= maxY) return null;

  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const delta = { x: target.x - center.x, y: target.y - center.y };
  const horizontalScale = delta.x === 0 ? Number.POSITIVE_INFINITY : (delta.x > 0 ? maxX - center.x : minX - center.x) / delta.x;
  const verticalScale = delta.y === 0 ? Number.POSITIVE_INFINITY : (delta.y > 0 ? maxY - center.y : minY - center.y) / delta.y;
  const scale = Math.min(
    horizontalScale > 0 ? horizontalScale : Number.POSITIVE_INFINITY,
    verticalScale > 0 ? verticalScale : Number.POSITIVE_INFINITY,
  );
  const x = center.x + delta.x * scale;
  const y = center.y + delta.y * scale;
  return {
    x,
    y,
    angle: Math.atan2(target.y - y, target.x - x) * 180 / Math.PI + 90,
    label,
  };
}
