import { describe, expect, it } from 'vitest';
import { placeOffscreenIndicator } from './offscreenIndicator';

describe('placeOffscreenIndicator', () => {
  const bounds = { width: 1000, height: 600, margin: 30 };

  it('returns no indicator for targets in the usable viewport', () => {
    expect(placeOffscreenIndicator({ x: 500, y: 300 }, 'Timber Hearth', bounds)).toBeNull();
  });

  it('clamps an offscreen target to the correct edge and preserves its label', () => {
    const placement = placeOffscreenIndicator({ x: 1400, y: 300 }, 'Dark Bramble', bounds);
    expect(placement?.x).toBe(970);
    expect(placement?.y).toBe(300);
    expect(placement?.label).toBe('Dark Bramble');
    expect(placement?.edge).toBe('right');
  });

  it('keeps the indicator out of the side-panel inset', () => {
    const placement = placeOffscreenIndicator(
      { x: 1400, y: 300 },
      'Solar System',
      { ...bounds, rightInset: 260 },
    );
    expect(placement?.x).toBe(710);
  });
});
