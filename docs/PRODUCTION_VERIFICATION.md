# Production verification

## Public Vercel release — 2026-10-12

Origin: https://orrery-eight-rose.vercel.app/ · API: /api · Simulator: /app.

- Vercel production commit `996f1f800966396831d05b8c5566aba3e5bf1967` deployed successfully. [Release CI](https://github.com/krishnacode120/Orrery/actions/runs/38199763432) passed, including real PostgreSQL and container checks.
- 30 HTTP/SEO smoke checks passed on the public HTTPS origin: 24 public HTML pages, app/share routes, robots, sitemap, API health and genuine unknown-route 404.
- `/api/ready`, presets and packaged astronomy metadata return 200. NASA Horizons Mars at JD 2451545 returned real SI vectors; repeated request hit the persistent cache.
- Synthetic scenario create/read/update succeeds; an invalid edit key is rejected with 403. A probe is retained temporarily for verification across the next deployment.
- HTTP redirects to HTTPS with 308. The production simulator reports cross-origin isolated Yes and Shared memory. Forced fallback reports Transferable messages with the 27-body system loaded.
- Database: dedicated Neon Free in iad1, production environment only. Full TLS hostname/certificate verification uses packaged CA roots; no verification bypass. The platform's missing default libpq trust path caused an initial startup failure and was fixed before declaring API health.

Custom domain, scheduled off-provider database backups/restore drill and external uptime alerts remain unconfigured. Search Console verification is in progress; no indexing or ranking claim is made. Hosted scenario payloads are capped at 4 MiB; local export retains the larger limit. See [Vercel limits and recovery](VERCEL.md).

## Local preparation — 2026-10-11

These are local release checks, not proof of public deployment.

| Check | Result |
| --- | --- |
| Frontend suite | 181 tests passed in 22 files |
| Backend suite | 64 passed; existing AnyIO deprecation warning |
| Vite production build | Passed; simulator chunk-size advisories remain |
| Actual Caddy 2.11.7 configuration | Validated and served built files locally |
| HTTP/SEO smoke | 30 checks passed through Caddy at 127.0.0.1:4175 |
| Public HTML pages | 24; unique metadata, one H1, JSON-LD, canonical and internal links |
| Homepage initial document | 6,317 bytes HTML; 3,989 bytes CSS; 27,636-byte WebP hero, before compression |
| Simulator code on public pages | No React/Three.js entry bundle |
| Worker through production headers | Shared memory; cross-origin isolated Yes |
| Forced fallback | Transferable messages; 27-body example loaded |
| Browser console during checks | No captured errors |
| Lightweight escape calculator | Earth surface: 11.186 km/s, computed from SI constants |
| What-If public deep link | Active experiment, preserved baseline, working tour dismissal |
| Responsive public homepage | 320, 375, 768 and 1280 px; no horizontal overflow |
| Online SQLite backup | Integrity and restore tests passed; WAL writes included |
| Source/history secret-pattern scan | No matches; a pattern scan is not a security guarantee |
| GitHub metadata | Description and eight relevant topics updated |

The landing notice originally overlapped onboarding; it now sits below the tour. Guided public examples do not overwrite the user's prior autosave.

## Historical predeployment gates (superseded by the public release above)

No production hostname, server or hosting account was supplied. Public HTTPS issuance, external reachability, live API/Horizons, persistent-volume restart on the actual host, off-host backup transport, external alert delivery, Search Console/Bing ownership and sitemap submission cannot yet be verified.

Docker is unavailable locally. [GitHub Actions run 38135098113](https://github.com/krishnacode120/Orrery/actions/runs/38135098113), for implementation commit 4b161bb6a239ff774f80c886f6121abe38120e37, passed all three jobs: frontend, backend and containers. The container job built both image targets, validated Caddy, replaced a database client container to verify volume persistence and created an online backup. This does not verify DNS, certificate issuance or storage on a future production host.

Core Web Vitals need measurement on the actual hosting network and real devices. No ranking, indexing, uptime or 60-FPS claim is made. The simulator remains larger than the public content bundle.

Launch artwork, screenshots, descriptions and a recording plan are supplied. A finished edited promotional video has not been produced. No analytics, community posts, paid services, license choice or search-engine ownership was configured on the owner's behalf.
