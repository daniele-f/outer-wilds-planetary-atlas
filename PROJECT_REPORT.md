# Outer Wilds Planetary Atlas — Complete Project Report

**Report date:** 2026-08-29  
**Project type:** Interactive, single-page web atlas  
**Current implementation:** React 19, TypeScript, Vite, CSS, and procedural SVG

## 1. Executive summary

Outer Wilds Planetary Atlas is a spoiler-conscious, interactive map of the *Outer Wilds* solar system. It presents the system as a continuously animated SVG scene: planets orbit the Sun, moons orbit their hosts, the Hourglass Twins exchange sand, the Interloper follows an eccentric comet orbit, and the Quantum Moon relocates unpredictably.

Visitors can inspect worlds, read playful travel-pamphlet descriptions, navigate between bodies, and make the camera smoothly follow a selected destination. The atlas is entirely client-side. It has no backend, accounts, analytics, database, or network API, and its visuals are drawn procedurally rather than copied from game assets.

For the entity-by-entity numerical and mathematical reference, see [`ATLAS_REPORT.md`](ATLAS_REPORT.md). Keep both reports synchronized whenever catalog values, orbit configuration, visual sizes, or interaction constants change.

### Current status

- The application is implemented and runnable locally.
- The project contains 20 test files covering the interactive behavior and numerical model.
- The latest verified build completed successfully.
- Desktop and mobile layouts are supported.
- Keyboard, pointer, touch, and reduced-motion behavior are considered.
- All information is intentionally light on plot spoilers.

## 2. Product goals and design character

The atlas aims to feel like an in-universe astronomical exhibit rather than a conventional database. It combines:

- An animated overview of the whole solar system.
- Clear selection and camera-following interactions.
- Friendly travel-brochure copy instead of dry encyclopedia entries.
- Recognizable, stylized silhouettes and colors without external game artwork.
- Enough astronomical motion to make the system feel alive, while keeping the display readable and usable.

This is an artistic visualization, not a scale simulation. Body sizes, distances, orbit speeds, and orbital shapes are deliberately tuned for composition and interaction.

## 3. Technology stack

| Area | Technology | Purpose |
| --- | --- | --- |
| UI | React 19 | Component model and state management |
| Language | TypeScript 5 | Static typing and strict compiler checks |
| Build tooling | Vite 7 | Development server and production bundling |
| React integration | `@vitejs/plugin-react` | JSX transform and React development support |
| Rendering | SVG + CSS | Solar-system visuals, animation, labels, and effects |
| Testing | Vitest | Unit and integration test runner |
| UI testing | Testing Library | Behavior-oriented component tests |
| Test DOM | jsdom | Browser-like DOM for automated tests |

The application does not use a router, server framework, global state library, canvas/WebGL engine, component library, or external asset pipeline.

## 4. How to run the project

### Easiest Windows method

Double-click:

```text
Run Atlas.bat
```

The launcher checks for Node.js, installs dependencies when necessary, starts Vite on localhost, and opens the atlas in the default browser. To start without automatically opening a browser:

```powershell
.\"Run Atlas.bat" --no-open
```

### PowerShell method

From the project directory:

```powershell
npm ci
npm run dev
```

Open the localhost URL printed by Vite. Stop the server with `Ctrl+C`.

### Run tests

Run the complete test suite once:

```powershell
npm test -- --run
```

Run tests in watch mode:

```powershell
npm test
```

### Production build and preview

```powershell
npm run build
npx vite preview
```

The production output is written to `dist/`.

### Prerequisite

Install a current Node.js release that includes npm. If PowerShell cannot find `node` or `npm`, restart the terminal after installation and verify with:

```powershell
node --version
npm --version
```

## 5. User interface overview

### Main atlas

The center of the application is a scalable SVG view of the solar system. It includes:

