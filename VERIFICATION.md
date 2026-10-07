# Orrery verification — 2026-10-07

## Automated results

| Check | Result |
| --- | --- |
| `npm.cmd test -- --reporter=verbose --silent=false` | 41 tests passed in 6 files |
| `.\\.venv\\Scripts\\python.exe -m pytest backend/tests -q` | 10 tests passed |
| `npm.cmd run build` | Passed |
| Circular orbit, 1,000 periods: maximum relative energy drift | 9.063741269683645e-8 (required < 1e-6) |
| Verlet forward/reversed timestep sequence | Passed |
| Two-body period | Passed |
| Mercury 1PN advance measured | 5.018828309921192e-7 rad/orbit |
| Mercury analytic advance | 5.018812201873169e-7 rad/orbit |
| Launch: staging, bound insertion, payload deployment | Passed |
| Launch orbit after insertion | Periapsis 164.09 km; apoapsis 208.80 km |
| Upper-stage fuel remaining at sampled insertion state | 9,497.40 kg |
| LEO/GEO period stability, maneuver impulse | Passed |
| All 24 presets: JSON round trip | Passed |
| Version 1 migration, edit-key protection, camera/metadata writes | Passed |
| SharedArrayBuffer and transferable worker contracts | Passed |

The launch result is for the included vehicle/guidance configuration and simplified atmosphere, not a validated real vehicle. The GR comparison is a weak-field two-body test. Neither result implies accuracy for arbitrary extreme settings.

Additional automated coverage includes RK4, rejected DP trials, tree/direct force agreement, massless non-sourcing, osculating-element round trips, swept collision contacts, merge/bounce/fragment conservation, Roche disruption, physical-event diagnostic baselines, black-hole absorption, oriented wormhole transport, non-destructive prediction, and bounded Horizons Hermite interpolation.

## Performance measurements

The benchmark integrates 12 sources with massless particles and reports simulation steps per wall-clock second. Final measurements while build/API tests ran concurrently:

| Test particles | Steps / second |
| --- | --- |
| 1,000 | 133.0 |
| 5,000 | 49.0 |
| 10,000 | 27.6 |

Earlier isolated runs on this machine measured approximately 329 / 93 / 54 respectively. These are CPU integration rates, not render FPS. The instanced 5,000-particle browser scene was exercised; observed render rates varied with quality, viewport size and simultaneous workloads. **The universal 5,000-particle / 60 FPS acceptance target is not established.** Auto quality degrades resolution/effects, and the simulation clock reports integrated rather than requested elapsed time.

## Browser and live-service verification

- Reality planets and major moons initialize; Earth/Sun positions and orbital guides render.
- Existing Phase 1 Sandbox editing/undo and share-URL behavior are retained; backend tests cover current payload round trips and edit-key security.
- Satellite View displays live altitude, velocity, acceleration, orbital elements, systems, ground track and recorded telemetry.
- A planned 100 m/s prograde maneuver executed in the browser event log and changed the orbit; ghost prediction ran through the worker.
- Verlet, RK4 and Dormand–Prince selection/stepping exercised through actual UI controls.
- Rocket View ignition and evolving vehicle telemetry exercised in the browser; automated mission test covers cutoff, stage separation, insertion and deployment.
- Shared memory and explicit `?fallback` transferable modes exercised.
- Desktop Earth textures, atmosphere, orbit lines, mission panels and adaptive quality inspected.
- 390 × 844 layout inspected: document width 390 px, 370 px bottom sheet; no horizontal page overflow.
- Keyboard-based activation, scenario search/catalog, settings, mission actions and focus behavior exercised.
- Recording start/stop reached the corresponding UI states without browser errors. The embedded browser's download observation timed out; the resulting WebM file was not independently decoded/validated. Verify actual file delivery in the deployment browser.
- Refreshed final browser session reported no console errors during satellite, integrator, prediction and recording-control checks.
- Live NASA Horizons single-vector and three-sample one-day series requests returned 200 through the proxy. Cache behavior and incomplete responses are also API-tested.
- Retained live Mars comparison at 2026-10-04 00:00 UTC (JD 2461317.5): JPL Table 1 angular difference **0.006683899758670762°**, below 1°.

