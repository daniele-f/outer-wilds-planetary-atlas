import { act, createRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BodyId } from '../data/celestialBodies';
import type { FrameCallback } from '../hooks/useAnimationClock';
import { ATLAS_VIEW_BOX, worldPointToClient } from '../lib/svgViewport';
import type { WorldPositionRegistry } from '../lib/worldPositions';
import type { Point } from '../types/celestial';
import { SolarSystem, type SolarSystemHandle } from './SolarSystem';

type NativeTestEvent = Record<string, unknown> & {
  type: string;
  target: TestElement;
  defaultPrevented: boolean;
};

type StoredListener = Readonly<{
  callback: EventListener;
  capture: boolean;
}>;

class TestStyle {
  [name: string]: unknown;

  setProperty(name: string, value: string): void {
    this[name] = value;
  }

  removeProperty(name: string): void {
    delete this[name];
  }
}

class TestElement {
  readonly nodeType = 1;
  readonly nodeName: string;
  readonly tagName: string;
  readonly namespaceURI: string;
  ownerDocument!: TestDocument;
  parentNode: TestElement | null = null;
  firstChild: TestElement | TestText | null = null;
  lastChild: TestElement | TestText | null = null;
  nextSibling: TestElement | TestText | null = null;
  previousSibling: TestElement | TestText | null = null;
  readonly style = new TestStyle();
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, StoredListener[]>();

  constructor(tagName: string, namespaceURI = 'http://www.w3.org/1999/xhtml') {
    this.nodeName = tagName.toUpperCase();
    this.tagName = this.nodeName;
    this.namespaceURI = namespaceURI;
  }

  get textContent(): string {
    let text = '';
    for (let child = this.firstChild; child !== null; child = child.nextSibling) {
      text += child.textContent;
    }
    return text;
  }

