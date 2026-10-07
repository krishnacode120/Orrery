# Simulation architecture

React controls edit a serializable versioned scenario in Zustand. Immer patch history records physical edits and scenario operations. Selection, continuous camera movement, quality measurements and viewport preferences do not create a patch for every animation frame. If worker topology no longer matches the patch's expected IDs/order, undo restores the corresponding complete snapshot rather than applying array indices to different bodies.

The main thread owns editing intent; the physics worker owns integrated state between revisions. Comlink serializes exactly one simulation RPC at a time. initialize validates/clones the scenario and allocates fixed-capacity buffers. advance returns count, metadata/topology revision, event serial, dynamic vehicle state and diagnostics.

Shared transport has Float64 state (x,y,z,vx,vy,vz) and Float32 system-render positions. The worker writes only while its RPC is outstanding. The client copies the completed range before allowing another write. Stale scenario revisions are discarded. Fallback transfers completed ArrayBuffers and uses the same revision checks. Topology metadata and counts belong to one completed frame.

Local/vehicle rendering uses the copied Float64 positions to subtract a camera origin before casting into Three.js coordinates. It does not attempt to recover sub-meter precision from heliocentric Float32 data.

Physics modules have no React/browser dependencies except performance.now as a monotonic budget clock. workerCore is directly testable without a browser. Prediction uses a distinct worker and cloned engine, so it cannot mutate live bodies or monopolize the simulation worker. Edit/prediction debouncing cancels stale work. Its wall-time budget returns partial truthful horizons.

Autosave uses completed IndexedDB transactions. Explicit scenarios use a separate key namespace in the same database. Camera/mission settings and bounded history are embedded in exported JSON. Files are validated before replacing the scenario. Version 1 imports fill new defaults without changing SI state vectors.

The backend is a capability-based persistence/ephemeris service. SQLite retains payload JSON and a hash of the edit capability. No simulation runs on the server. NASA requests have a fixed upstream URL, numeric target validation, a two-request semaphore, timeout, and seven-day cache.
