import { useState } from 'react';
import type { MediaItem } from '../lib/types';
import { imgW, hueBg, rateClass, rateText } from '../lib/img';
import { useT } from '../i18n/i18n';

/* The bare `.poster` tile (gradient plate + fade-in cover + TV tag + rating badge),
 * shared by the rail card (PosterCard) and the drill-down grid card (GridCard) — the
 * exact `.poster` markup from the vanilla posterHTML. */

export interface PosterProps {
  item: MediaItem;
  seed: number;
  onSelect?: (m: MediaItem) => void;
  /** Continue Watching: 0–1 resume fraction → a thin progress bar at the bottom */
  progress?: number;
  /** Continue Watching: show a corner ✕ that calls this instead of opening the card */
  onRemove?: () => void;
}

export default function Poster({ item, seed, onSelect, progress, onRemove }: PosterProps) {
  const t = useT();
  const [loaded, setLoaded] = useState(false);
  const [broken, setBroken] = useState(false);
  const img = imgW(item.poster || '', 'w342');
  const isTv = item.type === 'tv' || item.type === 'series';
  const pct = progress && progress > 0.01 ? Math.max(0, Math.min(1, progress)) : 0;

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
      {onRemove && (
        <button
          type="button" className="cw-remove"
          aria-label={t('continue.remove')} title={t('continue.remove')}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      )}
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
      {pct > 0 && <div className="cw-progress" aria-hidden="true"><i style={{ width: `${(pct * 100).toFixed(1)}%` }} /></div>}
    </div>
  );
}