- A luminous central Sun.
- Animated planets and moons.
- Circular and elliptical orbit lines.
- Planet labels that stay readable across zoom levels.
- A dedicated foreground SVG layer keeps every entity label above celestial artwork and effects, converting screen transforms back into root SVG coordinates so labels remain anchored to their bodies.
- The music volume control responds to wheel scrolling in 5-point increments and stops the event from zooming the atlas.
- The minimized player’s Play button also adjusts volume with the wheel and shows a temporary numeric percentage tooltip.
- The minimized volume tooltip is centered directly above the Play button.
- It now sits above the minimized player box and includes a volume symbol before the percentage.
- The minimized tooltip icon is an inline SVG that inherits the percentage text color.
- The minimized icon is slightly larger with a clearer gap before the percentage.
- Hourglass Twins use standard planet-style shared solar orbit lines and moon-style binary orbit lines; hovering or selecting/following the composite twin target highlights the binary orbit and sand beam without affecting individual twin hovers.
- Composite hover now limits the highlight to the twins’ binary orbit and sand beam; the shared solar orbit receives no hover styling and responds only to selection/focus.
- The pause/play control uses CSS-drawn bars and a triangle, avoiding platform-dependent text glyphs.
- A deterministic starfield and subtle nebulae.
- No space-dust overlay.

### Header

The header identifies the atlas and establishes its observatory/travel-guide tone. It remains visually lightweight so the system map is the primary focus.

### Information side panel

Selecting a celestial body opens a responsive information panel. On desktop it appears at the right; on narrow screens it becomes a bottom sheet.

The panel contains:

- Body name and travel-oriented tagline.
- A playful destination pitch.
- A list of attractions.
- Travel advice.
- A nearby-satellites section only when that destination actually has a cataloged satellite.
- Optional support for spoiler details when such notes are supplied.
- Previous and next destination buttons.
- A **Take me there** button that focuses and follows the selected body.

The navigation and focus controls are pinned to the bottom of the panel, independent of text length.

### Settings menu

A low-opacity gear sits at the upper right. When the information panel is open, the gear shifts left so it is not covered by the panel.

The menu provides two display toggles:

- Hide/show orbit lines.
- Hide/show planet names.

Pressing the gear again closes the settings menu.

### Bottom controls

The control strip provides:

- Zoom in.
- Zoom out.
- Home/reset to the Sun.
- Pause/resume the simulation.
- Simulation speeds of 0.5×, 1×, and 2×.

The bottom hint reads: **“select a world to learn more”**.

## 6. Interaction reference

| Action | Result |
| --- | --- |
| Click a normal body | Selects it and opens its information panel |
| Double-click a normal body | Selects it, opens the panel, and smoothly focuses/follows it |
| Click **Take me there** | Smoothly centers and follows the selected body |
| Click previous/next | Selects, focuses, and follows the adjacent body in the catalog order |
| Drag/pan the map | Moves the viewport and releases any current camera follow |
| Mouse wheel | Zooms around the center of the viewport, not the pointer position |
| Pinch on touch | Zooms the atlas with touch gestures |
| Home button | Smoothly focuses and follows the Sun |
| Pause | Freezes orbital simulation time |
| Speed button | Changes the simulation time multiplier |
| Quantum Moon activation | Makes the moon jump instead of selecting it directly |

### Escape-key priority

Each press performs exactly one action, in this order:

1. Close the settings menu, if open.
2. Close the information panel, if open.
3. Stop following the focused body, if following one.
4. Clear the current selection, if one remains selected.

Closing the panel therefore does not silently clear the selected body, and releasing camera focus does not clear selection either.

### Sidebar destination order

The previous and next buttons wrap through this fixed order:

1. Sun
2. Hourglass Twins
3. Ash Twin
4. Ember Twin
5. Timber Hearth
6. Attlerock
7. Brittle Hollow
8. Hollow’s Lantern
9. Giant’s Deep
10. Dark Bramble
11. Interloper
12. Quantum Moon

The Quantum Moon can only be selected through these sidebar arrows. Direct activation always makes it relocate.

The Hourglass Twins are also a composite destination: clicking near the pair or on the sand beam selects the shared system, while clicking directly on either planet still selects that individual twin.

## 7. Celestial-body catalog

