import type { Point } from '../types/celestial';

/** The exact client-pixel rectangle in which an entity is considered onscreen. */
export type IndicatorWindow = Readonly<{
  left: number;
  top: number;
  right: number;
  bottom: number;
}>;

export type OffscreenIndicatorPlacement = Readonly<{
  x: number;
  y: number;
  angle: number;
  label: string;
  edge: 'left' | 'right' | 'top' | 'bottom';
}>;

/** Returns an edge-clamped indicator for a target outside the usable map area. */
export function placeOffscreenIndicator(
  target: Point,
  label: string,
  window: IndicatorWindow,
): OffscreenIndicatorPlacement | null {
  const minX = window.left;
  const maxX = Math.max(minX, window.right);
  const minY = window.top;
  const maxY = Math.max(minY, window.bottom);
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
  const edge = Math.abs(scale - horizontalScale) < 1e-6
    ? (delta.x > 0 ? 'right' : 'left')
    : (delta.y > 0 ? 'bottom' : 'top');
  return {
    x,
    y,
    angle: Math.atan2(target.y - y, target.x - x) * 180 / Math.PI + 90,
    label,
    edge,
  };
}
