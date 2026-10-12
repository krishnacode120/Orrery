# Google Search Console and discovery

Production origin: **https://orrery-eight-rose.vercel.app/**. Ownership verification is being configured with the owner's explicit approval; sitemap submission is not yet confirmed.

## Assigned Vercel hostname

Use a **URL-prefix** property for `https://orrery-eight-rose.vercel.app/`; you do not control DNS for `vercel.app`. Choose HTML-tag verification. The approved public token is scoped to that exact homepage in `site/verification.mjs`. After deployment, verify the tag in page source and click Verify. Keep the token deployed. Submit `https://orrery-eight-rose.vercel.app/sitemap.xml` and inspect the homepage. Verification and sitemap submission do not guarantee indexing.

## Future custom domain

When a custom domain is supplied, set PUBLIC_APP_URL, redeploy canonical URLs and use the following DNS workflow. Tokens must come from the intended owner account.

1. Open Google Search Console using the intended owner account.
2. Add a Domain property for the exact registered domain. A Domain property covers protocols/subdomains; its normal verification method is DNS.
3. Copy the TXT verification record supplied by Google into the domain's authoritative DNS provider. Preserve existing TXT records. Wait for propagation, then choose Verify in Search Console. Keep the record after verification.
4. Verify https://DOMAIN/robots.txt and https://DOMAIN/sitemap.xml publicly. Ensure every sitemap URL uses the intended HTTPS canonical hostname.
5. Open Sitemaps in the property and submit sitemap.xml. Inspect the processing status and reported errors.
6. Use URL Inspection on the homepage. Run the live test. Check HTTP 200, indexability, rendered/HTML content, canonical selection and required resources.
7. Request indexing for the homepage and a few main landing pages using Google's available controls. Respect submission limits; repeated requests are not an acceleration mechanism.
8. Inspect /solar-system-simulator, /orbital-mechanics-simulator, /rocket-simulator and /satellite-simulator. Do not submit unlisted /s URLs.
9. Revisit Pages/Indexing reports after Google has processed the site. Submitted, discovered, crawled and indexed are different states; record actual status rather than assuming success.
10. Monitor Performance for queries, impressions, clicks, CTR and average position. Start with specific relevant queries, then improve content based on actual demand. Search Console position is an aggregate, not a guaranteed rank for every user.

No workflow can force Google to index a URL or rank it on the first page. A sitemap is a discovery hint. If pages are not indexed, inspect access/status, robots, canonical selection, duplicate/thin content and quality before resubmitting.

## Bing

Add the site to Bing Webmaster Tools using an authorized owner account. Use its offered verification method or authorized Search Console import, then submit the same sitemap and inspect crawl issues. Do not transfer account permissions without reviewing the scope.

IndexNow is optional and is not configured. If added later, generate an operator-controlled key, serve its validation file and submit only changed public content URLs. It does not replace Google's sitemap/inspection workflow and must never include unlisted scenarios.

## Launch record

Fill only after observing each result:

- Production origin:
- Domain/DNS operator:
- Google property:
- Verification observed at:
- Sitemap processing status:
- Homepage canonical/index status:
- Major landing-page status:
- Bing property/sitemap status:
- Next review date:

References: [Google ownership verification](https://support.google.com/webmasters/answer/9008080), [building/submitting sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [URL Inspection](https://support.google.com/webmasters/answer/9012289).