| Body | Classification and presentation | Orbit configuration | Satellites in catalog |
| --- | --- | --- | --- |
| Sun | Glowing center of the system and default Home focus | Stationary system origin | None |
| The Hourglass Twins | Composite binary-system destination and sand-beam spectacle | Shared barycenter radius 170, period 30, phase 3.8, counterclockwise; internal binary period 18, clockwise | Ash Twin, Ember Twin |
| Timber Hearth | Green/blue home world | Radius 260, period 42, phase 0.35, counterclockwise | The Attlerock |
| The Attlerock | Small rocky moon | Local radius 28, period 10, phase 1.2, counterclockwise | None |
| Brittle Hollow | Dark-blue fractured world with glowing cracks | Radius 370, period 58, phase 2.3, counterclockwise | Hollow’s Lantern |
| Hollow’s Lantern | Volcanic moon | Local radius 35, period 13, phase 0.5, counterclockwise | None |
| Giant’s Deep | Large green, turbulent world | Radius 470, period 74, phase 4.7, counterclockwise | None |
| Ash Twin | One half of the Hourglass Twins | Shared barycenter radius 170, period 30, phase 3.8, counterclockwise | None |
| Ember Twin | Other half of the Hourglass Twins | Shared barycenter radius 170, period 30, phase 3.8, counterclockwise | None |
| Dark Bramble | Large dark world with icy fractures/vines | Radius 570, period 118, phase 5.45, counterclockwise | None |
| The Interloper | Icy comet with an anti-solar tail | Semi-major radius 690, period 160, phase 0.25, eccentricity 0.82, clockwise | None |
| Quantum Moon | Elusive moon that changes host | Dynamically orbits one eligible host at local radius 64, period 90, randomized direction | None |

Every catalog entry also contains spoiler-conscious travel content: a tagline, pitch, attraction list, travel tips, and satellite IDs.

### Interloper orbit details

The Interloper uses an eccentric ellipse rather than a circular path.

- Semi-major radius: 690 atlas units.
- Eccentricity: 0.82.
- Periapsis: 124.2 units from the Sun.
- Apoapsis: 1255.8 units from the Sun.
- The ellipse is shifted left, placing its closest approach between the Sun and Timber Hearth’s orbit.
- Its unselected orbit opacity is 0.26, deliberately subtler than regular planet orbits but still visible.
- Its selected orbit opacity remains 0.72.
- Its tail always points away from the Sun.

### Quantum Moon behavior

The Quantum Moon is intentionally different from every other target:

- Its local orbit radius is 64 atlas units, keeping it farther from each host planet.
- Each relocation also randomizes its local phase around the new host.
- Hover escapes are armed on pointer entry and disarmed after a jump; the pointer must leave and re-enter before another jump.

- It chooses among Timber Hearth, Brittle Hollow, Giant’s Deep, the Hourglass Twins, and Dark Bramble as eligible hosts.
- A new host never repeats the current host.
- It orbits very slowly, choosing clockwise or counterclockwise at random on initial placement and every jump.
- Hovering or approaching it can make it jump.
- It can keep jumping indefinitely; there is no five-jump stabilization limit.
- A 450 ms cooldown prevents uncontrolled repeat triggering.
- Fresh pointer movement is required for subsequent proximity escapes.
- Clicking or keyboard-activating it relocates it rather than selecting it.
- Previous/next sidebar navigation is the only way to select it.
- If the camera is following it, the camera follows its new position after a jump.

### Hourglass Twins behavior

Ash Twin and Ember Twin share a barycentric orbit. Their local positions are computed as a binary pair, and animated sand grains transfer between them. The sand transfer is reversible and respects reduced-motion preferences.

The shared barycenter moves counterclockwise around the Sun. The two twins retain their clockwise local rotation around one another.

## 8. Camera system

The camera is represented by an `x` offset, `y` offset, and zoom value.

### Limits and timing

- Minimum zoom: 0.45×.
- Maximum zoom: 2.8×.
- Button zoom factor: 1.2 per step.
- Wheel zoom rate: 0.0015.
- Drag threshold: 4 client pixels.
- Focus transition: 220 ms with cubic ease-out.

Focus transitions become immediate when the operating system requests reduced motion.

### Coordinate transforms

The camera library supplies reversible world-to-screen and screen-to-world transforms. A separate viewport utility maps SVG coordinates to client coordinates and accounts for scaling and letterboxing. This separation keeps selection, proximity detection, panning, and camera focus consistent.

### Focus and follow

Focusing is not a one-time jump. The camera first interpolates smoothly to the target, then reads the body’s live world position every animation frame. It therefore remains centered while the body continues orbiting. With the desktop information panel open, the focus point shifts left to the center of the unobscured map area; with the mobile bottom sheet open, it shifts upward to the center of the remaining map area. Both offsets smoothly return to screen center when the panel closes. Manual panning cancels follow mode, allowing the user to explore freely.

The solar-system component exposes an imperative camera API:

- `zoomIn()`
- `zoomOut()`
- `resetCamera()`
- `focusBody(id)`
- `unfocusBody()`
- `getWorldPositions()`
- `screenToWorld(point)`
- `worldToScreen(point)`

