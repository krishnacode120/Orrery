# Planet positions and independent selection — 13 October 2026

## Root cause and scope

The audited Mercury/Venus authoritative states are correct SI vectors, with distinct
IDs. JPL Table 1, worker Float64 publication and ID-based interpolation do not swap
these planets. No orbital offsets or forced physical separations were added.

Four presentation/interaction defects were found:

1. `AdaptiveLabels` wrote coordinates in the current floating-origin frame while
   its `FrameGroup` parent applied the old-to-new frame transform again. During
   camera rebasing, the label could detach from its planet and identify a different
   visible object. Dynamic labels now live at scene root, like dynamic body meshes.
   The launch-pad group had the same double-transform and was corrected too.
2. Body meshes and the canvas screen-target picker both handled clicks, with
   different hit rules. A helper target could overwrite the actual surface hit.
   One canvas picker now owns selection, double-click focus and context actions.
   Surface ray intersections take precedence over small screen-space helpers;
   helpers use projected distance, depth and stable ID, independent of body order.
3. Unbounded exaggerated radii could intersect at compressed/custom display scales.
   Exaggeration is capped at 40% of nearest displayed major-body separation, never
   below physical radius. True radii remain exact, including actual collisions.
   No body center, physical radius or collision input is modified.

4. The viewport title named the selected body even when the camera stayed at a
   different planet. It now identifies the camera target, or Free Camera. The
   selection/info panel identifies the selected object separately.

Projected line-of-sight conjunctions can still overlap on screen; those are real
viewing geometry, not a reason to move a planet. The supplied historical screenshot
did not include an epoch/scenario, so this release does not claim to reconstruct
that exact saved state.

## Position contract

State is heliocentric/inertial J2000 ecliptic meters and meters per second.
`viewSpace` subtracts the common Float64 render origin, divides by meters per scene
unit, and maps axes `[x,y,z] -> [x,z,-y]`. Float32 uploads happen afterwards.
Educational mode additionally applies an explicitly labelled radial compression.
The worker's legacy Float32 overview buffer remains protocol-compatible; body
meshes use Float64 state through `viewSpace`, not a second conversion of that buffer.
Camera targeting is preferred over selection when choosing a local render frame.

F4 reports Mercury/Venus physical Sun distance, render distance/center/radius,
selection/info targets and last picking method. Read-only sanity checks flag
non-finite state, duplicate IDs, impossible Reality radii and physical intersections.
They never repair or clamp physics.

## Interaction changes

- Click/tap selects. Double-click or Focus moves the camera explicitly.
- Empty viewport click, Escape or Clear Selection clears the selection. Placement,
  drag, maneuver editing, dialogs and UI controls do not deselect behind the panel.
- Closing information keeps selection. Info can be opened independently.
- Settings → Display → Show information on selection persists locally.
- Free Camera retains position, orientation and speed while selecting, clearing or
  reading information. Return to Free Camera clears tracking without resetting pose.
- Information uses physical values and osculating orbital elements, with catalog
  provenance and Unknown for unavailable stellar data. No exaggerated radius enters it.
- Catalog stars use one screen-space picking listener, optional catalog information,
  explicit focus and clean deselection; no per-star React event handlers.
- Invisible labels leave keyboard/accessibility hit testing, rather than remaining
  invisible clickable elements.

## Verification

New regressions cover five epochs (2000-01-01, 2026-10-12, 2026-10-13,
2030-01-01, 2050-01-01), all three visual scales, Sun/Earth/camera origins,
Float32 separation tolerance, worker topology ordering, interpolation ordering,
selection/info/camera independence, tool guards and picking priority.

Live Horizons comparisons passed for Mercury and Venus at all five epochs:
direction error below 0.0075°, fractional radius error below 0.000026.
These are measured checks of the approximation, not a guarantee for arbitrary dates.
Run `ORRERY_API_URL` against a local or production `/api` origin with
`node scripts/verify-inner-planets.mjs`; results go to `artifacts/`.

The full frontend suite, backend suite and production build are required before
publishing. Browser checks include actual inner-planet rendering, empty-click clear,
optional info, W focus cancellation, Follow-to-Free and unchanged paused SI state.
Production verification additionally checks `/`, `/app`, `/api/health`, `/api/ready`,
shared-memory/fallback operation, responsive selection and console errors.

## Files and compatibility

Changes are restricted to scene/frame/label/picking components, navigation actions,
selection/UI stores and panels, two interaction utilities, read-only position sanity,
regression tests and documentation. Horizons verification scripts accept an API
origin and add the focused inner-planet report. Backend schema, endpoints, scenario
edit keys, integration algorithms, units and worker ownership protocol are unchanged.

Known limits: educational compression is nonlinear, so its displayed separations
are not physical distances. Helper targets cannot make two exactly coincident
projections uniquely identifiable; the object navigator remains an unambiguous
alternative. Mobile viewport tests do not replace testing every physical device.
