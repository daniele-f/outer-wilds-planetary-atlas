import {
  act,
  createElement,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { screenToWorld } from '../lib/camera';
import { ATLAS_VIEW_BOX, clientPointToSvg } from '../lib/svgViewport';
import { useMapCamera, type MapCamera, type UseMapCameraOptions } from './useMapCamera';

type TestTarget = HTMLElement & {
  captured: Set<number>;
  released: number[];
};

const roots: Root[] = [];

class TestElement {
  readonly nodeType = 1;
  readonly nodeName: string;
  readonly tagName: string;
  readonly namespaceURI = 'http://www.w3.org/1999/xhtml';
  ownerDocument!: TestDocument;
  parentNode: TestElement | null = null;
  firstChild: TestElement | null = null;
  nextSibling: TestElement | null = null;
  readonly style = {};
  textContent = '';

  constructor(tagName: string) {
    this.nodeName = tagName.toUpperCase();
    this.tagName = this.nodeName;
  }

  addEventListener() {}
  removeEventListener() {}
  appendChild(child: TestElement) {
    child.parentNode = this;
    this.firstChild ??= child;
    return child;
  }
  insertBefore(child: TestElement) {
    return this.appendChild(child);
  }
  removeChild(child: TestElement) {
    if (this.firstChild === child) this.firstChild = null;
    child.parentNode = null;
    return child;
  }
  setAttribute() {}
  removeAttribute() {}
  getRootNode() {
    return this.ownerDocument;
  }
}

class TestDocument {
  readonly nodeType = 9;
  readonly defaultView: Window & typeof globalThis;
  readonly documentElement: TestElement;
  readonly body: TestElement;
  activeElement: TestElement | null = null;

  constructor() {
    this.defaultView = globalThis as Window & typeof globalThis;
    this.documentElement = this.createElement('html');
    this.body = this.createElement('body');
  }

  addEventListener() {}
  removeEventListener() {}
  createElement(tagName: string) {
    const element = new TestElement(tagName);
    element.ownerDocument = this;
    return element;
  }
  createTextNode(text: string) {
    const node = this.createElement('#text');
    node.textContent = text;
    return node;
  }
}

if (!('document' in globalThis)) {
  const document = new TestDocument();
  Object.assign(globalThis, {
    document,
    window: globalThis,
    HTMLElement: TestElement,
    HTMLIFrameElement: class {},
  });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function createTarget(width = 600, height = 400): TestTarget {
  const captured = new Set<number>();
  const target = {
    captured,
    released: [] as number[],
    setPointerCapture(pointerId: number) {
      captured.add(pointerId);
    },
    hasPointerCapture(pointerId: number) {
      return captured.has(pointerId);
    },
    releasePointerCapture(pointerId: number) {
      captured.delete(pointerId);
      target.released.push(pointerId);
    },
    getBoundingClientRect() {
      return { left: 10, top: 20, width, height } as DOMRect;
    },
  };
  return target as unknown as TestTarget;
}

function pointerEvent(target: TestTarget, pointerId: number, x: number, y: number): ReactPointerEvent<HTMLElement> {
  return {
    currentTarget: target,
    pointerId,
    clientX: x + 10,
    clientY: y + 20,
  } as unknown as ReactPointerEvent<HTMLElement>;
}

function wheelEvent(target: TestTarget, x: number, y: number, deltaY: number): ReactWheelEvent<HTMLElement> {
  return {
    currentTarget: target,
    clientX: x + 10,
    clientY: y + 20,
    deltaY,
    preventDefault() {},
  } as unknown as ReactWheelEvent<HTMLElement>;
}

function renderCamera(
  options: UseMapCameraOptions = {},
  target = createTarget(),
): { current: () => MapCamera; target: TestTarget } {
  let camera: MapCamera | null = null;
  const container = document.createElement('div');
  const root = createRoot(container);
  roots.push(root);

  function Harness() {
    camera = useMapCamera(options);
    return null;
  }

  act(() => root.render(createElement(Harness)));
  return {
    current: () => {
      if (camera === null) {
        throw new Error('Camera harness did not render.');
      }
      return camera;
    },
    target,
  };
}

afterEach(() => {
  while (roots.length > 0) {
    act(() => roots.pop()?.unmount());
  }
});

describe('useMapCamera pointer interactions', () => {
  it('keeps the SVG world point at the viewport center fixed when wheel zooming away from center', () => {
    const harness = renderCamera({
      mapClientPoint: (clientPoint, viewport) => clientPointToSvg(clientPoint, viewport, ATLAS_VIEW_BOX),
    });
    const clientCursor = { x: 100, y: 100 };
    const svgCenter = clientPointToSvg({ x: 300, y: 200 }, { width: 600, height: 400 }, ATLAS_VIEW_BOX);
    const worldBefore = screenToWorld(svgCenter, harness.current().camera);

    act(() => harness.current().handlers.onWheel(wheelEvent(harness.target, 100, 100, -100)));
    const worldAfter = screenToWorld(svgCenter, harness.current().camera);

    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 10);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 10);
  });

  it('continues panning from the latest pinch camera when one pointer remains', () => {
    const harness = renderCamera();

    act(() => {
      harness.current().handlers.onPointerDown(pointerEvent(harness.target, 1, 100, 100));
      harness.current().handlers.onPointerDown(pointerEvent(harness.target, 2, 200, 100));
    });
    act(() => {
      harness.current().handlers.onPointerMove(pointerEvent(harness.target, 2, 250, 100));
      harness.current().handlers.onPointerUp(pointerEvent(harness.target, 2, 250, 100));
    });
    act(() => harness.current().handlers.onPointerMove(pointerEvent(harness.target, 1, 130, 100)));

    expect(harness.current().camera).toEqual({ offset: { x: -20, y: -50 }, scale: 1.5 });
  });

  it('cleans up a pointer that loses capture so the next pointer can pan normally', () => {
    const harness = renderCamera();

    act(() => harness.current().handlers.onPointerDown(pointerEvent(harness.target, 1, 100, 100)));
    act(() => harness.current().handlers.onLostPointerCapture(pointerEvent(harness.target, 1, 100, 100)));
    act(() => harness.current().handlers.onPointerDown(pointerEvent(harness.target, 2, 20, 20)));
    act(() => harness.current().handlers.onPointerMove(pointerEvent(harness.target, 2, 60, 20)));

    expect(harness.current().camera).toEqual({ offset: { x: 40, y: 0 }, scale: 1 });
    expect(harness.target.released).toEqual([]);
  });

  it('uses CSS client pixels for drag activation in a 390x844 mapped viewport', () => {
    const target = createTarget(390, 844);
    const harness = renderCamera({
      mapClientPoint: (clientPoint, viewport) => clientPointToSvg(clientPoint, viewport, ATLAS_VIEW_BOX),
    }, target);

    act(() => harness.current().handlers.onPointerDown(pointerEvent(target, 1, 100, 100)));
    act(() => harness.current().handlers.onPointerMove(pointerEvent(target, 1, 102, 100)));
    expect(harness.current().camera).toEqual({ offset: { x: 0, y: 0 }, scale: 1 });

    act(() => harness.current().handlers.onPointerMove(pointerEvent(target, 1, 104, 100)));
    expect(harness.current().camera.offset.x).toBeCloseTo(14.769230769230717, 10);
    expect(harness.current().camera.offset.y).toBeCloseTo(0, 10);
  });

  it('continues an active drag from a rebased camera offset', () => {
    const harness = renderCamera();

    act(() => harness.current().handlers.onPointerDown(pointerEvent(harness.target, 1, 100, 100)));
    act(() => harness.current().rebaseOffset({ x: -80, y: 10 }));
    act(() => harness.current().handlers.onPointerMove(pointerEvent(harness.target, 1, 110, 100)));

    expect(harness.current().camera).toEqual({ offset: { x: -70, y: 10 }, scale: 1 });
  });
});
