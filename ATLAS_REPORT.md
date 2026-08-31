# Outer Wilds Planetary Atlas — Technical & Mathematical Report

This report documents the numerical model currently implemented by the atlas. Values are **atlas units** and **simulation seconds**, not canonically measured astronomical values. The project is an authored visualization: distances, sizes, periods, and speeds are tuned for readability and interaction.

## Coordinate system and formulas

- The scene is an SVG view box from x = -720..720, y = -430..430 (1,440 × 860 units).
- The Sun is the world origin (0, 0).
- SVG positive y points down the screen. Increasing angle is visually clockwise; decreasing angle is visually counterclockwise.
- A circular orbit uses θ(t) = phase + direction × 2π × frac(t / period).
- Circular position is (r cos θ, r sin θ).
- Angular speed is ω = 2π / period radians per simulation second.
- Circular tangential speed is v = 2πr / period atlas units per simulation second.
- A moon's world position is host position + local moon position.
- Distances are nominal orbital distances unless marked variable. Instantaneous diagonal distance changes as bodies move.
- direction = -1 is counterclockwise; direction = 1 is clockwise.

## Visual size and interaction size

The visual radius is the SVG artwork radius. The hit radius is the minimum interaction radius before camera-scale compensation.

| Entity | Visual radius | Hit radius | Satellites / host |
| --- | ---: | ---: | --- |
| Sun | 43 | 56 | None |
| Hourglass Twins (composite) | 0 (no separate artwork) | 64 | Ash Twin + Ember Twin |
| Timber Hearth | 19 | 30 | Attlerock |
| Attlerock | 8 | 23 | Timber Hearth |
| Brittle Hollow | 23 | 32 | Hollow’s Lantern |
| Hollow’s Lantern | 9 | 23 | Brittle Hollow |
| Giant’s Deep | 28 | 37 | None |
| Ash Twin | 18 | 30 | Hourglass barycenter |
| Ember Twin | 18 | 30 | Hourglass barycenter |
| Dark Bramble | 26 | 35 | None |
| Interloper | 12 nucleus (+ coma artwork) | 23 | None |
| Quantum Moon | 10 | 23 | Dynamic host |

## Entity-by-entity model

### Sun

- Type: stationary solar primary.
- World position: (0, 0) at all times.
- Distance from Sun: 0.
- Rotation/orbit period: none; it is not simulated as an orbiting body.
- Visual radius: 43; hit radius: 56.
- Camera role: default Home/reset focus target.
- Physics: surface gravity, mass, luminosity, temperature, and physical rotation are not modeled.

### Hourglass Twins — shared system

- Composite selection target: the shared barycenter and sand beam can be selected as “Hourglass Twins”; exact planet hit areas retain priority for Ash Twin or Ember Twin.
- Composite camera focus follows the live barycenter, so the pair remains centered while their binary orbit evolves.
- Composite visual radius: 0 (no third planet is drawn); composite hit radius: 64 atlas units.
- Catalog satellites: Ash Twin and Ember Twin.
- Ash Twin and Ember Twin share one barycenter orbit.
- Barycenter orbit radius: 170.
- Barycenter period around the Sun: 30 seconds.
- Barycenter angular speed: 0.2094 rad/s.
- Nominal barycenter tangential speed: 35.60 units/s.
- Solar direction: counterclockwise (-1).
- Each twin is 29 units from the barycenter (58 units center-to-center separation).
- Closest nominal neighboring planetary orbits: Timber Hearth at radius 260, radial gap 90; Brittle Hollow at 370, radial gap 200.
- Internal binary period: 18 seconds, clockwise, with opposite local positions.
- Internal angular speed: 0.3491 rad/s.
- Sand transfer period: 44 seconds; source/destination visual radii vary from 23 to 13 while preserving a combined radius of 36.
- Six animated sand grains are rendered along the transfer curve.
- Individual visual radius: 18; hit radius: 30.
- Physics: masses, gravity, atmosphere, and real orbital mechanics are not modeled.

