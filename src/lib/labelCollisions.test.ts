// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { applyLabelCollisionOffsets, resolveLabelCollisions, syncForegroundLabels } from './labelCollisions';

describe('resolveLabelCollisions', () => {
  it('moves two overlapping labels equally apart until both are legible', () => {
    const offsets = resolveLabelCollisions([
      { id: 'timber-hearth', left: 100, top: 100, width: 70, height: 18 },
      { id: 'attlerock', left: 100, top: 110, width: 70, height: 18 },
    ]);

    expect(offsets).toEqual({
      'timber-hearth': { x: 0, y: -6 },
      attlerock: { x: 0, y: 6 },
    });
  });

  it('applies the resolved offsets to overlapping SVG label elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
    const createLabel = (top: number) => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.classList.add('body-label', 'body-label--foreground');
      Object.assign(group, { getScreenCTM: () => matrix });
      Object.assign(label, { getBBox: () => ({ x: 100, y: top, width: 70, height: 18 }) });
      group.append(label);
      svg.append(group);
      return label;
    };
    const first = createLabel(100);
    const second = createLabel(110);
    document.body.append(svg);

    applyLabelCollisionOffsets(svg);

    expect(first.style.transform).toBe('translate(0px, -6px)');
    expect(second.style.transform).toBe('translate(0px, 6px)');
  });

  it('mirrors entity labels into a final foreground layer', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const entity = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    entity.dataset.bodyId = 'timber-hearth';
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.classList.add('body-label');
    label.textContent = 'Timber Hearth';
    label.setAttribute('y', '42');
    Object.assign(svg, { getScreenCTM: () => ({ a: 2, b: 0, c: 0, d: 2, e: 100, f: 50 }) });
    Object.assign(label, { getScreenCTM: () => ({ a: 4, b: 0, c: 0, d: 4, e: 160, f: 130 }) });
    entity.append(label);
    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.classList.add('body-label-layer');
    svg.append(entity, overlay);

    syncForegroundLabels(svg, overlay);

    const foreground = overlay.querySelector<SVGTextElement>('.body-label--foreground');
    expect(foreground?.textContent).toBe('Timber Hearth');
    expect(foreground?.dataset.bodyId).toBe('timber-hearth');
    expect(foreground?.getAttribute('y')).toBe('42');
    expect(foreground?.parentElement?.getAttribute('transform')).toBe('matrix(2 0 0 2 30 40)');
    expect(svg.lastElementChild).toBe(overlay);
  });
});
