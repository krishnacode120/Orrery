# Orrery production deployment

## Release status

Public deployment: **https://orrery-eight-rose.vercel.app/** on Vercel, with dedicated Neon PostgreSQL (Free). See [Vercel deployment](VERCEL.md) for the active architecture and [verification results](PRODUCTION_VERIFICATION.md). The simulator remains React/Vite + Three.js + worker physics; FastAPI serves the same-domain API. Local development defaults to SQLite.

The remainder of this guide describes the alternative self-hosted Docker/Caddy deployment.

Use a single small-server deployment initially. One FastAPI worker keeps the in-memory rate limiter coherent. SQLite is on a named persistent volume, not a container layer. The Vercel deployment instead uses PostgreSQL-backed rate counters shared across function instances.

## Configure and launch

On the server, install Docker Engine and the Compose plugin from the official Docker instructions for its distribution. Clone the repository, select the verified release commit and create .env from .env.example. Set:

- ORRERY_DOMAIN: the bare production hostname.
- PUBLIC_APP_URL: the same hostname with https:// and no path.
- API_BASE_URL: /api.
- ACME_EMAIL: the operator's certificate contact.
- GIT_COMMIT: the deployed Git commit for reproducibility.

Do not commit .env. Run these from the repository:

```sh
node scripts/production-preflight.mjs
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=50 api backup
```

The preflight needs Node 22; if Node is not installed on the host, run it with the official Node container mounting the repository read-only. The frontend Docker build also validates PUBLIC_APP_URL. Deployment must fail rather than publish example.com canonicals.

Point the domain's A record to the server IPv4 address. Add AAAA only if IPv6 actually routes to the server. Wait for DNS propagation, then let Caddy obtain and renew certificates. Caddy redirects HTTP to HTTPS. Do not put a TLS-terminating CDN in front without reviewing forwarded-header trust and origin TLS. No self-signed production certificate or certificate-warning bypass is required.

The Compose network uses 172.30.70.0/24 and trusts forwarded headers only from Caddy at 172.30.70.10. If this conflicts with host networking, update both the subnet/address and Uvicorn's forwarded-allow-ips together. Port 8000 is not published. Never publish it as a shortcut around the proxy.

## Routing and headers

- / and the public content routes: pre-rendered HTML with no simulator bundle.
- /app: simulator shell, noindex.
- /s/{id}: simulator share entry, noindex, no-store.
- /api/*: private-network reverse proxy to FastAPI.
- Unknown routes: real HTTP 404 with readable error HTML.
- Upstream failures: bounded timeouts and a readable error response.

Caddy sends COOP same-origin and COEP require-corp, nosniff, a restrictive referrer policy, disabled camera/microphone/geolocation/payment permissions, HSTS and a CSP. Scripts are same-origin; generated JSON-LD scripts have explicit SHA-256 hashes. Styles permit inline declarations because styled-components/Three.js use them. Blob workers and generated image/video blobs remain allowed. eval and third-party script origins are not enabled.

Security headers must also be present on direct /app and /s requests and on error responses. SharedArrayBuffer additionally needs a secure context and browser support. Settings → Performance reports cross-origin isolation and actual memory transport. /app?fallback explicitly exercises transfer mode.

Production rejects non-HTTPS API traffic except safe internal health probes, hides OpenAPI/docs, limits bodies to 32 MiB, bounds request reading and upstream timeouts, validates Host/Origin, and redacts input values from validation errors. Structured logs omit body data, request query strings, scenario IDs and edit keys. Caddy access logs are deliberately not enabled. Configure host-level log rotation and disk monitoring.

## Persistence and recovery

Named volumes: database, backups, caddy_data and caddy_config. Recreating containers preserves them. **Do not run docker compose down -v on production.** The backup service creates a checked online SQLite snapshot daily and retains 14. Configure encrypted off-host copying before launch; same-host backups do not protect against disk/server loss.

Follow [backup and restore](../deploy/restore.md). Test a restore into an isolated deployment with a real saved scenario and its retained edit key. A share link grants read access; noindex is not authentication. Keep edit keys, SQLite files and backups out of public static storage.

Before every upgrade: take a manual backup, retain the old image/commit, rebuild, then replace services. Schema setup is additive CREATE TABLE/INDEX IF NOT EXISTS. There is no destructive automatic schema migration. An older application may not understand newer payload fields; preserve the previous database before rollback.

## Health and monitoring

/api/health checks process liveness. /api/ready checks database schema accessibility; it returns no filesystem paths or counts. Compose waits for readiness. Set PUBLIC_APP_URL and run python deploy/monitor.py from a separate machine/timer every few minutes. It exits nonzero on homepage/API failures. Connect that exit status to your chosen alert system; no paid monitor or notification destination has been provisioned.

Also monitor backup age/failures, volume capacity, certificate renewal and restart loops. Test the monitor by temporarily pointing a staging check at an unavailable service, never by disrupting production.

## Smoke verification

```sh
node scripts/seo-smoke.mjs https://YOUR_ACTUAL_DOMAIN
```

Check HTTP → HTTPS, canonical domain, robots.txt and sitemap.xml. In a supported browser verify Settings → Performance says cross-origin isolated Yes and memory transport SAB; repeat with ?fallback and confirm transferable mode. Test a fresh guided example and a pre-existing local autosave. Save a disposable scenario, reload its /s link, recreate the API container, and confirm it remains available. Delete that test record only with its edit key.

Exercise Horizons, rocket/satellite examples, JSON export/import and the reference mission. Verify the public pages at 320, 375, 768 px and desktop. Do not represent local smoke results as live-domain verification.

## Public launch gate

- Real domain/hosting account and billing approved by the operator.
- HTTPS issued, redirect verified, public routes accessible externally.
- Persistent data and off-host backup/restore drill verified.
- API, worker isolation and fallback tested through the production proxy.
- Correct canonical domain/sitemap; no shared scenarios in sitemap.
- Source secrets scan reviewed; license decision made by owner.
- Google/Bing ownership verification performed by the owner or an authorized account.
- Live URL added to README only after it works.

References: [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https), [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [worker CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/worker-src).
