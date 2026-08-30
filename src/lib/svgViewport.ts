import type { Point } from '../types/celestial';
import { screenToWorld, worldToScreen, type Camera } from './camera';

export type Size = Readonly<{ width: number; height: number }>;
export type SvgViewBox = Readonly<{ x: number; y: number; width: number; height: number }>;

export const ATLAS_VIEW_BOX: SvgViewBox = Object.freeze({
  x: -720,
  y: -430,
  width: 1_440,
  height: 860,
});

function point(x: number, y: number): Point {
  return Object.freeze({ x, y });
}

/** Returns CSS pixels per SVG user unit for xMidYMid meet rendering. */
export function svgViewportScale(viewport: Size, viewBox: SvgViewBox): number {
  if (viewport.width <= 0 || viewport.height <= 0) return 1;
  return Math.min(viewport.width / viewBox.width, viewport.height / viewBox.height);
}

/** Converts a CSS-local client point into the centred SVG coordinate space. */
export function clientPointToSvg(clientPoint: Point, viewport: Size, viewBox: SvgViewBox): Point {
  const scale = svgViewportScale(viewport, viewBox);
  const horizontalInset = (viewport.width - viewBox.width * scale) / 2;
  const verticalInset = (viewport.height - viewBox.height * scale) / 2;
  return point(
    viewBox.x + (clientPoint.x - horizontalInset) / scale,
    viewBox.y + (clientPoint.y - verticalInset) / scale,
  );
}

/** Converts a centred SVG coordinate into CSS-local client space. */
export function svgPointToClient(svgPoint: Point, viewport: Size, viewBox: SvgViewBox): Point {
  const scale = svgViewportScale(viewport, viewBox);
  const horizontalInset = (viewport.width - viewBox.width * scale) / 2;
  const verticalInset = (viewport.height - viewBox.height * scale) / 2;
  return point(
    horizontalInset + (svgPoint.x - viewBox.x) * scale,
    verticalInset + (svgPoint.y - viewBox.y) * scale,
  );
}

/** Composes CSS-local client, SVG viewport, and camera transforms into world space. */
export function clientPointToWorld(
  clientPoint: Point,
  camera: Camera,
  viewport: Size,
  viewBox: SvgViewBox,
): Point {
  return screenToWorld(clientPointToSvg(clientPoint, viewport, viewBox), camera);
}

/** Composes camera and SVG viewport transforms into CSS-local client space. */
export function worldPointToClient(
  worldPoint: Point,
  camera: Camera,
  viewport: Size,
  viewBox: SvgViewBox,
): Point {
  return svgPointToClient(worldToScreen(worldPoint, camera), viewport, viewBox);
}

type HitRadiusOptions = Readonly<{
  minimumPixels: number;
  visualRadius: number;
  visualPadding: number;
  cameraScale: number;
  viewport: Size;
  viewBox: SvgViewBox;
}>;

/** Returns a world-space hit radius with a stable minimum physical size. */
export function hitRadiusForMinimumPixels(options: HitRadiusOptions): number {
  const composedScale = Math.max(
    Number.EPSILON,
    Math.abs(options.cameraScale) * svgViewportScale(options.viewport, options.viewBox),
  );
  return Math.max(
    options.visualRadius + options.visualPadding,
    options.minimumPixels / composedScale,
  );
}

type LabelFontSizeOptions = Readonly<{
  minimumPixels: number;
  cameraScale: number;
  viewport: Size;
  viewBox: SvgViewBox;
}>;

/** Returns an SVG font size that preserves a readable client-pixel height through zoom. */
export function labelFontSizeForMinimumPixels(options: LabelFontSizeOptions): number {
  const composedScale = Math.max(
    Number.EPSILON,
    Math.abs(options.cameraScale) * svgViewportScale(options.viewport, options.viewBox),
  );
  return options.minimumPixels / composedScale;
}
