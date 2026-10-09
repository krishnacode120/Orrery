Use this as the next full upgrade prompt for Orrery:

---

# Orrery — Universe Explorer, System Builder, Time Machine & Discovery Expansion

Continue developing the existing Orrery project and extend it beyond the Solar System into a broader **interactive universe exploration and scientific simulation platform**.

Do not rebuild the existing application from scratch. Preserve the current architecture, physics engine, camera system, Solar System simulation, What-If mode, God Mode, rocket simulation, satellite system, mission planning, persistence, backend, worker architecture, and existing UI where they already work.

This upgrade should add a new exploration layer so the application can progress naturally from:

```text
Planet
→ Moon
→ Planetary System
→ Solar System
→ Nearby Stars
→ Exoplanet Systems
→ Milky Way
→ Local Group
```

The final experience should remain scientifically grounded, visually polished, responsive, and consistent with the professional aerospace/scientific style of the existing Orrery project.

Do not create fake controls or placeholder screens. Every visible feature must either work or be clearly marked experimental/unavailable.

---

# 1. Add a new EXPLORE workspace

Create a new main workspace:

```text
EXPLORE
```

It should be accessible alongside existing modes such as:

```text
Explore
Physics
Mission
Satellite
What-If
God Mode
Cinema
```

The Explore workspace should focus on scientific navigation and discovery rather than sandbox manipulation.

Main sections:

```text
Solar System
Nearby Stars
Exoplanet Systems
Milky Way
Local Group
Observation
Time Machine
```

Keep the 3D visualization as the primary viewport.

All side panels must remain collapsible.

---

# 2. Nearby Star Map

Create a scientifically grounded nearby-star visualization.

Include supported stars such as:

```text
Sun
Proxima Centauri
Alpha Centauri A
Alpha Centauri B
Barnard's Star
Sirius A
Sirius B
Epsilon Eridani
Tau Ceti
Vega
Altair
Procyon
Wolf 359
Lalande 21185
```

Where reliable data is available, show:

- distance from Sun
- stellar type
- mass
- radius
- effective temperature
- luminosity
- apparent magnitude
- absolute magnitude
- known planetary systems

Do not fabricate missing values.

If information is unavailable:

```text
Unknown
Not available
Estimated
```

must be shown clearly.

---

# 3. Interstellar Scale Rendering

The current scale architecture must be extended beyond AU-scale navigation.

Support at least:

```text
meters
kilometers
AU
light-hours
light-days
light-years
parsecs
```

Keep authoritative physical data in well-defined units.

Do not directly render light-year distances into Float32 world coordinates without a scale transformation.

Add a hierarchical rendering/reference system for:

```text
local spacecraft
planetary system
Solar System
nearby stellar neighborhood
galactic overview
```

Avoid jitter and clipping at all scales.

---

# 4. Smooth Solar-System-to-Star transition

Users should be able to:

```text
Focus Sun
→ pull out beyond planetary orbits
→ enter stellar neighborhood view
→ select Proxima Centauri
→ travel visually to that system
```

This is a camera/navigation transition, not physical faster-than-light spacecraft movement.

Clearly separate:

```text
Camera Navigation
```

from:

```text
Physical Travel Simulation
```

Do not confuse the two.

---

# 5. Search the Universe

Add global object search.

The search system should handle categories such as:

```text
planets
moons
stars
exoplanets
spacecraft
satellites
asteroids
comets
systems
galaxies
```

Example searches:

```text
Earth
Europa
Saturn
Proxima Centauri
TRAPPIST-1
Andromeda
```

Results should include type and distance/context.

Selecting a result should:

1. select the object
2. expose relevant data
3. optionally focus the camera

Do not automatically move the camera just because the item was selected unless the user explicitly chooses focus.

---

# 6. Exoplanet System Mode

Add a dedicated:

```text
EXOPLANET SYSTEM
```

view.

Support real systems when reliable parameters exist.

Examples:

```text
Proxima Centauri
TRAPPIST-1
Kepler-186
Kepler-452
TOI systems
```

For each system display available:

- host star
- planet names
- orbital period
- semi-major axis
- estimated radius
- estimated mass
- eccentricity
- equilibrium temperature
- discovery method
- discovery year
- habitable-zone relationship

