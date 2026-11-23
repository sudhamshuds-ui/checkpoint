import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// A self-contained preview of the dashboard on sample posts (no login, no backend).
export default defineConfig({
  root: 'src/web',
  base: './',
  publicDir: false,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: fileURLToPath(new URL('./dist-demo', import.meta.url)),
    emptyOutDir: true,
    rolldownOptions: { input: fileURLToPath(new URL('./src/web/demo.html', import.meta.url)) },
  },
});
