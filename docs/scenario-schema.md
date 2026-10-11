# Scenario schema version 2

Top-level fields: version, schemaVersion, createdByVersion, name, mode, jd, bodies, settings, view, tags, description, provenance, maneuvers, stations, telemetry, mission, events, eventSerial, and optional ephemeris, branch and experimentEvents.

Body data preserves all original Phase 1 fields. New fields include visible, metadata, collisionMode, disrupted, blackHole, wormhole, rocket, spacecraft, acceleration and portalCooldownJD. State is always SI; spin period is seconds. Display-unit preferences do not change stored numbers.

settings includes computeMode (cpu, gpu, auto; cpu by default). Missing schemaVersion/createdByVersion migrate to version 2 with explicit creator provenance. Optional engine endpoints and attitude/RCS configuration are validated on import. Export metadata is local and is not automatically uploaded.

settings contains G multiplier, softening, step/time scale, integrator, acceleration adaptivity, eta, minimum step, relative and absolute tolerances, solver, theta, collision mode/restitution, fragment count/spread/minimum mass/distribution, Roche multiplier, GR flag and c.

view contains selected body, panel, reference-frame scale, scaleMode, realDistances, realRadii, per-class display multipliers, body exaggeration, quality, exposure, labels/paths/trails/guides, camera mode, current pose, named saved poses, keyframes, units, contrast/text/reduced-motion settings, prediction duration/resolution and optional bounded trailHistory. Trail samples contain JD and SI position. Camera coordinates are in their named display scale.

Workspace visibility is stored separately in localStorage; physical scenario exports preserve view/scale preferences and mission state. Transfers store SI path points, departure/arrival vectors, target IDs, epoch and the model label. SOI/apsis/landing events use the existing event serial contract. Fuel-aware maneuver nodes retain execution status, propellantUsed, and rejection reason.

rocket stages and guidance state, spacecraft power/configuration, maneuvers, stations, events and telemetry are ordinary JSON. No functions, GPU resources, edit keys or worker buffers are exported. Local save and sharing both validate the same physics contract.

Version 1 migration fills missing version 2 fields and new settings/body defaults while preserving existing vectors, masses, clock, and supported fields. Negative zero is normalized because JSON has no signed-zero representation. Unknown schema versions are rejected. The backend accepts both versions for compatibility, and /api/migrate explicitly upgrades a document.

Limits are enforced at import/API boundaries. Invalid vectors, duplicate IDs, dangling/self parents, non-finite nested numbers, malformed vehicle configurations, excessive collections and unsupported modes fail visibly. JSON import is replacement, so it is undoable through scenario history.

Optional branch contains id, parentId, name and epochJD. experimentEvents contains up to 256 uniquely named events with jd, typed operation, executed, actualJD and optional failed reason. Operations support scalar/vector edits, body creation/deletion, burns, ignition/cutoff, staging, collision trigger and fragmentation. Version 1/2 imports without these fields receive an empty schedule. Sandbox epochs and executed event dates can extend through 2999; Reality initialization retains the 2050 boundary. View.smoothMotion and pauseVisualEffects are visual preferences; rocket.separationSpeed is a physical relative separation impulse speed in m/s. Undefined orbital telemetry is null, never NaN or Infinity.

Reverse stepping is not an undo log. Undo/redo operates on supported editing actions and scenario replacements; physical collision/staging evolution belongs to worker simulation state. When topology differs, history restores the saved scenario snapshot to prevent unsafe index-based edits.

## Camera and observation extension

Scenario version 2 remains compatible. View.navigation stores speed, damping, mouse-look, collision, chase and reference settings. View.camera/savedCameras/keyframes support SI positionSI/targetSI and a renderer-basis quaternion (render mapping x,z,-y from J2000 x,y,z), mode, FOV, reference and optional barycenterIds. Legacy position/target/scale poses remain accepted. View.timeBookmarks contains bounded named Julian dates. Eclipse is a supported event kind. Maneuver.components optionally stores prograde/normal/radial delta-v, resolved at execution. Spacecraft transmitterPower/antennaGain and sunlightState/solarFraction supplement existing power state. All data remains finite and subject to existing scenario limits.

Camera state does not alter physical positions or the worker protocol. Recorded replay uses a separate validated file schema documented in replay-schema.md.
