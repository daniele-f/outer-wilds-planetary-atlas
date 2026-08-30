export type Point = Readonly<{
  x: number;
  y: number;
}>;

/** Direction in SVG screen space: 1 is clockwise and -1 is counterclockwise. */
export type OrbitDirection = 1 | -1;

export interface OrbitConfig {
  /** Distance from the orbit's focus, or semi-major axis for eccentric paths. */
  readonly radius: number;
  /** Duration of one full revolution in simulation seconds. */
  readonly period: number;
  /** Starting angle in radians. */
  readonly phase?: number;
  /** Direction in SVG screen space. Defaults to clockwise. */
  readonly direction?: OrbitDirection;
  /** Ellipse eccentricity, where zero is circular. */
  readonly eccentricity?: number;
}
