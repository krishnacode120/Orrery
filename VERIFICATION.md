# Orrery verification — 2026-10-08

## Automated verification

| Check | Result |
| --- | --- |
| `npm.cmd test -- --reporter=verbose --silent=false` | 54 passed in 7 files |
| `.\.venv\Scripts\python.exe -m pytest backend/tests -q` | 12 passed |
| `npm.cmd run build` | Passed |
| Circular orbit over 1,000 periods: max relative energy drift | 9.063741269683645e-8 |
| Verlet signed nonuniform forward/reverse sequence | Passed |
| Mercury 1PN advance vs analytic | 5.018828309921192e-7 vs 5.018812201873169e-7 rad/orbit |
| Two-stage ascent, separation, insertion and deployment | Passed |
| Insertion periapsis / apoapsis altitude | 164.09 km / 208.80 km |
| Remaining upper-stage fuel at sampled insertion | 9,497.40 kg |
| 37 presets and old-schema JSON round trips | Passed |
| Shared-memory and transferable worker contracts | Passed |
| Edit-key security and metadata/camera persistence | Passed |

New tests cover physical-radius rendering, reversible educational display transforms, Earth–Mars Hohmann time, Lambert state and numerical arrival, fuel-aware impulses and rejection atomicity, SOI transitions without teleportation, relative measurements, 18 major moons, relative-orbit God tools, moving-primary prelaunch constraints, hyperbolic excess energy, and invalid display scales.

Existing tests continue to cover RK4 convergence, rejected DP trials, tree/direct agreement, massless non-sourcing, orbital element round trips, swept contacts, collision conservation, tidal fragmentation, event-adjusted drift baselines, black-hole capture, wormhole transport, non-destructive prediction and bounded Horizons interpolation.

## Performance

The final CPU benchmark, while the application and other checks were running:

| Particles + 12 sources | Steps/second |
| --- | --- |
| 1,000 | 106.9 |
| 5,000 | 58.1 |
| 10,000 | 33.2 |

Earlier isolated runs on this machine measured approximately 367 / 140 / 58. These are integration rates, not frame rates. Browser observations in small scenes varied around 34–58 FPS depending on quality and active views. No universal 5,000-particle / 60 FPS claim is established.

Browser tests exposed blank frames during inset and quality changes. The inset now uses a scissored second camera in one WebGL context, with explicit ownership of the main/composer render pass. The Canvas is memoized and DPR changes only when the desired value changes, avoiding canvas resets during UI updates. Main, inset and high-quality views were then observed rendering together.

## Browser checks

Current upgrade checks:
- Full-window viewport; independent panel collapse; H hide/restore.
- Scientific/visibility scales, Earth close-up and full-system framing.
- Desktop and 390 × 844 layouts; canvas fills the viewport and no horizontal page overflow.
- Transfer planner calculations and epoch/duration readouts.
- Parking-orbit rocket added to the full solar system: object count rises from 27 to 28; planets and moons remain.
- Live rocket coast telemetry, navball, available delta-v and flight controls.
- Single-context tracking inset and minimap.
- Navigation history, keyboard activation and responsive panels.
- No runtime errors in the verified views. A development hot-reload type error when converting Scene to a memoized component cleared on a fresh load.

Previously retained checks:
- Reality initialization; Sandbox editing, undo, prediction, integrator selection and actual maneuver execution.
- Launch UI and evolving telemetry; the automated launch test covers complete insertion/deployment.
- SharedArrayBuffer and explicit ?fallback modes.
- Satellite telemetry/ground tracks, scenario filtering and saved/shared state.
- NASA Horizons live proxy responses and bounded series. Retained Mars comparison at 2026-10-04 00:00 UTC: 0.006683899758670762° against Horizons.
- Recording controls reached start/stop states, but the embedded browser download timed out. The output WebM has not been independently decoded.

## Model and verification limits

- A complete continuous Earth-launch-to-Mars-capture mission has not been validated end-to-end. Lambert/patched-conic estimates need course corrections; cruise presets explicitly skip launch and escape.
- Rocket physics is a changing-mass point model with approximate drag and guidance, not calibrated 6-DOF dynamics. Planned fuel-aware burns are impulses, not finite engine maneuvers.
- Landing detects surface contact; autonomous descent and terrain are not modeled.
- Moon paths/phases and pole/Greenwich conventions are approximate. The SSO-like preset does not include J2 precession.
- GPU compute gravity is unavailable. Gravity uses CPU direct/tree evaluation; particles use GPU instancing.
- Black-hole lensing is a procedural approximation, not full-scene geodesic tracing. Wormholes are experimental.
- Physical dissipation, consumed fuel, stage separation and collisions cannot be undone by negative time.
- Cross-browser touch hardware, exported video delivery/decoding and an exhaustive original-roadmap acceptance run remain deployment checks.
- Vite reports the large Three.js rendering chunk (about 980 kB minified, 264 kB gzip). Scene, mission and exploration tools are lazy chunks.
- Backend tests emit an upstream AnyIO deprecation warning and a local pytest-cache permission warning; all tests pass.

## Verification checklist

1. Start both servers from README. Confirm Earth near 1 AU in Reality; convert to Sandbox, edit Jupiter and undo.
2. Hide/restore regions and all UI. Focus Earth, a moon and a vehicle; switch Scientific/Visibility/Educational scales.
3. With collisions disabled, step forward/reverse; try each integrator and inspect accepted/rejected steps.
4. Load impact/tidal/black-hole/wormhole presets and inspect actual events, fragments and conservation baselines.
5. Load the 5,000-particle preset; inspect solver, quality and measured throughput.
6. Add a launch vehicle to the solar system, ignite, stage, reach orbit and deploy. The isolated default ascent has automated coverage.
7. Plan a transfer on an actual vehicle, inspect fuel margin and surface-intersection warnings; verify burn execution once.
8. Exercise SOI entry and target-relative maneuvers. Treat destination encounter/capture as an active flight problem.
9. Test Satellite View, ground tracks, links, prediction and maneuvers.
10. Save locally, export/import and share; verify edit-key protection and persisted vehicle/mission state.
11. Check Horizons initialization/playback, explicit fallback transport, narrow layout, keyboard help and reduced motion.
12. Save PNG and short WebM in the deployment browser; independently verify video playback.

Screenshots in docs/screenshots document actual UI states. Passing tests establishes the specific invariants above, not certification of every original feature request.
