import { useEffect, useMemo, useState } from 'react';
import { listAddonCatalogs, fetchAddonCatalog, type AddonCatalog } from '../lib/addonClient';
import { useAddons } from '../stores/addons';
import Row from './Row';
import type { MediaItem } from '../lib/types';

/* Home rows supplied by installed community catalog add-ons — the client-direct
 * counterpart of appendAddonRows: the browser fetches each add-on's catalog
 * itself and renders it as a rail below the built-in rows. Rows with no art drop out. */

function CatalogRow({ cat, onSelect }: { cat: AddonCatalog; onSelect?: (m: MediaItem) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  useEffect(() => {
    let alive = true;
    fetchAddonCatalog(cat).then((l) => { if (alive) setItems(l); });
    return () => { alive = false; };
  }, [cat.addonId, cat.type, cat.id, cat.base]);
  if (!items.length) return null;
  return <Row title={cat.name} cat={`addon:${cat.addonId}:${cat.type}:${cat.id}`} items={items} onSelect={onSelect} />;
}

export default function AddonRows({ onSelect }: { onSelect?: (m: MediaItem) => void }) {
  const inst = useAddons((s) => s.installed); // recompute when the collection changes
  const cats = useMemo(() => listAddonCatalogs(), [inst]);
  if (!cats.length) return null;
  return <>{cats.map((c, i) => <CatalogRow key={`${c.addonId}-${c.type}-${c.id}-${i}`} cat={c} onSelect={onSelect} />)}</>;
}