### Ash Twin

- Uses the shared Hourglass barycenter orbit above.
- Nominal distance from the Sun: 170 to its barycenter, approximately 141..199 units including its binary offset.
- Nearest distinct planetary orbit: Timber Hearth, nominal radial gap 90.
- Second-nearest distinct planetary orbit: Brittle Hollow, nominal radial gap 200.
- Distance to Ember Twin: 58 units center-to-center.
- Solar period: 30 seconds; solar direction: counterclockwise.
- Local binary period: 18 seconds; local direction: clockwise.
- Nominal barycentric angular speed: 0.2094 rad/s; local angular speed: 0.3491 rad/s.
- Visual radius: 18; hit radius: 30.

### Ember Twin

- Uses the same shared orbit and binary parameters as Ash Twin.
- Nominal distance from the Sun: 170 to its barycenter, approximately 141..199 units including its binary offset.
- Nearest distinct planetary orbit: Timber Hearth, nominal radial gap 90.
- Second-nearest distinct planetary orbit: Brittle Hollow, nominal radial gap 200.
- Distance to Ash Twin: 58 units center-to-center.
- Solar period: 30 seconds; solar direction: counterclockwise.
- Local binary period: 18 seconds; local direction: clockwise.
- Visual radius: 18; hit radius: 30.

### Timber Hearth

- Circular solar orbit: radius 260, phase 0.35 radians.
- Period: 42 seconds; angular speed: 0.1496 rad/s.
- Direction: counterclockwise (-1).
- Nominal tangential speed: 38.90 units/s.
- Nearest planetary orbit: Hourglass barycenter, radial gap 90.
- Second-nearest planetary orbit: Brittle Hollow, radial gap 110.
- Satellite: Attlerock at local radius 28.
- Nominal Timber-to-Attlerock distance: 28 units; maximum Sun-distance from the local offset is approximately 288.
- Visual radius: 19; hit radius: 30.
- Physics: gravity, mass, atmosphere, rotation, and surface geography are visual fiction rather than simulation inputs.

### Attlerock

- Host: Timber Hearth.
- Local circular orbit radius: 28, phase 1.2 radians.
- Period around Timber Hearth: 10 seconds; angular speed: 0.6283 rad/s.
- Direction: counterclockwise (-1).
- Nominal local tangential speed: 17.59 units/s.
- Distance from the Sun varies with Timber Hearth's orbit: nominal bounds 232..288 units using 260 ± 28.
- Closest nominal planetary reference: Timber Hearth itself, 28 units; next planetary orbit is the Hourglass system, nominal radial gap 62 from Attlerock's local outer position.
- Visual radius: 8; hit radius: 23.

### Brittle Hollow

- Circular solar orbit: radius 370, phase 2.3 radians.
- Period: 58 seconds; angular speed: 0.1083 rad/s.
- Direction: counterclockwise (-1).
- Nominal tangential speed: 40.08 units/s.
- Nearest planetary orbit: Giant’s Deep, radial gap 100.
- Second-nearest planetary orbit: Timber Hearth, radial gap 110.
- Satellite: Hollow’s Lantern at local radius 35.
- Nominal Brittle-to-Lantern distance: 35 units; Sun-distance varies approximately 335..405.
- Visual radius: 23; hit radius: 32.
- Palette: dark-blue sphere/core and blue-violet glowing cracks.

### Hollow’s Lantern

- Host: Brittle Hollow.
- Local circular orbit radius: 35, phase 0.5 radians.
- Period around Brittle Hollow: 13 seconds; angular speed: 0.4833 rad/s.
- Direction: counterclockwise (-1).
- Nominal local tangential speed: 16.92 units/s.
- Distance from the Sun varies approximately 335..405 units using 370 ± 35.
- Closest nominal planetary reference: Brittle Hollow itself, 35 units; next reference is Giant’s Deep, nominal radial gap 65 from the local outer position.
- Visual radius: 9; hit radius: 23.

### Giant’s Deep

