# Bug review — 2026-10-09

This pass reviewed worker ownership, simulation events, visual interpolation, prediction lifecycle, scenario persistence, and API validation. It fixes the reproduced failures below; it is not a claim that every requested feature or browser interaction is certified.

## Fixed failures

| Area | Failure | Result |
| --- | --- | --- |
| Physics worker | A rejected old RPC could fail the newly edited scenario; worker crashes or unresolved RPCs could hang the connection. | Errors belong to the dispatch revision. Stale results/errors are discarded. Failed runtimes terminate, pending work has a watchdog, and an edit creates a fresh runtime. Pause is read again after initialization. |
| Analysis | Failed prediction workers could leave busy indicators running indefinitely; stale ghost paths survived edits. | Worker errors, message errors, aborts and timeouts reject requests and terminate the worker. Preparation errors are caught. Predictions clear on relevant edits and target changes. Invalid horizons and work budgets are rejected. |
| Maneuvers | A burn exactly at the last integration boundary waited until the next call. Missing or pinned targets were silently skipped repeatedly. Reports could sum a display value instead of the executed vector. | Forward stepping executes boundary burns once. Invalid burns are rejected once in the event log. Reports use the executed delta-v magnitude. |
| Pause/resume | Pausing showed the current physical pose, but resuming could briefly interpolate backwards to the pre-pause pose. | Paused rendering collapses the previous/current visual pair without changing authoritative physics. |
| Test particles | Fragmenting a non-sourcing object could create massive gravity sources and hit the source cap. | Fragments retain the parent's test-particle status, physical mass and momentum; capacity checks distinguish sourcing from non-sourcing fragments. |
| Disabled gravity | Roche disruption still ran with G set to zero; a coincident black hole could absorb at a zero horizon radius and produce an invalid body radius. | Tidal disruption and zero-radius horizon absorption do not run when gravity is disabled. |
| Object deletion | Deleting a wormhole mouth left its partner linked to a missing ID, causing validation to reject deletion. | The shared deletion routine unlinks the partner and removes dependent ground stations and maneuver nodes. |
| IndexedDB library | Generated record IDs differed from storage keys, and deletion could fail on saved scenarios. Aborted transactions could stay pending. | IDs and keys agree; old name-keyed records remain deletable. Transaction aborts reject explicitly. |
| Experiment recovery | Pause state was lost, obsolete chaos plans survived reset, and corrupt recovery data could disturb the current session. | Original pause state persists, lifecycle transitions clear obsolete jobs/plans, records validate before mutation, and recovery refuses to replace an active experiment. |
| HTTP / commands | Empty successful responses failed JSON parsing; non-JSON upstream errors were misleading; asynchronous palette failures escaped the error handler. | 204 returns null, HTTP failures retain status, caller cancellation signals are honored, and palette commands are awaited. |
| Scenario API | Malformed camera collections, trails, or ephemerides could produce server exceptions. Duplicate mission IDs and numeric configuration coercion were inconsistent. | Invalid data returns validation errors; typed vehicle/mission/navigation values normalize before cross-field checks. Existing optional-field omission remains compatible. |
| Horizons | Invalid response shapes, non-finite vectors, wrong dates and unordered series could be accepted or throw unexpected exceptions. | Both endpoints require finite vectors at the requested epochs. Invalid upstream responses return 502 and are not cached. The cache version excludes old unchecked records. |
| CORS | Payload/rate limit responses lacked CORS headers and appeared as generic browser network failures. | CORS wraps the limits middleware, so 413 and 429 responses retain allowed-origin headers. |

## Verification

Commands run after the final code changes:

```powershell
npm.cmd test -- --reporter=verbose --silent=false
.\.venv\Scripts\python.exe -m pytest backend/tests -q
npm.cmd run build
```

- Frontend: **121 passed in 14 files**, including 16 new regression tests.
- Backend: **52 passed**, including 17 new regression cases.
- Production build: **passed**, 1,133 modules.
- Existing conservation, reverse stepping, integrators, Mercury precession, worker transports, scenario compatibility, rocket staging/insertion, and experiment isolation tests remain passing.
- The 1,000-orbit maximum relative energy drift remains **9.063741269683645e-8**.
- Vite still reports large rendering chunks. Backend verification emits an upstream AnyIO deprecation warning and a local pytest-cache permissions warning; these are not failing tests.

The browser automation kernel could not start because Windows sandbox setup failed with `helper_unknown_error: setup refresh had errors`. This review therefore does not establish browser camera acceptance, visual quality, touch behavior, actual render FPS, or decoded video export. Run the interactive checklists in [VERIFICATION.md](../VERIFICATION.md) on a working browser before relying on those behaviors.

## Regression files

- `src/tests/workerSession.test.js`: injected runtime/scheduler tests for ownership, failure, stop/pause, shared publication and analysis cancellation.
- `src/tests/regressions.test.js`: events, test-particle debris, disabled gravity, portal deletion, interpolation, import/API client behavior, async persistence and experiment restoration.
- `backend/tests/test_regressions.py`: actual API responses for invalid payloads, mocked upstream Horizons responses and CORS limit errors.

The IndexedDB test double models asynchronous request ordering and transaction completion/abort; real-browser storage interaction remains part of the manual checklist.
