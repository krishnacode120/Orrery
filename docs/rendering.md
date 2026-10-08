# Rendering architecture

Scene, MissionControl and the exploration tools are lazy chunks. React Three Fiber uses Three.js with logarithmic depth. Custom shaders include the common and log-depth chunks, avoiding depth disagreement with stock materials.

System rendering uses AU/4 as a display unit. Planetary and Earth views use primary-radius units. Local/true views use selected-body units and a floating origin. Scientific and Visibility distances remain linear. Educational system coordinates use an explicitly labeled logarithmic radial transform with an inverse for placement. Custom settings expose distance and object-class size multipliers. Scientific mode removes minimum-radius visibility floors; markers and focus navigation locate small bodies. Collision radii remain SI.

Planet color maps, Earth city lights, and clouds are local CC BY 4.0 assets. Custom bodies use procedural FBM, gas bands, roughness-like modulation, day/night diffuse light and approximate Fresnel atmosphere. No remote font or texture fetch is needed. Colors/exposure are display choices, not radiometric instruments. Geographic texture orientation and the simple Earth rotation convention are not intended for navigation.

Asteroids and resolved debris share one instanced mesh. Star points are generated deterministically with color/brightness variation, not positions from a measured catalog. Trails have bounded CPU histories, faded line colors and display-width controls; orbital paths are osculating ellipses recomputed from live state. Node, apsis, maneuver and velocity guides are diagnostic overlays. Trail history is sampled into scenario view state every two seconds for persistence.

Black-hole rendering combines an opaque horizon, procedural distorted star pattern, emission ring and radial disk temperature approximation. Doppler brightness is visual only. This is not full-scene GR lensing or Kerr geodesic integration. Wormholes render the other mouth's scene into a 256² texture every eight frames with all portal surfaces hidden to prevent recursion, then distort the rim.

Auto quality samples frame intervals once per second and adapts no more frequently than five seconds. It reduces DPR and disables bloom at low quality; lower trail/sphere limits reduce CPU and GPU work. Physics is CPU-based. Benchmark throughput is not equivalent to render FPS.

The tracking inset uses a scissored second camera in the same WebGL context, after the main/postprocessed pass. A single frame callback owns the composer/main pass and inset pass. Canvas memoization prevents UI state changes from reconfiguring its pixel ratio; DPR updates occur only on a quality change. Renderer viewport, scissor and temporary visibility/uniform changes are restored after each inset draw. Hidden UI suppresses the inset. This avoids competing Canvas contexts.

The navigation controller owns a Float64 SI pose. CameraRig is the only writer to the visible camera; OrbitControls operates on an isolated proxy only in orbit/follow modes. Free flight uses yaw/pitch and local movement axes. Focus uses object extent and FOV, with cancellable staged cross-scale travel. Selection and panel changes do not reposition the camera. Bookmarks retain SI position, quaternion, mode, target, FOV and reference frame. See camera-navigation.md.

MotionFrame first publishes an interpolated visual pose from previous/current completed states; CameraRig then publishes a camera-relative origin and render unit before other frame callbacks. Bodies and instanced particles subtract that origin using Float64 state. FrameGroup rebases static orbit lines, labels and launch-site buffers from their construction frame. Radius scaling follows unit changes without remounting body meshes, with frame-time-aware log-radius damping for display-only radius changes. Educational compressed coordinates remain an explicit display approximation. Screen-space picking uses a small invisible hit tolerance without enlarging the rendered body.

History trails now use capped circular buffers and geometry updates on new samples rather than full per-render rebuilding. Vehicle attitudes use quaternion interpolation; detached stages remain physical bodies. Pause/revision changes return the authoritative pose. See motion.md for timing and limits.

The F3 overlay reports frame intervals and CPU renderer submission time; GPU completion time is explicitly unavailable. F4 reports the authoritative camera pose, reference, clipping, speed and origin.

Capture uses canvas PNG and a browser MediaRecorder stream of a resampled viewport canvas. UI overlay capture is not implemented. No capture feature claims an exact delivery frame rate, bit-exact output or support in every browser.
