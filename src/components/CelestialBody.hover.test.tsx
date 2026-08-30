import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  getBody,
  type BodyId,
  type CelestialBody as CelestialBodyRecord,
} from '../data/celestialBodies';
import { CelestialBody, CelestialHitArea } from './CelestialBody';

function requireBody(id: BodyId): CelestialBodyRecord {
  const body = getBody(id);
  if (body === undefined) throw new Error(`Missing catalog body: ${id}`);
  return body;
}

type HitAreaPointerProps = Readonly<{
  onPointerEnter?: (event: { clientX: number; clientY: number }) => void;
  onPointerLeave?: () => void;
  style?: Readonly<{ cursor?: string }>;
}>;

describe('celestial hit-layer hover bridge', () => {
  it('emphasizes the matching visual while the real hit circle is hovered and clears on leave', () => {
    const body = requireBody('timber-hearth');
    let hoveredId: BodyId | null = null;
    let hoverPoint: Readonly<{ x: number; y: number }> | undefined;
    const hitArea = CelestialHitArea({
      body,
      radius: 30,
      onActivate: () => {},
      onHoverChange: (id: BodyId | null, clientPoint) => {
        hoveredId = id;
        hoverPoint = clientPoint;
      },
    });
    const hitAreaProps = hitArea.props as HitAreaPointerProps;

    expect(hitAreaProps.onPointerEnter).toEqual(expect.any(Function));
    expect(hitAreaProps.onPointerLeave).toEqual(expect.any(Function));
    expect(hitAreaProps.style).toMatchObject({ cursor: 'pointer' });

    hitAreaProps.onPointerEnter?.({ clientX: 80, clientY: 90 });
    expect(hoverPoint).toEqual({ x: 80, y: 90 });
    const hoveredMarkup = renderToStaticMarkup(
      <CelestialBody
        body={body}
        selected={false}
        hovered={hoveredId === body.id}
        onActivate={() => {}}
      />,
    );

    expect(hoveredMarkup).toContain('celestial-entity--hovered');
    expect(hoveredMarkup).toContain('class="body-label"');
    expect(hoveredMarkup).not.toContain('body-focus-ring');
    expect(hoveredMarkup).not.toContain('body-selection-ring');

    hitAreaProps.onPointerLeave?.();
    const restingMarkup = renderToStaticMarkup(
      <CelestialBody
        body={body}
        selected={false}
        hovered={hoveredId === body.id}
        onActivate={() => {}}
      />,
    );

    expect(restingMarkup).not.toContain('celestial-entity--hovered');
  });
});
