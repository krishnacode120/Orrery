import {readFileSync} from 'node:fs';
import {publicOrigin} from '../site/render.mjs';
const local=Object.fromEntries(readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
const env={...local,...process.env},origin=publicOrigin(env.PUBLIC_APP_URL,true);
if(new URL(origin).host!==env.ORRERY_DOMAIN)throw new Error('ORRERY_DOMAIN must equal PUBLIC_APP_URL hostname');
if(!env.ACME_EMAIL||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.ACME_EMAIL))throw new Error('Set a valid ACME_EMAIL');
if(env.API_BASE_URL&&env.API_BASE_URL!=='/api')throw new Error('Use API_BASE_URL=/api');
console.log('Production origin and HTTPS settings validated: '+origin);
