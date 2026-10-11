import {pages} from '../site/content.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const origin=(process.argv[2]??'http://127.0.0.1:4173').replace(/\/$/,'');
const checks=[];
async function check(path,status=200){const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(15000)}),body=await response.text();if(response.status!==status)throw new Error(path+' returned '+response.status+', expected '+status);checks.push({path,status:response.status});return {response,body};}
for(const page of pages){const {body}=await check(page.path);for(const pattern of [/<title>[^<]+<\/title>/,/name="description"/,/rel="canonical"/,/application\/ld\+json/])if(!pattern.test(body))throw new Error('Missing SEO metadata on '+page.path);if((body.match(/<h1>/g)??[]).length!==1)throw new Error('Heading structure: '+page.path);if(body.includes('/src/main.jsx')||/src="\/assets\/index/.test(body))throw new Error('Simulator eagerly loaded: '+page.path);}
for(const path of ['/app','/s/smoke-unlisted']){const {response,body}=await check(path);if(!response.headers.get('x-robots-tag')?.includes('noindex')&&!body.includes('content="noindex'))throw new Error('Missing noindex: '+path);if(!body.includes('id="root"'))throw new Error('Missing app shell');if(response.headers.get('cross-origin-opener-policy')!=='same-origin'||response.headers.get('cross-origin-embedder-policy')!=='require-corp')throw new Error('Missing isolation headers');}
await check('/robots.txt');await check('/sitemap.xml');await check('/api/health');await check('/not-a-real-orrery-page',404);
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/seo-smoke.json',JSON.stringify({origin,checks},null,2));console.log(checks.length+' HTTP/SEO smoke checks passed at '+origin);
