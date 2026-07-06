import { create } from 'zustand';
import { api } from '../lib/api';
import { useAuth } from './auth';

/* Installed add-on collection. Per the project's client-direct model, the browser
 * fetches an add-on's manifest DIRECTLY (never via our server) to validate + install.
 * localStorage is the instant, offline-safe source of truth; when signed in, the
 * collection also syncs to the server (/api/addons, requireAuth) so installs follow
 * the user across devices — the server only stores the list (it never fetches add-ons).
 * Guests stay purely local. */

const KEY = 'stredio.addons';

export interface Manifest {
  id: string;
  name: string;
  version?: string;
  description?: string;
  types?: string[];
  resources?: unknown[];
  catalogs?: unknown[];
}
export interface AddonRecord { id: string; url: string; manifest: Manifest; installedAt: number }

function load(): AddonRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function save(list: AddonRecord[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
}
const authed = () => !!useAuth.getState().user;
const addonId = (a: AddonRecord) => a.manifest?.id || a.id;

// best-effort server writes — local stays the source of truth if these fail
function serverInstall(rec: AddonRecord) {
  if (!authed()) return;
  api('/api/addons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: rec.url, manifest: rec.manifest }) }).catch(() => {});
}
function serverRemove(id: string) {
  if (!authed()) return;
  api(`/api/addons/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
}

/** Accept a base URL or a full manifest URL; return the manifest URL. */
export function normalizeManifestUrl(raw: string): string {
  let u = raw.trim().replace(/^stremio:\/\//, 'https://').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  if (!/manifest\.json$/i.test(u)) u += '/manifest.json';
  return u;
}

interface AddonsState {
  installed: AddonRecord[];
  install: (rawUrl: string) => Promise<void>;
  remove: (id: string) => void;
  /** merge the server collection with local (union by manifest id), both directions */
  pullFromServer: () => Promise<void>;
}

export const useAddons = create<AddonsState>((set, get) => ({
  installed: load(),
  install: async (rawUrl) => {
    const url = normalizeManifestUrl(rawUrl);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Manifest fetch failed (${res.status})`);
    const manifest = await res.json() as Manifest;
    if (!manifest || !manifest.id || !manifest.name) throw new Error('Not a valid add-on manifest');
    if (get().installed.some((a) => a.manifest.id === manifest.id)) return; // already installed
    const rec: AddonRecord = { id: manifest.id, url, manifest, installedAt: Date.now() };
    const next = [...get().installed, rec];
    save(next); set({ installed: next });
    serverInstall(rec);
  },
  remove: (id) => {
    const next = get().installed.filter((a) => a.id !== id);
    save(next); set({ installed: next });
    serverRemove(id);
  },
  pullFromServer: async () => {
    if (!authed()) return;
    try {
      const { addons: remote } = await api<{ addons: AddonRecord[] }>('/api/addons');
      const local = get().installed;
      // union by manifest id, keeping the first-seen record (server order first)
      const byId = new Map<string, AddonRecord>();
      for (const a of [...(remote || []), ...local]) { const id = addonId(a); if (id && !byId.has(id)) byId.set(id, a); }
      const merged = [...byId.values()];
      save(merged); set({ installed: merged });
      // push any local-only add-ons up so the server matches
      const remoteIds = new Set((remote || []).map(addonId));
      for (const a of local) if (!remoteIds.has(addonId(a))) serverInstall(a);
    } catch { /* offline / not authed — keep local */ }
  },
}));
