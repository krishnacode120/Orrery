import { defineConfig, loadEnv } from 'vite';
import {seoSite} from './site/plugin.mjs';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';
let buildInfo={version:'1.1.0',commit:process.env.GIT_COMMIT??null,dirty:null};
try{buildInfo.commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();buildInfo.dirty=!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();}catch{}

const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig(({mode})=>{
 const env={...loadEnv(mode,process.cwd(),''),...process.env};
 if(env.API_BASE_URL&&env.API_BASE_URL!=='/api')throw new Error('This deployment requires same-origin API_BASE_URL=/api');
 return {
  plugins: [react(),seoSite(env)],
  define:{__ORRERY_BUILD__:JSON.stringify(buildInfo),'import.meta.env.VITE_API_BASE_URL':JSON.stringify(env.API_BASE_URL??'/api'),'import.meta.env.VITE_SHARE_MAX_BYTES':JSON.stringify(Number(env.ORRERY_SHARE_MAX_BYTES)||32*1024*1024)},
  server: { headers, proxy: { '/api': 'http://127.0.0.1:8000' } },
  preview: { headers, proxy: { '/api': 'http://127.0.0.1:8000' } },
  worker: { format: 'es' },
  build: {rollupOptions: {output: {manualChunks(id){if(id.replace(/\\\\/g,'/').includes('/astronomy/data/'))return 'astronomy-data';}}}},
  test: { environment: 'node', include: ['src/tests/**/*.test.{js,jsx}'] },
};});
