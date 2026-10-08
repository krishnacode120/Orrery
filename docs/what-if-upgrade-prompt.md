# Orrery upgrade prompt extension: What-If and clean motion

This section extends the existing camera-first Orrery upgrade request. Preserve the existing SI/J2000 physics contracts, worker ownership, revisions, baseline accounting, Reality/Sandbox separation and independently controlled camera. Build on working systems. Do not generate fake outcomes, telemetry, trajectories or unavailable controls.

## What-If workspace and experiments

1. Add WHAT-IF as a dedicated non-destructive branch of the current scenario. Preserve the original state. Provide Apply Changes, Reset Experiment, Compare, Save as Scenario and Exit Without Saving, with clear BASELINE/WHAT-IF identity.
2. Provide real state edits: Earth mass ×2/×10, Jupiter ×10/×1000, Sun ±10%, remove/duplicate Moon, second Earth, stop/reverse Earth, move Mars, gravity ×0.5/×2/×10, double/zero/reverse velocities.
3. Expose selected-body mass, radius, density, position, velocity, spin, tilt and explicitly visual temperature. Support relative multipliers 0.1–1000× and velocity −50%, −25%, current, +25%, +50%, +100%, reverse and zero.
4. Predict modifications with cloned simulation state before committing to the baseline. Derive all numerical effects from simulation; say long-term results require simulation when uncertain.
5. Compare baseline and experiment through split, overlay or difference views without duplicating expensive live simulation unnecessarily. Show positions, velocities, orbital elements and energy differences at comparable epochs.
6. Support future events for mass/velocity/gravity edits, creation/deletion, rocket burns, staging and collision triggers, using actual simulation dates or relative delays.
7. Save independently named branches with parent/child scenario relationships.
8. Include experimental presets: star-like Jupiter, Moon removal/two moons, Earth/Mars orbit exchange, Sun ±25%, rogue flyby, binary Sun, alignment, planets ×10, reversed velocities, no Jupiter, Moon collision, asteroid impact and black-hole flyby. Label unrealistic assumptions.
9. Support rocket and spacecraft experiments with launch date, orbit, mass/fuel/thrust, burn epoch/duration and transfer assumptions. Compare actual or explicitly approximate travel time, Δv, fuel, encounter distance and arrival speed.
10. Run bounded coarse sensitivity sampling in a worker. Rank only supported completed results and describe model limits.

## Clean physical and visual motion

11. Use frame-time-aware motion at 30, 60, 120 and 144 FPS.
12. Use smooth cancellable focus, damped follow/chase and staged cross-scale camera travel.
13. Selection, workspace, panel, God Mode, labels, scale, What-If and time-speed changes must not unexpectedly snap the camera.
14. Interpolate previous/current worker publications for visual body poses only; physics remains authoritative.
15. Smooth rocket pose, attitude, gimbal visuals where supported, separation, camera tracking and trails separately from truthful telemetry.
16. Detach physical stages with inherited position/velocity and configured momentum-aware separation impulse; evolve both objects through physics.
17. Use capped circular trail histories with adaptive sampling and progressive updates.
18. Keep UI animation subtle: roughly 150–250 ms open, 120–200 ms close, short tooltip fade and minimal dropdown travel.
19. Preserve inspector location across selection; avoid remount flashes and animating every number.
20. Use rounded stable-width telemetry rather than excessive decimal noise.
21. Keep physics speed settings authoritative; any animated speed indicator is presentation only.
22. Pause physical evolution at a documented integration boundary, stop trails and physical effects, and optionally pause visual effects.
23. Keep reverse history/prediction trails clear; do not imply dissipation and consumed fuel are undone by reverse integration.
24. Drive merges, bounces and fragments from simulation. Restrict optional flashes/dust to restrained visual presentation.
25. Fragment bodies with valid physical states and continuing gravity; crack visuals are optional.
26. Keep accretion/lensing visual approximations smooth and confined to the scene.
27. Animate solar convection/corona slowly and procedurally rather than obvious loops.
28. Keep clouds and atmosphere anchored to the body with slow rotation.
29. Support optional vehicle velocity/target/nadir/Sun attitude response with quaternion interpolation.
30. Prefer quaternion slerp for vehicle and camera rotation; avoid Euler flips.
31. Interpolate only display radius when changing visibility scale; never interpolate authoritative physical radius.
32. Use LOD hysteresis and crossfade where practical; do not claim those features without implementing them.
33. Attach labels by projection each frame; fade overlap visibility without heavy lagging springs.
34. Enter What-If without reloading the scene or moving the camera. Reset restores physical baseline immediately and removes overlays.
35. Optional before/after scrubber must be explicitly a visual comparison, not an intermediate physical universe.
36. Capture Before/After positions, orbits, velocities, energies and orbital elements with epoch labels.
37. Integrate experiment edits with undo/redo while keeping baseline immutable.
38. Surprise Me must generate bounded previewable edits with immediate reset.
39. Chaos Mode must show its bounded plan and require explicit execution.
40. Offer day/week/month/year/10-year/100-year/custom prediction horizons with numerical warnings, budgets and truthful actual reached horizons.
41. Detect actual collisions, impacts, Roche disruption, SOI changes and fuel depletion; label sampled escape/capture/destabilization inferences appropriately.
42. Export concise experiment reports using only recorded/simulated numbers, including actual duration, sampled deviation, orbital elements and detected events.

## Acceptance workflow

Open Solar System — Today; enter WHAT-IF; select Jupiter; set mass ×100; display baseline and experiment paths; request 20 years; distinguish requested and reached horizons; play, pause and compare Earth/Mars orbits, barycenter, energy and angular momentum. Reset; remove Moon; request 100 years; save Earth Without Moon; exit. Baseline must remain preserved, camera under user control, physical motion authoritative, trajectories clearly labeled and panels responsive.

This file records requirements, not a completion certificate. Implemented behavior and current safeguards are documented in what-if.md and motion.md. VERIFICATION.md distinguishes automated results from outstanding interactive acceptance.
