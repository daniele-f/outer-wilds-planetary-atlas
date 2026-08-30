// @vitest-environment jsdom

import { act } from 'react';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FrameCallback } from './hooks/useAnimationClock';
import App from './App';
import { InfoPanel } from './components/InfoPanel';
import { getBody } from './data/celestialBodies';
import { circularPosition, composePoint } from './lib/orbits';
import { ATLAS_VIEW_BOX, worldPointToClient } from './lib/svgViewport';

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

class TestResizeObserver {
  observe(): void {}
  disconnect(): void {}
}

let mobileViewport = false;

function matchMedia(query: string): MediaQueryList {
  return {
    matches: mobileViewport && query === '(max-width: 760px)',
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
}

let frames: ControlledFrames;

beforeEach(() => {
  frames = new ControlledFrames();
  mobileViewport = false;
  localStorage.clear();
  localStorage.setItem('outer-wilds-atlas.spoilers-enabled', 'false');
  vi.stubGlobal('PointerEvent', MouseEvent);
  vi.stubGlobal('requestAnimationFrame', frames.request);
  vi.stubGlobal('cancelAnimationFrame', frames.cancel);
  vi.stubGlobal('ResizeObserver', TestResizeObserver);
  vi.stubGlobal('matchMedia', matchMedia);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function timberHearthPosition(): Element {
  const body = document.querySelector('[data-body-id="timber-hearth"]');
  const position = body?.parentElement;
  if (position === null || position === undefined) {
    throw new Error('Missing mounted Timber Hearth position group.');
  }
  return position;
}

function worldClientPosition(id: 'timber-hearth' | 'attlerock' | 'brittle-hollow' | 'hollows-lantern') {
  const body = getBody(id);
  if (body?.orbit === undefined) throw new Error(`Missing orbit fixture for ${id}.`);
  const world = id === 'attlerock' || id === 'hollows-lantern'
    ? (() => {
      const host = getBody(id === 'attlerock' ? 'timber-hearth' : 'brittle-hollow');
      if (host?.orbit === undefined) throw new Error(`Missing host orbit fixture for ${id}.`);
      return composePoint(circularPosition(host.orbit, 0), circularPosition(body.orbit, 0));
    })()
    : circularPosition(body.orbit, 0);
  return worldPointToClient(world, { offset: { x: 0, y: 0 }, scale: 1 }, { width: 390, height: 844 }, ATLAS_VIEW_BOX);
}

function mockMobileSvgBounds() {
  return vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockImplementation(function bounds(this: SVGElement) {
    if (this.tagName.toLowerCase() !== 'svg') return new DOMRect(0, 0, 0, 0);
    return new DOMRect(0, 0, 390, 844);
  });
}

function assignMobileSurfaceBounds(surface: Element) {
  Object.assign(surface, {
    getBoundingClientRect: () => new DOMRect(0, 0, 390, 844),
    setPointerCapture() {},
    hasPointerCapture: () => true,
    releasePointerCapture() {},
  });
}

function finishFocusTransition(startTimestamp = 1_000) {
  act(() => {
    frames.step(startTimestamp);
    frames.step(startTimestamp + 240);
  });
}

describe('planetary atlas application UI', () => {
  it('opens with the atlas title without selection guidance or an intro modal', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /outer wilds planetary atlas/i })).toBeVisible();
    expect(screen.queryByText('Select a celestial body to learn more.')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles orbit lines and planet names from a collapsible settings menu', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const settings = screen.getByRole('button', { name: 'Map settings' });

    expect(settings).toHaveClass('atlas-settings__trigger');
    expect(screen.queryByRole('group', { name: 'Map display settings' })).not.toBeInTheDocument();
    await user.click(settings);
    expect(screen.getByRole('group', { name: 'Map display settings' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Hide orbit lines' }));
    expect(container.querySelector('.solar-system')).toHaveClass('solar-system--orbits-hidden');
    await user.click(screen.getByRole('button', { name: 'Hide planet names' }));
    expect(container.querySelector('.solar-system')).toHaveClass('solar-system--labels-hidden');

    await user.click(settings);
    expect(screen.queryByRole('group', { name: 'Map display settings' })).not.toBeInTheDocument();
  });

  it('shows a spoiler warning on first visit and keeps the Quantum Moon hidden by default', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('outer-wilds-atlas.spoilers-enabled');
    const { container } = render(<App />);

    expect(screen.getByRole('dialog', { name: /spoiler/i })).toBeVisible();
    expect(screen.getByText(/you cannot unsee spoilers/i)).toBeVisible();
    expect(container.querySelector('[data-body-id="quantum-moon"]')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /keep spoilers hidden/i }));
    expect(screen.queryByRole('dialog', { name: /spoiler/i })).not.toBeInTheDocument();
    expect(localStorage.getItem('outer-wilds-atlas.spoilers-enabled')).toBe('false');
  });

  it('reveals the Quantum Moon from the spoiler prompt and persists the choice', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(screen.getByRole('button', { name: /show spoilers/i }));
    expect(first.container.querySelector('[data-body-id="quantum-moon"]')).toBeInTheDocument();
    expect(localStorage.getItem('outer-wilds-atlas.spoilers-enabled')).toBe('true');

    first.unmount();
    render(<App />);
    expect(screen.queryByRole('dialog', { name: /spoiler/i })).not.toBeInTheDocument();
    expect(document.querySelector('[data-body-id="quantum-moon"]')).toBeInTheDocument();
  });

  it('toggles Quantum Moon spoilers from settings after the first-visit choice', async () => {
    const user = userEvent.setup();
    localStorage.setItem('outer-wilds-atlas.spoilers-enabled', 'false');
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Map settings' }));
    const toggle = screen.getByRole('button', { name: /show quantum moon/i });
    await user.click(toggle);
    expect(container.querySelector('[data-body-id="quantum-moon"]')).toBeInTheDocument();
    expect(localStorage.getItem('outer-wilds-atlas.spoilers-enabled')).toBe('true');
  });

  it('closes the settings menu when the user clicks outside it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Map settings' }));
    expect(screen.getByRole('group', { name: 'Map display settings' })).toBeVisible();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('group', { name: 'Map display settings' })).not.toBeInTheDocument();
  });

  it('persists display settings across remounts', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Map settings' }));
    await user.click(screen.getByRole('button', { name: 'Hide orbit lines' }));
    expect(first.container.querySelector('.solar-system')).toHaveClass('solar-system--orbits-hidden');

    first.unmount();
    const second = render(<App />);

    expect(second.container.querySelector('.solar-system')).toHaveClass('solar-system--orbits-hidden');
  });

  it('moves the settings trigger beside an open information panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('button', { name: 'Map settings' })).not.toHaveClass('atlas-settings__trigger--panel-open');
    screen.getByRole('button', { name: 'Sun, Star' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Map settings' })).toHaveClass('atlas-settings__trigger--panel-open');
  });

  it('moves the focused world into the remaining map area while the side panel is open', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function bounds(this: HTMLElement) {
      if (this.classList.contains('atlas-stage')) return new DOMRect(0, 0, 1_200, 800);
      if (this.classList.contains('info-panel')) return new DOMRect(788, 12, 400, 776);
      return new DOMRect(0, 0, 0, 0);
    });
    const nativeGetComputedStyle = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((element: Element) => {
      const style = nativeGetComputedStyle(element);
      if (element.classList.contains('info-panel')) style.setProperty('right', '12px');
      return style;
    }) as typeof window.getComputedStyle);

    const { container } = render(<App />);
    screen.getByRole('button', { name: 'Sun, Star' }).focus();
    await user.keyboard('{Enter}');
    expect(container.querySelector('.camera-world')).not.toHaveAttribute('transform', 'translate(-206 0) scale(1)');
    finishFocusTransition();

    expect(container.querySelector('.camera-world')).toHaveAttribute('transform', 'translate(-206 0) scale(1)');

    await user.click(screen.getByRole('button', { name: 'Close Sun details' }));
    finishFocusTransition(2_000);

    expect(container.querySelector('.camera-world')).toHaveAttribute('transform', 'translate(0 0) scale(1)');
  });

  it('moves the focused world upward into the remaining map area on mobile', async () => {
    mobileViewport = true;
    const user = userEvent.setup();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function bounds(this: HTMLElement) {
      if (this.classList.contains('atlas-stage')) return new DOMRect(0, 0, 390, 844);
      if (this.classList.contains('info-panel')) return new DOMRect(10, 534, 370, 300);
      return new DOMRect(0, 0, 0, 0);
    });
    const nativeGetComputedStyle = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((element: Element) => {
      const style = nativeGetComputedStyle(element);
      if (element.classList.contains('info-panel')) style.setProperty('bottom', '10px');
      return style;
    }) as typeof window.getComputedStyle);

    const { container } = render(<App />);
    screen.getByRole('button', { name: 'Sun, Star' }).focus();
    await user.keyboard('{Enter}');
    expect(container.querySelector('.camera-world')).not.toHaveAttribute('transform', 'translate(0 -155) scale(1)');
    finishFocusTransition();

    expect(container.querySelector('.camera-world')).toHaveAttribute('transform', 'translate(0 -155) scale(1)');

    await user.click(screen.getByRole('button', { name: 'Close Sun details' }));
    finishFocusTransition(2_000);
    expect(container.querySelector('.camera-world')).toHaveAttribute('transform', 'translate(0 0) scale(1)');
  });

  it('dismisses settings, details, camera follow, and selection with successive Escape presses', async () => {
    const user = userEvent.setup();
    render(<App />);
    const timberHearth = screen.getByRole('button', { name: 'Timber Hearth, Planet' });

    timberHearth.focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Focus camera on Timber Hearth' }));
    await user.click(screen.getByRole('button', { name: 'Map settings' }));

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: 'Map display settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Timber Hearth' })).toBeVisible();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(timberHearth).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{Escape}');
    expect(timberHearth).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('{Escape}');
    expect(timberHearth).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps keyboard focus on a selected map body and presents its travel pamphlet', async () => {
    const user = userEvent.setup();
    render(<App />);
    const timberHearth = screen.getByRole('button', { name: 'Timber Hearth, Planet' });

    timberHearth.focus();
    await user.keyboard('{Enter}');

    expect(timberHearth).toHaveFocus();
    expect(timberHearth).toHaveAttribute('aria-pressed', 'true');
    const panel = screen.getByRole('complementary', { name: 'Timber Hearth' });
    expect(within(panel).getByRole('heading', { level: 2, name: 'Timber Hearth' })).toBeVisible();
    expect(within(panel).getByText('Planet')).toBeVisible();
    expect(within(panel).getByText('Temperate terrestrial world')).toBeVisible();
    expect(within(panel).getByText(/go for the pine-scented launchpad, stay for the campfire stories/i)).toBeVisible();
    expect(within(panel).getByText(/friendly little homeworld/i)).toBeVisible();
    expect(within(panel).getByRole('heading', { name: 'Worth the trip' })).toBeVisible();
    expect(within(panel).getByText(/crater hiking/i)).toBeVisible();
    expect(within(panel).getByRole('heading', { name: 'Nearby detour' })).toBeVisible();
    expect(within(panel).getByRole('heading', { name: 'Before you launch' })).toBeVisible();
    expect(within(panel).getByText(/save room for marshmallows/i)).toBeVisible();
  });

  it('omits the satellite detour section when the destination has no satellites', () => {
    const body = getBody('giants-deep');
    if (body === undefined) throw new Error("Missing Giant's Deep fixture.");
    render(
      <InfoPanel
        body={body}
        onClose={() => {}}
        onSelectBody={() => {}}
        onFocusBody={() => {}}
        onNavigateBody={() => {}}
      />,
    );

    const panel = screen.getByRole('complementary', { name: "Giant's Deep" });
    expect(within(panel).queryByRole('heading', { name: /satellite|detour/i })).not.toBeInTheDocument();
  });

  it.each([
    { label: 'Attlerock', host: 'timber-hearth', hostName: 'Timber Hearth', moon: 'attlerock' },
    { label: "Hollow's Lantern", host: 'brittle-hollow', hostName: 'Brittle Hollow', moon: 'hollows-lantern' },
  ] as const)('routes an overlapping $label label click to $hostName while keyboard selection remains named', async ({ label, host, hostName, moon }) => {
    const user = userEvent.setup();
    const restoreBounds = mockMobileSvgBounds();
    const { container } = render(<App />);
    const hostPoint = worldClientPosition(host);
    const labelNode = [...container.querySelectorAll('text')].find((node) => node.textContent === label);
    if (labelNode === undefined) throw new Error(`Missing ${label} label.`);

    fireEvent.click(labelNode, { clientX: hostPoint.x, clientY: hostPoint.y });
    expect(screen.getByRole('complementary', { name: hostName })).toBeVisible();

    const moonButton = screen.getByRole('button', { name: `${label}, Moon` });
    moonButton.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('complementary', { name: label })).toBeVisible();
    expect(moonButton).toHaveAttribute('aria-pressed', 'true');
    restoreBounds.mockRestore();
  });

  it('uses the same client-pixel threshold for panning and click suppression at 390x844', () => {
    const restoreBounds = mockMobileSvgBounds();
    const { container, unmount } = render(<App />);
    const surface = container.querySelector('.atlas-map-surface');
    const timberHit = container.querySelector('[data-hit-body-id="timber-hearth"]');
    if (surface === null || timberHit === null) throw new Error('Missing map interaction targets.');
    const timberPoint = worldClientPosition('timber-hearth');
    assignMobileSurfaceBounds(surface);

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 102, clientY: 100 });
    fireEvent.click(timberHit, { clientX: timberPoint.x, clientY: timberPoint.y });
    expect(screen.getByRole('complementary', { name: 'Timber Hearth' })).toBeVisible();
    expect(container.querySelector('.camera-world')).toHaveAttribute('transform', 'translate(0 0) scale(1)');

    unmount();
    const rerendered = render(<App />);
    const rerenderedSurface = rerendered.container.querySelector('.atlas-map-surface');
    const rerenderedHit = rerendered.container.querySelector('[data-hit-body-id="timber-hearth"]');
    if (rerenderedSurface === null || rerenderedHit === null) throw new Error('Missing rerendered map interaction targets.');
    assignMobileSurfaceBounds(rerenderedSurface);
    fireEvent.pointerDown(rerenderedSurface, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(rerenderedSurface, { pointerId: 2, clientX: 104, clientY: 100 });
    fireEvent.click(rerenderedHit, { clientX: timberPoint.x, clientY: timberPoint.y });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(rerendered.container.querySelector('.camera-world')).toHaveAttribute('transform', 'translate(14.769230769230717 0) scale(1)');
    restoreBounds.mockRestore();
  });

  it('opens body details when the orbit advances between pointer down and pointer up', () => {
    const restoreBounds = mockMobileSvgBounds();
    const { container } = render(<App />);
    const surface = container.querySelector('.atlas-map-surface');
    const timberHit = container.querySelector('[data-hit-body-id="timber-hearth"]');
    if (surface === null || timberHit === null) throw new Error('Missing map interaction targets.');
    assignMobileSurfaceBounds(surface);
    const timberPoint = worldClientPosition('timber-hearth');

    fireEvent.pointerDown(timberHit, { pointerId: 7, clientX: timberPoint.x, clientY: timberPoint.y });
    act(() => frames.step(1_000));
    fireEvent.pointerUp(surface, { pointerId: 7, clientX: timberPoint.x, clientY: timberPoint.y });

    expect(screen.getByRole('complementary', { name: 'Timber Hearth' })).toBeVisible();
    restoreBounds.mockRestore();
  });

  it('focuses the camera on a selected moving body and Home returns focus to the Sun', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    act(() => frames.step(0));
    const timberHearth = screen.getByRole('button', { name: 'Timber Hearth, Planet' });

    timberHearth.focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Focus camera on Timber Hearth' }));
    const cameraWorld = container.querySelector('.camera-world');
    const focusedAtStart = cameraWorld?.getAttribute('transform');

    expect(focusedAtStart).toBe('translate(0 0) scale(1)');

    act(() => {
      frames.step(1_000);
      frames.step(1_120);
    });
    expect(cameraWorld?.getAttribute('transform')).not.toBe(focusedAtStart);

    await user.click(screen.getByRole('button', { name: 'Reset view' }));
    finishFocusTransition(2_000);
    expect(cameraWorld).toHaveAttribute('transform', 'translate(0 0) scale(1)');
  });

  it('wraps focused navigation through the Quantum Moon and back to the Sun', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    act(() => frames.step(0));

    screen.getByRole('button', { name: 'Interloper, Comet' }).focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Next destination: Quantum Moon' }));
    expect(screen.getByRole('complementary', { name: 'Quantum Moon' })).toBeVisible();
    finishFocusTransition();
    expect(container.querySelector('.camera-world')?.getAttribute('transform')).not.toBe('translate(0 0) scale(1)');

    await user.click(screen.getByRole('button', { name: 'Next destination: Sun' }));
    expect(screen.getByRole('complementary', { name: 'Sun' })).toBeVisible();
    finishFocusTransition(2_000);
    expect(container.querySelector('.camera-world')).toHaveAttribute('transform', 'translate(0 0) scale(1)');

    await user.click(screen.getByRole('button', { name: 'Previous destination: Quantum Moon' }));
    expect(screen.getByRole('complementary', { name: 'Quantum Moon' })).toBeVisible();
  });

  it('navigates outward from the Sun before visiting the Interloper and Quantum Moon', async () => {
    const user = userEvent.setup();
    render(<App />);
    screen.getByRole('button', { name: 'Sun, Star' }).focus();
    await user.keyboard('{Enter}');
    const outwardOrder = [
      'Hourglass Twins',
      'Ash Twin',
      'Ember Twin',
      'Timber Hearth',
      'Attlerock',
      'Brittle Hollow',
      "Hollow's Lantern",
      "Giant's Deep",
      'Dark Bramble',
      'Interloper',
      'Quantum Moon',
      'Sun',
    ];

    for (const destination of outwardOrder) {
      await user.click(screen.getByRole('button', { name: `Next destination: ${destination}` }));
      expect(screen.getByRole('complementary', { name: destination })).toBeVisible();
    }
  });

  it('keeps Take me there at the bottom after the destination arrows', async () => {
    const user = userEvent.setup();
    render(<App />);
    screen.getByRole('button', { name: 'Sun, Star' }).focus();
    await user.keyboard('{Enter}');
    const panel = screen.getByRole('complementary', { name: 'Sun' });
    const actions = within(panel).getByRole('group', { name: 'Destination controls' });
    const buttons = within(actions).getAllByRole('button');

    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Previous destination: Quantum Moon',
      'Next destination: Hourglass Twins',
      'Focus camera on Sun',
    ]);
  });

  it('makes the Quantum Moon jump on every click without opening its panel', () => {
    const { container } = render(<App />);
    const moon = container.querySelector('[data-body-id="quantum-moon"]');
    const moonHitArea = container.querySelector('[data-hit-body-id="quantum-moon"]');
    if (moon === null || moonHitArea === null) throw new Error('Missing Quantum Moon target.');
    const firstHost = moon.getAttribute('data-quantum-host');

    fireEvent.click(moonHitArea);
    const secondHost = container.querySelector('[data-body-id="quantum-moon"]')?.getAttribute('data-quantum-host');
    fireEvent.click(container.querySelector('[data-hit-body-id="quantum-moon"]') as Element);
    const thirdHost = container.querySelector('[data-body-id="quantum-moon"]')?.getAttribute('data-quantum-host');

    expect(secondHost).not.toBe(firstHost);
    expect(thirdHost).not.toBe(secondHost);
    expect(screen.queryByRole('complementary', { name: 'Quantum Moon' })).not.toBeInTheDocument();
  });

  it('selects, centers, and follows a body when it is double-clicked', () => {
    const { container } = render(<App />);
    act(() => frames.step(0));
    const timberHearth = container.querySelector('[data-hit-body-id="timber-hearth"]');
    if (timberHearth === null) throw new Error('Missing Timber Hearth target.');

    fireEvent.doubleClick(timberHearth);
    const cameraWorld = container.querySelector('.camera-world');
    const focusedAtStart = cameraWorld?.getAttribute('transform');
    expect(screen.getByRole('complementary', { name: 'Timber Hearth' })).toBeVisible();
    expect(focusedAtStart).toBe('translate(0 0) scale(1)');

    finishFocusTransition();
    expect(cameraWorld?.getAttribute('transform')).not.toBe(focusedAtStart);
  });

  it('selects and follows the composite Hourglass Twins target between the planets', async () => {
    const user = userEvent.setup();
    const restoreBounds = mockMobileSvgBounds();
    const { container } = render(<App />);
    act(() => frames.step(0));
    const twins = getBody('hourglass-twins');
    if (twins?.orbit === undefined) throw new Error('Missing Hourglass Twins orbit fixture.');
    const point = worldPointToClient(
      circularPosition(twins.orbit, 0),
      { offset: { x: 0, y: 0 }, scale: 1 },
      { width: 390, height: 844 },
      ATLAS_VIEW_BOX,
    );
    const hit = container.querySelector('[data-hit-body-id="hourglass-twins"]');
    if (hit === null) throw new Error('Missing Hourglass Twins composite target.');

    fireEvent.click(hit, { clientX: point.x, clientY: point.y });
    expect(screen.getByRole('complementary', { name: 'Hourglass Twins' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Focus camera on Hourglass Twins' }));
    finishFocusTransition();
    expect(container.querySelector('.camera-world')).not.toHaveAttribute('transform', 'translate(0 0) scale(1)');
    restoreBounds.mockRestore();
  });

  it('invites the user to select a world to learn more', () => {
    render(<App />);

    expect(screen.getByText(/select a world to learn more/i)).toBeVisible();
    expect(screen.queryByText(/select a world to inspect/i)).not.toBeInTheDocument();
  });

  it('centers a selected body again after the map was freely panned', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    act(() => frames.step(0));
    const surface = container.querySelector('.atlas-map-surface');
    if (surface === null) throw new Error('Missing map surface.');
    assignMobileSurfaceBounds(surface);

    screen.getByRole('button', { name: 'Timber Hearth, Planet' }).focus();
    await user.keyboard('{Enter}');
    const focusButton = screen.getByRole('button', { name: 'Focus camera on Timber Hearth' });
    await user.click(focusButton);
    const cameraWorld = container.querySelector('.camera-world');
    finishFocusTransition();
    const centeredTransform = cameraWorld?.getAttribute('transform');

    fireEvent.pointerDown(surface, { pointerId: 11, clientX: 40, clientY: 40 });
    fireEvent.pointerMove(surface, { pointerId: 11, clientX: 50, clientY: 40 });
    fireEvent.pointerUp(surface, { pointerId: 11, clientX: 50, clientY: 40 });
    expect(cameraWorld?.getAttribute('transform')).not.toBe(centeredTransform);

    await user.click(focusButton);
    finishFocusTransition(2_000);
    expect(cameraWorld).toHaveAttribute('transform', centeredTransform ?? '');
  });

  it('centers the Sun when its side-panel focus button is pressed', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const surface = container.querySelector('.atlas-map-surface');
    if (surface === null) throw new Error('Missing map surface.');
    assignMobileSurfaceBounds(surface);

    screen.getByRole('button', { name: 'Sun, Star' }).focus();
    await user.keyboard('{Enter}');
    fireEvent.pointerDown(surface, { pointerId: 12, clientX: 40, clientY: 40 });
    fireEvent.pointerMove(surface, { pointerId: 12, clientX: 50, clientY: 40 });
    fireEvent.pointerUp(surface, { pointerId: 12, clientX: 50, clientY: 40 });

    await user.click(screen.getByRole('button', { name: 'Focus camera on Sun' }));
    finishFocusTransition();
    expect(container.querySelector('.camera-world')).toHaveAttribute('transform', 'translate(0 0) scale(1)');
  });

  it('releases body focus when the user pans the map', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    act(() => frames.step(0));
    const surface = container.querySelector('.atlas-map-surface');
    if (surface === null) throw new Error('Missing map surface.');
    assignMobileSurfaceBounds(surface);

    screen.getByRole('button', { name: 'Timber Hearth, Planet' }).focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Focus camera on Timber Hearth' }));
    finishFocusTransition();

    fireEvent.pointerDown(surface, { pointerId: 9, clientX: 40, clientY: 40 });
    fireEvent.pointerMove(surface, { pointerId: 9, clientX: 50, clientY: 40 });
    fireEvent.pointerUp(surface, { pointerId: 9, clientX: 50, clientY: 40 });
    const cameraWorld = container.querySelector('.camera-world');
    const afterPan = cameraWorld?.getAttribute('transform');

    expect(cameraWorld).toHaveAttribute('transform', afterPan ?? '');
  });

  it('navigates to a known satellite and closes details without changing the map view', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    screen.getByRole('button', { name: 'Timber Hearth, Planet' }).focus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: 'Explore Attlerock' }));

    const panel = screen.getByRole('complementary', { name: 'Attlerock' });
    expect(within(panel).getByRole('heading', { level: 2, name: 'Attlerock' })).toBeVisible();
    expect(within(panel).getByText('Rocky satellite')).toBeVisible();
    const cameraTransform = container.querySelector('.camera-world')?.getAttribute('transform');

    await user.click(within(panel).getByRole('button', { name: 'Close Attlerock details' }));

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByText('Select a celestial body to learn more.')).not.toBeInTheDocument();
    expect(container.querySelector('.camera-world')).toHaveAttribute('transform', cameraTransform);
  });

  it('routes zoom and reset controls through the mounted map camera', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const camera = container.querySelector('.camera-world');

    expect(camera).toHaveAttribute('transform', 'translate(0 0) scale(1)');
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(camera).toHaveAttribute('transform', 'translate(0 0) scale(0.8333333333333334)');
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(camera).toHaveAttribute('transform', 'translate(0 0) scale(1)');
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(camera).toHaveAttribute('transform', 'translate(0 0) scale(1.2)');
    await user.click(screen.getByRole('button', { name: 'Reset view' }));
    finishFocusTransition();
    expect(camera).toHaveAttribute('transform', 'translate(0 0) scale(1)');
  });

  it('advances orbital time at the selected half speed', async () => {
    const user = userEvent.setup();
    render(<App />);

    const halfSpeed = screen.getByRole('button', { name: 'Set simulation speed to 0.5x' });
    await user.click(halfSpeed);
    expect(halfSpeed).toHaveAttribute('aria-pressed', 'true');
    act(() => {
      frames.step(1_000);
      frames.step(2_000);
    });

    expect(timberHearthPosition()).toHaveAttribute('transform', 'translate(250.216 70.652)');
  });

  it('freezes orbital time while paused and resumes at the selected two-times speed', async () => {
    const user = userEvent.setup();
    render(<App />);

    act(() => {
      frames.step(1_000);
      frames.step(2_000);
    });
    expect(timberHearthPosition()).toHaveAttribute('transform', 'translate(254.797 51.756)');

    const pause = screen.getByRole('button', { name: 'Pause simulation toggle' });
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    expect(pause.querySelector('.atlas-control-icon--pause')).toBeInTheDocument();
    expect(pause).not.toHaveTextContent('Ⅱ');
    await user.click(pause);
    expect(pause).toHaveAccessibleName('Pause simulation toggle');
    expect(pause).toHaveAttribute('aria-pressed', 'true');
    expect(pause.querySelector('.atlas-control-icon--play')).toBeInTheDocument();
    act(() => frames.step(3_000));
    expect(timberHearthPosition()).toHaveAttribute('transform', 'translate(254.797 51.756)');

    const doubleSpeed = screen.getByRole('button', { name: 'Set simulation speed to 2x' });
    await user.click(doubleSpeed);
    expect(doubleSpeed).toHaveAttribute('aria-pressed', 'true');
    expect(pause).toHaveAttribute('aria-pressed', 'true');
    await user.click(pause);
    act(() => frames.step(4_000));
    expect(timberHearthPosition()).toHaveAttribute('transform', 'translate(258.732 -25.646)');
  });

  it('gives every control an accessible name, tooltip, and current state', () => {
    render(<App />);

    expect(screen.getByRole('group', { name: 'Atlas controls' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Map view controls' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Simulation controls' })).toBeInTheDocument();
    for (const name of ['Zoom in', 'Zoom out', 'Reset view', 'Pause simulation toggle']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('title');
    }
    expect(screen.getByRole('button', { name: 'Set simulation speed to 0.5x' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Set simulation speed to 1x' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Set simulation speed to 2x' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps supplied spoiler notes inside a closed native disclosure', () => {
    const body = getBody('timber-hearth');
    if (body === undefined) throw new Error('Missing Timber Hearth fixture.');
    render(
      <InfoPanel
        body={body}
        spoilerNotes={['A hidden late-game observation.']}
        onClose={() => {}}
        onSelectBody={() => {}}
        onFocusBody={() => {}}
        onNavigateBody={() => {}}
      />,
    );

    const disclosure = screen.getByText('Spoiler notes').closest('details');
    expect(disclosure).toBeInTheDocument();
    expect(disclosure).not.toHaveAttribute('open');
    expect(within(disclosure as HTMLElement).getByText('A hidden late-game observation.')).toBeInTheDocument();
  });
});
