# Outer Wilds Planetary Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, full-screen interactive SVG atlas of the Outer Wilds solar system with nested orbital animation, map navigation, selectable bodies, and specialized twins, comet, and Quantum Moon behavior.

**Architecture:** React owns durable UI state while a ref-driven animation clock updates SVG transforms without per-frame React renders. Pure TypeScript modules provide orbital, camera, sand-transfer, and quantum calculations, and focused components translate those models into procedural SVG visuals and accessible UI.

**Tech Stack:** React 19, TypeScript 5, Vite 7, Vitest, CSS, SVG

**Spec:** `docs/superpowers/specs/2026-08-27-outer-wilds-planetary-atlas-design.md`

## Global Constraints

- No backend, database, UI framework, external game assets, or unnecessary dependencies.
- The application must run with `npm install` and `npm run dev`.
- TypeScript is strict and production code contains no `any`.
- Animation uses `requestAnimationFrame`, CSS transforms, or SVG transforms and avoids per-frame React rendering.
- Standard descriptions are concise, original, and spoiler-free.
- Desktop fills the viewport without document scrolling; mobile uses a bottom information sheet.
- Reduced-motion preferences preserve functionality while reducing decorative motion.

---

### Task 1: Scaffold and deterministic orbital model

**Files:**
- Create: `package.json`, `index.html`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`
- Create: `src/vite-env.d.ts`, `src/types/celestial.ts`, `src/lib/orbits.test.ts`, `src/lib/orbits.ts`

**Interfaces:**
- Produces: `Point`, `OrbitConfig`, `circularPosition`, `ellipticalPosition`, `binaryPositions`, `sandTransfer`, `tailVector`, `composePoint`.

- [ ] **Step 1: Add project configuration and a failing Vitest suite**

  Configure strict TypeScript, Vite React, and scripts `dev`, `build`, `test`. Tests assert circular positions at cardinal angles, nested point composition, 180-degree binary opposition, reversible transfer values/radii, faster eccentric movement near periapsis, and unit tail vectors pointing away from the origin.

- [ ] **Step 2: Run the orbital suite and verify RED**

  Run `npm test -- --run src/lib/orbits.test.ts`. Expected: failure because `src/lib/orbits.ts` exports do not exist.

- [ ] **Step 3: Implement the pure orbital functions**

  Use radians, clamp cycle fractions, return immutable `{x, y}` values, implement the comet with an eccentric-anomaly approximation and `sqrt((1+e)/(1-e))` true-anomaly conversion, and model sand as a triangular wave with direction.

- [ ] **Step 4: Verify GREEN**

  Run `npm test -- --run src/lib/orbits.test.ts`. Expected: every orbital test passes.

### Task 2: Catalog and application shell

**Files:**
- Create: `src/data/celestialBodies.test.ts`, `src/data/celestialBodies.ts`, `src/main.tsx`, `src/App.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: `OrbitConfig`.
- Produces: `BODY_IDS`, `celestialBodies`, `getBody`, and the root selection contract `onSelect(id)`.

- [ ] **Step 1: Write failing catalog validation tests**

  Assert all eleven required named entities exist, IDs are unique, every record has type/description/features/facts, satellite IDs resolve, standard copy contains no configured spoiler terms, and normal orbiting records have valid radii/speeds/angles.

- [ ] **Step 2: Verify RED**

  Run `npm test -- --run src/data/celestialBodies.test.ts`. Expected: missing catalog module.

- [ ] **Step 3: Implement typed body data and mount the shell**

  Add original concise content for Sun, Timber Hearth, Attlerock, Brittle Hollow, Hollow's Lantern, Giant's Deep, Ash Twin, Ember Twin, Dark Bramble, Interloper, and Quantum Moon. Add the viewport shell, initial no-selection state, and global palette/font/reset rules.

- [ ] **Step 4: Verify GREEN and compile**

  Run `npm test -- --run src/data/celestialBodies.test.ts` and `npm run build`. Expected: pass.

### Task 3: Camera geometry and input hook

**Files:**
- Create: `src/lib/camera.test.ts`, `src/lib/camera.ts`, `src/hooks/useMapCamera.ts`

