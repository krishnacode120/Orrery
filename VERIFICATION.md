# Orrery verification — 2026-10-08

## Automated verification

| Check | Result |
| --- | --- |
| `npm.cmd test -- --reporter=verbose --silent=false` | 87 passed in 10 files |
| `.\.venv\Scripts\python.exe -m pytest backend/tests -q` | 20 passed |
| `npm.cmd run build` | Passed; 1,116 modules |
| Circular orbit over 1,000 periods: max relative energy drift | 9.063741269683645e-8 |
| Verlet signed nonuniform forward/reverse sequence | Passed |
| Mercury 1PN advance vs analytic | 5.018828309921192e-7 vs 5.018812201873169e-7 rad/orbit |
| Two-stage ascent, separation, insertion and deployment | Passed |
| Insertion periapsis / apoapsis altitude | 164.09 km / 208.80 km |
| Remaining upper-stage fuel at sampled insertion | 9,497.40 kg |
| 37 presets and old-schema JSON round trips | Passed |
| Shared-memory and transferable worker contracts | Passed |
| Edit-key security and metadata/camera persistence | Passed |

The camera suite covers camera-local movement, independent selection, immediate focus cancellation, follow offsets, pose-preserving exits from follow/chase, temporary precision/boost, pitch limits, target lock, frame-rate-independent translation damping, size/FOV focus, collision tunneling prevention, SI camera restoration, floating-origin metre offsets at Neptune, rotating surface sites, reference frames, retained barycenter pairs, and SOI arrival automation that preserves free-camera ownership.

Observation tests cover finite-disc shadows, phase/angular diameter/light delay, radio LOS/range/power behavior, ground-station coordinate frames, idealized Lagrange roots, capture/escape estimates, bounded rendezvous guidance, live maneuver components, integration-segment closest approaches, and shadow event serialization. Replay tests establish immutable exact snapshots, read-only playback, exact live-state restoration, and explicit recording limits. New backend tests cover legacy/SI cameras, navigation bounds, date bookmarks, maneuver components, and eclipse events.

Existing tests retain Kepler/JD initialization, integrators, rejected adaptive trials, tree/direct agreement, massless non-sourcing, orbital elements, collision conservation, tidal debris, adjusted drift baselines, black-hole absorption, wormholes, cloned prediction, bounded Horizons interpolation, fuel-aware burns, moving-primary launch constraints, and scenario/worker contracts.

## Performance

Final CPU benchmark on this machine, during the regression suite:

| Particles + 12 sources | Steps/second |
| --- | --- |
| 1,000 | 310.5 |
| 5,000 | 117.5 |
| 10,000 | 55.1 |

These are integration rates, not render frame rates. Results vary with concurrent load. Prior browser observations in small scenes were approximately 34–58 FPS; they do not establish the frame rate of this camera upgrade or a universal 5,000-particle / 60 FPS guarantee.

Production output: main chunk 492.25 kB / 165.22 kB gzip, lazy Scene chunk 1,007.20 kB / 271.16 kB gzip, physics worker 70.37 kB. Vite reports the large rendering chunk. Mission control and optional tools remain lazy chunks.

## Interactive verification status

**The current camera rebuild has not passed the interactive acceptance checklist.** Browser verification could not start: the computer-use kernel exits during Windows sandbox setup with `helper_unknown_error: setup refresh had errors`. No current browser acceptance result or screenshot is claimed.

The earlier published upgrade was inspected for full-window layout, panel collapse, H hide/restore, physical/visibility scales, desktop and 390 × 844 layout, Earth close-up, transfer planner, added parking-orbit rocket, live coast telemetry, minimap and single-context inset. Those observations predate this camera rebuild.

Previously retained checks include Reality/Sandbox editing, predictions and maneuvers, SharedArrayBuffer and explicit `?fallback` transport, satellite telemetry and saved/shared state, and live Horizons proxy responses. The retained Mars comparison at 2026-10-04 00:00 UTC was 0.006683899758670762° against Horizons. Recording controls reached start/stop, but the exported WebM has not been independently decoded.

## Required deployment checks

Run the complete [camera acceptance checklist](docs/camera-navigation.md), including selection without motion, focus interruption, moving-body follow/orbit, chase-to-free without jumps, near-satellite precision, Earth–Neptune travel, surface/telescope views, and UI hide/restore. Headless tests cannot establish visual smoothness, touch behavior, or rendered jitter.

Then exercise:

1. Reality initialization near 1 AU; Sandbox edit, undo and all integrators.
2. Collision/tidal/black-hole/wormhole presets and their actual event/baseline behavior.
3. 5,000 particles with performance HUD and auto quality.
4. Launch, stage, insertion and deployment in the viewport.
5. Fuel-aware scheduled burns, visual maneuver placement, preview and closest approach.
6. Observation/comparison, shadow power, radio links, and rendezvous estimates.
7. Record/import replay, scrub exact snapshots, return to live and export JSON.
8. Camera bookmarks and scenario import/export, local save and backend sharing.
9. Horizons loading, explicit fallback transport, mobile layout and keyboard accessibility.
10. PNG/WebM export in the deployment browser and independent video playback.

## Model limits

- Continuous Earth-launch-to-Mars-capture has not been validated end-to-end. Lambert/patched-conic estimates require course corrections; cruise presets skip launch/escape.
- Rocket dynamics use changing-mass point motion, approximate atmosphere and guidance. Planned burns are fuel-aware impulses; displayed duration is an estimate.
- Surface landing is contact detection; terrain and autonomous descent are absent.
- Moon phases/poles and geographic conventions are approximate. SSO-like presets do not include J2 precession.
- Finite-disc shadows are geometric and use the strongest individual occulting disc. The isolated Earth scenario uses an explicitly labeled approximate solar direction. Radio power is a free-space estimate, not a full RF receiver model.
- Lagrange markers assume the restricted circular three-body model; instantaneous period commensurability is not proof of resonant libration. Docking indicators do not join rigid bodies.
- Replay shows captured states only; it does not invent arbitrary backward physics or intermediate states.
- GPU gravity compute is unavailable; particles use GPU instancing and gravity remains CPU direct/tree evaluation.
- Black-hole lensing is procedural, not full-scene geodesic tracing. Wormholes are experimental.
- Consumed fuel, dissipation, staging and collisions cannot be undone by negative time.
- Extremely rapid body motion can engulf a camera between frames; collision protection then projects to the permitted boundary. Absolute SI precision is bounded by Float64.
- Backend tests emit an upstream AnyIO deprecation warning and a local pytest-cache permission warning; all 20 tests pass.

Screenshots in docs/screenshots document earlier inspected UI states. Passing tests establishes the listed invariants, not certification of every feature request.
