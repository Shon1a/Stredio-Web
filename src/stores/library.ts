import { create } from 'zustand';
import type { MediaItem } from '../lib/types';

/* My List (watchlist) — localStorage-backed, port of the vanilla myList/inMyList/
 * toggleMyList (key `sf:mylist`). Cross-device server sync (/api/library-state)
 * layers on in Phase 5 once auth exists; the local list works standalone now. */

const MYLIST_KEY = 'sf:mylist';

export interface WatchItem {
  id: string | number;
  type?: MediaItem['type'];
  title?: string;
  year?: string | number;
  rating?: number;
  poster?: string;
}

function load(): WatchItem[] {
  try { return JSON.parse(localStorage.getItem(MYLIST_KEY) || '[]'); } catch { return []; }
}
function save(list: WatchItem[]) {
  try { localStorage.setItem(MYLIST_KEY, JSON.stringify(list)); } catch { /* quota */ }
}

interface LibraryState {
  mylist: WatchItem[];
  inList: (id: string | number) => boolean;
  toggle: (item: WatchItem) => boolean; // returns the new state (true = now in list)
}

export const useLibrary = create<LibraryState>((set, get) => ({
  mylist: load(),
  inList: (id) => get().mylist.some((m) => String(m.id) === String(id)),
  toggle: (item) => {
    const cur = get().mylist;
    const has = cur.some((m) => String(m.id) === String(item.id));
    const next = has ? cur.filter((m) => String(m.id) !== String(item.id)) : [item, ...cur];
    save(next);
    set({ mylist: next });
    return !has;
  },
}));
