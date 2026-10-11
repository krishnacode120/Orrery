import {it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {pages} from '../../site/content.mjs';
import {renderPage,publicOrigin,robots,sitemap,csp,errorPage} from '../../site/render.mjs';
import {publicLaunch,PUBLIC_LAUNCHES} from '../publicLaunch.js';
const origin='https://orrery.example.org';
it('renders unique indexable HTML for every public route without the simulator bundle',()=>{
 const titles=new Set(),descriptions=new Set();
 for(const p of pages){
  const html=renderPage(p,origin);expect(html.match(/<h1>/g)).toHaveLength(1);
  expect(html).toContain('<title>'+p.title.replaceAll('&','&amp;')+'</title>');
  expect(html).toContain('name="description"');expect(html).toContain('rel="canonical" href="'+origin+p.path+'"');
  expect(html).toContain('content="index,follow');expect(html).not.toMatch(/src="[^"]*(src\/main|assets\/index)/);
  expect(p.sections.length).toBeGreaterThanOrEqual(2);expect(titles.has(p.title)).toBe(false);expect(descriptions.has(p.description)).toBe(false);
  titles.add(p.title);descriptions.add(p.description);
  for(const [,data] of html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)){
   const parsed=JSON.parse(data);expect(parsed['@context']).toBe('https://schema.org');
   const hash=createHash('sha256').update(data).digest('base64');expect(csp(origin)).toContain("'sha256-"+hash+"'");
  }
 }
});
it('sitemap omits unlisted shares and has only canonical public pages',()=>{
 const xml=sitemap(origin);expect(xml.match(/<loc>/g)).toHaveLength(pages.length);expect(xml).not.toContain('/s/');expect(xml).not.toContain('/app');
 expect(robots(origin)).toContain('Allow: /');expect(robots(origin)).not.toContain('Disallow: /s/');expect(robots(origin)).toContain(origin+'/sitemap.xml');
 expect(errorPage(404)).toContain('noindex');
});
it('rejects invalid production origins and keeps API unrelated to public metadata',()=>{
 for(const value of ['http://real.example.org','https://a.example/path','https://u:p@a.example','https://example.com'])expect(()=>publicOrigin(value,true)).toThrow();
 expect(publicOrigin(origin,true)).toBe(origin);
});
it('all content links resolve to real pages or allowlisted simulator examples',()=>{
 const paths=new Set(pages.map(p=>p.path));
 for(const p of pages){for(const link of p.links??[])expect(paths.has(link)).toBe(true);if(p.launch)expect(PUBLIC_LAUNCHES.has(p.launch)).toBe(true);}
 expect(publicLaunch('?launch=sandbox')).toEqual({launch:'sandbox',experiment:null});
 expect(publicLaunch('?launch=whatif&experiment=removeMoon').experiment).toBe('removeMoon');
 expect(publicLaunch('?launch=delete-everything')).toBeNull();
 expect(publicLaunch('?launch=whatif&experiment=unbounded')).toEqual({launch:'whatif',experiment:null});
});