## 9. Simulation and orbital model

The simulation clock advances from animation-frame timestamps. The chosen speed multiplier scales elapsed time; speed zero pauses it.

The orbit utilities calculate:

- Circular positions.
- Elliptical positions.
- Binary-body positions.
- Reversible sand-transfer progress.
- Anti-solar comet-tail vectors.
- Complete Hourglass Twins frame state.
- Complete Interloper frame state.
- Point composition for parent/local orbit nesting.

Moon positions are composed from their host’s current world position plus a local orbit. A live world-position registry lets the camera and pointer-interaction systems use the same moving coordinates rendered by the components.

Orbit direction is explicit in SVG screen space: `1` means clockwise and `-1` means counterclockwise. The five planetary systems and the two regular moons use counterclockwise motion; the Interloper uses clockwise motion; the Quantum Moon holds one randomly chosen direction until its next relocation.

### Orbit-line appearance

- Normal planet orbit opacity: 0.31.
- Unselected moon orbit opacity: 0.26.
- Unselected Interloper orbit opacity: 0.26.
- Selected circular orbit opacity: 0.82.
- Selected Interloper orbit opacity: 0.72.
- Orbit lines have no shadow or duplicate “ghost” stroke.

## 10. State and data flow

`App.tsx` owns the main UI state:

- Selected celestial-body ID.
- Simulation speed.
- Paused/running state.
- Quantum Moon status.
- Settings-menu visibility.
- Information-panel visibility.
- Orbit-line visibility.
- Planet-label visibility.

The principal flow is:

```text
App state
  ├─ SolarSystem receives selection, clock speed, and visibility settings
  │    ├─ animation clock produces simulation time
  │    ├─ orbit components calculate and render live positions
  │    ├─ position registry exposes those coordinates
  │    └─ camera/pointer logic consumes the live positions
  ├─ InfoPanel receives the selected catalog entry
  ├─ SettingsMenu updates display preferences
  └─ Controls call the SolarSystem camera API and update simulation state
```

Selection, panel visibility, and camera following are deliberately independent. This is what makes the ordered Escape behavior possible.

## 11. Source-code architecture

### Application entry points

| File | Responsibility |
| --- | --- |
| `index.html` | Vite HTML entry document |
| `src/main.tsx` | Creates the React root and mounts the application |
| `src/App.tsx` | Top-level state, event coordination, layout, and component wiring |
| `vite.config.ts` | React plugin and Vitest configuration |

### Core components

| Component | Responsibility |
| --- | --- |
| `AtlasHeader.tsx` | App title and header presentation |
| `SolarSystem.tsx` | Main scene, live simulation, camera coordination, input routing, focus transitions, target arbitration, and world-position registry |
| `CelestialBody.tsx` | Reusable procedural planet rendering, hit target, label, hover/selection visuals, and activation events |
| `Orbit.tsx` | Circular orbit-line rendering |
| `Moon.tsx` | Host-relative moon orbit and position composition |
| `HourglassTwins.tsx` | Binary planets and reversible animated sand stream |
| `Interloper.tsx` | Eccentric comet motion, icy rendering, tail, and interaction target |
| `QuantumMoon.tsx` | Quantum Moon orbit, instability visuals, and escape interactions |
| `Starfield.tsx` | Deterministic background stars and nebulae |
| `InfoPanel.tsx` | Destination pamphlet, optional satellite section, navigation, and focus controls |
| `SettingsMenu.tsx` | Gear menu and display toggles |
| `Controls.tsx` | Camera, Home, pause, and simulation-speed controls |

### Hooks

| Hook | Responsibility |
| --- | --- |
| `useAnimationClock.ts` | Animation-frame clock with adjustable speed and pause behavior |
| `useMapCamera.ts` | Camera state, mouse/touch panning, pinch zoom, center-based wheel zoom, pointer capture, and drag detection |

### Libraries

| Module | Responsibility |
| --- | --- |
| `camera.ts` | Camera types, transforms, zoom clamping, zoom math, and reset behavior |
| `orbits.ts` | All orbit, binary, sand-transfer, and comet-frame math |
| `quantum.ts` | Host choice, no-repeat randomization, proximity tests, cooldown state, and client/world conversion |
| `selectableTargets.ts` | Overlapping-hit arbitration, nearest-target selection, and stable tie-breaking |
| `svgViewport.ts` | SVG/client scale mapping, view-box data, minimum hit radii, and minimum label sizes |
| `worldPositions.ts` | Mutable live registry and immutable position snapshots |