**Interfaces:**
- Produces: `Camera`, `screenToWorld`, `worldToScreen`, `zoomAtPoint`, `clampZoom`, and `useMapCamera()` handlers/state.

- [ ] **Step 1: Write failing camera tests**

  Assert world/screen transforms round-trip, zoom keeps the world point under the cursor fixed, scale clamps to `0.45..2.8`, and reset restores the configured initial camera.

- [ ] **Step 2: Verify RED**

  Run `npm test -- --run src/lib/camera.test.ts`. Expected: missing camera exports.

- [ ] **Step 3: Implement geometry and gesture handling**

  Implement pointer-captured dragging with a movement threshold, pointer-centered wheel zoom, two-pointer pinch zoom, explicit zoom buttons, and reset. Prevent native dragging only inside the map.

- [ ] **Step 4: Verify GREEN**

  Run `npm test -- --run src/lib/camera.test.ts`. Expected: pass.

### Task 4: Reusable animated SVG solar system

**Files:**
- Create: `src/hooks/useAnimationClock.ts`, `src/components/Orbit.tsx`, `src/components/CelestialBody.tsx`, `src/components/Moon.tsx`, `src/components/Starfield.tsx`, `src/components/SolarSystem.tsx`, `src/styles/atlas.css`

**Interfaces:**
- Consumes: catalog data, orbital functions, camera hook, `selectedId`, `onSelect`.
- Produces: complete ordinary system rendering and a world-position registry for special entities.

- [ ] **Step 1: Write a failing animation-clock behavior test**

  Add `src/hooks/useAnimationClock.test.ts` with a controllable frame scheduler proving pause freezes simulation time and 2x speed advances twice as far.

- [ ] **Step 2: Verify RED**

  Run `npm test -- --run src/hooks/useAnimationClock.test.ts`. Expected: missing hook/factory.

- [ ] **Step 3: Implement the clock and ordinary scene**

  Render the centered Sun, subtle double-stroke orbits, procedural body variants, upright labels, selection rings, fixed hit areas, and nested Attlerock/Hollow's Lantern groups. Update transform attributes through registered refs each frame. Add deterministic stars, dust, nebula, sun corona, shadows, hover/focus treatment, and reduced-motion CSS.

- [ ] **Step 4: Verify tests and build**

  Run `npm test -- --run` and `npm run build`. Expected: pass with no TypeScript errors.

### Task 5: Hourglass Twins and Interloper

**Files:**
- Create: `src/components/HourglassTwins.tsx`, `src/components/Interloper.tsx`
- Modify: `src/components/SolarSystem.tsx`, `src/styles/atlas.css`

**Interfaces:**
- Consumes: `binaryPositions`, `sandTransfer`, `ellipticalPosition`, `tailVector`, selection callback.
- Produces: independently selectable twins, animated curved transfer stream, and selectable comet.

- [ ] **Step 1: Extend failing pure-model tests for special render inputs**

  Assert twin visual radii stay within configured minima/maxima and always change oppositely; assert a full comet cycle reaches both inner and outer bounds and outbound tail dot-product with the Sun-to-comet vector is positive.

- [ ] **Step 2: Verify RED**

  Run the targeted orbital tests. Expected: new derived helper assertions fail because the helper exports are absent.

- [ ] **Step 3: Implement both specialized renderers**

  Place the twin barycenter on its solar orbit, twins on opposing local positions, size them from transfer amount, preserve stable hit circles, and animate a curved amber path plus grains in the current direction. Render the comet on its eccentric orbit with icy nucleus/coma and an outward gradient tail; emphasize the full eccentric path only when selected.

- [ ] **Step 4: Verify GREEN and build**

  Run `npm test -- --run` and `npm run build`. Expected: pass.

### Task 6: Quantum Moon state machine and screen-space escape

**Files:**
- Create: `src/lib/quantum.test.ts`, `src/lib/quantum.ts`, `src/components/QuantumMoon.tsx`
- Modify: `src/components/SolarSystem.tsx`, `src/styles/atlas.css`

**Interfaces:**
- Produces: `MAX_QUANTUM_ESCAPES = 5`, `chooseQuantumHost`, `canQuantumEscape`, `isPointerNear`, and stabilized selection behavior.