- Circular solar orbit: radius 470, phase 4.7 radians.
- Period: 74 seconds; angular speed: 0.0849 rad/s.
- Direction: counterclockwise (-1).
- Nominal tangential speed: 39.91 units/s.
- Nearest planetary orbit: Dark Bramble, radial gap 100.
- Second-nearest planetary orbit: Brittle Hollow, radial gap 100 (a tie).
- No cataloged satellite.
- Visual radius: 28; hit radius: 37.

### Dark Bramble

- Circular solar orbit: radius 570, phase 5.45 radians.
- Period: 118 seconds; angular speed: 0.0532 rad/s.
- Direction: counterclockwise (-1).
- Nominal tangential speed: 30.35 units/s.
- Nearest planetary orbit: Giant’s Deep, radial gap 100.
- Second-nearest planetary orbit: Brittle Hollow, radial gap 200.
- No cataloged satellite.
- Visual radius: 26; hit radius: 35.

### Interloper

- Eccentric elliptical solar orbit: semi-major radius 690, phase 0.25 radians, eccentricity e = 0.82.
- Period: 160 seconds; mean angular speed: 0.0393 rad/s.
- Direction: clockwise (1).
- Semi-minor axis: 690 × √(1 − 0.82²) ≈ 396.75 units.
- Periapsis: 690(1 − 0.82) = 124.2 units from the Sun.
- Apoapsis: 690(1 + 0.82) = 1,255.8 units from the Sun.
- Ellipse center offset: -690 × 0.82 = -565.8 units on x, placing closest approach between the Sun and Timber Hearth’s orbit.
- Nearest nominal planet at periapsis: Hourglass system, radial gap 45.8 from the barycenter radius; next: Timber Hearth, radial gap 135.8. These are phase-dependent live distances.
- Tail vector: normalized position vector, so the tail always points directly away from the Sun.
- Visual nucleus radius: 12 with larger coma/tail artwork; hit radius: 23.

### Quantum Moon

- Dynamic host set: Timber Hearth, Brittle Hollow, Giant’s Deep, Hourglass Twins barycenter, and Dark Bramble.
- Host selection excludes the current host whenever alternatives exist.
- Local circular orbit radius: 64.
- Relocations randomize local phase as well as host and direction.
- Hover relocation requires a leave/re-enter cycle: remaining inside the proximity radius cannot trigger repeated jumps.
- Period: 90 seconds; angular speed magnitude: 0.0698 rad/s.
- Nominal local tangential speed: 3.35 units/s.
- Direction: randomly chosen clockwise or counterclockwise on initial placement and rerolled on every jump.
- Distance from the Sun is host-dependent. Nominal host-radius ranges are approximately 122..618 units before local offset.
- Distance to its current host: 48 units.
- No fixed two-closest-planets value exists because the host changes.
- Hover proximity threshold: 34 client pixels.
- Escape cooldown: 450 milliseconds, with fresh pointer movement required for another proximity escape.
- Jump count is unbounded; each jump resets local phase to the current simulation time.
- Visual radius: 10; hit radius: 23.

The Quantum Moon artwork retains its procedural swirl/mottle paths and rim while omitting the two circular crater-dot elements.

## Shared simulation and interaction constants

| Constant | Value | Meaning |
| --- | ---: | --- |
| View box | 1440 × 860 | World drawing rectangle |
| Minimum zoom | 0.45× | Camera lower bound |
| Maximum zoom | 2.8× | Camera upper bound |
| Button zoom factor | 1.2× | Zoom-in/out multiplier |
| Wheel zoom rate | 0.0015 | Exponential wheel scaling coefficient |
| Drag threshold | 4 px | Minimum pointer movement for panning |
| Focus transition | 220 ms | Cubic ease-out camera movement |
| Mobile panel focus offset | Half panel height plus bottom inset | Centers a followed body in the map area above the bottom sheet |
| Quantum hover threshold | 34 px | Client-space proximity trigger |
| Quantum cooldown | 450 ms | Minimum time between escapes |