Clearly distinguish:

```text
Measured
Estimated
Unknown
```

values.

---

# 7. Habitable Zone Visualization

Add a toggle:

```text
Show Habitable Zone
```

For a selected star, estimate:

```text
inner boundary
conservative zone
outer boundary
```

Use a documented simplified model.

Do not present this as proof that a planet is habitable.

Show tooltip:

```text
This region represents an approximate liquid-water habitable zone based primarily on stellar luminosity.
```

---

# 8. Hypothetical Planet Placement

In God Mode or System Builder, allow users to add a hypothetical planet around a selected star.

Input:

```text
planet mass
planet radius
orbital distance
eccentricity
inclination
initial anomaly
```

Show:

```text
estimated orbital period
equilibrium temperature
habitable-zone position
Hill sphere
escape velocity
```

Then allow the system to simulate the planet where appropriate.

---

# 9. System Builder

Create a dedicated workspace:

```text
SYSTEM BUILDER
```

Users should be able to create a planetary system from scratch.

Start with:

```text
Primary star
```

Configure:

```text
mass
radius
temperature
luminosity
rotation
```

Then add:

```text
planets
moons
asteroid belts
comets
binary companions
```

---

# 10. Generate Stable-Looking System

Add:

```text
Generate System
```

with configurable parameters:

```text
Star Type
Planet Count
Inner Radius
Outer Radius
Allow Gas Giants
Allow Moons
Allow Asteroid Belt
```

The generator should produce bounded, physically plausible initial conditions.

Use spacing heuristics such as Hill-radius separation where appropriate.

Clearly state:

```text
Generated systems are not guaranteed to remain stable over astronomical timescales.
```

---

# 11. Binary Star Systems

Add support for:

```text
Binary Star
```

scenarios.

Support:

- two stars orbiting barycenter
- circumbinary planet
- planet orbiting one component

Show:

```text
binary separation
binary period
barycenter
```

Add presets.

---

# 12. Triple-System Experiment

Add optional experimental support for simple three-star systems.

Label clearly:

```text
Experimental
```

Do not attempt to fake long-term stability.

Let the normal N-body physics determine behavior.

---

# 13. Planetary Formation Mode

Add an educational workspace:

```text
FORMATION
```

This is a simplified experimental model.

Support:

```text
star
protoplanetary disk
planetesimals
proto-planets
dust particles
```

Possible processes:

- gravitational interaction
- collision
- merging
- accretion
- simplified migration
- ejection

Do not claim this is a complete astrophysical formation simulation.

Display:

```text
Simplified educational formation model
```

---

# 14. Accretion simulation

When two suitable proto-bodies collide:

```text
merge masses
conserve momentum
update radius/density approximation
```

Track:

```text
number of bodies
largest body
total disk mass
ejected bodies
collision count
```

---

# 15. Interstellar Mission Planner

Create:

```text
INTERSTELLAR MISSION
```

mode.

Allow:

```text
Origin
Destination
Propulsion Type
Cruise Speed
Acceleration
Deceleration
```

Example:

```text
Earth
→ Proxima Centauri
```

Display:

```text
Distance
Travel Time
Maximum Speed
Communication Delay
Energy Estimate
```

---

# 16. Propulsion Concepts

Provide selectable propulsion models:

```text
Chemical
Nuclear Thermal
Ion
Solar Sail
Laser Sail
Fusion Concept
Nuclear Pulse Concept
Antimatter Concept
Custom
```

Clearly classify each as:

```text
Operational
Demonstrated
Conceptual
Speculative
```

Do not imply speculative propulsion currently exists.

---

# 17. No fake faster-than-light travel

Do not include physically real FTL propulsion.

If the project includes an entertainment visualization such as:

```text
Warp Visualization
```

it must be clearly marked:

```text
Fictional Visualization
```

and separated from scientific mission calculations.

---

# 18. Relativity Calculator

Add a high-speed travel calculator.

For speeds where relativistic effects matter, calculate:

```text
β = v/c
Lorentz factor
Earth-frame time
Traveler proper time
Relativistic kinetic energy
```

Allow speeds such as:

