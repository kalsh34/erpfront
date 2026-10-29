import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';
import { UserRole } from '../types';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeId?: string;
  phone?: string;
  avatarUrl?: string;
  /** Effective per-user permissions (role defaults + module grants − denies). */
  permissions?: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  setUser: (user: User) => void;
}

/** Permission check used by UI action gating (`can('guard-payroll.calculate')`). */
export function can(permissions: string[] | undefined, ...required: string[]): boolean {
  if (!permissions?.length) return false;
  return required.some((p) => permissions.includes(p));
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { token, user } = res.data.data;
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      fetchMe: async () => {
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.data, isAuthenticated: true });
        } catch {
          set({ token: null, user: null, isAuthenticated: false });
        }
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'vitalpayroll-auth' }
  )
);
