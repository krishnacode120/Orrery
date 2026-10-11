# Orrery launch kit

## Short description

Orrery is an interactive browser laboratory for the Solar System, orbital mechanics and spacecraft experiments. Explore planets, branch a What-If scenario, inspect a satellite orbit or run a reproducible Earth–Mars mission with explicit model limits.

## Technical description

A React/Vite and Three.js frontend renders worker-owned SI physics. Massive bodies use Float64 CPU integration; eligible test particles can use a labelled Float32 WebGPU path. FastAPI provides cached Horizons vectors and capability-protected scenario persistence. Static HTML guides explain the science before visitors launch the heavier application.

## Suggested repository description

Interactive 3D Solar System, orbital mechanics, rocket, satellite and N-body physics simulator built with React, Three.js and FastAPI.

Topics: solar-system, orbital-mechanics, threejs, physics-simulation, astronomy, spaceflight, react, fastapi, n-body, webgpu.

## Visual assets

- public/social/orrery-preview.png — 1200×630 original schematic social artwork.
- public/social/orrery-preview.webp — optimized landing illustration.
- public/site/mission-replay.webp — actual mission verification screenshot.
- docs/screenshots — existing real application captures.

## Concise demo recording plan

Record actual application views, with visible labels for display-radius exaggeration and model approximation where relevant:

1. Solar System overview and a deliberate Earth focus.
2. Inspect Earth and a satellite ground track.
3. Enter a preserved-baseline What-If branch and increase Jupiter's mass.
4. Open the measured Earth–Mars result and replay check; do not present accelerated playback as real mission elapsed time.
5. Show the God Tools panel and catalog-based Universe Explorer.
6. End with the real production URL only after deployment.

Target 45–60 seconds, restrained cuts, no fabricated telemetry or live-control claims. Browser recording support is available in app settings. A finished video has not been produced in this release; these are recording instructions, not a claimed media deliverable.

## Promotion

Use the descriptions and real screenshots only where a community permits project sharing. Explain approximations and invite reproducible feedback. No posts, purchased backlinks or automatic outreach have been made.
