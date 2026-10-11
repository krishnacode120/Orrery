import {spawnSync} from 'node:child_process';
import {readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {csp,publicOrigin,escape} from '../site/render.mjs';
const host=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL;
const origin=publicOrigin(process.env.PUBLIC_APP_URL||(host?'https://'+host:undefined),true);
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{stdio:'inherit',shell:process.platform==='win32',env:{...process.env,PUBLIC_APP_URL:origin,ORRERY_PRODUCTION:'1',ORRERY_SHARE_MAX_BYTES:String(4*1024*1024)}});
if(result.status!==0)process.exit(result.status??1);
// Meta policy supplies domain-specific JSON-LD hashes; frame-ancestors is an HTTP header.
const policy=csp(origin).replace(/frame-ancestors[^;]*;?/g,'');
async function secure(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const file=join(directory,entry.name);
  if(entry.isDirectory())await secure(file);
  else if(entry.name.endsWith('.html')){
   let html=await readFile(file,'utf8');
   html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="'+escape(policy)+'">');
   // Preview deployments cannot compete with the canonical production site.
   if(process.env.VERCEL_ENV==='preview')html=html.replace(/<meta name="robots"[^>]*>/g,'') .replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
   await writeFile(file,html);
  }
 }
}
await secure('dist');
await Promise.all(['security.caddy','public-pages.json'].map(name=>unlink(join('dist',name))));
console.log('Vercel static pages built for '+origin);
