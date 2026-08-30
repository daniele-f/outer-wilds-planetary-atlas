import type { BodyId } from '../data/celestialBodies';
import type { Point } from '../types/celestial';

export type WorldPositionSnapshot = Readonly<Partial<Record<BodyId, Point>>>;

export type WorldPositionRegistry = Readonly<{
  update: (id: BodyId, position: Point) => void;
  get: (id: BodyId) => Point | undefined;
  snapshot: () => WorldPositionSnapshot;
}>;

/** Stores live world coordinates while exposing stable value snapshots to special entities. */
export function createWorldPositionRegistry(): WorldPositionRegistry {
  const positions: Partial<Record<BodyId, Point>> = {};

  return {
    update: (id, position) => {
      positions[id] = Object.freeze({ x: position.x, y: position.y });
    },
    get: (id) => positions[id],
    snapshot: () => Object.freeze({ ...positions }),
  };
}
