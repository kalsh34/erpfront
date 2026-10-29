import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Dev requests go to /api on this server and are forwarded to the backend.
  // The target is DEV_API_TARGET (process env) or VITE_API_URL from the .env
  // files (frontend/.env.local etc.), falling back to a local backend on 5000.
  // .env.local currently sets VITE_API_URL=https://erpback-tnsv.onrender.com,
  // so `npm run dev` talks to the deployed Render API (no local backend needed).
  const env = loadEnv(mode, __dirname, 'VITE_');
  const apiTarget = (
    process.env.DEV_API_TARGET ||
    env.VITE_API_URL ||
    'http://localhost:5000'
  ).replace(/\/+$/, '');

  return {
    // basicSsl: the QR scanner needs the camera, and browsers only allow the
    // camera on HTTPS (or localhost). Phones on the LAN reach this over https.
    plugins: [react(), basicSsl()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      // Listen on the LAN IP so a phone on the same Wi-Fi can open the app.
      host: true,
      proxy:
        mode === 'development'
          ? {
              '/api': {
                target: apiTarget,
                changeOrigin: true,
              },
            }
          : undefined,
    },
  };
});