### Data and types

| File | Responsibility |
| --- | --- |
| `src/data/celestialBodies.ts` | Catalog IDs, body metadata, orbit configurations, travel copy, and satellite relationships |
| `src/types/celestial.ts` | Shared `Point`, orbit, and celestial-body types |

### Styling

| File | Responsibility |
| --- | --- |
| `src/styles/global.css` | Reset, root sizing, global colors, and full-viewport behavior |
| `src/styles/atlas.css` | SVG scene, bodies, orbits, labels, glow effects, and map interaction styling |
| `src/styles/ui.css` | Header, side panel, settings, controls, buttons, responsive rules, and accessibility utilities |

### Project documentation and launch files

| File | Responsibility |
| --- | --- |
| `README.md` | Concise setup and usage guide |
| `PROJECT_REPORT.md` | This complete technical and product report |
| `Run Atlas.bat` | Windows dependency check and development-server launcher |
| `docs/superpowers/specs/2026-08-27-outer-wilds-planetary-atlas-design.md` | Original product/design specification |
| `docs/superpowers/plans/2026-08-27-outer-wilds-planetary-atlas.md` | Original implementation plan |

### TypeScript configuration

The project uses strict TypeScript settings, including:

- `strict`
- `noImplicitAny`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- ES2022 target
- DOM libraries
- Bundler-style module resolution
- Isolated modules
- No TypeScript file emission; Vite performs bundling

## 12. Visual design details

### Celestial bodies

All bodies are made from SVG primitives, gradients, masks, filters, and CSS. Each has a recognizable visual treatment. Brittle Hollow specifically uses a dark-blue palette rather than a light brown/gray one:

- Main sphere: `#263e72`
- Dark core: `#080d2c`
- Cracks: `#788fdf`

Attlerock uses a warmer brown-gray sphere (`#aa9475`) with muted brown craters so it is visually distinct from the Quantum Moon’s cool gray palette. The Quantum Moon keeps its procedural swirl/mottle paths but no longer renders the two circular crater dots.

### Hover and selection

Hovered, keyboard-focused, and selected bodies grow to approximately 1.08× and gain brightness/glow. There are no dotted hover or focus rings around bodies. The selected body retains the same emphasized glow/grow character used on hover.

### Starfield

The background contains 108 deterministically placed stars and two nebula layers. Deterministic generation prevents the star pattern from changing on rerender. The previous space-dust effect is absent.

### Responsive layout

- Desktop: information panel on the right.
- At 760 px and below: panel becomes a bottom sheet.
- At 470 px and below: control layouts stack more aggressively.
- The settings gear relocates based on panel state.
- Map hit targets and label sizes are adjusted to remain usable when the SVG scales.
- Labels have no outline stroke; their fill and hover glow remain readable at the minimum screen size.

## 13. Accessibility and input support

The implementation includes:

