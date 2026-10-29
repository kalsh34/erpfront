import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

/**
 * Single source of truth for the API base URL.
 *
 * The backend is https://erpback-tnsv.onrender.com (deployed on Render).
 * Configure the base URL with VITE_API_URL in:
 *   - frontend/.env.local          → loaded in dev and ALSO used as the dev proxy target
 *   - frontend/.env.production     → used by `vite build`
 *   - hosting env var              → overrides at deploy time if you build on Render/Vercel
 *
 * Dev always talks to the Vite /api proxy (`npm run dev`), which forwards to
 * whatever backend VITE_API_URL names — currently the Render deployment. Set
 * DEV_API_TARGET=... or `cross-env` overrides to hit a different backend for a
 * single run without touching the .env files.
 */
export const getApiBaseUrl = () => {
  // In dev, serve API calls through the Vite proxy so the browser never hits a
  // cross-origin URL (works the same for localhost and for phones on the LAN).
  if (import.meta.env.DEV) {
    return '/api';
  }

  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const fallback = 'http://localhost:5000';
  const base = (configured || fallback).replace(/\/+$/, '');
  return `${base}/api`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear the session in state only — NEVER navigate with window.location.
      // A hard navigation is a full document request for a client-side route;
      // on static hosts without an SPA fallback that answers 404 and destroys
      // whatever the calling screen was about to show (e.g. the login error).
      // ProtectedRoute reacts to the auth state change and client-side redirects
      // to /login without touching the network.
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
