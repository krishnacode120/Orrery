# Recorded replay schema

Replay files are separate from scenario JSON:

```json
{"version":1,"name":"Mission replay","frames":[{"wallTime":1791468000000,"scenario":{"version":2,"name":"Recorded state","mode":"sandbox","jd":2461321.5,"bodies":[],"settings":{"gMultiplier":1,"softening":1000,"stepSeconds":1800,"timeScale":86400}}}]}
```

Each frame stores a validated complete scenario snapshot, including physical state, fuel, stages, burns and events. Recording retains at most 240 frames, 32 MiB and 1,000 bodies. Clock direction can be reversed while recording, so playback follows capture order rather than sorting Julian dates.

Playback does not simulate or interpolate between frames. The viewer's current camera is kept independent of recorded physics. Entering playback captures the live scenario and pauses its worker ownership loop; edits, Undo and single-step operations cannot alter the replay. Returning to Live restores the exact physical snapshot and reinitializes the worker at a new revision.

Export/import validates every frame and enforces payload limits. No credentials or edit keys are included. Files are imported locally; no server replay endpoint is required.
