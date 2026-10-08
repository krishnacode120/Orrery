# Exploration and flight workspace

The viewport fills the window. UI regions overlay it rather than shrinking the canvas; camera framing accounts for desktop panels. Explore, Physics, Mission, Satellite, God, Minimal, Presentation and Cinema layouts change visibility without replacing the simulation.

## Navigation

- H hides/restores the whole interface. Double-clicking a hidden viewport also restores it.
- View exposes independent top bar, navigator, inspector, footer, rail and HUD controls. Recovery buttons restore collapsed regions.
- Search the left navigator, choose an object, then inspect its live state. Back/forward remembers focus destinations.
- F frames the selection; Shift-F frames the system. Local, planetary and system transitions use a floating origin and logarithmic distance easing.
- Right-click a body for focus, follow, inspection, targeting and Sandbox actions.
- The optional map supports system, planetary and local frames. Its triangle is the current camera position.
- The optional inset tracks the selected object using a second camera in the main WebGL context.

## Scale models

| Model | Distances | Radii |
| --- | --- | --- |
| Scientific | Physical ratios | Physical radii, including particles |
| Visibility | Physical ratios | Exaggerated at system scale |
| Educational | Logarithmic system display | Exaggerated |
| Custom | Configurable linear/compressed transform | Separate planet, moon and vehicle multipliers |

All state, collisions, telemetry and gravity remain SI in J2000 ecliptic coordinates. Scale modes affect only drawing and inverse pointer placement. Actual-size bodies can be smaller than a pixel in the system view; adaptive labels and local focus provide navigation.

## Continuous scene workflow

1. Open Solar system now; focus Earth or a moon without replacing the scene.
2. In Mission planner, choose Earth as departure. Add a launch vehicle or initialize a parking-orbit vehicle. Parking initialization explicitly skips ascent.
3. Flight operations exposes ignition, throttle, guidance, engine configuration, up to eight stages, separation and deployment. The same solar-system bodies remain active.
4. Plan a transfer using the actual vehicle as departure. The planner distinguishes the vehicle ejection burn from a planet-to-planet heliocentric estimate.
5. Schedule a burn. Fuel-aware rocket burns debit the active stage; impossible burns are rejected and logged. Staged available delta-v assumes discarded dry stages.
6. Follow N-body propagation. SOI entry/exit updates the reference primary and optionally focuses the arrival environment. No position or velocity is changed by SOI bookkeeping.
7. Recalculate transfers as course corrections. Near the destination, inspect relative energy and plan a circularization burn; target-frame maneuvers are accessible in Flight operations.
8. Deploy a payload, inspect Satellite View, or return to God Mode in the same scenario.

The planner is not an autonomous mission optimizer. Hohmann windows assume circular coplanar motion. Lambert paths use a two-body osculating target prediction; patched-conic ejection neglects finite SOI departure time. N-body perturbations can produce a miss. A complete launch-to-Mars-capture flight has not been validated end-to-end. The cruise demonstrations explicitly skip launch and escape and must not be mistaken for such validation.

Landing is a sphere contact model with a five-metre-per-second safe-contact threshold. Powered descent requires manual controls. Surface-bound objects follow the primary's translation and rotation.

## Sandbox experiments

Ctrl-drag a body to move it; Shift-drag adds velocity. The simulation pauses during the gesture and resumes its previous state on release or cancellation. Escape, window blur and Cancel discard the gesture. A debounced worker prediction previews the edit.

God Mode changes mass, radius, spin, state vectors and orbits. Relative orbital operations use the selected primary's velocity. The collision laboratory clones an impactor and sets its approach speed/angle, mass multiplier and collision response; the physical collision engine resolves contact. Undo restores the setup.

Measurements report separation, relative speed, one-way straight-line light time and angular separation at a chosen observer. Coincident observer/body geometry reports an undefined angle. The gravity grid is a potential visualization, not general-relativistic spacetime.

## Solar-system data

The eight planets retain JPL Table 1 initialization. Eighteen moons cover Earth, Mars, Jupiter, Saturn, Uranus and Neptune. Their default paths are circular mean-orbit approximations with illustrative phases, not measured ephemerides or accurate mutual inclinations. Horizons can replace supported targets at a common epoch.

Reference data: [JPL satellite physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/) and [satellite mean elements](https://ssd.jpl.nasa.gov/sats/elem/). Transfer background: [NASA Basics of Space Flight](https://science.nasa.gov/learn/basics-of-space-flight/chapter4-1/). Fuel accounting: [NASA ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/).

## Persistence and compatibility

The existing version-2 schema and version-1 migration remain. New fields use JSON data, not renderer or worker handles. Physical edits continue through revision-gated worker replacement; topology events and conservation baselines use the existing serial protocol. Client and API validate display multipliers and flags. Shared scenario edit keys remain separate from read URLs.

Run instructions, model limits and deployment requirements are in the root README. Reproducible outcomes and remaining verification gaps are in VERIFICATION.md.
