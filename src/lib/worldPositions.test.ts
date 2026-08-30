import { describe, expect, it } from 'vitest';
import { createWorldPositionRegistry } from './worldPositions';

describe('createWorldPositionRegistry', () => {
  it('returns value snapshots that stay unchanged as live positions advance', () => {
    const registry = createWorldPositionRegistry();
    const firstPosition = { x: 100, y: -20 };

    registry.update('timber-hearth', firstPosition);
    const firstSnapshot = registry.snapshot();
    firstPosition.x = 999;
    registry.update('timber-hearth', { x: 120, y: -10 });

    expect(firstSnapshot['timber-hearth']).toEqual({ x: 100, y: -20 });
    expect(registry.get('timber-hearth')).toEqual({ x: 120, y: -10 });
    expect(registry.snapshot()['timber-hearth']).toEqual({ x: 120, y: -10 });
    expect(registry.get('quantum-moon')).toBeUndefined();
  });
});
