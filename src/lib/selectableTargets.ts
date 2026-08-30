import type { BodyId } from '../data/celestialBodies';
import type { Point } from '../types/celestial';

export type SelectableActivationSource = 'hit-area' | 'keyboard' | 'label';

type Target = Readonly<{ position: Point; radius: number }>;

export type SelectableTargetRegistry = Readonly<{
  update: (id: BodyId, position: Point, radius: number) => void;
  updateRadius: (id: BodyId, radius: number) => void;
  resolve: (
    requestedId: BodyId,
    source: SelectableActivationSource,
    worldPoint?: Point,
  ) => BodyId | undefined;
}>;

/** Resolves overlapping pointer targets by nearest centre, independent of SVG paint order. */
export function createSelectableTargetRegistry(): SelectableTargetRegistry {
  const targets = new Map<BodyId, Target>();

  return {
    update: (id, position, radius) => {
      targets.set(id, {
        position: Object.freeze({ x: position.x, y: position.y }),
        radius: Math.max(0, radius),
      });
    },
    updateRadius: (id, radius) => {
      const target = targets.get(id);
      if (target === undefined) return;
      targets.set(id, { position: target.position, radius: Math.max(0, radius) });
    },
    resolve: (requestedId, source, worldPoint) => {
      if (source === 'keyboard') return requestedId;
      if (worldPoint === undefined) return undefined;

      let nearestId: BodyId | undefined;
      let nearestDistanceSquared = Number.POSITIVE_INFINITY;
      targets.forEach((target, id) => {
        const deltaX = worldPoint.x - target.position.x;
        const deltaY = worldPoint.y - target.position.y;
        const distanceSquared = deltaX * deltaX + deltaY * deltaY;
        if (distanceSquared > target.radius * target.radius) return;
        const nearer = distanceSquared < nearestDistanceSquared;
        const tiedAndEarlier =
          distanceSquared === nearestDistanceSquared &&
          (nearestId === undefined || id < nearestId);
        if (!nearer && !tiedAndEarlier) return;
        nearestId = id;
        nearestDistanceSquared = distanceSquared;
      });
      return nearestId;
    },
  };
}
