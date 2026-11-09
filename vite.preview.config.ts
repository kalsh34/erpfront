import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plain-HTTP twin of vite.config.ts, used only so the desktop app's embedded
// browser can display the app without a self-signed certificate interstitial.
// The normal `npm run dev` server (https://localhost:3000) stays the default.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
