import { create } from 'zustand';
import { loadHeart } from '../lib/heart';

/* Official add-on collection, sourced from the external repo Shon1a/Stredio-official-addons
 * via jsDelivr (like the translations repo). The merge runs through the Stredio-Heart
 * WASM core (AddonRuntime) — the same Rust merge_official rules the vanilla uses —
 * with a pure-JS fallback, and an inline 4-card safety net if the CDN is unreachable. */

const ADDONS_CDN = 'https://cdn.jsdelivr.net/gh/Shon1a/Stredio-official-addons@master/';

export interface OfficialAddon {
  id: string;
  section?: string;
  name: string;
  version?: string;
  ver?: string;
  iconCls?: string;
  glyph?: string;
  tags?: string[];
  defaultInstalled?: boolean;
  noConfig?: boolean;
  preview?: boolean;
  kind?: string;
  types?: string[];
  resources?: unknown[];
  flags?: { official?: boolean; protected?: boolean };
}

/* The four protected home-feature add-ons — the boot/fallback set. Their real
 * display metadata comes from the CDN; these stand in if it's unreachable. */
const INLINE: OfficialAddon[] = [
  { id: 'catalog', section: 'official', name: 'Catalog Rows', ver: 'v1.0.0', tags: ['catalog'], defaultInstalled: true, flags: { official: true, protected: true } },
  { id: 'providers', section: 'official', name: 'Streaming Services', ver: 'v1.0.0', tags: ['providers'], defaultInstalled: true, flags: { official: true, protected: true } },
  { id: 'studios', section: 'official', name: 'Studios', ver: 'v1.0.0', tags: ['studios'], defaultInstalled: true, noConfig: true, preview: true, flags: { official: true, protected: true } },
  { id: 'upcoming', section: 'official', name: 'Upcoming Radar', ver: 'v1.0.0', tags: ['upcoming'], defaultInstalled: true, noConfig: true, preview: true, flags: { official: true, protected: true } },
];

async function fetchText(file: string): Promise<string | null> {
  try { const r = await fetch(ADDONS_CDN + file, { cache: 'force-cache' }); if (r.ok) return await r.text(); } catch { /* offline */ }
  return null;
}
const parse = <T>(txt: string | null): T | null => { try { return txt ? JSON.parse(txt) as T : null; } catch { return null; } };

/* PRIMARY: drive the Stredio-Heart WASM core, exactly like the vanilla —
 *   new AddonRuntime(inline) → load_official() → official_manifest_fetched(index.json)
 *   → [FetchOfficialPayload] → official_payload_fetched(payload) → addons_json(). */
async function loadViaHeart(): Promise<OfficialAddon[] | null> {
  const mod = await loadHeart();
  if (!mod) return null;
  try {
    const rt = new mod.AddonRuntime(JSON.stringify(INLINE));
    rt.load_official();
    const fx1 = parse<Array<{ FetchOfficialPayload?: { file: string } }>>(rt.official_manifest_fetched(await fetchText('index.json'))) || [];
    const pf = fx1.find((e) => e && e.FetchOfficialPayload);
    if (pf?.FetchOfficialPayload) {
      rt.official_payload_fetched(await fetchText(pf.FetchOfficialPayload.file));
    }
    const list = parse<OfficialAddon[]>(rt.addons_json());
    rt.free();
    return Array.isArray(list) && list.length ? list : null;
  } catch { return null; }
}

/* FALLBACK: no WASM — fetch the manifest + payload and use the descriptors directly. */
async function loadViaJs(): Promise<OfficialAddon[] | null> {
  const idx = parse<{ collections?: Array<{ section?: string; file?: string }> }>(await fetchText('index.json'));
  const coll = idx?.collections?.find((c) => c.section === 'official') || idx?.collections?.[0];
  if (!coll?.file) return null;
  const payload = parse<{ addons?: OfficialAddon[] }>(await fetchText(coll.file));
  return Array.isArray(payload?.addons) && payload!.addons.length ? payload!.addons : null;
}

interface OfficialState {
  list: OfficialAddon[];
  loaded: boolean;
  load: () => Promise<void>;
}

export const useOfficial = create<OfficialState>((set) => ({
  list: INLINE,
  loaded: false,
  load: async () => {
    const list = (await loadViaHeart()) || (await loadViaJs()) || INLINE;
    set({ list, loaded: true });
  },
}));