```text
0.01c
0.05c
0.1c
0.25c
0.5c
0.75c
0.9c
0.99c
Custom
```

Reject:

```text
v >= c
```

for massive spacecraft.

---

# 19. Relativistic visualization

For educational purposes show a graph/table comparing:

```text
velocity
Earth time
traveler time
```

for a selected mission.

Do not alter the current Newtonian Solar System engine to fake relativistic dynamics.

Keep relativity calculations as a separate supported module unless a later dedicated relativistic engine is implemented.

---

# 20. Light Travel Time Everywhere

Extend the existing light-delay tool.

For any two supported objects calculate:

```text
distance
one-way light time
round-trip light time
```

Examples:

```text
Earth → Moon
Earth → Mars
Earth → Voyager-like spacecraft
Earth → Proxima Centauri
```

Use current simulation positions where available.

---

# 21. Communication Timeline

For interplanetary/interstellar missions show:

```text
Message sent
Signal arrival
Possible reply sent
Reply arrival
```

Example:

```text
Earth → Mars

One-way:
12m 44s

Earliest response:
25m 28s
```

Values must update with current simulated distance.

---

# 22. Observation Mode

Add a major:

```text
OBSERVATION
```

workspace.

Allow the user to choose an observer:

```text
Earth
Moon
Mars
Jupiter moon
spacecraft
custom body
```

Then display the sky from that location.

---

# 23. Planetary Sky View

For a selected observer calculate apparent directions to:

```text
Sun
planets
major moons
selected stars
spacecraft
```

Allow:

```text
Horizon View
Full Sky
Telescope
```

Where surface-local orientation is supported.

---

# 24. Telescope Mode

Upgrade Telescope View.

Input:

```text
Observer
Target
FOV
Tracking
```

FOV presets:

```text
30°
10°
5°
1°
0.5°
0.1°
```

Show:

```text
angular diameter
distance
light delay
relative velocity
```

where derivable.

---

# 25. Apparent Angular Size

Calculate apparent angular size.

Examples:

```text
Sun from Earth
Moon from Earth
Earth from Mars
Jupiter from Europa
```

Use:

```text
object radius
distance from observer
```

Do not use display-exaggerated radius for scientific calculations.

---

# 26. Planetary Phases

Where geometry permits, display approximate illumination phase.

Examples:

```text
Venus phase from Earth
Moon phase from Earth
Earth phase from Moon
```

This should be derived from observer/object/light-source geometry.

---

# 27. Eclipse and Occultation Explorer

Expand eclipse detection.

Support:

```text
solar eclipse
lunar eclipse
planetary transit
moon transit
occultation
satellite shadow entry
```

Add:

```text
Find Next Event
```

for supported systems.

Do not hardcode results if the current simulator can calculate them.

---

# 28. Time Machine

Create a dedicated:

```text
TIME MACHINE
```

workspace.

Allow the user to jump to a date.

Distinguish between:

```text
JPL approximate initialization
Horizons state
local numerical propagation
recorded simulation
```

Always show which source/method is being used.

---

# 29. Timeline presets

Allow presets for interesting dates once they are calculated or supplied by reliable data.

Examples:

```text
Mars opposition
Jupiter opposition
planetary conjunction
eclipse
perihelion
aphelion
```

Do not invent future events.

---

# 30. Event Finder

Create a search tool for simulation events.

Possible queries:

```text
Next Earth-Mars closest approach
Next Moon perigee
Next Jupiter opposition
Next close spacecraft encounter
```

Where supported, calculate by bounded numerical search.

Run expensive event searches in a worker.

---

# 31. Milky Way View

Add a higher-level:

```text
MILKY WAY
```

visualization.

This should be a navigational/educational visualization rather than an N-body simulation of the entire galaxy.

Show:

```text
galactic disk
approximate spiral structure
Sun location
galactic center
selected known stars
```

Clearly indicate when geometry is schematic.

Do not imply billions of individually simulated stars.

---

# 32. Galactic Coordinate Mode

Add support for displaying:

```text
galactic longitude
galactic latitude
distance
```

for supported objects.

Keep transformations documented.

---

# 33. Milky Way scale navigation

Allow transitions:

