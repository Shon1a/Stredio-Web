import { create } from 'zustand';
import { api, setSessionToken } from '../lib/api';

/* Auth — port of the vanilla auth flow (assets/js/app.js + server/auth.js). Talks
 * to /api/auth/*; the session token is mirrored to localStorage via the api client
 * (setSessionToken) so it survives browser restarts across the split deploy. Also
 * holds the auth-modal open state + the gated-route "intent" to resume after login. */

export interface User {
  id: string;
  email: string;
  name?: string;
  surname?: string;
  isAdmin?: boolean;
}

export interface SignupData {
  email: string; password: string; name: string; surname: string; dob: string;
}

interface AuthConfig { google: boolean; googleClientId?: string }

interface AuthState {
  user: User | null;
  ready: boolean;
  config: AuthConfig | null;
  authOpen: boolean;
  intent: string | null;
  refresh: () => Promise<void>;
  loadConfig: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (d: SignupData) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  openAuth: (intent?: string) => void;
  closeAuth: () => void;
}

const jsonPost = (path: string, body: unknown) =>
  api<{ user: User; token: string }>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  config: null,
  authOpen: false,
  intent: null,

  refresh: async () => {
    try {
      const { user } = await api<{ user: User | null }>('/api/auth/me');
      set({ user: user || null });
    } catch {
      set({ user: null });
    } finally {
      set({ ready: true });
    }
  },
  loadConfig: async () => {
    try { set({ config: await api<AuthConfig>('/api/auth/config') }); } catch { /* dormant */ }
  },
  login: async (email, password) => {
    const { user, token } = await jsonPost('/api/auth/login', { email, password });
    setSessionToken(token); set({ user, authOpen: false });
  },
  signup: async (d) => {
    const { user, token } = await jsonPost('/api/auth/signup', d);
    setSessionToken(token); set({ user, authOpen: false });
  },
  googleLogin: async (credential) => {
    const { user, token } = await jsonPost('/api/auth/google', { credential });
    setSessionToken(token); set({ user, authOpen: false });
  },
  logout: async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    setSessionToken(null); set({ user: null });
  },
  openAuth: (intent) => set({ authOpen: true, intent: intent ?? null }),
  closeAuth: () => set({ authOpen: false, intent: null }),
}));
