# Simulation architecture

React controls edit a serializable versioned scenario in Zustand. Immer patch history records physical edits and scenario operations. Selection, continuous camera movement, quality measurements and viewport preferences do not create a patch for every animation frame. If worker topology no longer matches the patch's expected IDs/order, undo restores the corresponding complete snapshot rather than applying array indices to different bodies.

The main thread owns editing intent; the physics worker owns integrated state between revisions. Comlink serializes exactly one simulation RPC at a time. initialize validates/clones the scenario and allocates fixed-capacity buffers. advance returns count, metadata/topology revision, event serial, dynamic vehicle state and diagnostics.

Shared transport has Float64 state (x,y,z,vx,vy,vz) and Float32 system-render positions. The worker writes only while its RPC is outstanding. The client copies the completed range before allowing another write. Stale scenario revisions are discarded. Fallback transfers completed ArrayBuffers and uses the same revision checks. Topology metadata and counts belong to one completed frame.

Rendering uses copied Float64 positions to subtract the authoritative camera origin before casting into Three.js coordinates. It does not attempt to recover sub-meter precision from heliocentric Float32 data. NavigationController is independent of React; CameraRig bridges one active controller into the visible camera. A separate display-frame module coordinates dynamic meshes and rebased static buffers.

Replay holds exact validated scenario snapshots separately from the live simulation. Entering playback saves the live state, bumps its revision and suspends worker dispatch. In-flight frames fail the revision/replay guard. Scrubbing selects captured snapshots and blocks physics edits; exiting restores the saved live state with another revision. The viewer camera remains independently navigable. See replay-schema.md.

Physics modules have no React/browser dependencies except performance.now as a monotonic budget clock. workerCore is directly testable without a browser. Prediction uses a distinct worker and cloned engine, so it cannot mutate live bodies or monopolize the simulation worker. Edit/prediction debouncing cancels stale work. Its wall-time budget returns partial truthful horizons.

Autosave uses completed IndexedDB transactions. Explicit scenarios use a separate key namespace in the same database. Camera/mission settings and bounded history are embedded in exported JSON. Files are validated before replacing the scenario. Version 1 imports fill new defaults without changing SI state vectors.

What-If holds the original scenario, editing history and pause state independently of its editable branch. Enter/reset/exit use a revision boundary without a camera load command. Apply is a single undoable scenario commit. A separate disposable worker integrates cloned baseline and experimental states to matched epochs; stale results are discarded on editing revisions. Root autosave and experiment-session storage use separate IndexedDB keys. Scheduled physical changes execute atomically inside Engine and adjust event conservation baselines. Settings, event execution flags and topology publish with the same completed frame. See what-if.md.

MotionFrame publishes a shared visual-only interpolation frame before CameraRig. Geometry, labels and follow targets consume that frame; UI telemetry consumes authoritative worker state. Previous/current poses are never written back to physics buffers or scenario history. See motion.md.

The backend is a capability-based persistence/ephemeris service. SQLite retains payload JSON and a hash of the edit capability. No simulation runs on the server. NASA requests have a fixed upstream URL, numeric target validation, a two-request semaphore, timeout, and seven-day cache.
