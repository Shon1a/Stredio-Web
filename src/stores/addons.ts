import { create } from 'zustand';

/* Installed add-on collection. Per the project's client-direct model, the browser
 * fetches an add-on's manifest DIRECTLY (never via our server) to validate + install.
 * Stored locally now; server sync (/api/addons, requireAuth) + install-state
 * (/api/addon-state) layer on in Phase 5. */

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
  },
  remove: (id) => { const next = get().installed.filter((a) => a.id !== id); save(next); set({ installed: next }); },
}));
