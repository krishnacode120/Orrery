// Public editorial content: rendered to HTML at build time, never dependent on WebGL.
export const pages = [
  {
    "path": "/",
    "title": "Orrery — Interactive Solar System & Orbital Mechanics Simulator",
    "heading": "A universe to explore. Physics to question.",
    "description": "Explore planets, simulate orbits, launch rockets and test gravity in Orrery, an interactive 3D Solar System and orbital mechanics laboratory.",
    "eyebrow": "Interactive space physics laboratory",
    "intro": "Explore the Solar System, then change the conditions. Orrery brings planetary motion, editable N-body gravity and spacecraft experiments into one browser workspace.",
    "cta": "Open the simulator",
    "launch": "solar",
    "sections": [
      [
        "Observe a moving Solar System",
        "Start with the current date, explore eight planets and major moons, and follow their paths through time. Move from a system overview to a local spacecraft view. Real distances and display-radius controls help you navigate scales that cannot all fit faithfully on one screen."
      ],
      [
        "Change one assumption",
        "Branch into What-If mode, increase a planet’s mass, remove a moon or alter a velocity. Compare the experiment with its preserved baseline. Paths and outcomes come from numerical integration; long-term chaos is something to measure, not a prediction to invent."
      ],
      [
        "Follow a mission through the equations",
        "Launch a multistage vehicle, inspect its atmosphere and propellant telemetry, plan maneuvers or run the Earth–Mars reference mission. The scientific workbench checks actual capture and deterministic replay, while explaining where the models use ideal impulses and other approximations."
      ]
    ],
    "links": [
      "/solar-system-simulator",
      "/orbital-mechanics-simulator",
      "/rocket-simulator",
      "/satellite-simulator",
      "/what-if-solar-system",
      "/universe-explorer"
    ]
  },
  {
    "path": "/solar-system-simulator",
    "title": "3D Solar System Simulator — Orrery",
    "heading": "Explore the Solar System in motion.",
    "description": "Explore eight planets and major moons in 3D. Control time, inspect orbital paths and compare approximate ephemerides with an editable gravity simulation.",
    "intro": "Start from a date, follow a planet and see how distance, orbital speed and perspective shape your view of the Solar System.",
    "launch": "solar",
    "cta": "Open Solar System Simulator",
    "sections": [
      [
        "An astronomical view with usable scale",
        "The eight planets share a consistent inertial coordinate system. Major moons add local planetary systems to explore. Switch between visible display radii and physical radii: display exaggeration changes the picture, never a body’s gravitational mass or collision radius."
      ],
      [
        "Time is a control, not an animation track",
        "Reality mode computes approximate planetary states for the selected epoch. Pause, accelerate or reverse the clock to compare inner and outer orbits. Convert a snapshot to Sandbox to integrate the same positions and velocities under gravity. Dissipative collisions cannot be undone merely by reversing time."
      ],
      [
        "Try an observation",
        "Focus Earth, identify Mars and compare their distance and light-travel delay. Change the date and watch the geometry evolve. Approximate moon phases and the JPL element model have limits; Horizons can initialize supported targets with external state vectors when the API is available."
      ]
    ],
    "links": [
      "/learn/why-planets-orbit",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/orbital-mechanics-simulator",
    "title": "Orbital Mechanics Simulator — Orrery",
    "heading": "Make orbital mechanics visible.",
    "description": "Study eccentricity, inclination, orbital velocity and maneuver nodes. Compare Hohmann and Lambert planning with numerical N-body propagation.",
    "intro": "An orbit is a position and a velocity, not a rail. Change either and inspect the new path, energy and closest approach.",
    "launch": "orbits",
    "cta": "Explore orbital mechanics",
    "sections": [
      [
        "Read an orbit from its state",
        "The inspector derives semi-major axis, eccentricity, inclination, nodes, periapsis and apoapsis from current relative state vectors. These are osculating two-body elements: useful local descriptions that can evolve when other bodies perturb the orbit."
      ],
      [
        "Plan a burn and inspect its consequence",
        "A prograde impulse raises energy, but its effect on the opposite apsis depends on where it occurs. Radial and normal components serve different purposes. Place a maneuver, preview a cloned trajectory and compare prediction with execution. Fuel-aware rocket impulses reject insufficient propellant."
      ],
      [
        "Choose the right model for the question",
        "Hohmann estimates describe ideal coplanar circular transfers. Lambert solutions connect endpoints in a chosen flight time. The sandbox executes numerical gravity with Verlet, RK4 or adaptive Dormand–Prince. Inspect timesteps and drift instead of assuming every calculated curve is equally accurate."
      ]
    ],
    "links": [
      "/learn/orbital-velocity",
      "/learn/hohmann-transfer",
      "/learn/apoapsis-periapsis",
      "/mission-planner"
    ]
  },
  {
    "path": "/rocket-simulator",
    "title": "Rocket Simulator & Mission Planner — Orrery",
    "heading": "From launch pad to orbital flight.",
    "description": "Simulate staged rocket ascent, thrust, propellant use and orbital insertion. Run a reproducible Earth-to-Mars mission with measured capture checks.",
    "intro": "Follow a rocket whose motion comes from gravity, thrust, changing mass and approximate atmospheric forces. Read the flight data that explains its trajectory.",
    "launch": "rocket",
    "cta": "Launch Rocket Simulator",
    "sections": [
      [
        "Ascent with a changing vehicle",
        "Ignition releases the launch constraint. Guidance pitches the thrust direction as altitude and velocity change; propellant loss changes acceleration. Pressure-dependent engine settings distinguish sea-level and vacuum performance. Stages separate into physical bodies rather than disappearing at a scripted time."
      ],
      [
        "Measure the difficult parts",
        "Mission Control displays dynamic pressure, Mach within the atmosphere, acceleration, fuel and osculating orbital elements. Max-Q is detected from the trajectory. Optional structural warnings and a heating proxy help compare flights, but are not substitutes for aerodynamic or structural engineering."
      ],
      [
        "A complete reference experiment",
        "The scientific workbench starts on Earth, reaches a parking orbit, targets a full N-body cruise and captures into a Mars-bound orbit. It records burns, propellant and replay data. Ascent uses continuous thrust; interplanetary burns are fuel-aware ideal impulses. Read the accuracy page before treating this educational model as flight planning."
      ]
    ],
    "links": [
      "/learn/how-rockets-reach-orbit",
      "/learn/time-to-mars",
      "/mission-planner",
      "/accuracy"
    ]
  },
  {
    "path": "/satellite-simulator",
    "title": "Satellite Orbit Simulator — Orrery",
    "heading": "Understand the orbit behind the satellite.",
    "description": "Simulate LEO, MEO, GEO and polar orbits. Explore ground tracks, maneuver plans, sunlight and geometric communications in a satellite laboratory.",
    "intro": "Load an orbital preset, change the state and connect the three-dimensional path to a ground track and live telemetry.",
    "launch": "satellite",
    "cta": "Open Satellite Simulator",
    "sections": [
      [
        "Different orbits answer different questions",
        "A low Earth orbit gives a short period and rapidly changing ground track. Higher orbits take longer to complete. GEO needs the correct period, direction, equatorial plane and low eccentricity to appear stationary; a high orbit alone is not geostationary."
      ],
      [
        "See the environment along a path",
        "Satellite telemetry reports altitude, inclination, apses, speed and orbital period. Sunlight, penumbra and umbra affect a simplified power model. Communication indicators use distance, propagation delay and geometric obstruction; they do not establish that a real radio link will close."
      ],
      [
        "Simulation, not a live tracking feed",
        "These vehicles are simulated state vectors. They are not an operational catalog of current spacecraft telemetry or a TLE tracking service. The Sun-synchronous-like preset demonstrates an inclination, without a J2 model that would maintain the expected precession. Use maneuver prediction to study changes in the implemented gravity model."
      ]
    ],
    "links": [
      "/learn/geostationary-orbit",
      "/learn/orbital-velocity",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/space-physics-sandbox",
    "title": "Space Physics & N-Body Gravity Sandbox — Orrery",
    "heading": "Change the system. Follow the consequences.",
    "description": "Experiment with mass, velocity, gravity, collisions and fragmentation in a 3D N-body sandbox with diagnostics and reversible editing.",
    "intro": "Build an experiment around a physical question. The inspector, God Tools and diagnostics turn an orbital scene into a working gravity laboratory.",
    "launch": "sandbox",
    "cta": "Open the physics sandbox",
    "sections": [
      [
        "Edit physical state directly",
        "Change mass, radius, position or velocity and the worker integrates the revised system. Pinning is a constraint, not an invisible source of momentum conservation. Test particles feel gravity without sourcing it, making them useful for fields, rings and trajectory studies."
      ],
      [
        "Compare collision rules",
        "Merging combines mass and momentum. Bouncing uses a configurable restitution impulse. Fragmentation creates physical debris with bounded counts and momentum-aware velocities. These are controlled experiment rules, not material-strength models or hydrodynamic simulations of planetary destruction."
      ],
      [
        "Use diagnostics as part of the experiment",
        "Changing a mass is an intentional energy change, not numerical drift. The engine adjusts event baselines and exposes integration warnings. Try reducing the timestep and comparing the result. Undo handles supported edits; a paused snapshot or What-If branch is safer than expecting reverse time to reconstruct destroyed bodies."
      ]
    ],
    "links": [
      "/what-if-solar-system",
      "/learn/escape-velocity",
      "/accuracy"
    ]
  },
  {
    "path": "/what-if-solar-system",
    "title": "What-If Solar System Simulator — Orrery",
    "heading": "What happens if you change the Solar System?",
    "description": "Test a heavier Jupiter, two moons around Earth or a lighter Sun in a preserved-baseline What-If physics experiment.",
    "intro": "Keep a baseline, change one variable and compare actual simulated outcomes. Reset the branch when you want to ask a different question.",
    "launch": "whatif",
    "cta": "Start a What-If experiment",
    "sections": [
      [
        "What if Jupiter were much heavier?",
        "Increasing Jupiter’s mass changes the forces on the other bodies and the system’s barycenter. The outcome depends on epoch, duration and numerical settings. Start with a tenfold increase, then inspect trajectory differences instead of assuming an immediate ejection. The mass edit is an artificial experiment, not a model of how Jupiter could acquire that matter."
      ],
      [
        "What if Earth had two moons?",
        "A duplicated Moon needs a new position and velocity. Its future depends on mutual perturbations and proximity to Earth’s Hill region. The two-moon preset is a starting state, not a promise of long-term stability. Compare short runs first and inspect close encounters with a smaller timestep."
      ],
      [
        "What if the Sun lost mass?",
        "Reducing the central mass changes the orbital energy of planets whose instantaneous velocities are unchanged. Orbits can become more eccentric or unbound. The experiment applies a state change; it does not model stellar mass ejection, radiation or the travel of that change through a relativistic field."
      ]
    ],
    "examples": [
      [
        "Jupiter mass ×10",
        "jupiter10"
      ],
      [
        "Earth has two moons",
        "duplicateMoon"
      ],
      [
        "Remove the Moon",
        "removeMoon"
      ],
      [
        "Sun mass −10%",
        "sun90"
      ]
    ],
    "links": [
      "/space-physics-sandbox",
      "/learn/escape-velocity",
      "/accuracy"
    ]
  },
  {
    "path": "/universe-explorer",
    "title": "Universe Explorer: Stars & Exoplanets — Orrery",
    "heading": "Beyond the Solar System, with context.",
    "description": "Explore nearby stars, selected exoplanet systems, habitable-zone estimates and schematic galactic views with clear data provenance.",
    "intro": "Travel from a familiar planetary system into a catalog-based view of nearby stars and selected exoplanets.",
    "launch": "universe",
    "cta": "Open Universe Explorer",
    "sections": [
      [
        "Read the catalog, including what it does not know",
        "Bundled HYG stars and selected NASA exoplanet records include provenance. Missing values remain unknown; estimated or minimum masses are distinguished from measured values. A catalog view is separate from the live N-body simulation until you explicitly create an editable system."
      ],
      [
        "Habitable zones are one filter",
        "An estimated radiative habitable zone describes a simplified range of stellar heating. It does not establish surface water, atmosphere, biology or habitability. Examine stellar luminosity, orbit and uncertainty before interpreting a planet’s position in a colored band."
      ],
      [
        "Know when a map is schematic",
        "Milky Way and Local Group views explain scale and relationships rather than numerically integrating galaxies. Interstellar calculations use idealized endpoints and propulsion profiles, with energy and proper-time limits. They are a way to reason about distances, not evidence that a proposed engine can perform the trip."
      ]
    ],
    "links": [
      "/solar-system-simulator",
      "/accuracy",
      "/about"
    ]
  },
  {
    "path": "/mission-planner",
    "title": "Space Mission Planner & Earth–Mars Transfers — Orrery",
    "heading": "Plan a transfer. Test it under gravity.",
    "description": "Explore Lambert launch windows, maneuver nodes, closest approach and an Earth–Mars reference mission with deterministic replay and debriefs.",
    "intro": "Separate a planning estimate from an executed trajectory. Orrery lets you examine both and measure their differences.",
    "launch": "planner",
    "cta": "Open Mission Planner",
    "sections": [
      [
        "Departure and arrival belong together",
        "A transfer opportunity depends on two epochs, not simply the distance to Mars today. The launch-window grid solves bounded zero-revolution Lambert cases and reports departure C3 and arrival excess speed. These are not surface-to-surface propellant budgets."
      ],
      [
        "Execution adds constraints",
        "A vehicle must leave its parking orbit, exit the departure sphere of influence and encounter the target while retaining enough fuel for capture. SOI changes select analysis frames; they do not teleport the spacecraft or turn off other gravity. Maneuver previews are limited to the horizon actually integrated."
      ],
      [
        "Review a reproducible mission",
        "Run the reference mission in the scientific workbench and inspect parking eccentricity, TMI, encounter, capture and final apses. Export the actual burn log and accepted-step replay. It is a validated experiment within documented approximations, not a general optimizer guaranteed to solve any vehicle and launch date."
      ]
    ],
    "links": [
      "/rocket-simulator",
      "/learn/hohmann-transfer",
      "/learn/time-to-mars",
      "/accuracy"
    ]
  },
  {
    "path": "/features",
    "title": "Orrery Features: Exploration, Physics & Missions",
    "heading": "One laboratory, several ways to investigate.",
    "description": "Find Orrery’s Solar System, What-If, mission, satellite and scientific analysis tools, with links to the models behind them.",
    "intro": "Choose the workspace that matches your question. The simulator stays at the center; specialized panels expose the relevant controls.",
    "launch": "solar",
    "sections": [
      [
        "Explore",
        "Navigate planets and moons, compare observations, inspect apparent size and light delay, and visit catalog-based star systems. Free, follow and orbit cameras cover system-scale and local views."
      ],
      [
        "Simulate",
        "Use direct-source gravity, optional tree/GPU tracers, three integrators, collisions, tidal experiments and editable bodies. What-If preserves a baseline while a separate experiment develops."
      ],
      [
        "Analyze",
        "Plan maneuvers, read vehicle telemetry and test the Earth–Mars reference mission. Export scenarios, reports and deterministic tapes. Diagnostics distinguish numerical error from intentional changes and constrained motion."
      ]
    ],
    "links": [
      "/solar-system-simulator",
      "/space-physics-sandbox",
      "/mission-planner",
      "/satellite-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/about",
    "title": "About Orrery — Interactive Space Physics Laboratory",
    "heading": "A place to ask better questions about space.",
    "description": "Learn why Orrery combines astronomical exploration with inspectable physics, reproducible experiments and transparent model limits.",
    "intro": "Orrery is a browser-based project for exploring how motion, gravity and mission choices fit together. It is built for curious learners and people who want to inspect the numbers.",
    "sections": [
      [
        "An inspectable experiment",
        "The project pairs a React and Three.js viewport with an independent worker-based numerical engine. Scenario files preserve SI state and settings. You can pause, edit, export and repeat an experiment rather than relying on an animation with a predetermined ending."
      ],
      [
        "Transparency before spectacle",
        "Approximate ephemerides, schematic galaxy views, ideal burns and simplified atmospheres are identified as such. A successful test is evidence about a specific model and configuration, not a claim of flight certification. The public accuracy guide and repository describe the boundaries."
      ],
      [
        "Source and participation",
        "The repository includes frontend, backend, tests and documentation. Report reproducible bugs with model settings and a minimal scenario, excluding private information or edit keys. Public source availability does not by itself grant a software license; see the repository’s licensing status before redistribution."
      ]
    ],
    "links": [
      "/accuracy",
      "/features",
      "/learn"
    ]
  },
  {
    "path": "/accuracy",
    "title": "Orrery Accuracy, Physics Models & Limitations",
    "heading": "Know what the model can tell you.",
    "description": "Review Orrery’s ephemerides, numerical integrators, gravity, atmosphere, moon approximations, GPU precision and mission validation boundaries.",
    "intro": "A convincing picture is not an accuracy guarantee. Orrery exposes model choices so observations and experiments can be interpreted honestly.",
    "sections": [
      [
        "Positions and frames",
        "Reality uses JPL approximate planetary elements, with circular mean-orbit moon models unless replaced by supported Horizons vectors. Horizons initialization is followed by local numerical propagation. Internal state is SI in the J2000 ecliptic basis; rotating body frames have illustrative prime-meridian origins. UTC, TT and approximate TDB are distinguished."
      ],
      [
        "Gravity and numerical error",
        "Massive sources interact directly. Non-sourcing tracers can use direct, Barnes–Hut or eligible Float32 WebGPU evaluation. Verlet, RK4 and adaptive Dormand–Prince have different error behavior. GPU precision can be kilometres at astronomical distances and is not intended for spacecraft navigation. Inspect tolerances, timesteps and applicable conservation metrics."
      ],
      [
        "Missions and approximations",
        "Rocket ascent uses changing mass, thrust and an approximate layered atmosphere. Interplanetary rocket burns are fuel-aware ideal impulses. The reference mission verifies actual Mars binding and replay, not real launch feasibility. Heating, docking, communications, GR and fragmentation remain simplified; black-hole visuals are not a full spacetime solution."
      ],
      [
        "Exploration is not always propagation",
        "Nearby-star and exoplanet data retain source labels. Galaxy maps are schematic. Habitable-zone overlays are radiative estimates. A static catalog object only becomes a physics body when explicitly instantiated. Read the model label before comparing a rendered system with a measured astronomical state."
      ]
    ],
    "links": [
      "/mission-planner",
      "/universe-explorer",
      "/space-physics-sandbox"
    ]
  },
  {
    "path": "/learn",
    "title": "Learn Orbital Mechanics — Orrery Guides & Calculators",
    "heading": "Understand the motion. Then try it.",
    "description": "Learn orbital velocity, transfers, escape, Lagrange points and satellite orbits with clear explanations and interactive Orrery examples.",
    "intro": "Start with one concept, follow a worked approximation, and test it in the simulator. Each guide separates an ideal equation from a more complicated physical system.",
    "sections": [
      [
        "A useful learning sequence",
        "Begin with why planets orbit and circular orbital velocity. Then connect energy to escape velocity and the closest/farthest points of an ellipse. Transfer planning becomes easier once you can distinguish a local burn from an entire trajectory."
      ],
      [
        "Equations have assumptions",
        "The calculators use spherical point-mass gravity and idealized orbits. They leave out atmospheric losses, finite burn duration and multi-body perturbations. Use them as reference cases for a numerical experiment, not as operational navigation tools."
      ]
    ],
    "links": []
  },
  {
    "path": "/privacy",
    "title": "Privacy & Shared Scenarios — Orrery",
    "heading": "Your scenarios stay local until you share them.",
    "description": "Understand Orrery’s local storage, shared-scenario URLs, edit keys, API requests and hosting logs.",
    "intro": "The default application does not include advertising, third-party analytics or automatic uploads of simulation state.",
    "sections": [
      [
        "Local state",
        "Autosave, camera preferences and saved experiments use browser storage on your device. JSON and report exports are local downloads. Clearing browser site data removes locally stored records; export important work first."
      ],
      [
        "Sharing is an explicit upload",
        "Saving to the backend sends the selected scenario or mission definition to the hosting server. A share ID permits anyone holding the link to read its contents. It is unlisted and marked noindex, but it is not private access control. The separate edit key permits changes; keep it out of screenshots, issues and public messages."
      ],
      [
        "Requests and operations",
        "Horizons requests go through the API to NASA JPL. The supplied production logging configuration avoids request bodies, query strings, scenario IDs and edit keys. Hosting providers may retain infrastructure logs under their own policies. No retention guarantee is implied; the operator must document any analytics or logging changes before enabling them."
      ]
    ],
    "links": [
      "/about",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/orbital-velocity",
    "title": "What Is Orbital Velocity? — Orrery",
    "heading": "What Is Orbital Velocity?",
    "description": "Calculate circular orbital speed and understand why altitude and sideways motion matter.",
    "intro": "Calculate circular orbital speed and understand why altitude and sideways motion matter.",
    "launch": "satellite",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "Speed is only half the state",
        "Orbital velocity has both magnitude and direction. At the same altitude, a sideways circular velocity, an upward velocity and a downward velocity produce different trajectories. A satellite in orbit is accelerating even when its speed is constant, because gravity keeps changing its direction."
      ],
      [
        "The circular reference case",
        "For a small body around a spherical primary, v = √(μ/r), where μ = GM and r is distance from the center, not altitude above the surface. Using Earth’s mean radius and mass gives about 7.67 km/s at 400 km altitude. A higher circular orbit is slower but travels a longer path, so its period is longer."
      ],
      [
        "Try it in Orrery",
        "Load the 400 km satellite preset and inspect its relative velocity and period. Pause, add a modest prograde impulse, and compare the new periapsis and apoapsis. The spacecraft will not instantly move into a higher circular orbit: one burn normally creates an ellipse. The calculator omits drag, oblateness and other bodies."
      ]
    ],
    "calculator": "orbit",
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/hohmann-transfer",
    "title": "What Is a Hohmann Transfer? — Orrery",
    "heading": "What Is a Hohmann Transfer?",
    "description": "Explore a two-impulse transfer between circular orbits and its ideal flight time.",
    "intro": "Explore a two-impulse transfer between circular orbits and its ideal flight time.",
    "launch": "planner",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "Two burns, one transfer ellipse",
        "For coplanar circular orbits around one dominant mass, a Hohmann transfer follows half an ellipse whose ends touch the starting and destination circles. The first impulse enters that ellipse; the second matches the destination circular speed. Neither burn is free, and arriving at the right radius is not the same as meeting a moving target."
      ],
      [
        "A compact calculation",
        "With radii r₁ and r₂, the transfer semi-major axis is a = (r₁ + r₂)/2. At either end its speed follows v = √[μ(2/r − 1/a)]. Subtract the local circular speed to obtain each ideal impulse. Flight time is π√(a³/μ). Between circular 1 AU and 1.524 AU orbits this is about 259 days."
      ],
      [
        "Where the estimate stops",
        "A real Earth–Mars mission also needs Earth escape, correct planetary phasing and Mars capture. Inclination, eccentricity and finite burns complicate the problem. In Orrery, compare this ideal reference with a Lambert opportunity and then with actual N-body execution. A useful comparison reports its assumptions alongside delta-v."
      ]
    ],
    "calculator": "transfer",
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/escape-velocity",
    "title": "What Is Escape Velocity? — Orrery",
    "heading": "What Is Escape Velocity?",
    "description": "Calculate an ideal escape speed and distinguish leaving a planet from escaping the Solar System.",
    "intro": "Calculate an ideal escape speed and distinguish leaving a planet from escaping the Solar System.",
    "launch": "sandbox",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "Escape is an energy condition",
        "In an isolated two-body model, a trajectory is unbound when specific orbital energy v²/2 − μ/r is zero or positive. The threshold speed is vₑ = √(2μ/r). Its value depends on distance from the primary’s center. From the same radius it is √2 times circular speed."
      ],
      [
        "Surface speed is not a launch budget",
        "At Earth’s mean surface the ideal result is about 11.2 km/s. This ignores atmosphere, rotation and propulsion losses. A vehicle already in a circular orbit has existing velocity; a prograde escape impulse is the difference between the local escape and circular speeds, not the full escape speed. Fuel requirements also depend on engine performance and changing mass."
      ],
      [
        "Choose the primary",
        "Escaping Earth does not imply escaping the Sun. A spacecraft leaving Earth can remain on a bound heliocentric ellipse. In Orrery, inspect relative orbital energy and reference frame before interpreting an “escape” warning. Try a small velocity change around the threshold and compare periapsis, energy and future path."
      ]
    ],
    "calculator": "escape",
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/lagrange-points",
    "title": "What Is a Lagrange Point? — Orrery",
    "heading": "What Is a Lagrange Point?",
    "description": "Understand the five idealized equilibrium locations and why they are not places without gravity.",
    "intro": "Understand the five idealized equilibrium locations and why they are not places without gravity.",
    "launch": "orbits",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "Equilibrium in a rotating picture",
        "For two bodies in circular mutual motion, the restricted three-body model has five locations where a small object can keep a fixed position in the co-rotating frame. Gravity is still present. The apparent balance includes the rotating frame’s acceleration; it is not a cancellation of every physical force."
      ],
      [
        "Five locations, different behavior",
        "L1, L2 and L3 lie along the line through the two primaries. L4 and L5 complete equilateral triangles. The triangular locations are stable only for suitable mass ratios and idealized assumptions; the collinear locations are unstable. Real spacecraft near these regions use three-dimensional trajectories and corrections."
      ],
      [
        "Read the markers correctly",
        "Enable Orrery’s idealized Lagrange markers for a selected pair. Compare the Sun–Earth and Earth–Moon length scales. Markers are derived reference locations, not permanently pinned physical objects or automatically stable parking slots. A full N-body experiment will include perturbations absent from the circular restricted model."
      ]
    ],
    "calculator": null,
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/sphere-of-influence",
    "title": "What Is a Sphere of Influence? — Orrery",
    "heading": "What Is a Sphere of Influence?",
    "description": "Distinguish patched-conic reference changes from real changes in gravity.",
    "intro": "Distinguish patched-conic reference changes from real changes in gravity.",
    "launch": "planner",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "A boundary for an approximation",
        "A sphere of influence is a convenient region for switching the dominant central body in a patched-conic calculation. A common estimate is rSOI = a(m/M)^(2/5), using the smaller body’s orbital scale a and the two masses. It is not a material surface or a place where the Sun suddenly stops attracting a spacecraft."
      ],
      [
        "Do not confuse it with a Hill sphere",
        "The approximate Hill radius a(1−e)(m/3M)^(1/3) addresses a different question: a region relevant to retaining satellites against the larger body’s tidal influence. Both are model-dependent estimates. Long-term stability also depends on direction, eccentricity and perturbations; being inside either boundary is not sufficient proof."
      ],
      [
        "Watch a transition",
        "In Orrery, follow a departure or arrival and inspect the parent/reference-frame event. The full simulation keeps the other gravitational sources active. A change in parent should alter relative readouts, not teleport the vehicle. Compare heliocentric and planet-relative speed to see why the same state can have very different numbers."
      ]
    ],
    "calculator": null,
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/why-planets-orbit",
    "title": "Why Do Planets Orbit the Sun? — Orrery",
    "heading": "Why Do Planets Orbit the Sun?",
    "description": "See how sideways motion and gravitational acceleration produce curved paths.",
    "intro": "See how sideways motion and gravitational acceleration produce curved paths.",
    "launch": "solar",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "Continuous falling, with sideways motion",
        "Gravity changes a planet’s velocity toward the Sun. Its sideways motion carries it away from the radial line, so the resulting path can curve around the Sun rather than strike it. No engine is needed to maintain an ideal orbit in vacuum; an orbit is free fall, not motion without forces."
      ],
      [
        "Ellipses and perturbations",
        "The isolated two-body inverse-square problem has conic trajectories. Bound cases are ellipses, with circles as a special case. In the actual Solar System, each planet also feels other bodies. An ellipse fitted to its instantaneous state is therefore a changing local description, not a rigid track drawn through space."
      ],
      [
        "Make the distinction visible",
        "Open Reality mode to inspect approximate date-based planetary positions. Convert to Sandbox, pause and reduce Earth’s tangential velocity. Resume and watch its periapsis change. “Stop Earth” is an artificial instantaneous edit; it removes orbital kinetic energy without modeling a mechanism that could accomplish that change."
      ]
    ],
    "calculator": null,
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/apoapsis-periapsis",
    "title": "What Are Apoapsis and Periapsis? — Orrery",
    "heading": "What Are Apoapsis and Periapsis?",
    "description": "Read the nearest and farthest points of an orbit, and avoid confusing radius with altitude.",
    "intro": "Read the nearest and farthest points of an orbit, and avoid confusing radius with altitude.",
    "launch": "orbits",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "Two ends of an ellipse",
        "Periapsis is the smallest distance to the primary’s center; apoapsis is the largest. For a bound ellipse, rₚ = a(1−e) and rₐ = a(1+e). Subtract the primary’s radius when you want altitude. Around Earth the specific names perigee and apogee are often used."
      ],
      [
        "What a burn changes",
        "A short prograde burn at periapsis typically raises the opposite apsis while leaving the burn point as the new periapsis, provided the trajectory remains in that regime. Circularization requires matching the circular speed at a suitable point. A burn elsewhere generally changes both apses and the ellipse’s orientation."
      ],
      [
        "Inspect an actual state",
        "Load a satellite and add a maneuver. Compare the pre-burn elements, the predicted path and the propagated result. For an unbound hyperbola there is no finite apoapsis; an honest readout should show “Unbound,” not an enormous invented distance. Other bodies can change osculating apses during a longer run."
      ]
    ],
    "calculator": null,
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/time-to-mars",
    "title": "How Long Does It Take to Reach Mars? — Orrery",
    "heading": "How Long Does It Take to Reach Mars?",
    "description": "Understand transfer time, launch geometry and Orrery’s measured Earth–Mars reference mission.",
    "intro": "Understand transfer time, launch geometry and Orrery’s measured Earth–Mars reference mission.",
    "launch": "reference",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "There is no single travel time",
        "Mars is moving while a spacecraft is in flight. Departure epoch, arrival epoch, energy, escape geometry and capture requirements all matter. Dividing today’s Earth–Mars distance by a rocket’s launch speed does not produce a useful mission estimate. The rocket changes speed throughout the flight."
      ],
      [
        "A useful ideal reference",
        "A half-ellipse between circular 1 AU and 1.524 AU orbits around the Sun takes about 259 days in the two-body model. That is a transfer-scale estimate, not an arrival guarantee. Higher-energy trajectories can trade flight time against departure and capture costs; they do not remove the need for the planets to be in suitable positions."
      ],
      [
        "A measured Orrery example",
        "The bundled 2031 reference experiment reaches a parking orbit, executes fuel-aware ideal impulses and captures around Mars. Its verified run lasts about 261.2 days including two final Mars orbits. Run it yourself and inspect epoch, approach speed, propellant and capture criteria. This validates the implemented model, not a real launch vehicle or mission design."
      ]
    ],
    "calculator": null,
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/geostationary-orbit",
    "title": "What Is a Geostationary Orbit? — Orrery",
    "heading": "What Is a Geostationary Orbit?",
    "description": "Understand GEO, its required geometry and its difference from other synchronous orbits.",
    "intro": "Understand GEO, its required geometry and its difference from other synchronous orbits.",
    "launch": "geo",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "A period is not enough",
        "A geostationary satellite follows a circular, prograde equatorial orbit with Earth’s sidereal rotation period. Its ground position then stays approximately fixed in the ideal model. A synchronous orbit with inclination or eccentricity can trace a daily pattern rather than remain above one longitude."
      ],
      [
        "Estimate the radius",
        "Set orbital period T = 2π√(r³/μ) equal to about 86,164 seconds and solve r = (μ(T/2π)²)^(1/3). With standard Earth parameters the altitude is approximately 35,786 km. This is measured above the equatorial radius, which differs from the mean-radius approximation used in simple calculators."
      ],
      [
        "Compare with low orbit",
        "In Orrery, compare GEO with a 400 km LEO preset. Inspect period, ground track and station visibility. The simulated geometry does not include stationkeeping against every real perturbation, operational radio coverage or a live spacecraft catalog. The comparison is most useful when both the reference frame and the force model are stated."
      ]
    ],
    "calculator": null,
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  },
  {
    "path": "/learn/how-rockets-reach-orbit",
    "title": "How Does a Rocket Reach Orbit? — Orrery",
    "heading": "How Does a Rocket Reach Orbit?",
    "description": "Follow thrust, staging, gravity losses and the sideways speed needed for orbital flight.",
    "intro": "Follow thrust, staging, gravity losses and the sideways speed needed for orbital flight.",
    "launch": "rocket",
    "cta": "Try this in Orrery",
    "sections": [
      [
        "Going up is not the whole job",
        "A rocket must clear the atmosphere while building enough horizontal velocity to keep falling around Earth. A high vertical hop can return to the surface even after reaching space. Guidance turns the thrust direction as the vehicle climbs; the useful result is a safe bound trajectory, not merely a peak altitude."
      ],
      [
        "Mass changes the acceleration",
        "Thrust divided by current mass contributes to acceleration, while gravity and drag oppose or redirect motion. The ideal rocket equation Δv = Isp g₀ ln(m₀/mf) links propellant, mass ratio and engine performance. It does not include losses or guarantee that a guidance program delivers the available delta-v efficiently."
      ],
      [
        "Look at the flight data",
        "Load Orrery’s rocket preset, ignite and watch actual propellant flow, Max-Q, stage separation and apses. Pause near insertion to compare altitude with periapsis: a vehicle can be high above Earth while its predicted orbit still crosses the surface. Atmospheric and engine models are approximations; this experiment is not a structural or flight-certification tool."
      ]
    ],
    "calculator": null,
    "article": true,
    "links": [
      "/learn",
      "/orbital-mechanics-simulator",
      "/accuracy"
    ]
  }
];
