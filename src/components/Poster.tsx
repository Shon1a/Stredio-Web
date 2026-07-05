import { useState } from 'react';
import type { MediaItem } from '../lib/types';
import { imgW, hueBg, rateClass, rateText } from '../lib/img';
import { useT } from '../i18n/i18n';

/* The bare `.poster` tile (gradient plate + fade-in cover + TV tag + rating badge),
 * shared by the rail card (PosterCard) and the drill-down grid card (GridCard) — the
 * exact `.poster` markup from the vanilla posterHTML. */

export default function Poster({ item, seed, onSelect }: { item: MediaItem; seed: number; onSelect?: (m: MediaItem) => void }) {
  const t = useT();
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const img = imgW(item.poster || '', 'w342');
  const isTv = item.type === 'tv' || item.type === 'series';

  const open = () => onSelect?.(item);
  return (
    <div
      className="poster"
      tabIndex={0}
      role="button"
      aria-label={`${item.title} (${item.year ?? ''}) — ${t('poster.view_details')}`}
      onClick={open}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
    >
      <div className="art" style={{ background: hueBg(seed) }}>
        <div className="t">{item.title}</div>
        {img && !broken && (
          <img
            className={loaded ? 'cov rdy' : 'cov'}
            src={img}
            loading="lazy"
            alt={`${item.title} poster`}
            onLoad={() => setLoaded(true)}
            onError={() => setBroken(true)}
          />
        )}
      </div>
      {isTv && <div className="tvtag mono" aria-label="Series">TV</div>}
      <div className={`rate mono ${rateClass(item.rating)}`}>{rateText(item.rating)}</div>
    </div>
  );
}
