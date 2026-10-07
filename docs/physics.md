# Physics models

## State and forces
Internal positions are meters, velocities m/s, masses kg, radii meters, elapsed integration seconds. Inertial axes remain J2000 ecliptic. The renderer uses (x,z,-y) only after subtracting its floating origin.

Newtonian acceleration uses Plummer softening: G m r / (r² + epsilon²)^(3/2). The potential uses the matching softened expression. Massive sources interact pairwise with equal/opposite forces. Massless objects may retain an inertial/vehicle mass for telemetry, but never source gravity or enter gravitational conservation diagnostics.

Pinned objects remain fixed and can still source gravity. They are external constraints, so closed-system conservation alarms are suppressed. A prelaunch rocket is a separate surface constraint on a rotating Earth; launch releases it.

## Integration
Verlet is kick-drift-kick. Its Newtonian fixed-step path is unchanged and tested through 1,000 circular orbits and a reversible signed nonuniform sequence. Reversibility means replaying the same timestep sequence backward; acceleration-selected timesteps do not guarantee an automatically reversible sequence.

RK4 evaluates four complete state/force stages. DP uses the Dormand-Prince 5(4) tableau, weighted absolute/relative infinity-norm error, rejected-trial isolation, and bounded next-step growth. Its diagnostics distinguish accepted and rejected steps. Minimum-step exhaustion fails visibly rather than silently accepting an inaccurate step.

An optional acceleration cap is dt = eta min_i sqrt(epsilon/|a_i|), excluding pins. Maximum dt is stepSeconds. The final remainder may be shorter. Work per batch is bounded; the JD clock advances by accepted time only.

Rocket flight uses split propulsion at no more than 0.25-second gravity steps. Selecting DP during a powered rocket scenario uses RK4 gravity substeps and reports that approximation. Fuel, drag, stages and ideal impulses are not reversible.

## Octree
The Barnes-Hut hierarchy stores only massive sources. A node's total mass and mass-weighted position approximate far-field attraction when size/distance < theta. Cells containing the evaluation point are always opened. Coincident sources terminate in bounded-depth buckets. Sources always use direct source-source summation; only tracers use the hierarchy. Theta zero yields direct evaluation.

## Contacts, fragments, and tides
A multilevel spatial hash indexes swept bounding spheres, avoiding a single cell size spanning stars and small particles. Sphere contact uses a linear swept segment over the accepted step. This is not curved-trajectory continuous collision detection. At most one contact per body and 64 contact events are resolved per substep.

Merge conserves source mass and COM momentum for unconstrained bodies; radius cubed adds. Pins introduce external impulses. A passive tracer can be absorbed without altering the source mass. Bounce uses normal impulses with restitution and positional correction. Passive-passive collisions are intentionally excluded.

Fragmentation compares reduced-mass impact kinetic energy to 3G/5 sum(m²/R). It emits a bounded set of resolved massive chunks with deterministic randomized velocity components, corrected to the original COM position/momentum. Fragment mass may be equal or varied. Debris collision/tidal overrides disable repeated unresolved cascades. This is not material fracture, SPH, or hydrodynamics.

Fluid Roche boundary: 2.44 R_primary (rho_primary/rho_secondary)^(1/3). Crossing/being initialized within the enabled boundary can create a resolved stream. Capacity exhaustion preserves the original mass. The simple model has no strength, spin-stress, fluid evolution or debris viscosity.

## Diagnostics
Energy and angular-momentum baselines reset after an authorized edit/new revision. Physical events add their before/after invariant jump to the existing baseline, preserving accumulated numerical drift. These adjustments are exposed in eventEnergyDelta/eventMassDelta.

Newtonian energy is not a conserved invariant under the approximate 1PN correction, thrust, exhaust or pins. Their diagnostics are labeled accordingly. Linear momentum and COM are displayed directly. Zero denominators do not produce fabricated percentage drift.

## Relativity and extreme objects
The dominant-primary 1PN term is GM/(c²r³) [(4GM/r-v²) r + 4(r·v) v]. A massive unpinned primary receives the balancing reaction. This is a Schwarzschild test-body-inspired approximation, not full EIH dynamics. It rejects GM/(c²r) > 0.01 or v²/c² > 0.04. Verlet uses an implicit endpoint half-kick for velocity dependence; RK4/DP evaluate it at their stage velocities.

Analytic perihelion advance is 6πGM/[a(1-e²)c²] radians/orbit. The test compares actual Mercury-state integrations with and without 1PN at physical c, subtracting Newtonian numerical precession.

Black-hole capture uses r_s = 2GM/c² and swept center crossing, then conserves merged mass/momentum and grows the horizon. Disk/lensing visuals are not ray-traced geodesics. Wormhole traversal is an explicitly nonphysical relocation with quaternion-relative velocity/spin transformation and simulation-time cooldown; it does not conserve global gravitational potential energy.

## Orbital elements
Osculating a, e, i, Ω, ω, M, true anomaly, period, apses, specific energy and angular momentum use the selected parent (or strongest suitable larger source). Circular/equatorial conventions are deterministic; unbound orbits have null period/apoapsis. Editing accepts bound ellipses only. Hill estimates are meaningful only for a small secondary in a suitable hierarchy.

## Sources
- [JPL approximate positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
- [JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [Dormand-Prince/RK45 reference](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.RK45.html)
- [Barnes-Hut teaching reference](https://introcs.cs.princeton.edu/java/assignments/checklist/barnes-hut.html)
- [Relativistic perihelion derivation](https://farside.ph.utexas.edu/teaching/336k/Newtonhtml/node116.html)
