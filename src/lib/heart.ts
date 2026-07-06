/* Stredio-Heart — the reusable Rust core, compiled to WebAssembly and loaded from
 * jsDelivr (github.com/Shon1a/Stredio-Heart), the same way Stremio's web app loads
 * @stremio/stremio-core-web. The core owns the domain logic; the React shell drives
 * it and renders its JSON snapshots.
 *
 * Currently wired: AddonRuntime (official add-on merge). CatalogRuntime (home-row
 * gating) and LibraryRuntime (continue-watching) are exposed by the core too and can
 * be routed through progressively. If the WASM can't load (old browser / strict CSP)
 * callers fall back to a pure-JS path. */

const HEART_JS = 'https://cdn.jsdelivr.net/gh/Shon1a/Stredio-Heart@master/web/stredio_heart.js';

export interface AddonRuntime {
  addons_json(): string;
  install_map_json(): string;
  load_official(): string;
  official_manifest_fetched(json?: string | null): string;
  official_payload_fetched(json?: string | null): string;
  status(): string;
  toggle_addon(id: string, now: number): string;
  free(): void;
}

export interface HeartModule {
  default: (input?: unknown) => Promise<unknown>;
  AddonRuntime: new (inlineJson: string) => AddonRuntime;
  collection_addons_json?: (payloadJson: string) => string;
}

let heartPromise: Promise<HeartModule | null> | null = null;

/** Load + instantiate the WASM core once; resolves null if it can't load. */
export function loadHeart(): Promise<HeartModule | null> {
  if (heartPromise) return heartPromise;
  heartPromise = (async () => {
    try {
      const mod = await import(/* @vite-ignore */ HEART_JS) as HeartModule;
      await mod.default(); // instantiate the wasm (glue fetches stredio_heart_bg.wasm from jsDelivr)
      return mod;
    } catch {
      return null; // WASM unavailable → callers use their JS fallback
    }
  })();
  return heartPromise;
}
