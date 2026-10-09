# Universe Explorer

Orrery separates four kinds of state:

| Layer | Behavior |
|---|---|
| Live simulation | Worker-owned SI position/velocity, N-body Sandbox |
| Ephemeris | JPL approximate initialization or supported Horizons initialization/playback |
| Astronomy catalog | Static source positions and measured/estimated parameters; no gravity |
| Educational graphics | Schematic galaxy structure, magnetospheres, radiation shells, cutaways |

## Explore and navigation

Open **Universe** or choose the Explore workspace. The complete Solar System remains the starting simulation. Use the object search to select without focusing. **Focus** and double-click are explicit camera actions.

Nearby Stars, Milky Way, Local Group and Exoplanet System use a separate lazy-loaded renderer with one navigation controller. Entering catalog navigation captures the current simulation and camera, pauses evolution, advances the revision, and rejects old in-flight worker responses. Returning restores the preserved state. Catalog objects never enter the physics worker simply because they are visible.

WASDQE cancels automatic motion and enters Free navigation. Drag looks, wheel changes free movement speed, Shift boosts, Ctrl enables precision; Orbit drag/zoom/pan uses a proxy OrbitControls camera. Alt+Left/Right restores catalog navigation history. H hides the interface and labels without changing the transform.

Maps use J2000 ecliptic meters in Float64. The renderer subtracts the camera origin before scaling into Float32 geometry. The nearby map is heliocentric; the Milky Way's center/disk use a documented J2000-to-Galactic rotation. Galaxies are schematic point clouds, not billions of simulated bodies. Labels are capped at 16 relevant objects. Nearby stars share one BufferGeometry; galaxy clouds share one geometry per galaxy.

The cosmic slider covers kilometer through Local Group scales logarithmically; scale buttons expose Earth radius, approximate Moon distance, AU, Solar System, Proxima, Milky Way and Andromeda. These change camera navigation, never physical positions. They are reference scales, not computed live Earth-Moon separation.

## Discovery and comparison

Search spans live planets, moons, vehicles, small bodies, stars, systems, exoplanets and galaxies. Ctrl+K also accepts catalog names. Details show source, status and missing values. Favorites support objects, systems, local scenarios, missions and catalog viewpoints. Saved catalog sessions include camera, selection, section, date, scale and layers; export/import is bounded and validated.

Loading a catalog session restores navigation. Its recorded date is shown; **Initialize Reality at session date** explicitly recomputes supported ephemeris state. It does not fabricate an earlier Sandbox state. Recorded replay remains the only exact historical Sandbox snapshot source.

Compare up to five stars/systems, including the preserved Solar System when available. System comparisons include host scale, planet count, orbit scale, radius, period and simplified habitable-zone boundaries. Unknown stellar lifetimes remain Unknown.

## Exoplanets and habitable zones

Five NASA composite systems are bundled. Orbit phase and 3D orientation are illustrative, surface shading is procedural and not an observed surface map, and catalog render radius is physical where available. Marker picking remains visible at large distances. Create Editable Scenario instantiates a local barycentric model, leaving the original simulation available through **Restore original simulation**.

The simplified liquid-water-zone guide uses solar-scaled luminosity and flux thresholds 1.10 and 0.53:

inner = AU × sqrt((L/Lsun)/1.10)
outer = AU × sqrt((L/Lsun)/0.53)

This is a pedagogical estimate, not a climate calculation or proof of habitability. Bolometric NASA host luminosity is used for catalog systems. Blackbody equilibrium temperature assumes albedo 0.3 and uniform reradiation unless otherwise configured.

## System Builder and Formation

Start with a primary configuration, then edit mass, radius, temperature, luminosity and rotation. Hypothetical planet/moon placement converts a, e, i and mean anomaly into real SI state vectors; the orbit must clear the primary surface. Period, escape speed, equilibrium temperature, Hill estimate and HZ relationship are derived.

Generate System supports 1–16 planets, bounded orbital radii, gas giants, giant moons and 600 non-sourcing belt tracers. It enforces an eight-mutual-Hill-radius spacing heuristic; this is not proof of long-term stability. Deterministic seeds reproduce physical initial conditions.

Binary systems use circular two-star barycentric initial conditions, with circumbinary or component-orbit planets. The optional hierarchical third star is experimental. N-body evolution decides stability.

Formation supports 8–256 resolved gravitating planetesimals and 0–5,000 massless dust tracers. Physical-radius collision merging conserves mass and momentum and uses volume-based radius behavior. Metrics show resolved bodies, disk mass, largest body, unbound bodies and retained merge events. **No hydrodynamics, gas migration, chemistry or genuine planet-formation timescales** are claimed.

## Interstellar missions and relativity

Open Interstellar missions directly or from Mission planner. Live or preserved Solar System objects, bundled nearby stars and exoplanet hosts are available as endpoints. A locally instantiated catalog system is translated to its catalog host location for this calculation only.

Choose a propulsion category, speed, mass, optional proper acceleration/deceleration, and reply turnaround. Technology classifications are operational, demonstrated, conceptual or speculative; choosing a category does not make an arbitrary requested speed feasible.

