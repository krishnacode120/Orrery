# Orrery verification — 2026-10-11

## Scientific integration milestone

| Check | Measured result |
| --- | --- |
| Full frontend suite | **177 passed, 21 files** |
| Full backend suite | **59 passed** |
| Production build | **Passed**, large-chunk advisory remains |
| Reference launch → Mars capture | **SUCCESS**, all eight measured checks passed |
| Deterministic accepted-step replay | **PASS**, 15,996 steps, zero final position/velocity difference in this run |
| Actual mission worker at 30/60/144 request segmentation | Equivalent state |
| Horizons: 6 planets × 3 epochs | 18/18 below 1°; worst angular error 0.143593° |
| Browser WebGPU, 10k tracers / 50 sources | Available; 83.085 ms including upload/readback; precision limits below |
| Moon / Mars powered descent | Safe touchdown, approximately 0.4 / 0.3 m/s |
| Mission-definition API | Edit-key tests and live localhost create/read/delete passed |
| Mobile mission control | 390 × 844; document width 390, no horizontal overflow |

The final commands were run with access to the installed Node/Python runtimes after sandbox restrictions prevented package resolution. Backend warnings: upstream anyio deprecation and nonfatal pytest cache access. No tests were skipped to obtain this result. A test that assumed six simulated seconds must finish inside a 12 ms wall budget now explicitly uses deterministic headless advancement; assertions and event criteria are unchanged.

### Actual reference mission

The runner starts on Earth's surface at 2031-01-01 UTC with JPL approximate planets and an approximate Moon. RK4 propagates continuous-thrust ascent; N-body shooting corrects the Lambert departure; later burns are fuel-aware ideal impulses.

| Quantity | Measured value |
| --- | --- |
| Parking periapsis / apoapsis altitude | 164.088 / 217.699 km |
| Parking eccentricity | 0.004085 |
| TMI delta-v | 3,880.932 m/s |
| Mars arrival relative speed at upstream encounter | 3,882.243 m/s |
| Closest Mars center distance | 9,389.619 km |
| Capture delta-v | 2,739.385 m/s |
| Final Mars periapsis / apoapsis altitude | 6,000.151 / 6,000.151 km |
| Mission duration, including two verification orbits | 261.221 days |
| Propellant consumed | 838,019.655 kg |
| Propellant aboard / discarded with stages | 3,429.889 / 33,550.455 kg |
| Total propulsive delta-v, including ascent | 15,966.461 m/s |
| Measured Max-Q | 51.950 kPa |
| Source-system energy drift | approximately 10^-12 percent |

The vehicle is non-sourcing. Source conservation excludes propulsive vehicle energy and must not be presented as a total mission invariant. Browser and Node runs differ slightly at floating-point precision; deterministic replay was exact within each tested runtime. Success means the implemented-model criteria passed, not real-world flight certification.

The browser ran the full mission and replay, then loaded the final physical state into Mission Control. This exposed and fixed a wrongly Earth-specific camera action and meaningless Mach-in-vacuum readout. Current-primary focus retains vehicle selection. Structural-limit controls explicitly show whether warnings are enabled. The new scientific panels and vehicle controls have server-rendered regression coverage.

Proof: [browser replay](docs/screenshots/reference-mission-replay.jpg), [mobile mission control](docs/screenshots/mission-mobile.jpg).

### Performance and numerical scope

A CPU benchmark with 50 sources and 10 steps measured direct gravity at 163.40 / 72.58 / 34.60 steps/s for 1k / 5k / 10k tracers. Tree results were 111.10 / 26.59 / 12.61 steps/s; at this source count its overhead exceeds the aggregation benefit. Removing a redundant per-body scan for wormholes improved the 10k direct case from about 3.09 steps/s. These are physics throughput measurements, not FPS claims.

