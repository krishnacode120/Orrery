# Backend API

FastAPI OpenAPI: /docs. SQLite file is configured with ORRERY_DB. CORS origins: ORRERY_ORIGINS. Limits: 32 MiB request body, 120 requests/minute/client per API process, 20,000 bodies and 512 sources. Public read URLs are capabilities; there is no authentication.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | /api/health | Service/schema status |
| GET | /api/horizons?target=499&jd=2461317.5 | Cached SI vector |
| GET | /api/horizons/series?target=499&jd=2461317.5&days=1&samples=33 | 2–129 samples, >0 to 32 days |
| GET | /api/presets | Built-in catalog; original solar-now/empty contracts retained |
| POST | /api/scenarios | Create JSON snapshot; returns id, editKey, url |
| GET | /api/scenarios/{id} | Read snapshot with ID |
| PUT | /api/scenarios/{id} | Replace snapshot with X-Edit-Key |
| DELETE | /api/scenarios/{id} | Delete with X-Edit-Key |
| GET | /api/scenarios?q=...&tag=...&limit=20 | Search scenarios owned by supplied X-Edit-Key |
| PATCH | /api/scenarios/{id}/metadata | Name, description, tags; edit key required |
| GET / PUT | /api/scenarios/{id}/cameras | Read/save viewpoints; writes require edit key |
| GET | /api/scenarios/{id}/telemetry?format=json | Stored samples, JSON or CSV |
| GET | /api/missions | Mission descriptors |
| GET | /api/spacecraft-presets | Generic spacecraft configurations |
| GET | /api/satellite-presets | Orbital preset parameters |
| POST | /api/migrate | Validate version 1/2 and return version 2 with model defaults |

Horizons uses CENTER=500@10, REF_PLANE=ECLIPTIC, REF_SYSTEM=ICRF, TIME_TYPE=UT, VEC_CORR=NONE and KM-S upstream, converted to meters/m/s. Target accepts numeric IDs only. A fixed upstream address prevents user-controlled proxy destinations. Timeout, application errors, malformed/incomplete vectors and dates outside 1800–2050 produce explicit errors.

Scenario metadata/search is capability-scoped. The API does not publish a browsable index of all users' snapshots. A share URL's ID permits reading camera and telemetry data in that snapshot. Edit keys are returned only on creation; the database stores hashes and checks them in constant time.

For internet deployment use HTTPS, a reverse proxy, backups, a shared/edge rate limiter if running multiple processes, and an appropriate retention policy. This repository does not provide multi-user accounts or confidential sharing.
