import { describe, expect, it } from 'vitest';
import { createSelectableTargetRegistry } from './selectableTargets';

describe('selectable target arbitration', () => {
  it('selects the nearer aligned planet regardless of target registration or paint order', () => {
    const forward = createSelectableTargetRegistry();
    forward.update('brittle-hollow', { x: 0, y: 0 }, 180.512820512821);
    forward.update('giants-deep', { x: 10, y: 0 }, 180.512820512821);

    const reverse = createSelectableTargetRegistry();
    reverse.update('giants-deep', { x: 10, y: 0 }, 180.512820512821);
    reverse.update('brittle-hollow', { x: 0, y: 0 }, 180.512820512821);

    expect(forward.resolve('giants-deep', 'hit-area', { x: 1, y: 0 })).toBe('brittle-hollow');
    expect(reverse.resolve('giants-deep', 'hit-area', { x: 1, y: 0 })).toBe('brittle-hollow');
  });

  it('uses a stable lexical ID tie-break for equal-distance overlapping targets', () => {
    const registry = createSelectableTargetRegistry();
    registry.update('giants-deep', { x: 10, y: 0 }, 180.512820512821);
    registry.update('brittle-hollow', { x: 0, y: 0 }, 180.512820512821);

    expect(registry.resolve('giants-deep', 'hit-area', { x: 5, y: 0 })).toBe('brittle-hollow');
  });

  it.each(['label', 'hit-area'] as const)(
    'arbitrates painted %s activation at the pointer point instead of the element paint order',
    (source) => {
      const registry = createSelectableTargetRegistry();
      registry.update('timber-hearth', { x: 0, y: 0 }, 180.512820512821);
      registry.update('attlerock', { x: 10, y: 0 }, 180.512820512821);

      expect(registry.resolve('attlerock', source, { x: 1, y: 0 })).toBe('timber-hearth');
    },
  );

  it('keeps keyboard activation bound to the named entity even when another body is nearer', () => {
    const registry = createSelectableTargetRegistry();
    registry.update('timber-hearth', { x: 0, y: 0 }, 180.512820512821);
    registry.update('attlerock', { x: 10, y: 0 }, 180.512820512821);

    expect(registry.resolve('attlerock', 'keyboard', { x: 1, y: 0 })).toBe('attlerock');
  });
});
