// Throwaway test config: same dev setup as vite.config.ts but plain HTTP,
// because the preview browser rejects the self-signed basicSsl cert.
// Proxy target follows DEV_API_TARGET / VITE_API_URL, like vite.config.ts.
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_');
  const apiTarget = (
    process.env.DEV_API_TARGET ||
    env.VITE_API_URL ||
    'http://localhost:5000'
  ).replace(/\/+$/, '');

  return {
    plugins: [react()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: {
      port: 5174,
      host: true,
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
  };
});
