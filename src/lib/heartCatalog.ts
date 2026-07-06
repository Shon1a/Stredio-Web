import { loadHeart, type CatalogRuntime } from './heart';
import type { HomeConfig } from '../stores/homeConfig';

/* Drives home-row gating through the Stredio-Heart WASM core (CatalogRuntime). The
 * Rust `Catalog` model owns the fixed HOME_ROWS list + the visible_rows() rule
 * (gating add-on installed AND, for catalog/provider rows, the per-row toggle on);
 * the shell just feeds the config and renders the returned order. Stateless-per-call.
 * Returns null when the WASM isn't up → Home falls back to the identical JS gating.
 *
 * The Upcoming marquee isn't one of Heart's HOME_ROWS, so its gating stays in the
 * shell (config.upcoming). */

let rt: CatalogRuntime | null = null;
let initPromise: Promise<void> | null = null;

export function initHeartCatalog(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const mod = await loadHeart();
    if (mod?.CatalogRuntime) { try { rt = new mod.CatalogRuntime(); } catch { rt = null; } }
  })();
  return initPromise;
}

/** Ordered list of visible home-row cats (incl. "studios"), or null when the core
 *  isn't available (caller uses its JS gating). */
export function visibleRows(config: HomeConfig): string[] | null {
  if (!rt) return null;
  try {
    const rowConfig = { ...config.catalogRows, ...config.providerRows }; // Heart uses one map (absent = on)
    rt.hydrate_row_config(JSON.stringify(rowConfig));
    rt.set_gating(config.catalog, config.providers, config.studios);
    const parsed = JSON.parse(rt.visible_rows_json());
    if (!Array.isArray(parsed)) return null;
    // visible_rows_json is an array of cat strings; tolerate {cat} objects just in case
    return parsed.map((x) => (typeof x === 'string' ? x : x?.cat)).filter(Boolean) as string[];
  } catch { return null; }
}
