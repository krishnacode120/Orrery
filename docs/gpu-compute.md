# GPU tracer propagation

Compute mode defaults to **Worker CPU**. Settings offers CPU, GPU and Auto; probing happens inside the physics worker. Missing WebGPU, adapter/pipeline failure, device loss or unsupported force settings fall back to CPU and report the reason.

Massive bodies always integrate on the CPU in Float64 and interact directly. Eligible non-sourcing, unlocked test particles use a real WGSL velocity-Verlet compute kernel, with old/new CPU source positions for its two kicks. Inputs use origin-relative AU/day Float32 values. Each accepted batch reads positions/velocities back before publication through the existing revision-tagged SAB or transferable protocol.

This path requires fixed Newtonian Verlet, no collisions/tides/GR, no vehicles/exotic objects and no pending scheduled events. Auto selects it only at 5,000 or more movable tracers. Physics accuracy settings are never silently reduced by render Auto Quality. GPU failure finishes the same tracer step on CPU rather than advancing the sources twice.

Float32 precision can be kilometres at astronomical scales. The UI reports a scale-based resolution estimate. **Do not use this path for precise encounters, spacecraft navigation, collisions or close surface dynamics.** CPU fallback and unchanged non-sourcing behavior have regression tests.

Lab exposes standalone 1k/10k/100k tracer kernel benchmarks against 50 fixed sources. These report upload + compute + readback time and error against 256 Float64 CPU samples. The 100k kernel benchmark is not a 100k-body scenario or a renderer FPS claim. Full scenario limits remain 20,000 bodies and 512 sources.

A browser run on 2026-10-11 measured 10,000 tracers / 50 sources at 83.085 ms for one step including transfer, maximum comparison error 34,200.711 m and 0.0022 m/s. These are machine-specific, single-step measurements, not steady-state throughput or accuracy guarantees.

Headless CPU benchmark (50 sources, 10 engine steps per case): direct 163.40 / 72.58 / 34.60 steps/s at 1k / 5k / 10k tracers; tree 111.10 / 26.59 / 12.61. With only 50 sources, tree traversal overhead outweighs source aggregation. No unconditional FPS target is claimed. Removing an accidental per-body wormhole scan improved the 10k direct case from approximately 3.09 to 34.60 steps/s.

Browser requirements: secure context (localhost qualifies), worker WebGPU support and a usable adapter. SAB separately requires cross-origin isolation; GPU does not replace that transport contract.

Specification: [WebGPU](https://www.w3.org/TR/webgpu/).
