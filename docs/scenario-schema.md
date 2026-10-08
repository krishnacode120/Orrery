# Scenario schema version 2

Top-level fields: version, name, mode, jd, bodies, settings, view, tags, description, provenance, maneuvers, stations, telemetry, mission, events, eventSerial, and optional ephemeris.

Body data preserves all original Phase 1 fields. New fields include visible, metadata, collisionMode, disrupted, blackHole, wormhole, rocket, spacecraft, acceleration and portalCooldownJD. State is always SI; spin period is seconds. Display-unit preferences do not change stored numbers.

settings contains G multiplier, softening, step/time scale, integrator, acceleration adaptivity, eta, minimum step, relative and absolute tolerances, solver, theta, collision mode/restitution, fragment count/spread/minimum mass/distribution, Roche multiplier, GR flag and c.

view contains selected body, panel, reference-frame scale, scaleMode, realDistances, realRadii, per-class display multipliers, body exaggeration, quality, exposure, labels/paths/trails/guides, camera mode, current pose, named saved poses, keyframes, units, contrast/text/reduced-motion settings, prediction duration/resolution and optional bounded trailHistory. Trail samples contain JD and SI position. Camera coordinates are in their named display scale.

Workspace visibility is stored separately in localStorage; physical scenario exports preserve view/scale preferences and mission state. Transfers store SI path points, departure/arrival vectors, target IDs, epoch and the model label. SOI/apsis/landing events use the existing event serial contract. Fuel-aware maneuver nodes retain execution status, propellantUsed, and rejection reason.

rocket stages and guidance state, spacecraft power/configuration, maneuvers, stations, events and telemetry are ordinary JSON. No functions, GPU resources, edit keys or worker buffers are exported. Local save and sharing both validate the same physics contract.

Version 1 migration fills missing version 2 fields and new settings/body defaults while preserving existing vectors, masses, clock, and supported fields. Negative zero is normalized because JSON has no signed-zero representation. Unknown schema versions are rejected. The backend accepts both versions for compatibility, and /api/migrate explicitly upgrades a document.

Limits are enforced at import/API boundaries. Invalid vectors, duplicate IDs, dangling/self parents, non-finite nested numbers, malformed vehicle configurations, excessive collections and unsupported modes fail visibly. JSON import is replacement, so it is undoable through scenario history.

Reverse stepping is not an undo log. Undo/redo operates on supported editing actions and scenario replacements; physical collision/staging evolution belongs to worker simulation state. When topology differs, history restores the saved scenario snapshot to prevent unsafe index-based edits.
