# Camera navigation and exploration

The visible camera has one writer: `CameraRig`. `NavigationController` holds its Float64 inertial position, quaternion, target, velocity and active mode. OrbitControls owns an isolated proxy camera, is enabled only in Orbit/Follow, and never writes the visible camera. No selected-object or panel-size watcher refocuses the camera.

## Controls

| Action | Control |
| --- | --- |
| Independent navigation | Choose FREE in the small viewport mode selector |
| Forward/back; left/right | W/S; A/D, in camera-local axes |
| Vertical | Q/E, selectable camera-up or J2000 ecliptic north |
| Look | Left/right drag; optional pointer lock with C |
| Pan in Free | Middle drag |
| Free speed | Wheel, logarithmic; Alt + wheel dollies |
| Precision / boost | Hold Ctrl ×0.001 / Shift ×10 |
| Select / focus | Click / double-click; F focuses current selection |
| Follow | Shift + F |
| Release automation, lock, tool | Esc |
| Navigation history | Alt + Left/Right |
| Hide interface | H |
| Performance / camera debug | F3 / F4 |

Single-click selection and Free Camera are independent. The left navigator selects on click and focuses on double-click. Explicit focus/preset/scale actions are camera commands. Pressing WASDQE, dragging, or scrolling cancels automated focus or cinematic motion. Exiting Follow/Chase to Free retains the exact current pose and clears tracking velocity.

Free movement uses exponential translation damping with the analytic displacement integral. Rotation, zoom and follow have separate rates. Adaptive speed follows nearby clearance with smoothing and a local safety cap; precision and boost do not change the stored base speed. A logarithmic manual speed ranges from metres/second to AU/second.

## Modes

- **Free:** inertial position and mouse-look. OrbitControls is disabled.
- **Orbit:** a fixed target, arbitrary panned point, or an explicitly chosen barycenter.
- **Follow:** carries the camera offset with its target, with user rotation and zoom.
- **Chase / Rocket / Satellite:** damped target-relative position; selectable velocity/attitude direction, height and distance.
- **Target lock:** free translation with continuous target pointing.
- **Cinematic:** SI camera keyframes, eight seconds per segment; manual input cancels.
- **Surface:** cancellable travel to a spherical latitude/longitude/altitude, then local movement with the body's rotation. It selects actual radii and defaults to camera-relative vertical.
- **Telescope:** target-lock specialization at a surface observer, with actual radii and 0.1–10° FOV. A blocked horizon remains visibly blocked. It is not an optical/astrometric observing pipeline.

Follow and reference frames are distinct. An inertial Free camera stays at the place the user leaves it. Explicit Sun/planet/moon/spacecraft frames translate with the reference; velocity-relative also carries its changing velocity direction. They do not modify gravitational state.

## Scale and precision

The camera position remains SI. A separate render origin follows it in bounded regions, and display units change with viewing scale/navigation distance. Positions are subtracted in double precision before they reach GPU transforms. Static line/label buffers rebase together in `FrameGroup`; body and particle transforms update against the active frame.

Scientific rendering retains distance/radius ratios. Educational logarithmic distance compression remains a separate, visibly identified display model. Focus uses body extent, rings, vehicle extent, FOV and aspect. Long travel pulls back, crosses an elevated system-scale route, then approaches with logarithmic distance interpolation; it does not interpolate billions of kilometres at a fixed local speed.

Camera collision protection projects swept segments against displayed spherical bodies plus the configured clearance. Interior access is explicit. It is a point-camera geometric constraint, not rigid-body collision physics. A moving body that engulfs the camera can require an immediate boundary correction. Large SI magnitudes still have a finite double-precision floor; the HUD reports it when significant.

Screen-space targets allow selecting small visible body centres within ten pixels without enlarging their rendered surfaces. Overlapping projected targets select the nearest centre. Mesh picking remains available.

## Bookmarks and presets

Bookmarks persist locally and in scenario JSON: SI position/target, quaternion, mode, target ID, FOV, scale and reference. Pair barycenter IDs are retained. Legacy render-coordinate viewpoints remain loadable. Bookmarks can be renamed, deleted and restored.