```text
Solar System
→ Stellar Neighborhood
→ Milky Way
```

Use hierarchical camera/reference systems.

Never attempt to represent all scales directly in one raw coordinate space.

---

# 34. Galactic Center

Allow users to focus the approximate position of:

```text
Sagittarius A*
```

Display educational information separately from physical Solar System simulation.

Do not introduce it as an active gravity source for the Solar System.

---

# 35. Local Group View

Add an optional:

```text
LOCAL GROUP
```

view.

Show major galaxies such as:

```text
Milky Way
Andromeda
Triangulum
```

plus major satellite systems where practical.

This should primarily be an educational scale visualization.

---

# 36. Distance Ladder

Add an educational tool:

```text
COSMIC SCALE
```

Example:

```text
Earth radius
Moon distance
Sun distance
Solar System
Proxima Centauri
Milky Way
Andromeda
```

Allow smooth logarithmic scale exploration.

This would be especially useful for demonstrating how enormous astronomical distances really are.

---

# 37. Universe Scale Slider

Add an optional logarithmic scale navigator.

Example:

```text
1 km
1,000 km
1 million km
1 AU
100 AU
1 ly
10 ly
1,000 ly
100,000 ly
1 Mly
```

Moving the slider should adjust exploration scale, not rewrite physics.

---

# 38. Discovery Cards

For selected astronomical objects show compact scientific information.

Example:

```text
PROXIMA CENTAURI

Type: M dwarf
Distance: 4.24 ly
Mass: ...
Radius: ...
Temperature: ...

Known planets:
...
```

Avoid oversized decorative cards.

Use concise scientific layout.

---

# 39. Compare Stars

Add comparison mode.

Example:

```text
Sun vs Proxima Centauri vs Sirius
```

Compare:

```text
mass
radius
temperature
luminosity
stellar type
estimated lifetime
```

Only show data available in the dataset.

---

# 40. Compare Planetary Systems

Allow:

```text
Solar System
vs
TRAPPIST-1
```

Compare:

```text
star size
number of planets
orbital scale
planet sizes
habitable zone
orbital periods
```

---

# 41. Educational Layer

Add optional explanatory overlays.

Examples:

```text
What is an AU?
What is a light-year?
What is a barycenter?
What is an exoplanet?
What is a habitable zone?
```

Keep this optional.

Professional users should be able to disable all educational content.

---

# 42. Orbital Challenge Mode

Add an optional:

```text
CHALLENGES
```

workspace.

Examples:

```text
Place satellite into circular orbit
Reach the Moon
Reach Mars
Create GEO orbit
Rendezvous with satellite
Escape Earth
Create stable binary system
```

Score using real simulation results.

Possible scoring metrics:

```text
Δv
fuel use
orbit error
mission duration
closest approach
```

---

# 43. Challenge validation

Do not validate a challenge based on visual position alone.

Example:

```text
Circular Orbit Challenge
```

should check:

```text
eccentricity threshold
altitude range
bound orbit
```

---

# 44. Mission Analyst

Add a context-aware assistant panel:

```text
MISSION ANALYST
```

Its job is to explain the current simulation.

Examples:

```text
Why is my orbit unstable?
Why did I miss Mars?
What does this eccentricity mean?
Why is energy drift high?
How do I circularize this orbit?
Why is the satellite losing altitude?
```

The assistant should receive structured current state such as:

```text
selected body
orbital elements
simulation settings
integrator
solver
vehicle telemetry
target
```

Do not provide fake telemetry.

---

# 45. Suggested-action system

Mission Analyst may suggest actions such as:

```text
Reduce timestep
Circularize orbit
Increase periapsis
Wait for better transfer window
Reduce burn duration
```

Suggestions must not automatically modify the simulation.

User must confirm actions.

---

# 46. Sensor View

Add a spacecraft:

```text
SENSORS
```

workspace/panel.

Support educational approximations such as:

```text
Optical Camera
Star Tracker
Range Finder
Radar-style proximity view
Sun Sensor
Altimeter
```

Do not claim full sensor hardware simulation.

---

# 47. Optical spacecraft camera

Allow a spacecraft to expose a forward-facing camera view.

Users should be able to:

