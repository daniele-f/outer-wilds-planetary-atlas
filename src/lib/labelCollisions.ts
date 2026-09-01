import type { Point } from '../types/celestial';

export type LabelBounds = Readonly<{
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}>;

export type LabelCollisionOptions = Readonly<{
  gap?: number;
  iterations?: number;
  maxDisplacement?: number;
}>;

function clampOffset(offset: Point, maximum: number): Point {
  const length = Math.hypot(offset.x, offset.y);
  if (length <= maximum || length === 0) return offset;
  const scale = maximum / length;
  return { x: offset.x * scale, y: offset.y * scale };
}

/** Returns screen-space offsets that keep visible labels apart. */
export function resolveLabelCollisions(
  labels: readonly LabelBounds[],
  { gap = 4, iterations = 6, maxDisplacement = 32 }: LabelCollisionOptions = {},
): Readonly<Record<string, Point>> {
  const offsets: Record<string, Point> = Object.fromEntries(
    labels.map(({ id }) => [id, { x: 0, y: 0 }]),
  );

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let collisionFound = false;
    for (const [firstIndex, first] of labels.entries()) {
      const firstOffset = offsets[first.id] ?? { x: 0, y: 0 };
      for (const second of labels.slice(firstIndex + 1)) {
        const secondOffset = offsets[second.id] ?? { x: 0, y: 0 };
        const deltaX = second.left + second.width / 2 + secondOffset.x
          - (first.left + first.width / 2 + firstOffset.x);
        const deltaY = second.top + second.height / 2 + secondOffset.y
          - (first.top + first.height / 2 + firstOffset.y);
        const overlapX = (first.width + second.width) / 2 + gap - Math.abs(deltaX);
        const overlapY = (first.height + second.height) / 2 + gap - Math.abs(deltaY);
        if (overlapX <= 0 || overlapY <= 0) continue;

        collisionFound = true;
        const separateHorizontally = overlapX < overlapY;
        const delta = separateHorizontally ? deltaX : deltaY;
        const direction = delta === 0 ? (first.id.localeCompare(second.id) <= 0 ? 1 : -1) : Math.sign(delta);
        const displacement = (separateHorizontally ? overlapX : overlapY) / 2;
        const firstNext = clampOffset({
          x: firstOffset.x - (separateHorizontally ? direction * displacement : 0),
          y: firstOffset.y - (separateHorizontally ? 0 : direction * displacement),
        }, maxDisplacement);
        const secondNext = clampOffset({
          x: secondOffset.x + (separateHorizontally ? direction * displacement : 0),
          y: secondOffset.y + (separateHorizontally ? 0 : direction * displacement),
        }, maxDisplacement);
        offsets[first.id] = firstNext;
        offsets[second.id] = secondNext;
      }
    }
    if (!collisionFound) break;
  }

  return offsets;
}

type MatrixLike = Readonly<{
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}>;

function transformPoint(matrix: MatrixLike, x: number, y: number): Point {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

function screenOffsetToLocal(offset: Point, matrix: MatrixLike): Point {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < Number.EPSILON) return { x: 0, y: 0 };
  return {
    x: (matrix.d * offset.x - matrix.c * offset.y) / determinant,
    y: (-matrix.b * offset.x + matrix.a * offset.y) / determinant,
  };
}

function formatOffset(value: number): string {
  const rounded = Math.abs(value) < .0005 ? 0 : Number(value.toFixed(3));
  return `${rounded}px`;
}

/** Measures visible SVG labels in screen space and applies local SVG translations. */
export function applyLabelCollisionOffsets(root: SVGSVGElement): void {
  if (typeof root.querySelectorAll !== 'function') return;
  const labels = Array.from(root.querySelectorAll<SVGTextElement>('.body-label'));
  const measurable: Array<Readonly<{ id: string; label: SVGTextElement; matrix: MatrixLike }>> = [];
  const bounds: LabelBounds[] = [];

  labels.forEach((label, index) => {
    if (window.getComputedStyle(label).display === 'none') return;
    const parent = label.parentElement as (SVGElement & { getScreenCTM?: () => MatrixLike | null }) | null;
    if (parent === null || typeof parent.getScreenCTM !== 'function' || typeof label.getBBox !== 'function') return;
    const matrix = parent.getScreenCTM();
    if (matrix === null) return;
    try {
      const box = label.getBBox();
      const corners = [
        transformPoint(matrix, box.x, box.y),
        transformPoint(matrix, box.x + box.width, box.y),
        transformPoint(matrix, box.x, box.y + box.height),
        transformPoint(matrix, box.x + box.width, box.y + box.height),
      ];
      const left = Math.min(...corners.map(({ x }) => x));
      const right = Math.max(...corners.map(({ x }) => x));
      const top = Math.min(...corners.map(({ y }) => y));
      const bottom = Math.max(...corners.map(({ y }) => y));
      if (right <= left || bottom <= top) return;
      const id = String(index);
      bounds.push({ id, left, top, width: right - left, height: bottom - top });
      measurable.push({ id, label, matrix });
    } catch {
      // Ignore labels whose browser SVG geometry is temporarily unavailable.
    }
  });

  const offsets = resolveLabelCollisions(bounds);
  measurable.forEach(({ id, label, matrix }) => {
    const localOffset = screenOffsetToLocal(offsets[id] ?? { x: 0, y: 0 }, matrix);
    label.style.transform = `translate(${formatOffset(localOffset.x)}, ${formatOffset(localOffset.y)})`;
  });
}
