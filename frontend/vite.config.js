import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    open: true, // Opens browser on server start
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
    outDir: 'dist',
    copyPublicDir: true, // Ensure public folder files are copied
  },
  publicDir: 'public',
});