The separate flat-spacetime calculator computes beta, Lorentz factor, Earth-frame time, proper time, relativistic kinetic energy, light delay, and an acceleration/coast/deceleration profile. It rejects speed >= c. Constant proper-acceleration ramps use hyperbolic kinematics; energy is a lower bound and excludes propulsion efficiency, reaction mass and power. Endpoints are static; gravity, stellar motion and engineering feasibility are outside the model. No relativistic behavior is injected into the Newtonian worker.

Comparison tables evaluate multiple speeds from the same distance. Communication timing includes send, arrival, reply send and reply arrival. Export includes inputs, model label and actual calculated results.

## Observation and Time Machine

Observation calculates geometric directions, spherical-surface azimuth/elevation, physical angular diameter, illumination phase and light delay. Telescope offers 30°, 10°, 5°, 1°, 0.5°, 0.1° fields and existing supported-body tracking. The 90° view is a wide camera, not a full-sphere projection. Catalog-star targeting in the 3D telescope is explicitly unavailable; its sky direction remains calculated.

These are instantaneous geometric observations: no atmospheric refraction, aberration, retarded ephemeris or terrain. Stellar radial velocities are not invented.

Time Machine exposes current provenance and explicit approximate-JPL, Horizons-state or one-day Horizons-playback initialization. Existing epoch limits remain unchanged. Recorded replay opens stored snapshots rather than integrating invented history.

Event Finder runs a cloned engine in a separate worker. Closest approach/perigee are sampled minima; opposition/conjunction are interpolated ecliptic-longitude crossings; shadow/occultation searches use geometric overlap. Sampling is bounded to 16–4,096 points, up to 100 years, with a 4-second UI compute budget. Actual reached coverage, completeness and resolution are displayed. Narrow events can be missed; illustrative moon phases and approximate ephemerides prevent certified eclipse forecasts. Detected dates can initialize Reality explicitly.

## Mission Analyst, challenges and sensors

Mission Analyst is deterministic, rule-based analysis of authoritative elements, telemetry, solver and conservation diagnostics. It is not a generative AI service. Suggestions, including reducing timestep or opening maneuver previews, execute only after clicking. Upcoming apsides are osculating two-body estimates; scheduled burns/experiment events retain their actual times.

Challenges score physical state: circular altitude/eccentricity/binding, GEO-like period/inclination, outbound escape energy, bound Moon/Mars arrival, relative rendezvous range/speed, or bound binary periapsis. Instantaneous success does not prove long-term stability. Recorded commanded delta-v and mission duration are reported.

Sensors calculate range/range rate, altitude, Sun angle, sunlight, proximity and bright reference-star FOV geometry. Optical inset reuses the existing WebGL context with a secondary camera (forward / target / Earth / Sun). Reference-star projection is educational; **attitude lock is unavailable because no attitude-determination algorithm is implemented**. Proximity geometry is not RF detection.

Optional magnetosphere/radiation shell and interior cutaway layers are schematic. They follow rendered bodies and do not change physics, mass or collision radius. Cutaway layers are approximate fractions; no geophysical model is claimed. Optional event notifications are category-filtered and throttled, and use actual logged events.

## Persistence, APIs and limits

Existing schema version 2 stays compatible with Phase 1 migrations. New visual fields are optional and validated by both frontend and backend. Physics JSON retains SI and existing 20,000-body / 512-source limits. Catalog navigation sessions are a separate bounded JSON format, 100 kB on import; viewpoint storage retains 30 sessions and 100 favorites.

The backend adds read-only /api/astronomy/metadata, /catalog, /stars/{id}, and /systems endpoints. Search lengths, categories and result limits are validated; existing CORS/rate limits apply. The offline catalog is bundled in source so deployment must retain src/astronomy/data for the backend or mount it at the documented location.

Existing full source packaging includes catalog data and attribution. The map is lazy-loaded; no catalog refresh occurs during application startup.

## Verification workflow

1. Start with Solar System; focus Earth; Observation: target Jupiter, inspect delay and physical angular diameter.
2. Open Nearby Stars; select Proxima without focusing; then Focus explicitly. WASDQE interrupts travel.
3. Open its system, enable HZ, create an editable copy, add a hypothetical planet and begin What-If.
4. Exit What-If; restore original simulation and confirm epoch, bodies and settings are retained.
5. Interstellar: Earth → Proxima, 0.1c; compare Earth and proper time and communication timeline.
6. Milky Way: locate Sun and center; Local Group: select Andromeda, focus, return to preserved simulation.
7. Builder: generate and evolve a system; binary/triple remain real N-body initial conditions.
8. Formation: create disk, resume, inspect actual accretion metrics.
9. Time Machine: initialize date; run bounded closest-approach search; partial results must report reached coverage.
10. Sensors, challenges, favorites/session export/import, H hide/restore, and compact/mobile panels.

Automated verification covers coordinate inverses, Float64 origin subtraction, relativistic limits and timing, barycentric catalog instantiation, Hill spacing, binary safety, non-sourcing dust, event search boundaries, state preservation, worker isolation, screen rendering and API validation. Browser observations and performance measurements are recorded separately in VERIFICATION.md.