- Accessible names for icon-only controls.
- A custom SVG favicon is served from `public/favicon.svg` and linked in `index.html`.
- First visit presents a custom spoiler warning; the choice is persisted in localStorage and controls whether the Quantum Moon is rendered or navigable.
- The spoiler prompt uses a prominent “Remember: You cannot unsee spoilers.” warning, a bold settings-menu hint, and a golden “Keep spoilers hidden” safe choice.
- The settings menu exposes this preference as a “Show spoilers” / “Hide spoilers” toggle.
- Spoiler mode also gates the close counterclockwise Sun Station orbit, artwork, selection, focus, and navigation entry.
- Sun Station artwork uses a broad solar crossbar, central spine, blue observation dome, and warm gold/orange structural panels inspired by the supplied reference image.
- The lower station body ends in a pointed fin silhouette, with no decorative circle around the station.
- The station silhouette follows the supplied reference with a blue canopy, gold crossbar, central arrow-like body, side wings, and twin lower rails.
- The latest silhouette tuning widens the crossbar, lowers the canopy behind it, and extends the pointed center and support rails.
- The paired lower support legs use a thinner 1.1px stroke for a lighter silhouette.
- Each leg now keeps only its outer vertical support; inner return segments were removed.
- The gold lower body is cut off above the darker central spine, removing its pointed bottom tip.
- The top horizontal crossbar was narrowed to a 28-unit span.
- The side wings/triangles were reduced to a smaller 22-unit span.
- Sun Station orientation updates continuously so its feet point toward the Sun and its dome points away.
- White Hole Station is stationary at (-585, 35), hidden when spoilers are off, and selectable/focusable between Dark Bramble and the Interloper when spoilers are on.
- White Hole is a separate stationary entity at (-1200, 35), hidden with spoilers off and selectable/focusable with spoilers on.
- White Hole Station remains stationary in space while its artwork rotates independently on its own axis every 12 seconds.
- The station’s rotation pivot is explicitly the center of `white-hole-station-ring` at local coordinates (0, 0).
- Sun focus/hover removes the generic parent drop-shadow filter from the artwork group; brightness and glow are applied to the surface instead so corona strokes remain crisp.
- Sun corona remains in its own layer and follows the enlarged Sun during focus/hover without the competing counter-scale that caused a visible in/out jump.
- Offscreen selected-body indicators project live world positions to the map edge, point toward the target, and avoid the open info panel’s occupied area; an unselected offscreen system is labeled “Solar System.”
- Offscreen labels anchor inward on the left/right edges so the full entity name remains inside the map window.
- Offscreen labels sit slightly below their chevrons for clearer separation.
- Panel safe areas are measured from actual stage/panel boundaries, keeping indicators to the panel’s left edge when the panel covers a body.
- The indicator layer sits above the info panel stacking layer so the panel-edge chevron remains visible.
- Indicator placement measures the mounted panel boundary directly, keeping the chevron aligned just inside the map beside the settings control.
- Desktop positioning adds the panel width to the chevron’s right inset; mobile positioning adds the panel height below the map, while closed panels restore zero inset.
- Right-edge indicators use an explicit CSS `right` offset so the panel-width distance is applied even during camera or layout updates.
- Entities whose projected point falls inside the open panel are explicitly redirected to the panel edge (or mobile sheet edge) for the indicator.
- Desktop top/bottom indicators retain their natural x-position but clamp leftward before reaching the panel.
- Their panel-side clamp uses the same 46px visual edge distance as right-edge indicators.
- Offscreen labels are edge-aware: below top chevrons, above bottom chevrons, and beside left/right chevrons with corner-safe alignment.
- Chevron placement now uses one invisible usable-window rectangle: viewport margins plus panel insets define all four edges, with no edge-specific override jumps.
- Chevron centers are inset along their pointing vector so the arrow tip, not its center, touches the usable-window border.
- Panel-open window insets now derive directly from the panel’s map-local left/top boundaries, matching the debug border exactly.
- Offscreen is now defined solely as a projected point outside the shared indicator-window rectangle used by the chevron.
- Chevron coordinates ease over 220ms when panel changes resize the indicator window, respecting reduced-motion preferences.
- The indicator window uses a 70px top and bottom margin, keeping vertical chevrons clear of the header and bottom controls.
- Quantum Moon’s initial frame is rendered in a layout effect so it never flashes at the Sun’s origin before moving to its selected host.
- Info panels now animate in and out over 220ms; dismissal keeps the panel mounted but inert until its matching desktop/mobile exit animation completes.
- The info-panel close control uses a CSS-drawn cross rather than a font glyph, ensuring it is geometrically centered on all systems.
- A compact custom bottom-right soundtrack player controls the supplied Outer Wilds YouTube playlist, shows the current title and a readable live elapsed/total time centered beside its controls when available, and leaves a visible gap below the raised information panel. After Play is requested, its play control waits 500ms before showing an accessible loading spinner, preventing flicker for fast starts; the minimized status simultaneously reads “Loading…”. A hover-revealed chevron minimizes it into a small playback-status pill with play/pause and restore controls; this state persists locally, and the information panel expands vertically into the freed space while keeping its gap above the player. Stop rewinds to the beginning, while a mute button and hover/focus volume slider control YouTube playback volume; muting moves the slider to zero and unmuting restores its previous value. The slider stays open for two seconds after the pointer leaves, closes on outside clicks, displays the live 0–100 volume value, and persists both the selected volume and last audible level locally across page loads. While it plays, the Sun responds with a subtle single pulse whose 0.6–0.72 second interval varies slightly; alternating pulse animations preserve the corona’s continuous motion and the effect respects reduced-motion preferences. Its play, pause, previous, and next icons are CSS-drawn rather than font glyphs for consistent rendering. Settings persist an Enable autoplay on load option; otherwise playback begins only after Play is pressed. On mobile, it expands to the available screen width for touch usability.
- Spoilers-off next/previous navigation excludes the hidden White Hole as well as other spoiler-only entities, so Dark Bramble advances to Interloper then Sun.
- Labels beside left/right chevrons are nudged 4px downward for visual alignment.
- Sun Station labels remain below the station because only the artwork layer rotates; the label stays in the translated parent group.
- Entity labels use fill and hover glow without an outline stroke.
- Visible entity labels are measured in screen space each frame; overlapping labels receive equal, clamped separation offsets and smoothly return to their default positions when clear.
- Orbital Probe Cannon is spoiler-gated and follows a clockwise local orbit around Giant’s Deep as one attached launcher/probe unit.
- The info panel is immediately hidden when its selected spoiler-gated entity is hidden.
- Quantum Moon relocations retain the SVG node between jumps, preventing a transient reset to the Sun before the new host position is applied.
- Hiding that panel also closes the settings menu and returns the gear trigger to its right-side position.
- OPC artwork and hit radius were reduced slightly to 11 and 22 atlas units respectively.
- The OPC artwork now applies a 0.50× SVG scale so its visible geometry matches the reduced radius.
- OPC now orbits closer to Giant’s Deep at a 48-unit local radius.
- The OPC rotates to align its tip with the clockwise orbital travel direction.
- The spoiler toggle is listed last in the settings menu with a separator above it.
- Orbit-line and planet-name controls also switch between “Show” and “Hide” labels to reflect their current state.
- The settings order is planet names, orbit lines, then the separated spoiler control.
- `aria-pressed` state on toggle and speed controls.
- Screen-reader-only live status regions for selection/simulation feedback.
- Keyboard activation for applicable interactive targets.
- Visible UI focus treatment where appropriate.
- Minimum effective body hit radius of 22 screen pixels.
- Minimum effective label size of 14 screen pixels.
- Reduced-motion handling for camera interpolation and animated effects.
- Pointer handling for mouse, pen, and touch.
- Pinch zoom and drag/pan support.

