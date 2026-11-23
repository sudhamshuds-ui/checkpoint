import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// The dashboard website, deployed to Vercel. The extension is built separately by WXT.
export default defineConfig({
  root: 'src/web',
  envDir: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: fileURLToPath(new URL('./dist', import.meta.url)), emptyOutDir: true },
});
