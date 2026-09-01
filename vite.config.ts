import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist/browser',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        local: 'index.local.html',
        help: 'index.help.html'
      }
    }
  }
});