  set textContent(value: string) {
    this.firstChild = null;
    this.lastChild = null;
    if (value === '') return;
    const text = this.ownerDocument.createTextNode(value);
    this.appendChild(text);
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (typeof listener !== 'function') return;
    const capture = typeof options === 'boolean' ? options : options?.capture ?? false;
    const entries = this.listeners.get(type) ?? [];
    entries.push({ callback: listener, capture });
    this.listeners.set(type, entries);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void {
    if (typeof listener !== 'function') return;
    const capture = typeof options === 'boolean' ? options : options?.capture ?? false;
    const entries = this.listeners.get(type) ?? [];
    this.listeners.set(type, entries.filter((entry) =>
      entry.callback !== listener || entry.capture !== capture,
    ));
  }

  listenersFor(type: string, capture: boolean): readonly EventListener[] {
    return (this.listeners.get(type) ?? [])
      .filter((entry) => entry.capture === capture)
      .map((entry) => entry.callback);
  }

  appendChild<T extends TestElement | TestText>(child: T): T {
    child.parentNode = this;
    child.previousSibling = this.lastChild;
    child.nextSibling = null;
    if (this.lastChild !== null) this.lastChild.nextSibling = child;
    this.firstChild ??= child;
    this.lastChild = child;
    return child;
  }

  insertBefore<T extends TestElement | TestText>(child: T, before: TestElement | TestText | null): T {
    if (before === null) return this.appendChild(child);
    child.parentNode = this;
    child.nextSibling = before;
    child.previousSibling = before.previousSibling;
    if (before.previousSibling !== null) before.previousSibling.nextSibling = child;
    else this.firstChild = child;
    before.previousSibling = child;
    return child;
  }

  removeChild<T extends TestElement | TestText>(child: T): T {
    if (child.previousSibling !== null) child.previousSibling.nextSibling = child.nextSibling;
    else this.firstChild = child.nextSibling;
    if (child.nextSibling !== null) child.nextSibling.previousSibling = child.previousSibling;
    else this.lastChild = child.previousSibling;
    child.parentNode = null;
    child.nextSibling = null;
    child.previousSibling = null;
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  getAttributeNames(): string[] {
    return [...this.attributes.keys()];
  }

  closest(selector: string): TestElement | null {
    for (let current: TestElement | null = this; current !== null; current = current.parentNode) {
      if (
        selector.includes('[data-hit-body-id]')
        && (current.getAttribute('data-hit-body-id') !== null || current.getAttribute('data-body-id') !== null)
      ) return current;
    }
    return null;
  }

  getRootNode(): TestDocument {
    return this.ownerDocument;
  }

  getBoundingClientRect(): DOMRect {
    if (this.tagName === 'SVG') {
      return {
        left: 120,
        top: 70,
        width: 720,
        height: 430,
        right: 840,
        bottom: 500,
        x: 120,
        y: 70,
        toJSON: () => ({}),
      };
    }
    return {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  }

  setPointerCapture(): void {}
  hasPointerCapture(): boolean { return true; }
  releasePointerCapture(): void {}
}

class TestText {
  readonly nodeType = 3;
  readonly nodeName = '#text';
  readonly namespaceURI = null;
  ownerDocument!: TestDocument;
  parentNode: TestElement | null = null;
  nextSibling: TestElement | TestText | null = null;
  previousSibling: TestElement | TestText | null = null;

  constructor(public textContent: string) {}

  get nodeValue(): string {
    return this.textContent;
  }

  set nodeValue(value: string) {
    this.textContent = value;
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

  addEventListener(): void {}
  removeEventListener(): void {}

  createElement(tagName: string): TestElement {
    const element = new TestElement(tagName);
    element.ownerDocument = this;
    return element;
  }

  createElementNS(namespaceURI: string, tagName: string): TestElement {
    const element = new TestElement(tagName, namespaceURI);
    element.ownerDocument = this;
    return element;
  }

  createTextNode(text: string): TestText {
    const node = new TestText(text);
    node.ownerDocument = this;
    return node;
  }
}

class ControlledFrames {
  private callback: FrameCallback | null = null;

  request = (callback: FrameCallback): number => {
    this.callback = callback;
    return 1;
  };

  cancel = (): void => {
    this.callback = null;
  };

  step(timestamp: number): void {
    const callback = this.callback;
    this.callback = null;
    if (callback === null) throw new Error('No requested frame is available.');
    callback(timestamp);
  }
}

function descendants(root: TestElement): TestElement[] {
  const found: TestElement[] = [];
  for (let child = root.firstChild; child !== null; child = child.nextSibling) {
    if (!(child instanceof TestElement)) continue;
    found.push(child, ...descendants(child));
  }
  return found;
}

function findByAttribute(root: TestElement, name: string, value: string): TestElement | undefined {
  return descendants(root).find((element) => element.getAttribute(name) === value);
}

function dispatch(root: TestElement, target: TestElement, type: string, fields: Record<string, unknown>): void {
  const path: TestElement[] = [];
  for (let current: TestElement | null = target; current !== null; current = current.parentNode) {
    path.push(current);
    if (current === root) break;
  }
  const event = {
    type,
    target,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() {},
    ...fields,
  } as NativeTestEvent;
  [...path].reverse().forEach((element) => {
    element.listenersFor(type, true).forEach((listener) => listener(event as unknown as Event));
  });
  path.forEach((element) => {
    element.listenersFor(type, false).forEach((listener) => listener(event as unknown as Event));
  });
}

function clientPoint(world: Point): Point {
  const local = worldPointToClient(
    world,
    { offset: { x: 0, y: 0 }, scale: 1 },
    { width: 720, height: 430 },
    ATLAS_VIEW_BOX,
  );
  return { x: local.x + 120, y: local.y + 70 };
}

let root: Root | null = null;
let restoreGlobals: (() => void) | null = null;

afterEach(() => {
  if (root !== null) act(() => root?.unmount());
  root = null;
  restoreGlobals?.();
  restoreGlobals = null;
  vi.restoreAllMocks();
});

describe('SolarSystem Quantum Moon interaction boundary', () => {
  it('relocates on every pointer or keyboard activation without becoming directly selectable', () => {
    const originalDocument = Reflect.get(globalThis, 'document');
    const originalWindow = Reflect.get(globalThis, 'window');
    const originalElement = Reflect.get(globalThis, 'Element');
    const originalHTMLElement = Reflect.get(globalThis, 'HTMLElement');
    const originalHTMLIFrameElement = Reflect.get(globalThis, 'HTMLIFrameElement');
    const originalResizeObserver = Reflect.get(globalThis, 'ResizeObserver');
    const originalMatchMedia = Reflect.get(globalThis, 'matchMedia');
    const originalRequestAnimationFrame = Reflect.get(globalThis, 'requestAnimationFrame');
    const originalCancelAnimationFrame = Reflect.get(globalThis, 'cancelAnimationFrame');
    const document = new TestDocument();
    const frames = new ControlledFrames();
    class TestResizeObserver {
      observe(): void {}
      disconnect(): void {}
    }
    Object.assign(globalThis, {
      document,
      window: globalThis,
      Element: TestElement,
      HTMLElement: TestElement,
      HTMLIFrameElement: class {},
      ResizeObserver: TestResizeObserver,
      matchMedia: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => true,
      }),
      requestAnimationFrame: frames.request,
      cancelAnimationFrame: frames.cancel,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    restoreGlobals = () => {
      const restore = (key: string, value: unknown) => {
        if (value === undefined) Reflect.deleteProperty(globalThis, key);
        else Reflect.set(globalThis, key, value);
      };
      restore('document', originalDocument);
      restore('window', originalWindow);
      restore('Element', originalElement);
      restore('HTMLElement', originalHTMLElement);
      restore('HTMLIFrameElement', originalHTMLIFrameElement);
      restore('ResizeObserver', originalResizeObserver);
      restore('matchMedia', originalMatchMedia);
      restore('requestAnimationFrame', originalRequestAnimationFrame);
      restore('cancelAnimationFrame', originalCancelAnimationFrame);
    };

    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const selections: BodyId[] = [];
    const registryBox: { current?: WorldPositionRegistry } = {};
    const container = document.createElement('div');
    root = createRoot(container as unknown as Element);

    function MountedQuantumStatus() {
      const [status, setStatus] = useState('');
      return (
        <>
          <SolarSystem
            selectedId={null}
            onSelect={(id) => selections.push(id)}
            speed={0}
            onRegistryReady={(readyRegistry) => { registryBox.current = readyRegistry; }}
            onQuantumStatusChange={setStatus}
          />
          <p role="status" aria-live="polite" aria-atomic="true">{status}</p>
        </>
      );
    }

    act(() => root?.render(
      <MountedQuantumStatus />,
    ));
    act(() => {
      frames.step(1_000);
      frames.step(2_000);
    });

    const surface = descendants(container).find((element) =>
      element.getAttribute('class') === 'atlas-map-surface',
    );
    const registry = registryBox.current;
    if (surface === undefined || registry === undefined) throw new Error('Mounted atlas harness is incomplete.');
    const initialPosition = registry.get('quantum-moon');
    if (initialPosition === undefined) throw new Error('Missing initial Quantum Moon position.');
    const initialMoon = findByAttribute(container, 'data-body-id', 'quantum-moon');
    const hitArea = findByAttribute(container, 'data-hit-body-id', 'quantum-moon');
    if (initialMoon === undefined || hitArea === undefined) throw new Error('Missing Quantum Moon targets.');
    expect(initialMoon.getAttribute('role')).toBe('button');
    const initialHost = initialMoon.getAttribute('data-quantum-host');

    act(() => dispatch(container, hitArea, 'click', {
      clientX: 0,
      clientY: 0,
      button: 0,
    }));
    const afterClick = findByAttribute(container, 'data-body-id', 'quantum-moon');
    const clickedHost = afterClick?.getAttribute('data-quantum-host');
    expect(clickedHost).not.toBe(initialHost);
    expect(registry.get('quantum-moon')).not.toEqual(initialPosition);

    if (afterClick === undefined) throw new Error('Missing relocated Quantum Moon.');
    act(() => dispatch(container, afterClick, 'keydown', { key: 'Enter' }));
    const afterKeyboard = findByAttribute(container, 'data-body-id', 'quantum-moon');
    expect(afterKeyboard?.getAttribute('data-quantum-host')).not.toBe(clickedHost);
    expect(findByAttribute(container, 'role', 'status')?.textContent).toBe(
      'Quantum Moon jumped to a different orbit.',
    );
    expect(selections).toEqual([]);
  });

  it('keeps the camera centered on Quantum Moon after it relocates while focused', () => {
    const originalDocument = Reflect.get(globalThis, 'document');
    const originalWindow = Reflect.get(globalThis, 'window');
    const originalHTMLElement = Reflect.get(globalThis, 'HTMLElement');
    const originalHTMLIFrameElement = Reflect.get(globalThis, 'HTMLIFrameElement');
    const originalResizeObserver = Reflect.get(globalThis, 'ResizeObserver');
    const originalMatchMedia = Reflect.get(globalThis, 'matchMedia');
    const originalRequestAnimationFrame = Reflect.get(globalThis, 'requestAnimationFrame');
    const originalCancelAnimationFrame = Reflect.get(globalThis, 'cancelAnimationFrame');
    const document = new TestDocument();
    const frames = new ControlledFrames();
    class TestResizeObserver {
      observe(): void {}
      disconnect(): void {}
    }
    Object.assign(globalThis, {
      document,
      window: globalThis,
      HTMLElement: TestElement,
      HTMLIFrameElement: class {},
      ResizeObserver: TestResizeObserver,
      matchMedia: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => true,
      }),
      requestAnimationFrame: frames.request,
      cancelAnimationFrame: frames.cancel,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    restoreGlobals = () => {
      const restore = (key: string, value: unknown) => {
        if (value === undefined) Reflect.deleteProperty(globalThis, key);
        else Reflect.set(globalThis, key, value);
      };
      restore('document', originalDocument);
      restore('window', originalWindow);
      restore('HTMLElement', originalHTMLElement);
      restore('HTMLIFrameElement', originalHTMLIFrameElement);
      restore('ResizeObserver', originalResizeObserver);
      restore('matchMedia', originalMatchMedia);
      restore('requestAnimationFrame', originalRequestAnimationFrame);
      restore('cancelAnimationFrame', originalCancelAnimationFrame);
    };

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const registryBox: { current?: WorldPositionRegistry } = {};
    const systemRef = createRef<SolarSystemHandle>();
    const container = document.createElement('div');
    root = createRoot(container as unknown as Element);
    act(() => root?.render(
      <SolarSystem
        ref={systemRef}
        selectedId="quantum-moon"
        onSelect={() => {}}
        speed={0}
        onRegistryReady={(readyRegistry) => { registryBox.current = readyRegistry; }}
      />,
    ));
    act(() => {
      frames.step(1_000);
      frames.step(2_000);
    });
    if (systemRef.current === null) throw new Error('Missing SolarSystem handle.');
    act(() => systemRef.current?.focusBody('quantum-moon'));
    act(() => {
      frames.step(3_000);
      frames.step(3_240);
    });

    const registry = registryBox.current;
    const hitArea = findByAttribute(container, 'data-hit-body-id', 'quantum-moon');
    const camera = descendants(container).find((element) => element.getAttribute('class') === 'camera-world');
    if (registry === undefined || hitArea === undefined || camera === undefined) {
      throw new Error('Missing focused Quantum Moon harness targets.');
    }
    const priorPosition = registry.get('quantum-moon');
    const priorTransform = camera.getAttribute('transform');
    act(() => dispatch(container, hitArea, 'click', { clientX: 0, clientY: 0, button: 0 }));

    expect(registry.get('quantum-moon')).not.toEqual(priorPosition);
    expect(camera.getAttribute('transform')).not.toBe(priorTransform);
  });

  it('keeps following Quantum Moon after a completed map click and repeated hover relocations', () => {
    const originalDocument = Reflect.get(globalThis, 'document');
    const originalWindow = Reflect.get(globalThis, 'window');
    const originalElement = Reflect.get(globalThis, 'Element');
    const originalHTMLElement = Reflect.get(globalThis, 'HTMLElement');
    const originalHTMLIFrameElement = Reflect.get(globalThis, 'HTMLIFrameElement');
    const originalResizeObserver = Reflect.get(globalThis, 'ResizeObserver');
    const originalMatchMedia = Reflect.get(globalThis, 'matchMedia');
    const originalRequestAnimationFrame = Reflect.get(globalThis, 'requestAnimationFrame');
    const originalCancelAnimationFrame = Reflect.get(globalThis, 'cancelAnimationFrame');
    const document = new TestDocument();
    const frames = new ControlledFrames();
    class TestResizeObserver {
      observe(): void {}
      disconnect(): void {}
    }
    Object.assign(globalThis, {
      document,
      window: globalThis,
      Element: TestElement,
      HTMLElement: TestElement,
      HTMLIFrameElement: class {},
      ResizeObserver: TestResizeObserver,
      matchMedia: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => true,
      }),
      requestAnimationFrame: frames.request,
      cancelAnimationFrame: frames.cancel,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    restoreGlobals = () => {
      const restore = (key: string, value: unknown) => {
        if (value === undefined) Reflect.deleteProperty(globalThis, key);
        else Reflect.set(globalThis, key, value);
      };
      restore('document', originalDocument);
      restore('window', originalWindow);
      restore('Element', originalElement);
      restore('HTMLElement', originalHTMLElement);
      restore('HTMLIFrameElement', originalHTMLIFrameElement);
      restore('ResizeObserver', originalResizeObserver);
      restore('matchMedia', originalMatchMedia);
      restore('requestAnimationFrame', originalRequestAnimationFrame);
      restore('cancelAnimationFrame', originalCancelAnimationFrame);
    };

    let now = 1_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const registryBox: { current?: WorldPositionRegistry } = {};
    const systemRef = createRef<SolarSystemHandle>();
    const container = document.createElement('div');
    root = createRoot(container as unknown as Element);

    function MountedSelection() {
      const [selectedId, setSelectedId] = useState<BodyId | null>(null);
      return (
        <SolarSystem
          ref={systemRef}
          selectedId={selectedId}
          onSelect={setSelectedId}
          speed={0}
          onRegistryReady={(readyRegistry) => { registryBox.current = readyRegistry; }}
        />
      );
    }

    act(() => root?.render(<MountedSelection />));
    act(() => {
      frames.step(1_000);
      frames.step(2_000);
    });

    const surface = descendants(container).find((element) => element.getAttribute('class') === 'atlas-map-surface');
    const sunBody = findByAttribute(container, 'data-body-id', 'sun');
    const registry = registryBox.current;
    if (surface === undefined || sunBody === undefined || registry === undefined || systemRef.current === null) {
      throw new Error('Missing click-to-focus Quantum Moon harness targets.');
    }
    const sun = clientPoint({ x: 0, y: 40 });
    act(() => {
      dispatch(container, sunBody, 'pointerdown', { pointerId: 1, clientX: sun.x, clientY: sun.y });
      dispatch(container, surface, 'pointerup', { pointerId: 1, clientX: sun.x, clientY: sun.y });
    });
    expect(findByAttribute(container, 'data-body-id', 'sun')?.getAttribute('aria-pressed')).toBe('true');

    act(() => systemRef.current?.focusBody('quantum-moon'));
    act(() => {
      frames.step(3_000);
      frames.step(3_240);
    });
    const camera = descendants(container).find((element) => element.getAttribute('class') === 'camera-world');
    if (camera === undefined) throw new Error('Missing focused camera world.');

    const relocateFromCurrentMoon = () => {
      const moonPosition = registry.get('quantum-moon');
      if (moonPosition === undefined || systemRef.current === null) throw new Error('Missing live Quantum Moon position.');
      const local = systemRef.current.worldToScreen(moonPosition);
      dispatch(container, surface, 'pointermove', { pointerId: 1, clientX: local.x + 120, clientY: local.y + 70 });
    };
    act(relocateFromCurrentMoon);
    now += 500;
    act(relocateFromCurrentMoon);

    const finalMoonPosition = registry.get('quantum-moon');
    if (finalMoonPosition === undefined) throw new Error('Missing relocated Quantum Moon position.');
    expect(camera.getAttribute('transform')).toBe(
      `translate(${-finalMoonPosition.x} ${-finalMoonPosition.y}) scale(1)`,
    );
  });
});
