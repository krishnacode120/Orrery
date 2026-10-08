# Visual motion and authoritative state

Physics state remains SI in the J2000 ecliptic basis. Visual smoothing never writes interpolated positions or attitudes into the scenario, worker buffers, conservation calculations, telemetry or editing history.

## Render bridge

MotionFrame runs before CameraRig and geometry callbacks. RenderInterpolator retains the previous and current completed publications and their receipt times. It interpolates positions and visual Julian date over one bounded publication interval, from 1/144 s to 250 ms. This deliberately adds a short visual delay instead of inventing future positions. There is no extrapolation.

The previous-body lookup is cached once per publication. Completed interpolation returns the current scenario directly. Labels, instanced particles, lighting, camera targets and body geometry consume the same visual frame; readouts continue using the current authoritative frame.

Vehicle orientation uses shortest-arc quaternion interpolation. Detached stages initially reference their parent's previous pose and then follow their own worker states. This is point-mass attitude visualization, not a six-degree-of-freedom rigid-body dynamics solver.

Pause returns the exact published pose, and an editing/experiment/replay revision resets interpolation. Pause stops dispatching nonzero batches at the worker boundary; a batch already in flight can complete. No substep rollback is invented. Frame-rate tests compare equal elapsed times at 30, 60, 120 and 144 FPS.

## Stage separation

A detached stage starts at the rocket's physical position and inherits its inertial velocity. A configured relative separation speed applies opposite mass-weighted impulses to the stage and remaining vehicle. Their combined mass and momentum are conserved for the separation operation. Exhaust and atmosphere remain external exchanges.

The stage remains a separate physics body. Rendering uses a procedural booster cylinder and interpolated attitude. Its collision override avoids immediately merging coincident point-model launch stages. Stage separation is not an animated deletion.

## Trails and scale

History trails use per-body circular buffers. Samples are added at a bounded wall-time frequency, with physical minimum-distance/maximum-time tests, capped counts and a duration window. Geometry and faded colors update only when samples change; camera movement rebases the retained line rather than rebuilding it every frame.

Low quality caps history at 128 points; other qualities cap at 1,024 points per body, across at most 40 history trails. Duplicate paused epochs add no points. Reversing time clears the forward history and starts a clean reverse trail. Osculating orbit lines and prediction paths remain separate concepts. Sampled histories persist every two seconds.

Changes in body display radius use delta-time exponential damping in log-radius space. Physical radius changes immediately at the edit revision. Display-unit changes preserve the render radius ratio, avoiding fake physical interpolation. Reduced-motion mode makes radius changes immediate. This upgrade does not claim a new crossfading LOD system.

## Effects and UI

Pause Visual Effects controls the shared procedural-effects clock. Physical solar/planetary spin follows visual simulation time. Interface hover/menu interactions can still respond while physics is paused.

Labels remain attached to projected bodies and use short opacity changes for overlap visibility. Inspector selection does not remount the entire panel or reset its scroll position. Numerical readouts use stable rounded formatting and tabular digits; telemetry is not filtered into misleading physical values.

Panels remain overlays over the full viewport. Comparison and branch actions do not request focus, load camera bookmarks or change scale. Hidden UI removes the experiment status strip. The camera has one owner; see camera-navigation.md.

## Validation limits

Headless tests establish immutable authoritative state, pause/revision behavior, shortest-arc vehicle attitude and capped pause/reverse-aware trail sampling. They do not measure rendered FPS, establish absence of visual jitter or certify a particular GPU/browser. Use the What-If and camera browser checklists before release.
