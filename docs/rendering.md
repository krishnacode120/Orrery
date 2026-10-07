# Rendering architecture

Scene and MissionControl are lazy chunks. React Three Fiber uses Three.js with logarithmic depth. Custom shaders include the common and log-depth chunks, avoiding depth disagreement with stock materials.

System rendering uses AU/4 as a display unit. Planetary and Earth views use primary-radius units. Local/true views use selected-body units and a floating origin. Distances remain linear. Display-radius exaggeration is visual only. Local spacecraft receive a visibility floor outside true local scale; collision radii remain SI.

Planet color maps, Earth city lights, and clouds are local CC BY 4.0 assets. Custom bodies use procedural FBM, gas bands, roughness-like modulation, day/night diffuse light and approximate Fresnel atmosphere. No remote font or texture fetch is needed. Colors/exposure are display choices, not radiometric instruments. Geographic texture orientation and the simple Earth rotation convention are not intended for navigation.

Asteroids and resolved debris share one instanced mesh. Star points are generated deterministically with color/brightness variation, not positions from a measured catalog. Trails have bounded CPU histories, faded line colors and display-width controls; orbital paths are osculating ellipses recomputed from live state. Node, apsis, maneuver and velocity guides are diagnostic overlays. Trail history is sampled into scenario view state every two seconds for persistence.

Black-hole rendering combines an opaque horizon, procedural distorted star pattern, emission ring and radial disk temperature approximation. Doppler brightness is visual only. This is not full-scene GR lensing or Kerr geodesic integration. Wormholes render the other mouth's scene into a 256² texture every eight frames with all portal surfaces hidden to prevent recursion, then distort the rim.

Auto quality samples frame intervals once per second and adapts no more frequently than five seconds. It reduces DPR and disables bloom at low quality; lower trail/sphere limits reduce CPU and GPU work. Physics is CPU-based. Benchmark throughput is not equivalent to render FPS.

Camera modes share OrbitControls. Follow modes translate with the target; chase uses velocity-relative framing. Free flight uses WASD/QE. Cinematic mode interpolates saved camera keyframes or follows an orbit. Viewpoints are scale-specific and persisted.

Capture uses canvas PNG and a browser MediaRecorder stream of a resampled viewport canvas. UI overlay capture is not implemented. No capture feature claims an exact delivery frame rate, bit-exact output or support in every browser.
