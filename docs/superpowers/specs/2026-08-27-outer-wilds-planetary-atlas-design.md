# Outer Wilds Planetary Atlas Design

## Purpose

Build a complete, spoiler-conscious, full-viewport interactive atlas inspired by the rustic observatory aesthetic of Outer Wilds. The map is the primary experience: it opens immediately on a living solar system, supports direct exploration, and keeps explanatory UI secondary.

## Technology and Constraints

- React, strict TypeScript, Vite, CSS, and SVG.
- No backend, database, UI framework, external game assets, or unnecessary dependencies.
- `npm install`, `npm run dev`, `npm test`, and `npm run build` are the supported workflows.
- SVG is the primary scene renderer. CSS provides decorative animation and responsive UI.
- `requestAnimationFrame` mutates SVG transform attributes through refs so orbital motion does not trigger a React render every frame.
- React state handles selection, panel visibility, simulation speed, camera state, and Quantum Moon state.

## Architecture

### Domain model

`src/types/celestial.ts` defines body metadata, feature lists, satellites, visual variants, and `OrbitConfig`. `src/data/celestialBodies.ts` contains the reusable spoiler-free catalog. Rendering and panels consume the same records, preventing duplicated names or descriptions.

### Simulation

`src/lib/orbits.ts` contains pure geometry for circular/elliptical positions, the twins' barycenter, transfer sizing, screen transforms, and comet-tail direction. `src/hooks/useAnimationClock.ts` supplies elapsed simulation time and speed without frame-by-frame React state. Tests cover these deterministic units.

Normal planets use one reusable circular-orbit model. Moons are nested beneath their host's translated SVG group, so their local orbit naturally follows the moving planet. The Hourglass Twins use a solar barycenter plus opposing local positions. The Interloper uses an eccentric orbit with non-linear phase so it accelerates near the Sun. The Quantum Moon uses the current host's world position plus a local orbit.

### Camera and interaction

`useMapCamera` owns pan and zoom, including drag, wheel zoom around the pointer, touch panning, optional pinch zoom, limits, and reset. It exposes world/screen conversion so Quantum Moon proximity is tested against its actual rendered screen position after camera translation and scale.

All ordinary entities use accessible SVG buttons/groups with visible focus, hover emphasis, generous hit targets, and stable screen-readable labels. Clicking selects a catalog entry and opens the information panel. Drag gestures do not accidentally activate a body.

### Specialized entities

The twins' 30–60 second triangular transfer cycle derives opposing apparent radii. A curved, animated path and moving grains indicate source-to-destination flow and reverse at each end. Hit targets remain constant.

The Interloper renders an icy nucleus, coma, and tail whose vector points away from the Sun. Its full orbit becomes stronger when selected.

The Quantum Moon chooses an eligible host on load. Pointer motion within a configurable screen-space radius triggers a flicker, chooses a normally different host, resets local phase, increments the escape count, and starts a cooldown. After exactly five escapes it stabilizes and becomes hoverable and selectable. The behavior remains active while orbital time is paused.

## Components

- `App`: owns selection and composes the viewport UI.
- `SolarSystem`: scene, animation registration, camera interaction, and coordinate reporting.
- `CelestialBody`, `Moon`, and `Orbit`: reusable ordinary renderers.
- `HourglassTwins`, `Interloper`, and `QuantumMoon`: isolated special behaviors.
- `InfoPanel`: default prompt, structured selected-body details, satellites, facts, close control, and optional collapsed spoiler content.
- `Controls`: reset, zoom, pause, and 0.5x/1x/2x speed controls.
- `AtlasHeader`: quiet title overlay.

## Visual Design

The canvas uses deep navy, faint procedural nebula gradients, deterministic stars, subtle twinkle, and dust. Orbits are layered imperfect dashed strokes rather than clinical circles. Warm amber, cream type, thin geometric marks, and restrained glow evoke a hand-built observatory chart. Each body is recognizable through procedural SVG gradients and shapes: forest colors for Timber Hearth, cracked rock and a dark core for Brittle Hollow, lava for Hollow's Lantern, storm bands for Giant's Deep, fractured thorns for Dark Bramble, and warm sand tones for the twins.

The sun remains at world origin with a pulsing corona and slow surface treatment. Labels stay upright because their text is outside rotating decorative groups. Selected bodies receive a stronger amber ring and their relevant orbit is emphasized.

## Layout and Responsiveness

The map fills the viewport with no desktop document scrolling. A minimal header occupies the upper-left, controls sit near the lower-left, and the information panel slides from the right over the map. On narrow screens the panel becomes a bounded bottom sheet and controls remain reachable. Pointer and touch gestures use `touch-action: none` only on the map surface.

The initial camera frames the regular planetary system with the Sun near center, while the Interloper can travel beyond the frame and return. Zoom limits retain useful navigation without allowing the scene to disappear.

## Accessibility and Motion

Controls use native buttons, accessible names, tooltips, clear focus rings, and sufficient contrast. Each body exposes its name and classification to assistive technology. Keyboard users can select bodies and operate controls. `prefers-reduced-motion` reduces twinkle, pulsing, decorative particles, and transition duration while preserving orbital positions and all interactions.

## Verification

Vitest unit tests verify orbital geometry, nested coordinate composition, barycentric opposition, reversible sand transfer, eccentric speed behavior, tail direction, camera transforms, and Quantum Moon host/escape rules. The production build must pass strict TypeScript compilation. Final browser inspection checks initial framing, selection, panel transitions, controls, pan/zoom, all nested orbits, five Quantum Moon escapes, responsive layout, and recurring console errors.

## Acceptance Mapping

Every named body is represented by shared catalog data and is selectable. Ordinary bodies orbit via the shared model; Attlerock and Hollow's Lantern use nested host groups. The twins share a moving barycenter, opposite local motion, animated curved sand, reversible sizing, and stable hit areas. The Interloper uses an eccentric orbit and outward tail. The Quantum Moon uses post-camera screen coordinates, cooldown, host changes, a five-escape cap, and stabilization. The camera supports zoom, pan, and reset; the panel presents spoiler-free structured content; the full-screen scene remains animated and responsive.
