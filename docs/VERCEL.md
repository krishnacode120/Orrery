# Vercel deployment

Vercel hosts the Vite static output and the existing FastAPI app as a Python function. Worker physics stays in the browser. PostgreSQL holds scenarios, edit-key hashes, mission definitions, Horizons cache and a shared serverless rate limiter. Local development still defaults to SQLite.

## Setup

1. Import krishnacode120/Orrery into Vercel; keep repository root, Vite framework and the checked-in build command.
2. Connect a dedicated managed PostgreSQL database. Set DATABASE_URL as a server-only environment variable. Never use VITE_DATABASE_URL. Do not reuse another application's database.
3. Set PUBLIC_APP_URL to the assigned HTTPS production hostname when available. Otherwise VERCEL_PROJECT_PRODUCTION_URL supplies the canonical origin. A custom domain can be added later; update PUBLIC_APP_URL and redeploy.
4. Deploy and run scripts/seo-smoke.mjs against the actual HTTPS origin. Check /api/ready, scenario create/read/edit-key enforcement, Horizons, isolation and fallback.
5. Configure the database provider's backups/recovery policy and test a restore. The Docker SQLite backup service does not run on Vercel. Neon Free currently supplies up to six hours of instant-restore history; it does not include scheduled backups. Export periodic encrypted PostgreSQL dumps to an owner-controlled destination before relying on it for irreplaceable scenarios. A separate off-provider backup destination has not been configured.
6. Submit /sitemap.xml using the Google Search instructions. Ownership verification remains an account/DNS step.

## Safety and limits

The server refuses to use ephemeral SQLite on Vercel. PostgreSQL connections are transactional, have bounded connection/statement timeouts, and production verifies TLS certificates using the packaged Mozilla CA bundle (certifi), including hostname verification. Schema creation is additive and serialized with a PostgreSQL advisory lock.

The platform limits function requests/responses to 4.5 MB. This deployment caps shared JSON at 4 MiB and explains oversized uploads before sending them. Larger simulations remain available locally and through JSON export; the self-hosted Docker deployment retains its 32 MiB API limit. Mission calculations remain bounded; a long server request is still subject to Vercel's 60-second function limit.

Serverless rate limits use atomic PostgreSQL counters shared across instances, with a 120-request fixed minute window. The original local per-process limiter remains as a second guard. Configure additional Vercel edge protection as needed for public traffic. Do not claim a process-local counter alone protects a scaled deployment.

Headers preserve COOP/COEP and noindex for app/share/API routes. Generated HTML also has a domain-specific CSP meta policy; frame-ancestors is enforced by an HTTP CSP header. Preview builds use noindex; only production pages belong in search.

No paid plan or database purchase is required by the code. Provider selection, free-tier limits, terms and any billing activation must be reviewed before provisioning. The owner approved the integration terms. A dedicated orrery-postgres Free resource is provisioned in iad1 with optional authentication disabled; only the Orrery production environment is connected. No database credentials belong in Git or screenshots.

References: https://vercel.com/docs/functions/runtimes/python, https://vercel.com/docs/functions/limitations and https://neon.com/docs/introduction/plans.
