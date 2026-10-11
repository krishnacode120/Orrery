# Public content and SEO

## Architecture and inventory

site/content.mjs is the editorial source. site/render.mjs produces semantic HTML, metadata, JSON-LD and calculator markup. The Vite plugin generates all public routes during a normal production build. Search crawlers and visitors receive the same HTML. No cloaking or renderer prerequisite is involved.

Indexable routes:

- /
- /solar-system-simulator
- /orbital-mechanics-simulator
- /rocket-simulator
- /satellite-simulator
- /space-physics-sandbox
- /what-if-solar-system
- /universe-explorer
- /mission-planner
- /features
- /about
- /accuracy
- /privacy
- /learn
- /learn/orbital-velocity
- /learn/hohmann-transfer
- /learn/escape-velocity
- /learn/lagrange-points
- /learn/sphere-of-influence
- /learn/why-planets-orbit
- /learn/apoapsis-periapsis
- /learn/time-to-mars
- /learn/geostationary-orbit
- /learn/how-rockets-reach-orbit

The simulator at /app and unlisted /s/* pages have noindex metadata/headers and are absent from the sitemap. Shared URLs are not blocked by robots.txt: crawlers must fetch the page to see noindex. This is discovery control, not confidentiality. API paths are disallowed.

## Content and metadata

Each page has a unique title/description, one H1, subordinate H2 sections, a canonical URL, Open Graph and Twitter preview data, useful internal links and a connection to an existing simulator function. Guided links use a bounded allowlist and preserve the previous autosave. They do not execute arbitrary URL code or accept arbitrary imported state.

WebSite/WebApplication and BreadcrumbList describe truthful entities. Articles use Article with headline, description and canonical page; no invented author, review, rating, date or award is included. Structured data does not guarantee a special search appearance.

Public domain comes from PUBLIC_APP_URL at build time. Rebuild when the canonical domain changes. The sitemap does not fabricate last-modified dates. Unknown pages have HTTP 404 and noindex rather than a 200 simulator fallback.

## Loading and accessibility

Public pages have no React, Three.js or physics worker requests. Only three calculator articles load a small local script. Images have intrinsic dimensions; the schematic hero is WebP with a separate PNG social preview. Screenshot images are lazy-loaded. Fonts are local system fallbacks. CSS includes narrow layouts, focus states, contrast, a skip link and reduced-motion handling.

Core Web Vitals must be measured on the real host and actual visitor devices. Small source sizes are not proof of good LCP/INP/CLS. Use Search Console and a real mobile PageSpeed/Lighthouse audit after deployment. The simulator's catalog/vendor chunks remain larger than landing-page resources and are not downloaded just to read an article.

## Editorial maintenance

Update a guide when the model changes. Compare equations with primary references and verify each interactive link. Never promise live satellite tracking, exact moon ephemerides, full general relativity, CFD or flight-certified missions. Source equations describe ideal models; the Accuracy page explains where the simulator differs.

Cluster pages around Solar System exploration, orbital mechanics, rockets and satellites. Add fewer substantial articles, not many paraphrased doorway pages. Link directly to relevant calculators and experiments. Promote the project only with truthful descriptions in communities that allow it; no automatic community posts or backlinks are configured.

## Verification and analytics

npm test includes static metadata, sitemap, CSP-hash and launch-link checks. scripts/seo-smoke.mjs tests actual HTTP routes. Run these after a canonical-domain or proxy change.

No third-party analytics is installed. If the operator later opts in, assess its privacy behavior and COEP/CSP compatibility before enabling it. Never send scenario contents, edit keys or detailed physics state as analytics events.

Google indexing and ranking are separate from deployment. Submission is a discovery hint, not guaranteed indexing or first-page placement. Follow [Google Search setup](GOOGLE_SEARCH.md).

Primary references: [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