Presets include system top/side, Sun, Earth, Moon, Mars, Jupiter's moon system, Saturn rings, ecliptic and north ecliptic. History saves actual camera poses and restores them; selection alone is not a history entry.

## Additional tools and approximations

- Observation: geometric distance, relative/closing speed, angular diameter, phase and light delay.
- Comparison: physical properties, a common-radius illustration and measured low-order period ratios. A period ratio alone does not prove resonance libration.
- Lagrange markers: roots of the idealized circular restricted three-body equations, not instantaneous N-body equilibrium points.
- Terminator: plane perpendicular to the instantaneous stellar direction.
- Sunlight: finite apparent discs and the strongest spherical occulter, producing sunlight/penumbra/umbra and solar power fraction. Multiple overlapping occulter unions, atmospheric scattering and refraction are omitted. Isolated Earth scenarios explicitly assume a Sun at 1 AU along +X.
- Radio: range, LOS, propagation delay and aligned-antenna free-space loss. No noise floor, receiver threshold, atmosphere, modulation or full RF link certification.
- Rendezvous: relative vectors/closing speed/alignment plus bounded impulsive match/approach assistance. Docking readiness is geometric only; no rigid-body docking is simulated.
- Escape/capture: current-state Kepler energy/angular-momentum targeting, shown before confirmation. Rocket impulses debit active-stage fuel.
- Maneuvers: local prograde/normal/radial components resolve at execution; orbit-line placement selects time from an osculating ellipse. Finite-thrust duration is an estimate; planned burns remain explicitly instantaneous.
- Closest approach: minimum over actually integrated relative-motion segments, with step resolution and partial-horizon limits displayed.
- Replay: up to 240 exact snapshots / 32 MiB / 1,000 bodies, every two wall-clock seconds and on events. Scrub selects captured states; edits and live worker stepping are blocked. Return to Live restores the saved live state. No interpolated or reconstructed uncaptured physics is claimed.

## Acceptance

The automated navigation tests cover local axes, selection independence, focus cancellation, Follow offset, Follow/Chase exit, precision/boost, pitch limits, target-lock, frame-rate-independent damping, FOV focus, collision protection, SI bookmark restoration, Neptune-scale offsets, spherical sites, surface cancellation, reference translation and barycenter bookmarks.

The complete 23-step interactive camera acceptance sequence still requires browser verification. The available browser automation kernel crashed on both initialization and recovery in this upgrade session; no current screenshot or interactive pass is claimed. Previously captured screenshots document the prior interface, not proof of this camera rebuild.

Run the full commands in README and use F4 to inspect position/mode/origin during manual acceptance. Test pointer lock, touch gestures, Clean View, real-radius picking and all mode handoffs on the intended browser/hardware.

1. Start at Solar System view.
2. Enter Free Camera.
3. Move with WASDQE.
4. Rotate with mouse drag.
5. Select Earth; verify the SI camera pose does not change.
6. Explicitly focus Earth.
7. Press W halfway through focus; verify travel cancels immediately.
8. Free roam near Earth.
9. Follow Earth with Shift + F.
10. Rotate and zoom while Earth moves; verify the relative offset remains user-controlled.
11. Exit Follow into Free; verify no pose jump or inherited tracking velocity.
12. Focus Moon.
13. Fly away manually from Moon.
14. Focus Jupiter.
15. Return to Solar System view.
16. Select a rocket without an automatic focus.
17. Enter Chase mode.
18. Exit Chase into Free; verify the exact pose is preserved.
19. Hide UI with H and continue navigating.
20. Restore UI; verify no camera reset.
21. Navigate near a satellite while holding Ctrl for precision.
22. Travel Earth–Neptune with high-speed free navigation.
23. Inspect rendered stability at both local and system scales.

Automatic destination focus on SOI arrival is restricted to a vehicle already tracked in Follow/Chase/Rocket/Satellite. Free, Orbit, Surface and Target Lock remain under user control.
