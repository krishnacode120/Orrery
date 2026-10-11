# Mission simulation

## Reference frames
All inertial state is J2000 ecliptic SI. Earth mission presets have their origin at Earth's center, with axes parallel to that basis. Preset orbital inclinations are specified relative to Earth's equator, transformed using the documented J2000 obliquity. Inspector/mission orbital inclination readouts explicitly say ecliptic. Earth-fixed latitude/longitude apply rotation about the oblique spin axis with a simplified Greenwich-zero-at-J2000 convention.

## Rocket model
The launch body contains a stage array (dry mass, capacity, current fuel, per-engine thrust, engine count, Isp), payload mass, current stage, engine/throttle state, guidance flags and mission counters. Total mass is derived from payload plus all remaining stages. Expelled propellant leaves the resolved system.

Mass flow is thrust/(Isp*g0), with ambient-pressure interpolation of configured thrust and Isp endpoints. Within a propulsion substep the velocity impulse uses Isp*g0*ln(m_before/m_after). Drag uses 0.5*rho*v_air²*Cd*A and co-rotating air. Earth uses layered hydrostatic approximations, Mars an exponential CO2 model; see [scientific missions](scientific-missions.md) for limits and measured reference results.

Feedback guidance commands altitude/vertical-speed response while accelerating tangentially toward circular speed. Throttle tapers near target velocity. Guidance is a demonstrator controller with no winds or lifting surfaces. Optional quaternion rigid-body torque dynamics, engine gimbals, throttle bounds and RCS are available.

Fuel depletion or manual separation discards the current stage as a separate non-sourcing body. Next-stage ignition changes thrust and mass. The insertion condition is a bound low-eccentricity orbit with periapsis above 82% of target altitude; telemetry displays the actual achieved apses. Deployment creates a satellite and removes payload mass from the parent rocket. A surface impact stops the vehicle and logs a crash.

MET and telemetry are simulation-driven. Pause freezes them. Reverse time integrates gravity only and cannot reconstruct consumed propellant, atmosphere losses or stage history.

## Satellite model
Satellites feel N-body gravity but are non-sourcing by default. Periods and elements derive from inertial vectors. Simple batteries integrate finite-disc sunlight/penumbra/umbra generation minus load. Payload state is a user configuration, not a model of a real instrument.

Radio links use endpoint distance and sphere obstruction. Propagation delay and an approximate free-space loss estimate are shown. There is no calibrated RF link budget, diffraction, atmosphere loss or real network connectivity. “Connected” means geometric visibility within the configured range.

Ground tracks are osculating two-body projections with rotating Earth coordinates, clearly distinct from actual sampled telemetry. The constellation generator places 24 satellites in six planes. SSO-like inclination does not imply J2 precession.

## Maneuvers
An ideal impulsive maneuver includes bodyId, JD, direction, scalar deltaV or inertial vector, executed flag and actual execution JD. The engine splits a forward step at the scheduled epoch. It updates invariant baselines for the commanded impulse, logs it, and executes it once. Prediction includes pending nodes. A fuelAware rocket node computes propellant from the active-stage Isp and changing total mass; failure leaves the vehicle unchanged and records a rejected maneuver. Fuel is not implicitly transferred across stages.

## Interplanetary planning

The zero-revolution universal-variable Lambert solver targets an osculating, moving destination at a selected arrival time. Circular Hohmann estimates supply reference flight time and phase/window readouts. A departure planet estimate is heliocentric; a parked vehicle departure adds a planet-centered hyperbolic ejection satisfying the requested outgoing excess velocity and rejects underground periapsis. Coast dynamics remain N-body. SOI parent changes affect telemetry and reference frames only.

Targeting ignores perturbations during planning and the finite time to leave a departure SOI; course corrections are necessary. Cruise presets explicitly initialize outside the departure SOI, skipping launch and escape. The separate reference runner now corrects its Lambert estimate with full N-body shooting, executes fuel-aware burns and verifies Mars capture; it is not a general mission optimizer. Circularization can be commanded against the current primary after an encounter, with rocket fuel accounting.

Contact detection is optional, with a 5 m/s safe touchdown threshold. Surface constraints follow the primary's translation and rotation. There is no terrain or structural landing model. Moon/Mars presets add actual-thrust descent feedback, tested to safe contact.

## References
[NASA rocket thrust](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/),
[NASA specific impulse](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/),
[ESA orbit types](https://www.esa.int/Enabling_Support/Space_Transportation/Types_of_orbits).