Planet labels retain a 14px minimum screen size; on viewports 760px wide or smaller their outline is reduced to 1.5px for readability.
The simulation toggle icon is rendered with CSS geometry rather than a Unicode pause/play character, keeping its appearance consistent across operating systems and installed fonts.
The browser tab uses a custom SVG favicon: a glowing Sun with an orbiting Timber Hearth accent on the atlas background.
Spoiler preference key: `outer-wilds-atlas.spoilers-enabled`; absent means the first-visit prompt is shown, and `false` keeps the Quantum Moon artwork, hit target, and navigation hidden.
The prompt’s safe “Keep spoilers hidden” action uses the atlas gold accent; the gear icon is enlarged for visibility and its settings-menu hint is bold.
The settings control is labeled “Show spoilers” or “Hide spoilers” while toggling the Quantum Moon visibility preference.
Sun Station is spoiler-gated alongside the Quantum Moon: radius 92, period 18 seconds, counterclockwise, with a 24-unit hit radius.
Its SVG artwork is a compact stylized station: crossbar, central spine, observation dome, and solar-gold structural wings.
The lower body terminates in a pointed fin and has no enclosing decorative ring.
The current geometry mirrors the reference silhouette: blue canopy, horizontal crossbar, central gold arrow, side wings, and paired support rails.
The crossbar and lower point were lengthened in the latest reference pass for a closer proportion match.
The paired support-rail stroke is 1.1px.
Only the outer vertical segments of each support rail are rendered.
The gold body stops above the dark central spine rather than ending in a point.
The station crossbar spans 28 atlas units.
The side-wing triangles span 22 atlas units in the current silhouette.
At every frame, station rotation is derived from its position: feet face radially inward and the dome radially outward.

### White Hole Station

- Fixed world position: (-585, 35), inside the Interloper’s orbit and near the map’s far-left edge.
- No orbit or motion; the station is stationary.
- Artwork, selectable target, and keyboard interaction are enabled only when spoilers are enabled.
- Spoiler-enabled hit radius: 28 atlas units.