- [ ] **Step 1: Write failing quantum tests**

  Assert initial hosts belong to the eligible set, host changes avoid the current host when alternatives exist, screen-space proximity respects the threshold, cooldown blocks repeated escapes, escape five stabilizes the moon, and escape six is impossible.

- [ ] **Step 2: Verify RED**

  Run `npm test -- --run src/lib/quantum.test.ts`. Expected: missing quantum module.

- [ ] **Step 3: Implement model and component**

  Choose an initial host once, derive its current world position from the registry, orbit locally, convert through the active camera for every pointer move, flicker/teleport/reset phase with cooldown, and enable hover/click only after the fifth escape. Add a restrained stabilized visual cue.

- [ ] **Step 4: Verify GREEN and build**

  Run `npm test -- --run` and `npm run build`. Expected: pass.

### Task 7: Information UI, controls, responsiveness, and accessibility

**Files:**
- Create: `src/components/InfoPanel.tsx`, `src/components/Controls.tsx`, `src/components/AtlasHeader.tsx`, `src/styles/ui.css`
- Modify: `src/App.tsx`, `src/components/SolarSystem.tsx`, `src/styles/global.css`

**Interfaces:**
- Consumes: selected body, camera commands, `speed`, `setSpeed`.
- Produces: responsive panel, header, zoom/reset/speed controls, keyboard-accessible selection and navigation.

- [ ] **Step 1: Add failing UI smoke tests**

  Add `src/App.test.tsx` with Testing Library assertions for the default guidance, selecting a body to show its name/type/features, closing the panel, and operating pause/reset controls by accessible name.

- [ ] **Step 2: Verify RED**

  Run `npm test -- --run src/App.test.tsx`. Expected: missing UI components or inaccessible controls.

- [ ] **Step 3: Implement UI and responsive styling**

  Add the quiet two-line header, panel sections, satellite buttons, close transition, optional closed spoiler disclosure, zoom/reset buttons, and speed choices. Use a right drawer above tablet width and bottom sheet below it. Add focus-visible styling, semantic labels, tooltips, and no-scroll viewport behavior.

- [ ] **Step 4: Verify GREEN and build**

  Run `npm test -- --run` and `npm run build`. Expected: pass.

### Task 8: Browser QA and final polish

**Files:**
- Modify as required by observed defects: `src/components/*.tsx`, `src/styles/*.css`, `src/lib/*.ts`

**Interfaces:**
- Consumes: complete application.
- Produces: verified acceptance behavior at desktop and mobile widths.

- [ ] **Step 1: Run the full automated gate**

  Run `npm test -- --run` and `npm run build`. Expected: all tests pass and Vite production build completes without warnings requiring action.

- [ ] **Step 2: Start the application and inspect desktop behavior**

  Run `npm run dev -- --host 127.0.0.1`, open the page, and verify initial framing, orbital motion, nested moons, twins, reversing sand, comet motion/tail, body selection, panel changes, hover/focus, pause/speed, pointer-centered zoom, pan, and reset.

- [ ] **Step 3: Verify the Quantum Moon acceptance sequence**

  Approach it five separate times, checking one escape per cooldown and normally changing hosts; confirm the sixth approach does not teleport and selection then opens Quantum Moon information.

- [ ] **Step 4: Inspect mobile and reduced-motion behavior**

  Test a narrow viewport, touch-style dragging, pinch if supported by the browser harness, bottom-sheet layout, selectable bodies, and the reduced-motion media query.

- [ ] **Step 5: Check console and rerun final gate**

  Confirm no recurring browser console errors. For each defect, add a failing regression test when logic is involved, fix it, and rerun `npm test -- --run` plus `npm run build`.

## Plan Self-Review

- Every acceptance criterion maps to Tasks 2–8.
- Pure behavioral logic is test-first; configuration/scaffolding is folded into the first tested deliverable.
- Component boundaries and shared interfaces are explicit.
- No placeholders or deferred implementation steps remain.
- The repository is currently absent, so commit steps are intentionally omitted; no Git history can be created without additional authorization.
