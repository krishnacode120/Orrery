# Scientific missions and numerical analysis

## Run the reference mission

Open **Lab → Scientific workbench → Reference mission**, or search **Earth Mars reference mission** in Ctrl+K. Choose **Run & certify mission**. A dedicated worker runs the same pure Engine used by live simulation; the viewport remains usable. Cancel terminates the job. The current scenario is unchanged until **Load final state** or **Load launch pad** is selected.

The reference epoch is 2031-01-01 UTC, with JPL Table 1 planetary initialization and an approximate Moon. The launch plane is solved from the transfer requirement; it is not a geographical launch-site feasibility study. A configurable three-stage vehicle uses continuous thrust, changing propellant mass, drag, gravity and feedback guidance to reach a parking orbit. Detached stages continue as bodies.

A numerical shooting solver corrects a Lambert departure estimate using full Newtonian N-body propagation. Departure, correction, encounter targeting and capture are **fuel-aware ideal impulses**, not finite-duration burns. They use the active engine's vacuum specific impulse. Insufficient propellant rejects a burn. The runner does not teleport or refill the vehicle. Mars capture is assessed from negative relative orbital energy, safe periapsis, bounded apoapsis and two subsequent propagated orbits.

The reference targets approximately 200 km parking altitude and 6,000 km Mars altitude. This deliberately high capture orbit makes a feasible, reproducible test of the implemented model; it is not a flight design for a real launcher. Collisions and GR are disabled, softening is 1 m, and RK4 is used with 0.25 s powered steps and state-dependent coast steps capped at 1,800 s. Tolerances and all measured checks are exported with the report.

Commands:

```powershell
npm.cmd run test:reference
npm.cmd run benchmark
node scripts/verify-horizons.mjs
```

The first command exports the actual mission result and replays its accepted-step/command tape. It exits unsuccessfully if capture checks or replay equivalence fail. Horizons validation requires the local API and network access.

## Validation and replay

Certification statuses distinguish NOT RUN, RUNNING, SUCCESS, PARTIAL SUCCESS, FAILED and NUMERICALLY UNRELIABLE. A generic current-orbit check is available in Accuracy for a selected vehicle, but is explicitly not whole-mission certification.

The deterministic tape contains initial scenario, settings, ordered accepted timesteps and step-indexed controls/burns/staging. Replaying ignores rendering and wall-clock budgets. The live vehicle worker also accumulates requests into logical physics quanta instead of consuming render-sized remainders; paused requests do not consume backlog. Tests compare actual worker execution with 30/60/144 request segmentation. Normal live simulation still slows under load.

Recorded snapshot playback is a separate, read-only presentation mechanism. Scrubbing jumps among measured snapshots, not invented states. The reference runner retains at most 220 snapshots and 4,000 recorder samples. The normal simulation telemetry limit remains 2,400 samples. Exported replay tapes are bounded to 200,000 steps and 4,096 commands.

## Analysis tools

- **Launch windows:** bounded 4–40 sample departure/arrival grids, zero-revolution Lambert solutions, C3 and arrival hyperbolic excess speed. The sum of excess speeds is labelled as such; it is not propellant cost or surface-to-surface delta-v. Select a cell to inspect/export the opportunity.
- **Numerical lab:** cloned scenarios compare Verlet/RK4/Dormand–Prince and direct/tree tracers. Position errors use a tighter DP numerical reference, not a claim of analytical truth. Only equal propagated horizons are comparable.
- **Sensitivity:** up to eight seeded mission replays with bounded burn timing/magnitude/direction perturbations. These samples have no automatic retargeting and their capture fraction is not a calibrated statistical probability.
- **Debrief:** actual events, burn accounting, closest approach, final orbit, source conservation and planned-versus-corrected-execution values. CSV/JSON/Markdown exports remain local unless the user saves a definition to the API.
- **Plots:** capped sample count, zoom, pan, cursor values and detected event markers. Telemetry is not visually smoothed into fabricated measurements.

## Atmosphere, engines and spacecraft

Earth uses a layered hydrostatic dry atmosphere with lapse-rate segments through 84.852 km, a documented exponential upper extension and vacuum cutoff at 150 km. Geometrical altitude is used; this is an approximation, not a complete implementation of the Standard Atmosphere. Mars uses an exponential CO2 approximation. Density, pressure, temperature, sound speed, Mach and dynamic pressure are calculated from state. Max-Q is the measured peak, never a scripted timestamp.

Thrust and specific impulse interpolate between configured sea-level and vacuum endpoints by ambient pressure. Engines expose ignition/restart limits and throttle bounds. Optional quaternion rigid-body dynamics use principal inertia, torque and gyroscopic coupling. Gimbal angles rotate the actual force. Orientation-only mode remains available. RCS consumes propellant and applies body-frame forces/torques.

Structural limits generate warnings only when enabled. Heating is a Sutton–Graves-shaped indicator, not certified heat flux or a thermal protection model. Re-entry examples are ballistic drag models; the spaceplane-like option changes aerodynamic coefficients without lift/CFD.

Moon/Mars descent guidance commands real throttle and thrust to remove lateral speed and manage descent. Contact success requires bounded relative speed. Docking requires close port range, low relative speed, small lateral offset and opposed-axis alignment. The resulting latch is kinematic; compound rigid-body dynamics are omitted.

## Frames, times and model quality

Physics remains SI in the J2000 ecliptic basis. Central frame helpers implement translated planet-centered coordinates, rotating body-fixed coordinates with angular transport velocity, LVLH and local ENU/NED. Body prime-meridian origins are illustrative; they are not IAU precision orientation models.

UTC → TT uses the embedded post-1972 leap-second table (last entry 2017); future dates assume that value remains unchanged. TDB is a low-order approximation. UTC-tagged Horizons requests are not labelled exact TDB.

Accuracy displays force/integration models, source provenance, reference frames, accepted/rejected steps and conservation applicability. Powered, constrained and dissipative systems do not have the same conservation interpretation as isolated Newtonian sources. The reference rocket is non-sourcing, so reported source energy drift excludes vehicle energy.

## Remaining fidelity boundaries

The validated mission does not establish flight certification, launch-site/weather feasibility, finite interplanetary burns, higher-order gravity harmonics, high-fidelity aerodynamics, compound docking dynamics or a covariance-based navigation solution. GPU tracers are not precision spacecraft. Independent target scenarios require their own checks; the reference result must not be generalized to arbitrary missions.

## Sources

[NASA Standard Atmosphere 1976](https://ntrs.nasa.gov/archive/nasa%20/casi.ntrs.nasa.gov/19770009539.pdf), [NASA rocket thrust](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/), [specific impulse](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/), [Sutton–Graves](https://ntrs.nasa.gov/api/citations/19720003329/downloads/19720003329.pdf), [NAIF time systems](https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/req/time.html), [Horizons manual](https://ssd.jpl.nasa.gov/horizons/manual.html).
