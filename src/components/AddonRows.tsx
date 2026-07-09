import { useEffect, useMemo, useState } from 'react';
import { listAddonCatalogs, fetchAddonCatalog, type AddonCatalog } from '../lib/addonClient';
import { useAddons } from '../stores/addons';
import Row from './Row';
import Rail from './Rail';
import type { MediaItem } from '../lib/types';

/* Home rows supplied by installed community catalog add-ons — the client-direct
 * counterpart of appendAddonRows: the browser fetches each add-on's catalog
 * itself and renders it as a rail below the built-in rows. Rows with no art drop out. */

// Placeholder cards shown while a catalog is in flight. A rail is horizontal, so its
// height is one card tall regardless of how many we render — this many just fills the
// viewport width so the skeleton reads as a real row.
const SKELETON_CARDS = 8;

function CatalogRow({ cat, onSelect }: { cat: AddonCatalog; onSelect?: (m: MediaItem) => void }) {
  // null = still loading (distinct from [] = loaded-but-empty)
  const [items, setItems] = useState<MediaItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    setItems(null);
    fetchAddonCatalog(cat).then((l) => { if (alive) setItems(l); });
    return () => { alive = false; };
  }, [cat.addonId, cat.type, cat.id, cat.base]);

  const rowCat = `addon:${cat.addonId}:${cat.type}:${cat.id}`;

  // While the catalog loads, render the row's real shell (the title is known up-front)
  // with a reserved-height skeleton rail, so the posters fill IN PLACE with no reflow.
  // The old behaviour returned null until the fetch resolved, so the whole ~450px row
  // appended just above the footer on arrival — shifting the footer (CLS) whenever it
  // was in view. The skeleton reuses the exact .strip / Rail / .pcard markup, so its
  // height matches the loaded row at every breakpoint. (A genuinely empty catalog still
  // collapses to null below — rare, and it only pulls up an otherwise-blank row.)
  if (items === null) {
    return (
      <div className="strip reveal in addon-skel" data-row={rowCat} aria-busy="true">
        <div className="strip-head">
          <span className="strip-title static mono">{cat.name}</span>
        </div>
        <Rail>
          {Array.from({ length: SKELETON_CARDS }, (_, i) => (
            <div className="pcard" key={i} aria-hidden="true">
              <div className="poster skel-box" />
              <div className="cap">
                <div className="t skel-box skel-line" />
                <div className="meta skel-box skel-line short" />
              </div>
            </div>
          ))}
        </Rail>
      </div>
    );
  }
  if (!items.length) return null;
  return <Row title={cat.name} cat={rowCat} items={items} onSelect={onSelect} />;
}

export default function AddonRows({ onSelect }: { onSelect?: (m: MediaItem) => void }) {
  const inst = useAddons((s) => s.installed); // recompute when the collection changes
  const cats = useMemo(() => listAddonCatalogs(), [inst]);
  if (!cats.length) return null;
  return <>{cats.map((c, i) => <CatalogRow key={`${c.addonId}-${c.type}-${c.id}-${i}`} cat={c} onSelect={onSelect} />)}</>;
}
