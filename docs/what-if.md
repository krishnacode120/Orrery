# What-If laboratory

WHAT-IF creates a real Newtonian Sandbox branch from the current complete scenario. It does not change the original scenario. Use the header's What-If button or the What-If workspace in the layout selector. Entering pauses the new branch, preserving the original pause state, editing history and physical snapshot. Selection and camera pose remain independent; entering, resetting and exiting do not issue camera commands.

## Work with an experiment

1. Open Solar System — Today and enter WHAT-IF.
2. Select Jupiter; choose 100× relative to its captured baseline mass.
3. Enable baseline dashed paths and experiment solid paths.
4. Choose a prediction horizon and click Compare. Automatic comparison starts after a 600 ms edit debounce.
5. Read the **actually compared** horizon before interpreting the paths or metrics. A 20-year request is not a promise that 20 years will fit the compute budget.
6. Play the live branch using the usual time controls. Its physical state evolves in the existing live worker.
7. Pause and Compare again. The preserved baseline is propagated to the branch's current epoch before both cloned states advance together.
8. Reset Experiment to restore the current branch's baseline, or Exit Without Saving to restore the original root scenario.
9. Save as Scenario to retain the experiment independently. Apply Changes commits the current evolved branch; one Undo restores the original root scenario.

Quick experiments include Earth/Jupiter mass changes, Sun mass changes, removing/duplicating the Moon, adding an Earth companion, stopping/reversing Earth relative to the Sun, moving Mars, global gravity multipliers and relative velocity changes. All modify actual SI state. The live parameter editor supports mass, radius, density, position, velocity, spin, tilt and temperature. Density edits change mass at fixed radius. Rocket mass is derived from fuel, dry stages and payload instead.

The 16 experiment presets include star-like Jupiter mass, two moons, exchanged planetary orbits, binary Sun, flybys, alignment, impacts and removal of Jupiter. These are explicitly experimental initial conditions. Increasing Jupiter's mass does not model fusion or stellar evolution. Collision-course presets require the ordinary physical collision settings to resolve impacts.

Surprise Me and Chaos Mode generate a bounded preview of one or three small mass/velocity changes. Nothing executes until **Execute these changes** is selected. Reset remains available.

## Comparison and reports

Comparison is an overlay plus a numerical difference view, not two permanently running live simulations. A separate disposable analysis worker owns two cloned Sandbox engines. The Reality baseline supplies initial state vectors; its comparison branch uses Newtonian propagation rather than continued ephemeris playback.

Only matched-epoch samples enter the report. If one engine advances further when the budget expires, its unmatched state is excluded. Baseline alignment consumes the same budget. No comparison is claimed when alignment did not finish.

Reports include per-body position/velocity and orbital-element differences, mass changes, energy/angular-momentum differences, barycenter displacement, sampled maximum positional deviation, actual elapsed simulation time, physical events and selected vehicle fuel/closest-approach metrics where available. Branch-to-branch energy differences are intentional and are distinct from each engine's numerical drift. Capture Before/After stores complete snapshots and labels comparisons at different epochs.

Outcome detection combines actual collision, disruption, SOI, fuel, impact and mission events with sampled changes between osculating-bound and osculating-unbound states. Escape/capture labels refer to the body's instantaneous current primary. They do not prove permanent capture, ejection or long-term stability. Maximum deviation is a sampled maximum, not a continuous error bound.

Export Simulation Report downloads JSON with the model label, budgets, sampled paths and numerical results. Export Branch JSON is a runnable ordinary scenario. Reports never manufacture qualitative scientific conclusions.

## Future events

Schedule scalar mass/radius/gravity changes, position/velocity changes, creation, deletion, impulse burns, ignition, cutoff, staging, collision triggers or physical fragmentation at the current epoch plus a delay.

The positive-time integrator splits at the next pending event. Events execute once, atomically; invalid operations are rejected and logged without partially editing the scenario. Intentional energy and angular-momentum changes adjust the conservation baselines. Settings, execution flags, topology and body state are published as one completed worker frame in both SharedArrayBuffer and transferable modes.

Creation uses a saved absolute vector at execution. A collision trigger deliberately places an approaching pair in overlap and enables merge; the collision resolver performs the actual merge. Fragmentation conserves mass and momentum within existing source/fragment limits. Scheduled events do not execute during pause. Reverse time does not undo executed events, consumed fuel or dissipative evolution.

Up to 256 scheduled events are retained in scenario JSON. Sandbox evolution supports 1800–2999. Approximate Reality initialization, Horizons coverage and ephemeris date bookmarks keep their existing coverage limits.

## Missions and coarse sensitivity

Rocket experiments edit stage dry mass, fuel, engine thrust, payload and separation speed. Epoch reinitialization loads approximate JPL planetary vectors while preserving vehicle-relative state; it does not replay an already flown launch. Circular parking-orbit initialization replaces the selected state using the actual current primary's circular velocity. Scheduled ignition/cutoff integrates engine thrust and fuel during a powered interval; launch autopilot may cut off sooner.

Maneuver timing experiments edit pending node epochs and use the existing maneuver editor. Nodes remain fuel-aware impulses for rockets, not finite-duration engine burns.

A worker sweep takes at most 12 coarse samples of mass, relative velocity or gravity. Only completed horizons enter encounter rankings. The Earth–Mars departure-date sweep offers a phased zero-revolution Lambert estimate or a circular coplanar Hohmann estimate. Both are planning approximations; the Hohmann estimate omits phase and inclination. Neither is a flown launch-to-arrival mission or an optimizer guaranteeing the best transfer.

## Persistence and limits

Root autosave stays on the original scenario while an experiment is active. A separate IndexedDB key stores the experiment, baseline and original snapshots every five seconds. Recover Last Autosaved Experiment is explicit; boot does not silently enter an experimental universe. Local branch saves include parent/child IDs, tags, scheduled events, settings, camera/view and mission data. Backend sharing uses the existing scenario routes and edit-key security.

Limits: 1,000 bodies per comparison branch; 32 tracked paths; 8–256 matched path samples; a 100 ms–12 s analysis budget; horizons up to 1,000 years within the Sandbox epoch boundary. Long requests can return partial results. These limits protect the browser; they do not establish prediction accuracy. Existing scene/source/fragment limits still apply.

## Verify in the browser

- Start in Free camera. Enter What-If, select Jupiter, edit and reset: camera pose must remain unchanged.
- Remove Moon, Undo and Redo: only the experiment changes. Exit restores the original Moon, date and pause state.
- Apply an evolved branch, then Undo: the root scenario must return.
- Compare identical branches: zero differences at matched samples. Change Jupiter's mass: measured differences and paths must come from the worker.
- Request a long horizon with a small budget: reached duration and partial warning must be visible.
- Schedule an event and step through its epoch: one event, updated state and no false intentional-change drift alarm.
- Save, export/import and share a branch; reload pending/executed events and parent metadata.
- Recover an autosaved session and verify root autosave remains untouched.
- Inspect stage separation: both objects continue physically with inherited velocity and a configured relative impulse.
- Test desktop/mobile panels, keyboard focus, hidden UI and both transport modes.

Automated invariants are recorded in ../VERIFICATION.md. Visual smoothness and browser interaction still require this checklist.
