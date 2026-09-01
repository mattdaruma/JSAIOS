import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'root-html-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            if (process.argv.some((arg) => arg.includes('index.local.html'))) {
              req.url = '/index.local.html';
            }
          }
          next();
        });
      }
    }
  ],
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
        local: 'index.local.html'
      }
    }
  }
});