```text
Look Forward
Track Target
Track Earth
Track Sun
```

This can reuse the main renderer with a secondary camera.

---

# 48. Star Tracker

Create a simplified star-tracker visualization.

Use visible reference stars and spacecraft orientation.

Show:

```text
Attitude lock
Tracking quality
```

Keep it educational unless a real attitude-determination algorithm is implemented.

---

# 49. Solar Environment Layer

Add optional environmental overlays.

Examples:

```text
Solar wind
Planetary magnetosphere
Radiation zones
Van Allen belts
```

Clearly label them as simplified.

Do not let the overlays dominate the default view.

---

# 50. Magnetosphere Visualization

Add simplified magnetic-field visualizations for:

```text
Earth
Jupiter
Saturn
```

Allow toggle:

```text
Show Magnetosphere
```

Keep it separate from gravitational physics unless electromagnetic dynamics are explicitly implemented.

---

# 51. Planet Interior View

Add:

```text
INTERIOR
```

visualization.

For rocky worlds display approximate layers:

```text
crust
mantle
outer core
inner core
```

For gas giants:

```text
atmosphere
molecular hydrogen
metallic hydrogen
core approximation
```

These are educational cutaways.

Do not modify collision radii or physics based on these render layers.

---

# 52. Earth Interior Example

When Earth is selected, allow:

```text
Surface
Cutaway
Interior
```

Smoothly transition rendering.

The cutaway must not accidentally expose or modify internal physics coordinates.

---

# 53. Upcoming Events Panel

Add a compact panel:

```text
UPCOMING EVENTS
```

Possible events:

```text
periapsis
apoapsis
conjunction
opposition
SOI crossing
eclipse
maneuver
collision risk
rocket stage event
```

Sort by simulation time.

---

# 54. Notifications without clutter

Important events may display a compact toast such as:

```text
Mars SOI entry in 10 minutes
```

Do not spam notifications for ordinary recurring events.

Allow notification categories to be configured.

---

# 55. Favorites

Allow users to favorite:

```text
objects
systems
missions
scenarios
camera views
```

Add a compact favorites navigator.

Persist locally.

---

# 56. Exploration history

Track recent exploration:

```text
Earth
Moon
Mars
Proxima Centauri
TRAPPIST-1
```

Allow back/forward navigation.

This should integrate with the existing camera navigation history where possible.

---

# 57. Saved Exploration Sessions

Allow the user to save a complete exploration state containing:

```text
selected workspace
camera
target
date
scale
visible overlays
selected object
```

This is separate from a full physics scenario when no simulation modifications were made.

---

# 58. Performance requirements

Do not render huge star catalogs as individual React components.

Use:

```text
InstancedMesh
BufferGeometry
LOD
spatial filtering
screen-space culling
```

Only render detailed labels for relevant objects.

Large datasets should be processed outside React render loops.

---

# 59. Data architecture

Create a clear astronomy data layer.

Separate:

```text
simulation bodies
catalog objects
educational metadata
ephemeris data
render-only objects
```

Do not force every catalog star into the active N-body physics engine.

---

# 60. Catalog vs Simulation

For example:

A nearby star displayed in the stellar map may initially be:

```text
Catalog Object
```

not an active gravitational body.

If the user creates a simulation around it, convert/load required objects into a simulation scenario.

This prevents enormous unnecessary N-body simulations.

---

# 61. Precision labels

Every scientific property should indicate uncertainty/status when appropriate.

Possible states:

```text
Exact configuration value
Calculated
Approximate
Estimated
Catalog value
Unknown
```

Avoid false precision.

---

# 62. Units

Expand unit formatting.

Support:

```text
m
km
AU
light-seconds
light-minutes
light-hours
light-days
light-years
parsecs
```

Automatically select readable units.

Example:

Instead of:

```text
40,208,000,000,000 km
```

show:

```text
4.25 ly
```

when appropriate.

---

# 63. Clean Universe animations

Animations must remain restrained.

Stars should not unnecessarily pulse.

Galactic visualizations should not spin rapidly.

Use slow, subtle movement only when scientifically or visually useful.

Avoid turning Explore Mode into a sci-fi game interface.

---

# 64. Scale transition animation