The actual WebGPU single-step comparison against 256 Float64 CPU tracers measured maximum errors of 34,200.711 m and 0.0022 m/s at astronomical scale. The path is explicitly Float32 and unsuitable for precision spacecraft navigation. Full scenarios retain the 20k cap; 100k is a standalone kernel benchmark only. Forced GPU failure is tested to complete exactly the same source/tracer step on CPU.

Horizons compares Mercury, Venus, Earth-Moon barycenter, Mars, Jupiter barycenter and Saturn barycenter at J2000, 2026-10-09 and 2031-01-01. Reports preserve position/velocity/angular errors and UTC-tagged epoch semantics. The 1° angular criterion alone is not an interplanetary navigation-accuracy certification.

### Reproduce

```powershell
npm.cmd test -- --reporter=verbose --silent=false
.\.venv\Scripts\python.exe -m pytest backend/tests -q
npm.cmd run build
npm.cmd run test:reference
npm.cmd run benchmark
node scripts/verify-horizons.mjs
```

The Horizons command requires the API and network. Local artifacts contain the full reference JSON/tape, logs, stress report and ephemeris report. They are excluded from Git because they can be large and contain local runtime metadata.

### Manual acceptance checklist

- Open Lab → Reference mission; run, inspect each measured check, replay and load final state.
- Inspect propellant aboard separately from discarded fuel; verify captured orbit around Mars.
- Open Accuracy and change frame; inspect model/time approximation labels.
- Compute a Launch windows grid and select a departure/arrival opportunity.
- Run CPU comparisons or GPU benchmark; inspect actual solver and precision warnings.
- Load Moon/Mars descent and observe physical throttle/fuel use and safe contact.
- Test mobile panels, hide UI, camera focus and return to free navigation.
- Retained SAB/transferable ownership tests pass; browser GPU and mission runs used the existing isolated development page.

The implemented milestone does not complete every item in the larger roadmap. General finite-duration interplanetary burn optimization, high-fidelity rotating-planet orientation/gravity, compound docking dynamics, calibrated uncertainty probabilities, a complete cross-category validation dashboard and certified 100k-particle real-time rendering remain outside the verified scope. See [scientific missions](docs/scientific-missions.md) and [GPU compute](docs/gpu-compute.md).

## Previous milestone — 2026-10-09


## Final automated verification

| Check | Result |
| --- | --- |
| `npm.cmd test -- --reporter=verbose --silent=false` | **156 passed in 17 files** |
| `.\.venv\Scripts\python.exe -m pytest backend/tests -q` | **57 passed** |
| `npm.cmd run build` | **Passed; 1,157 modules** |
| Circular orbit over 1,000 periods: max relative energy drift | 9.063741269683645e-8 |
| Verlet signed nonuniform forward/reverse sequence | Passed |
| Mercury 1PN advance vs analytic | 5.018828309921192e-7 vs 5.018812201873169e-7 rad/orbit |
| Two-stage ascent, separation, insertion and deployment | Passed |
| Insertion periapsis / apoapsis altitude | 164.09 km / 208.80 km |
| 37 presets and old-schema JSON round trips | Passed |
| Shared-memory and transferable worker contracts | Passed |
| Scenario edit-key security and camera/metadata persistence | Passed |

The retained camera tests cover camera-local movement, independent selection, immediate focus cancellation, follow offsets, pose-preserving exits, precision/boost, pitch limits, target lock, frame-rate-independent damping, size/FOV focus, collision protection, SI restoration, metre offsets at Neptune, rotating surface sites and reference frames.

What-If tests cover immutable baselines, branch-local undo, Apply/Undo, nested branches, timed physical operations, intentional conservation changes, same-frame settings/topology publication in both transports, fragment momentum, matched epochs, partial prediction horizons, bounded sensitivity and extended Sandbox dates. Render interpolation tests cover immutable authoritative state, equal-time rendering at 30/60/120/144 FPS, pause/revision behavior, attitude interpolation and capped reverse-aware trails.