The Quantum Moon remains intentionally nonstandard: keyboard activation triggers its escape just like pointer activation, while the sidebar remains the accessible path for selecting it.

## 14. Automated test coverage

The current suite contains **20 test files**. Coverage is behavior-focused and includes:

1. Top-level application rendering and integration.
2. Selecting bodies and opening/closing the information panel.
3. Sidebar previous/next navigation order and wrapping.
4. Camera focus through buttons, Home, and double-click.
5. Smooth focus transitions, camera following, and desktop/mobile panel-aware focus centering.
6. Manual pan releasing focus.
7. Center-based mouse-wheel zoom.
8. Mouse, touch, and pinch camera input.
9. Escape-key priority and one-action-per-press behavior.
10. Settings-menu visibility, outside-click dismissal, display toggles, and localStorage persistence.
11. Simulation pause and speed changes.
12. Camera coordinate transforms and zoom clamping.
13. Circular, elliptical, binary, and comet orbit math, including explicit direction handling.
14. Interloper periapsis and tail behavior.
15. Quantum host selection, randomized orbit direction, no-repeat jumps, proximity escape, cooldown, indefinite jumping, and focused following.
16. Hourglass Twins, Interloper, and Quantum Moon frame/render behavior.
17. SVG ID uniqueness across repeated components.
18. Starfield determinism and confirmation that space dust is absent.
19. Catalog validation, unique IDs, travel content, and satellite relationships.
20. Minimum screen-space hit-target and label sizing.
21. Overlapping target arbitration and stable tie-breaking.
22. World-position registry snapshots.

Vitest is configured with a Node test environment; component tests provide the DOM/harness facilities they require through jsdom and Testing Library.

## 15. Build and deployment characteristics

The application builds as a static Vite site. Hosting requires only the files generated in `dist/`; there is no server-side runtime requirement after the build.

Suitable deployment targets include any static web host. Because the project has no route hierarchy or backend endpoints, deployment configuration is minimal. The site does not currently include a hosting-provider-specific configuration.

## 16. Data, assets, privacy, and network behavior

