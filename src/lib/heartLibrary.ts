import { loadHeart, type LibraryRuntime } from './heart';
import type { WatchEntry, Progress } from '../stores/history';

/* Drives the library reducers through the Stredio-Heart WASM core (LibraryRuntime)
 * — the Rust merge-by-recency + caps/TTL rules, the same the shell used to do in JS.
 * Stateless-per-op: each call hydrates the runtime with the shell's current state,
 * applies the reducer, and returns the new {history, progress, removed} snapshot, so
 * Zustand stays the store-of-record and the runtime is a pure driver.
 *
 * The runtime's own continue_watching() keys progress by item id; our store keys it
 * by media key (id:S#E# for episodes), so the CW rail is still derived in the store.
 * We use Heart only for the merge/caps/tombstone reducers, whose {history, progress,
 * removed} shapes match exactly. Any error → returns null → the store's JS fallback. */

export interface Library { history: WatchEntry[]; progress: Record<string, Progress>; removed: Record<string, number> }

let rt: LibraryRuntime | null = null;
let initPromise: Promise<void> | null = null;

export function initHeartLibrary(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const mod = await loadHeart();
    if (mod?.LibraryRuntime) { try { rt = new mod.LibraryRuntime(); } catch { rt = null; } }
  })();
  return initPromise;
}
export const libReady = () => !!rt;

// Heart's LibraryItem.rating is Option<String>; our WatchEntry.rating is a number.
const toItem = (e: WatchEntry) => ({ ...e, rating: e.rating != null ? String(e.rating) : undefined });
const toLibJson = (l: Library) => JSON.stringify({ history: l.history.map(toItem), progress: l.progress, removed: l.removed });

interface RawItem extends Omit<WatchEntry, 'rating'> { rating?: string | number }
function fromLibJson(json: string): Library | null {
  try {
    const s = JSON.parse(json) as { history?: RawItem[]; progress?: Record<string, Progress>; removed?: Record<string, number> };
    const history: WatchEntry[] = (s.history || []).map((e) => ({ ...e, rating: e.rating != null && e.rating !== '' ? Number(e.rating) : undefined }));
    return { history, progress: s.progress || {}, removed: s.removed || {} };
  } catch { return null; }
}

// hydrate the runtime with the shell's current state, apply the op, read the snapshot
function run(current: Library, op: (r: LibraryRuntime) => void): Library | null {
  if (!rt) return null;
  try { rt.hydrate(toLibJson(current)); op(rt); return fromLibJson(rt.snapshot_json()); }
  catch { return null; }
}

export const heartLib = {
  ready: libReady,
  normalize: (cur: Library) => run(cur, () => {}),
  record: (cur: Library, item: WatchEntry) => run(cur, (r) => r.record_watch(JSON.stringify(toItem(item)))),
  setProgress: (cur: Library, key: string, pos: number, dur: number, now: number) => run(cur, (r) => r.set_progress(key, pos, dur, now)),
  remove: (cur: Library, id: string, now: number) => run(cur, (r) => r.remove(id, now)),
  pulled: (cur: Library, remote: Library, now: number) => run(cur, (r) =>
    r.pulled(JSON.stringify(remote.history.map(toItem)), JSON.stringify(remote.progress || {}), JSON.stringify(remote.removed || {}), now)),
};