Transitions between scale levels should use:

```text
fade detail
change reference frame
reposition camera
restore relevant detail
```

instead of extreme continuous zooming through empty space.

This improves usability and avoids numerical/rendering problems.

---

# 65. Explore Mode UI

Keep Explore UI compact.

Suggested layout:

```text
┌─────────────────────────────────────────────────────┐
│ Explore │ Search │ Time │ Scale │ Layers │ Hide UI  │
├────────┬────────────────────────────────────────────┤
│        │                                            │
│ Objects│             UNIVERSE VIEW                  │
│        │                                            │
│        │                                            │
├────────┴────────────────────────────────────────────┤
│ Selected Object │ Distance │ Scale │ Time           │
└─────────────────────────────────────────────────────┘
```

All panels collapse.

Simulation remains full-size underneath overlays.

---

# 66. Integration with What-If Mode

Allow supported catalog systems to become What-If scenarios.

Example:

```text
Open TRAPPIST-1
→ What-If
→ Increase planet e mass ×2
```

Only simulate objects loaded into the active scenario.

---

# 67. Integration with God Mode

God Mode should be available in user-created/system-builder simulations.

Do not allow meaningless editing of static catalog entries until they are instantiated into a scenario.

Provide:

```text
Create Editable Scenario
```

---

# 68. Integration with Rocket Mission Mode

Mission planner should support destinations beyond Solar System planets when using interstellar mode.

Example:

```text
Earth → Proxima Centauri
```

Switch to Interstellar Mission calculations instead of normal planetary transfer calculations.

---

# 69. Integration with Time Machine

Explore Mode must share the global simulation/observation date.

Changing the date should update supported:

```text
Solar System states
ephemeris objects
observation geometry
```

Catalog metadata that is effectively static does not need to change.

---

# 70. Documentation

Update README and project docs.

Add sections for:

```text
Explore Mode
Star Catalog
Exoplanet Systems
System Builder
Formation Mode
Interstellar Missions
Relativity Calculator
Observation Mode
Time Machine
Milky Way View
Local Group View
Mission Analyst
Sensor View
```

Clearly document which systems are:

```text
Physics simulations
Ephemeris playback
Catalog visualizations
Educational approximations
```

---

# 71. Suggested implementation order

Build in this order:

```text
1. Astronomy catalog data architecture
2. Explore workspace
3. Nearby stars
4. Scale/unit expansion
5. Hierarchical universe navigation
6. Universal search
7. Exoplanet system loader
8. Habitable zones
9. System Builder
10. Binary systems
11. Formation mode
12. Observation mode
13. Telescope improvements
14. Angular-size/phase calculations
15. Time Machine
16. Event Finder
17. Interstellar Mission Planner
18. Relativity calculator
19. Communication delay
20. Milky Way visualization
21. Local Group
22. Cosmic Scale tool
23. Compare modes
24. Challenges
25. Mission Analyst
26. Sensor View
27. Solar environment overlays
28. Planet interiors
29. Favorites/history
30. Performance optimization
31. Documentation
32. Final testing
```

Do not stop after every feature to ask for confirmation.

Build the complete expansion systematically.

---

# Final Acceptance Scenario

The completed application should allow this workflow:

```text
Open Orrery.

Start at the complete Solar System.

Focus Earth.

Switch to Observation Mode.

View Jupiter from Earth.

Measure current distance and light delay.

Return to Explore.

Zoom out into Nearby Stars.

Select Proxima Centauri.

Inspect its stellar properties.

Open its planetary system.

Show the approximate habitable zone.

Create an editable copy.

Add a hypothetical Earth-mass planet.

Run a What-If simulation.

Return to Explore.

Plan an interstellar mission:
Earth → Proxima Centauri.

Set speed to 0.1c.

Compare Earth-frame travel time and traveler proper time.

Open the Milky Way view.

Locate the Sun.

Move to Local Group scale.

Inspect Andromeda.

Return to the saved Solar System scenario without losing its state.
```

The result should make Orrery feel like a complete **space exploration, orbital mechanics, mission simulation, What-If physics, astronomy discovery, and universe-scale educational platform**, while keeping scientific calculations separate from schematic or educational visualization layers.