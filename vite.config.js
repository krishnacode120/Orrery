import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [react()],
  server: { headers, proxy: { '/api': 'http://127.0.0.1:8000' } },
  preview: { headers, proxy: { '/api': 'http://127.0.0.1:8000' } },
  worker: { format: 'es' },
  build: {rollupOptions: {output: {manualChunks(id){if(id.replace(/\\\\/g,'/').includes('/astronomy/data/'))return 'astronomy-data';}}}},
  test: { environment: 'node', include: ['src/tests/**/*.test.{js,jsx}'] },
});
