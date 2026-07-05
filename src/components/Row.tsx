import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../lib/types';
import PosterCard from './PosterCard';
import { useT } from '../i18n/i18n';

/* Port of railHTML + syncRail + wireRail (assets/js/app.js): a full-bleed
 * horizontal rail with left/right scroll arrows that disable at the ends and a
 * custom scroll-line whose thumb mirrors the scroll position. Same class names
 * (.strip / .strip-rail / .strip-row / .strip-arrow / .strip-scroll) so app.css
 * styles it identically. */

interface RailState {
  atStart: boolean;
  atEnd: boolean;
  hasScroll: boolean;
  thumbW: number;   // %
  thumbLeft: number; // %
}

function useRailScroll(rowRef: React.RefObject<HTMLDivElement | null>, deps: unknown[]) {
  const [s, setS] = useState<RailState>({ atStart: true, atEnd: false, hasScroll: false, thumbW: 0, thumbLeft: 0 });

  const sync = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const span = row.scrollWidth - row.clientWidth; // total scrollable distance
    const max = span - 1;
    if (span <= 0) {
      setS({ atStart: true, atEnd: true, hasScroll: false, thumbW: 0, thumbLeft: 0 });
      return;
    }
    const ratio = row.clientWidth / row.scrollWidth; // visible fraction = thumb width
    const pos = row.scrollLeft / span;               // 0..1 along the track
    setS({
      atStart: row.scrollLeft <= 0,
      atEnd: row.scrollLeft >= max,
      hasScroll: true,
      thumbW: ratio * 100,
      thumbLeft: pos * (100 - ratio * 100),
    });
  }, [rowRef]);

  useEffect(() => {
    sync();
    const row = rowRef.current;
    if (!row) return;
    row.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      row.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync, ...deps]);

  const scrollByDir = (dir: number) => {
    const row = rowRef.current;
    if (!row) return;
    const amt = Math.max(row.clientWidth * 0.8, 174); // ~poster(160)+gap(14) minimum
    row.scrollBy({ left: dir * amt, behavior: 'smooth' });
  };

  return { s, scrollByDir };
}

const ChevL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 5 8 12 15 19" /></svg>
);
const ChevR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 5 16 12 9 19" /></svg>
);

export interface RowProps {
  title: string;
  cat: string;
  items: MediaItem[];
  onSelect?: (item: MediaItem) => void;
  onSeeAll?: (cat: string) => void;
}

export default function Row({ title, cat, items, onSelect, onSeeAll }: RowProps) {
  const t = useT();
  const rowRef = useRef<HTMLDivElement>(null);
  const { s, scrollByDir } = useRailScroll(rowRef, [items]);

  if (!items.length) return null; // a category that returned nothing drops out

  return (
    <div className="strip reveal in" data-row={cat}>
      <div className="strip-head">
        <button
          className="strip-title mono"
          type="button"
          data-cat={cat}
          onClick={() => onSeeAll?.(cat)}
          aria-label={`${title} — ${t('cat.see_all')}`}
        >
          {title} <span className="arr" aria-hidden="true" />
        </button>
      </div>
      <div className="strip-rail">
        <button className="strip-arrow l" data-dir="-1" disabled={s.atStart} aria-label={t('ui.scroll_left')} onClick={() => scrollByDir(-1)}>{ChevL}</button>
        <div className="strip-row" ref={rowRef}>
          {items.map((m, i) => (
            <PosterCard key={`${m.id}-${i}`} item={m} seed={i} onSelect={onSelect} />
          ))}
        </div>
        <button className="strip-arrow r" data-dir="1" disabled={s.atEnd} aria-label={t('ui.scroll_right')} onClick={() => scrollByDir(1)}>{ChevR}</button>
        <div className="strip-scroll" hidden={!s.hasScroll} aria-hidden="true">
          <div className="strip-scroll-thumb" style={{ width: `${s.thumbW}%`, left: `${s.thumbLeft}%` }} />
        </div>
      </div>
    </div>
  );
}
