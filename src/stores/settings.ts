import { create } from 'zustand';

/* Playback / interface settings, persisted to localStorage (stredio.settings.v1),
 * mirroring the vanilla SETTINGS object. A focused subset is wired now; the full
 * control set (external player, popup-ring, etc.) can extend this store. */

const KEY = 'stredio.settings.v1';

export interface Settings {
  autoplayNext: boolean;
  subSize: number;       // % of base subtitle size
  blurUnwatched: boolean;
}

const DEFAULTS: Settings = { autoplayNext: true, subSize: 100, blurUnwatched: false };

function load(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; }
}
function save(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ }
}

interface SettingsState {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: load(),
  update: (patch) => { const next = { ...get().settings, ...patch }; save(next); set({ settings: next }); },
}));