- All catalog data is stored locally in TypeScript source.
- There is no database.
- There are no user accounts or authentication flows.
- There are no cookies or persistent user preferences.
- There is no analytics or telemetry code.
- There are no runtime API calls.
- There are no external image, audio, font, or game-asset dependencies.
- No user-entered information is collected or transmitted.
- Refreshing the page resets selection, camera, settings, and simulation controls.

## 17. Known limitations and maintenance notes

### Intentional limitations

- Distances, sizes, speeds, and orbital configurations are stylized rather than scientifically or game-scale accurate.
- Travel copy is spoiler-conscious and intentionally avoids deep story explanations.
- Orbit-line and planet-name display settings persist in localStorage and restore on the next visit.
- Quantum Moon host selection uses runtime randomness, so its jump sequence is not reproducible between sessions.
- The atlas is a single scene and has no URL routing or shareable per-body deep links.
- No audio is included.

### Documentation discrepancy

The current `README.md` still describes an older Quantum Moon rule in which five escapes led to stabilization. The implementation and tests now use the updated rule: **the Quantum Moon jumps indefinitely**. This report documents the actual current behavior.

### Extension considerations

The existing architecture supports future additions such as:

- More celestial bodies or satellite relationships through the catalog.
- Additional travel copy or optional spoiler layers.
- Persistent display preferences.
- Deep links to selected bodies.
- More orbital phenomena implemented in the orbit utility layer.
- Alternate visual themes without changing simulation logic.

New moving targets should register their live positions with the world-position registry so camera following, hit detection, and pointer proximity continue to agree.

## 18. Project directory map

```text
Outer Wilds Atlas/
├─ docs/
│  └─ superpowers/
│     ├─ plans/
│     └─ specs/
├─ src/
│  ├─ components/
│  │  ├─ AtlasHeader.tsx
│  │  ├─ CelestialBody.tsx
│  │  ├─ Controls.tsx
│  │  ├─ HourglassTwins.tsx
│  │  ├─ InfoPanel.tsx
│  │  ├─ Interloper.tsx
│  │  ├─ Moon.tsx
│  │  ├─ Orbit.tsx
│  │  ├─ QuantumMoon.tsx
│  │  ├─ SettingsMenu.tsx
│  │  └─ Starfield.tsx
│  ├─ data/
│  │  └─ celestialBodies.ts
│  ├─ hooks/
│  │  ├─ useAnimationClock.ts
│  │  └─ useMapCamera.ts
│  ├─ lib/
│  │  ├─ camera.ts
│  │  ├─ orbits.ts
│  │  ├─ quantum.ts
│  │  ├─ selectableTargets.ts
│  │  ├─ svgViewport.ts
│  │  └─ worldPositions.ts
│  ├─ styles/
│  │  ├─ atlas.css
│  │  ├─ global.css
│  │  └─ ui.css
│  ├─ types/
│  │  └─ celestial.ts
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ vite-env.d.ts
├─ index.html
├─ package.json
├─ package-lock.json
├─ README.md
├─ PROJECT_REPORT.md
├─ Run Atlas.bat
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

Test files are colocated with the relevant application modules and use `.test.ts` or `.test.tsx` suffixes.

## 19. Package scripts

| Script | Command | Result |
| --- | --- | --- |
| Development | `npm run dev` | Starts the Vite development server |
| Tests | `npm test` | Runs Vitest in its normal interactive/watch mode |
| One-time tests | `npm test -- --run` | Runs all tests once and exits |
| Production build | `npm run build` | Runs TypeScript project checks and creates the Vite production bundle |

## 20. Final assessment

The project is a complete, focused interactive atlas with a clear visual identity and a surprisingly rich interaction model for a small client-only codebase. Its strongest technical characteristics are the separation of camera math from rendering, the shared live-position registry, the composable orbit calculations, and the extensive behavior tests around unusual interactions such as the Quantum Moon and ordered Escape handling.

The primary maintenance item is keeping the concise README synchronized with behavior changes. The implementation itself is structured so that new bodies, copy, and orbital effects can be added without replacing the core architecture. Display names now use “The Attlerock,” “The Hourglass Twins,” and “The Interloper.”
The small Hourglass binary orbit explicitly matches moon orbit styling, including non-scaling stroke geometry, while the large solar orbit uses the standard planet orbit styling.

Selecting either individual Hourglass Twin highlights their shared binary orbit without applying the composite sand-beam effect.

- Simulation speed controls now include faster 4x and 8x options.
