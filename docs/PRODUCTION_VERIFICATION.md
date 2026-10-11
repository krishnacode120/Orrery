# Production preparation verification — 2026-10-11

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

## Deployment gates still open

No production hostname, server or hosting account was supplied. Public HTTPS issuance, external reachability, live API/Horizons, persistent-volume restart on the actual host, off-host backup transport, external alert delivery, Search Console/Bing ownership and sitemap submission cannot yet be verified.

Docker is unavailable locally. [GitHub Actions run 38135098113](https://github.com/krishnacode120/Orrery/actions/runs/38135098113), for implementation commit 4b161bb6a239ff774f80c886f6121abe38120e37, passed all three jobs: frontend, backend and containers. The container job built both image targets, validated Caddy, replaced a database client container to verify volume persistence and created an online backup. This does not verify DNS, certificate issuance or storage on a future production host.

Core Web Vitals need measurement on the actual hosting network and real devices. No ranking, indexing, uptime or 60-FPS claim is made. The simulator remains larger than the public content bundle.

Launch artwork, screenshots, descriptions and a recording plan are supplied. A finished edited promotional video has not been produced. No analytics, community posts, paid services, license choice or search-engine ownership was configured on the owner's behalf.
