import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pages} from './content.mjs';
import {publicOrigin,renderPage,robots,sitemap,csp,errorPage} from './render.mjs';
export function seoSite(env={}){
 const origin=publicOrigin(env.PUBLIC_APP_URL,env.ORRERY_PRODUCTION==='1'),headers={'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()'};
 let outDir;
 function route(server,preview=false){server.middlewares.use((req,res,next)=>{
  const url=new URL(req.url,'http://localhost'),path=url.pathname,page=pages.find(p=>p.path===path);
  for(const[k,v]of Object.entries(headers))res.setHeader(k,v);
  if(preview)res.setHeader('Content-Security-Policy',csp(origin));
  if(path!=='/'&&path.endsWith('/')&&pages.some(p=>p.path===path.slice(0,-1))){res.statusCode=308;res.setHeader('Location',path.slice(0,-1)+url.search);res.end();return;}
  if(page){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(renderPage(page,origin));return;}
  if(path==='/robots.txt'||path==='/sitemap.xml'){res.setHeader('Content-Type',path.endsWith('.xml')?'application/xml':'text/plain');res.end(path.endsWith('.xml')?sitemap(origin):robots(origin));return;}
  if(path==='/app'||path==='/app/'||/^\/s\/[A-Za-z0-9_-]{1,80}$/.test(path)){res.setHeader('X-Robots-Tag','noindex, nofollow');req.url=(preview?'/app.html':'/index.html')+url.search;next();return;}
  if(!path.startsWith('/api')&&req.headers.accept?.includes('text/html')&&!path.startsWith('/@')&&!path.startsWith('/src/')&&path!=='/index.html'){res.statusCode=404;res.setHeader('Content-Type','text/html; charset=utf-8');res.end(errorPage(404));return;}
  next();
 });}
 return {name:'orrery-public-site',configResolved(config){outDir=resolve(config.root,config.build.outDir);},configureServer:server=>route(server),configurePreviewServer:server=>route(server,true),
 async closeBundle(){
  const appPath=resolve(outDir,'index.html');let app;
  try{app=await readFile(appPath,'utf8');}catch{return;}
  app=app.replace('</head>','<meta name="robots" content="noindex,nofollow"><link rel="canonical" href="'+origin+'/app"></head>');
  await writeFile(resolve(outDir,'app.html'),app);
  for(const page of pages){const path=resolve(outDir,page.path==='/'?'index.html':page.path.slice(1)+'/index.html');await mkdir(dirname(path),{recursive:true});await writeFile(path,renderPage(page,origin));}
  await writeFile(resolve(outDir,'robots.txt'),robots(origin));await writeFile(resolve(outDir,'sitemap.xml'),sitemap(origin));
  for(const status of [404,500])await writeFile(resolve(outDir,status+'.html'),errorPage(status));
  await writeFile(resolve(outDir,'security.caddy'),'header Content-Security-Policy "'+csp(origin)+'"\n');
  await writeFile(resolve(outDir,'public-pages.json'),JSON.stringify(pages.map(p=>p.path)));
 }};
}