Physics, vehicle and persistence regression coverage retains Kepler/JD initialization, integrators and rejected trials, tree/direct agreement, massless non-sourcing, derived elements, collision/tidal conservation, adjusted drift baselines, black-hole absorption, wormholes, fuel-aware burns, launch constraints, bounded Horizons interpolation and scenario/worker ownership.

## Camera framing repair

Ten new frontend cases verify sampled full-orbit fitting within panel insets, logarithmic display fitting, non-destructive inner-planet framing, recovery from expanded-body collision barriers, eccentric-orbit bounds, stable polar angles, centered orbit damping, equal-time focus interpolation, projection-offset persistence and adaptive orbit speed. One new backend case verifies valid and malformed projection offsets in saved camera states.

The browser pass exercised angled, top and inner-system presets, Earth close-up focus, immediate W cancellation, live Earth following with user orbit rotation, and Follow → Free. Visible F4 telemetry retained identical position/direction during that handoff. Panel opening did not move the view. At 390 × 844, the compact header and view controls remain separate from navigation controls with no horizontal document overflow. Development HMR required a clean reload; the final runtime checks use that clean page.

Proof: [Solar System overview](docs/screenshots/camera-solar-overview.jpg), [inner planets](docs/screenshots/camera-inner-planets.jpg).

## Universe expansion verification

Twenty-four new frontend cases cover coordinate inverses, Float64 origin subtraction before Float32 publication, catalog provenance, relativistic cruise and acceleration timing, one-metre acceleration precision, rejection of FTL inputs, barycentric catalog instantiation, Hill-spacing generation, binary periapsis safety, non-sourcing formation dust, physical-state challenges, event-search final intervals, exploration snapshot validation, baseline restoration, catalog isolation from worker evolution and server-rendered tool panels.

Four backend cases verify astronomy metadata, bounded catalog search, star lookup, systems and compatible visual-field validation. Existing backend cases retain legacy/SI camera, maneuver, branch/schedule, Horizons epoch/coverage, CORS and security checks.

An additional worker regression reproduces a single-step request arriving during a paused publication. Publications acknowledge only a step actually dispatched; an unrelated zero-duration frame cannot clear a pending step.

## Browser verification

The in-app browser successfully rendered WebGL scenes. The following workflows were exercised through the actual UI:

- Observation: Earth → Jupiter, physical light-delay/angular-diameter readouts and telescope tracking.
- Nearby Stars: selection independent of focus; explicit Proxima focus; W immediately interrupts automated motion.
- Proxima catalog system: NASA composite rows, approximate habitable-zone guide, creation of a real editable three-body N-body scenario and addition of a physical hypothetical planet.
- What-If: baseline-preserving branch creation, exit without saving and restoration of the editable baseline.
- Original Solar System restoration: the 27 original bodies, epoch, pause state and target-lock camera returned after catalog/scenario exploration.
- Interstellar: Earth → Proxima at 0.1c displayed 42.26 Earth-frame years, 42.05 proper years and 4.226 years one-way communication delay from the catalog distance.
- Milky Way and Local Group: schematic rendered galaxy clouds, Sun/center markers and history navigation.
- Formation: creation of eight resolved planetesimals plus twenty non-sourcing dust tracers, actual mass/count metrics and original-system restoration.
- Single-step: the live Solar System advanced by its configured maximum frame after the worker acknowledgement repair.
- Event Finder: cloned Earth–Mars search completed one day with sixteen samples, accurately reporting no detected event within that sampled coverage.
- Responsive layout at 390 × 844: bounded bottom-sheet width/scrolling, accessible catalog controls and no horizontal document overflow. The temporary viewport override was reset.

Browser testing also found and fixed a Drei Html ref misuse, focus cancellation while a button held focus, catalog history retaining movement speed from another scale, a duplicate What-If horizon option and catalog labels appearing above mobile panels. No new runtime errors were recorded after the clean reload during the final event-search workflow. Earlier development/HMR errors remain in the browser's retained log history.