Screenshot evidence is in `artifacts/orrery-desktop.png` and `artifacts/orrery-mobile.png`.

## Known limits

- GPU compute gravity is unavailable; GPU instancing is implemented, gravity is CPU direct/tree.
- Black-hole lensing is procedural visual approximation, not full-scene geodesic tracing. Wormhole transport is experimental.
- Rocket simulation is a changing-mass point model with approximate drag and guidance, not 6-DOF flight dynamics.
- The Sun-synchronous-like preset does not include J2 precession. Moon phases and Greenwich orientation are explicitly approximate.
- Maneuvers are ideal impulses and do not debit propellant.
- High-rate impacts and reversing dissipative events are not reversible physical operations. The reversible-sequence test applies to conservative Verlet.
- UI-composited recording, audio, and GPU timestamp timing are unavailable.
- Browser pointer/touch hardware coverage and exhaustive cross-browser capture verification remain deployment checks; keyboard activation and responsive layout were tested here.
- Vite retains a large-render-chunk advisory (Three.js/R3F/postprocessing, approximately 960 kB minified before gzip). Scene and mission UI are separate lazy chunks.
- Backend tests emit an upstream Starlette/AnyIO alias deprecation warning; all tests pass.

## Manual verification checklist

1. Start both servers using README instructions. Confirm Reality date and Earth near 1 AU; convert to Sandbox, edit Jupiter mass, undo and redo.
2. Step forward/reverse with collisions disabled. Try all integrators and observe effective dt / accept/reject statistics.
3. Load Giant impact and Tidal ring formation. Play; inspect events, resolved fragments and adjusted conservation baselines.
4. Load Dark Sun / Wormhole laboratory. Inspect guides, horizon capture, linked exit orientation and cooldown.
5. Load Asteroid field · 5000. Check active solver, particle count and quality/FPS; compare direct/tree in settings.
6. Load Launch vehicle, ignite and follow the mission timeline through staging/insertion; deploy payload. Inspect actual charts and export telemetry.
7. Load LEO or constellation. Inspect ground tracks, range/occlusion links and an added maneuver with prediction.
8. Save locally, reload, export/import and share a scenario. Confirm camera, mission state, burns and settings survive; only the edit-key holder can modify the backend record.
9. Load Horizons initialization and playback at a covered epoch. Inspect provenance and bounded playback.
10. Try narrow layout, keyboard palette, high contrast, reduced motion, quality levels and both memory modes.
11. Save a PNG and record a short WebM in the deployment browser; verify playback and requested resolution.
12. Run the three automated commands above after dependency/environment changes.

Limits and model definitions are detailed in README.md and docs/.

## Visual/usability revision

The earlier completion claim was too broad: passing unit tests did not validate the complete product experience. This revision specifically rebuilds exploration and navigation rather than claiming the entire original roadmap is production-complete.

- New dedicated viewport layout, visual object navigator, live selection overview, tabbed settings and mission sections.
- Body/ring-aware camera framing, readable initial lighting, illumination-aware atmosphere, procedural ring density and planetary shadow.
- Expanded procedural vehicle geometry, local launch stand, visible prelaunch action, and mapped ground-track background.
- Browser checks exercised Earth/Saturn selection, scenario filtering, launch, settings tabs and mobile layout. Screenshots are in docs/screenshots/.
- Regression verification after the redesign: 41 frontend/physics tests, 10 backend tests, production build passed.
- Latest CPU benchmark: 242.3 / 80.7 / 47.9 steps per second at 1k / 5k / 10k particles. No universal 60 FPS claim is made.
- GitHub Actions configuration runs frontend and backend verification independently.