White Hole is a separate stationary anomaly at (-1200, 35), rendered and interactive only when spoilers are enabled; its hit radius is 30 atlas units.
White Hole Station’s fixed position is registered independently for camera focus.
Panel visibility is gated by the same spoiler state as the selected entity, preventing stale details when a spoiler is hidden.
Quantum relocation updates the existing SVG node in place, avoiding an origin flash at the Sun.
The settings menu closes during this transition and the trigger uses the unshifted right-side placement.
Orbital Probe Cannon uses a 48-unit, 22-second clockwise local orbit around Giant’s Deep and is rendered as one attached unit when spoilers are enabled.
Its current visual radius is 11 atlas units with a 22-unit hit radius.
Its artwork rotates with the local clockwise tangent so the probe tip points forward along the orbit.
The fixed-coordinate artwork is rendered at 0.50× scale to match that visual radius.
Its artwork has a 12-second linear self-rotation; the world position and interaction target remain fixed.
The SVG rotation origin is explicitly `(0, 0)`, the center of `white-hole-station-ring`.
The Sun corona is kept in its own layer and follows the enlarged Sun during focus/hover.
The generic focus filter is disabled on the Sun artwork group; the surface receives the brightness/glow treatment independently so the corona is not rasterized and blurred.
Offscreen navigation uses the current camera projection and clamps a pointer-transparent chevron inside the usable viewport. The selected body name is shown beside it; with no selection, the Sun/system center is used and labeled “Solar System.” Desktop panel width and mobile panel height are passed as safe-area insets so indicators never sit underneath the info panel.
Edge-aware label anchoring keeps names fully visible when the chevron is on the left or right boundary.
Labels use a small vertical gap beneath each chevron.
Safe-area insets are derived from the actual panel and stage rectangles, so covered entities are treated as offscreen at the panel boundary.
The indicator uses a higher stacking layer than the panel to remain visible at that boundary.
At runtime, the mounted panel rectangle is measured directly to place the chevron just to its left.
For desktop panels, the right safe distance is explicitly panel width plus its right margin; for mobile sheets, only the bottom safe distance is applied.
Right-edge placement writes that safe distance to CSS `right` directly, avoiding stale projected left coordinates.
If a projected entity point lies inside the panel rectangle, placement is forced to the adjacent panel edge so it cannot be hidden beneath the overlay.
When the desktop indicator is on the top or bottom edge, its x-position is preserved unless it would overlap the panel, in which case it is clamped leftward.
The clamp uses a 46px visual offset to match the right-edge indicator’s center distance.
Indicator labels sit below top edges, above bottom edges, and vertically centered beside left/right edges; corner variants align inward to remain visible.
The chevron is clamped to one invisible usable-window rectangle; panel insets shrink that rectangle when the info panel is open.
The chevron is inset by half its arrow length along the direction vector, placing its tip exactly on the rectangle edge.
When the panel is open, right/bottom limits use the panel’s direct local left/top boundaries so indicator and debug-window geometry stay identical.
Offscreen classification compares projected entity coordinates directly against the shared indicator-window rectangle.
Chevron position changes use a 220ms eased transition when the panel opens or closes; reduced-motion mode disables the transition.
The usable window has a 70px vertical margin (with the existing 34px horizontal margin), moving its top edge down and bottom edge up.
The Quantum Moon’s first position frame is applied before paint, preventing an origin-at-Sun flash on initial reveal.
Info-panel dismissal uses a matching 220ms exit animation (rightward on desktop, downward on mobile) before unmounting.
The close icon is rendered as two centered CSS strokes for consistent alignment across fonts and platforms.
The compact bottom-right music player loads the supplied Outer Wilds YouTube playlist with custom previous/play-pause/next, stop, and volume controls and reports the active title plus a readable elapsed/total time centered in the remaining control-row space when available. A down-chevron appears on hover to minimize the player into a small playback-status pill; the pill keeps play/pause and an up-chevron restore button, and its state persists locally. Stop rewinds to the beginning; the volume control toggles mute and reveals a volume slider on hover or keyboard focus. Muting moves the slider to zero and unmuting restores its previous value; the slider remains open for two seconds after the pointer leaves, closes on outside clicks, shows its live 0–100 value, and persists both the selected volume and last audible level locally across page loads. While music plays, the Sun makes a subtle single pulse on a slightly randomized 0.6–0.72 second interval; alternating pulse animations preserve the corona’s continuous motion and the effect respects reduced-motion preferences. All player icons are CSS-drawn rather than font glyphs for consistent rendering. The information panel is raised to leave a visible gap above it. The Settings menu persists an Enable autoplay on load option; otherwise it loads paused. Previous restarts after five seconds and moves to the preceding track within the first five seconds. It remains full-width on mobile for touch usability.
The visible navigation list is shared with the info panel; with spoilers off it omits White Hole, keeping the sequence Dark Bramble → Interloper → Sun.
Left/right labels include a 4px downward visual nudge.
The station label is outside the rotating artwork wrapper, so it remains upright and below the station.
It is rendered as the final settings-menu option with a separator above it.
Orbit and label controls use matching state-aware Show/Hide wording.
The display settings order is planet names followed by orbit lines, with spoilers separated below.

## What is deliberately not modeled

The atlas does not simulate real masses, surface gravity, density, atmospheric pressure, temperature, axial rotation, tidal forces, orbital inclination, collision physics, light travel time, or canonically scaled distances. “Speed” means rendered atlas-coordinate speed derived from configured period and radius. Surface gravity and other physical values should therefore be treated as **not available**, not as zero.

## Maintenance rule

Whenever an orbit radius, period, direction, visual/hit radius, special-body constant, or interaction constant changes, update this file and the summary sections of PROJECT_REPORT.md in the same change.

Display preferences are stored under the app's localStorage keys and are intentionally separate from the numerical atlas model.

