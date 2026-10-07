# Workspace redesign

The earlier interface exposed many parameters at once and frequently framed objects at unusable scales. This revision concentrates on visual exploration and the transition from observation to editing.

## Interaction structure

- A compact SVG tool rail provides named, keyboard-accessible actions and tooltips.
- The object navigator uses bundled surface-map previews and separate system, moon and vehicle lists.
- Selecting an object frames it immediately; the viewport provides a separate whole-system action.
- The viewport has its own layout area, so desktop panels no longer cover its subject.
- Object inspection opens with live measurements, physical context and orbiting bodies. Properties are a separate tab.
- Physics, display, camera and performance settings are separate sections.
- Mission control separates Flight, Orbit and Telemetry. Launch is prominent during prelaunch.
- The scenario catalog uses visual previews and keeps save/import/share controls in a separate disclosure.
- All these actions use the existing store and worker. No demonstration-only telemetry has been added.

## Rendering changes

Camera distance accounts for body radius, ring extent and system extent. Initial close-up lighting favors a readable sunlit limb. The atmosphere is thinner and responds to the illumination direction. Saturn's procedural rings include a radial density pattern, Cassini-like gap and geometric planetary shadow. The ring pattern is a visual approximation, not measured particle data.

Procedural vehicle geometry now includes stage sections, engine bells, structural bands, solar cells and antenna details. The displayed upper stage changes with simulation staging. A local rotating launch stand supplies scale at liftoff. Its geometry and local terrain are illustrative; they do not participate in vehicle forces or represent a surveyed launch site.

## Scope

This revision improves the product experience while preserving SI/J2000 physics and the worker transport contract. It does not claim to finish every item from the original roadmap. Existing numerical/model limitations remain in the main README and physics documentation.