Proof images: [Milky Way](docs/screenshots/universe-milky-way.jpg), [mobile nearby catalog](docs/screenshots/universe-mobile.jpg). The mobile image was captured before the final label-layer fix.

These observations do **not** certify the entire camera/What-If acceptance lists, touch gestures, vehicle chase, every browser, recording decode or jitter across every scale. See [camera checks](docs/camera-navigation.md), [What-If checks](docs/what-if.md) and [Universe Explorer checks](docs/universe-explorer.md).

## Performance and build

Final CPU benchmark, during verification on this machine:

| Particles + 12 sources | Steps/second |
| --- | --- |
| 1,000 | 245.7 |
| 5,000 | 68.3 |
| 10,000 | 47.4 |

These are physics integration rates, not render FPS or a universal laptop guarantee. Catalogue geometry uses GPU point buffers; physical debris retains GPU instancing. Gravity remains CPU direct/tree evaluation.

Production output includes a 537.41 kB main chunk (179.62 kB gzip), lazy 131.99 kB Scene chunk (37.24 kB gzip), a small Universe Scene chunk, and separate systems / astronomy-data chunks. Vite reports chunks above 500 kB. The catalog is an offline snapshot; it requires no remote font or catalog fetch on startup.

The backend emits an upstream AnyIO deprecation warning and a local pytest-cache permission warning; all 57 tests pass.

## Scientific and deployment limits

- HYG stars are a static nearby catalog, not continuously propagated ephemerides. Unknown stellar mass/radius/temperature remain Unknown. HYG visual luminosity proxies are labelled separately from NASA bolometric composite parameters.
- Composite exoplanet masses may be estimated or minimum masses. Radial-velocity composite radii may be estimated. Coplanar orbit orientation and phase are illustrative. Editable copies use configured local SI state and real N-body evolution.
- Galaxy clouds, magnetic fields, radiation shells and interior layers are schematic educational visualizations; they do not contribute gravity or electromagnetic forces.
- Formation models physical collision accretion, without gas dynamics, chemistry, migration or radiation feedback.
- Interstellar results use static-endpoint flat-spacetime kinematics. Propulsion classifications are not feasibility claims; no engineering fuel/power budget or stellar-motion solution is provided.
- Event searches are sampled and compute-bounded. Narrow events can be missed. Approximate moon phases prevent certified eclipse predictions.
- Rule-based Mission Analyst suggestions require explicit clicks. Reference-star geometry is not an attitude-determination solver; attitude lock is explicitly unavailable.
- Continuous Earth-launch-to-Mars-capture has not been validated end-to-end. Transfer estimates require course corrections; cruise presets skip launch/escape.
- Rocket dynamics use changing-mass point motion, approximate atmosphere and guidance. Planned burns are fuel-aware impulses; duration is estimated.
- SSO-like presets do not include J2. Geometric shadows, approximate isolated-Earth solar direction and free-space radio links are labelled; these are not full atmosphere/RF models.
- Replay shows captured snapshots. What-If predictions use bounded cloned Newtonian states, with reported reached horizons and sampled outcomes.
- Black-hole lensing is procedural, not full-scene geodesic tracing; wormholes are experimental. Dissipation, collisions and consumed fuel cannot be physically undone by reverse time.
- Float64 bounds absolute coordinate precision. Catalog origin subtraction occurs before Float32 rendering; physically authoritative local scenarios remain in their existing coordinate contract.
- Full GPU gravity compute, certified navigation ephemerides, procedural terrain, exact planetary interiors, stellar lifetimes, optional split-screen comparison and crossfading LOD are not claimed.

Deployment should separately exercise Horizons availability, backend sharing, both transport paths, capture decoding, touch navigation, long missions and 5,000-particle render performance on the target hardware. Source packaging contains the frontend, backend, tests, documentation, catalog attribution and binary assets.
