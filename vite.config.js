import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {execFileSync} from 'node:child_process';
let buildInfo={version:'1.1.0',commit:null,dirty:null};
try{buildInfo.commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();buildInfo.dirty=!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim();}catch{}

const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react()],
  define:{__ORRERY_BUILD__:JSON.stringify(buildInfo)},
  server: { headers, proxy: { '/api': 'http://127.0.0.1:8000' } },
  preview: { headers, proxy: { '/api': 'http://127.0.0.1:8000' } },
  worker: { format: 'es' },
  build: {rollupOptions: {output: {manualChunks(id){if(id.replace(/\\\\/g,'/').includes('/astronomy/data/'))return 'astronomy-data';}}}},
  test: { environment: 'node', include: ['src/tests/**/*.test.{js,jsx}'] },
});
