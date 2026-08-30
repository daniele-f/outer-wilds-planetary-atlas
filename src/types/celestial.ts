export type Point = Readonly<{
  x: number;
  y: number;
}>;

export interface OrbitConfig {
  /** Distance from the orbit's focus, or semi-major axis for eccentric paths. */
  readonly radius: number;
  /** Duration of one full revolution in simulation seconds. */
  readonly period: number;
  /** Starting angle in radians. */
  readonly phase?: number;
  /** Ellipse eccentricity, where zero is circular. */
  readonly eccentricity?: number;
}
