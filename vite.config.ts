import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import path from 'node:path';
import fs from 'node:fs';

/** Creates the Vite configuration for the Electron and React dev app. */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron'),
    },
  },
  plugins: [
    {
      name: 'mediapipe-bypass',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urlPath = req.url?.split('?')[0];
          if (urlPath?.startsWith('/mediapipe/wasm/')) {
            const fileName = path.basename(urlPath);
            const filePath = path.resolve(__dirname, 'public/mediapipe/wasm', fileName);
            if (fs.existsSync(filePath)) {
              if (fileName.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript');
              } else if (fileName.endsWith('.wasm')) {
                res.setHeader('Content-Type', 'application/wasm');
              }
              res.end(fs.readFileSync(filePath));
              return;
            }
          }
          next();
        });
      },
    },
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
          },
        },
      },
    }),
    renderer(),
  ],
  worker: {
    format: 'es',
  },
});
