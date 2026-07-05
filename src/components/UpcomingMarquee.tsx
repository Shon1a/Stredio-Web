import { useEffect, useMemo, useRef, useState } from 'react';
import type { MediaItem } from '../lib/types';
import { imgW } from '../lib/img';
import { useT, useGenre } from '../i18n/i18n';

/* Port of the Upcoming marquee (assets/js/app.js: upcomingCardHTML / fillUpcoming
 * / startUpcomingAnim). Two auto-scrolling strips — movies (right→left) above,
 * series (left→right via .um-rev) below — each a seamless WAAPI loop whose period
 * is one content copy's width, so speed stays constant regardless of title count.
 * Pauses on hover/focus; respects prefers-reduced-motion. Same class names so
 * app.css styles it identically. */

const UM_SPEED = 130;   // px/sec
const UM_UNIT = 188 + 14; // card width + gap
const GAP = 14;

function UpcomingCard({ item, onSelect }: { item: MediaItem; onSelect?: (m: MediaItem) => void }) {
  const t = useT();
  const genre = useGenre();
  const [broken, setBroken] = useState(false);
  // 188×112 landscape card → w342 backdrop is sharp and ~73% lighter than original
  const img = imgW(item.backdrop || '', 'w342') || item.poster || '';

  return (
    <div
      className="upcoming-card"
      tabIndex={0}
      role="button"
      aria-label={`${item.title} (${item.year ?? ''}) — ${t('poster.view_details')}`}
      onClick={() => onSelect?.(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(item); } }}
    >
      {img && !broken
        ? <img src={img} loading="lazy" alt="" onError={() => setBroken(true)} />
        : <div className="uc-fallback">{item.title}</div>}
      <div className="uc-grad" />
      <div className="uc-meta">
        <span className="uc-title">{item.title}</span>
        <div className="uc-info">
          <span>{item.year}</span>
          {item.genre ? <span className="uc-genre">{genre(item.genre)}</span> : null}
        </div>
      </div>
    </div>
  );
}

function MarqueeRow({ list, rev, id, onSelect }: { list: MediaItem[]; rev: boolean; id: string; onSelect?: (m: MediaItem) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Repeat a short list until one copy spans the viewport, then render it TWICE
  // so the -period wrap is seamless.
  const cards = useMemo(() => {
    if (!list.length) return [];
    const need = Math.ceil((window.innerWidth || 1280) / UM_UNIT) + 1;
    let copy = list.slice();
    while (copy.length < need) copy = copy.concat(list);
    return [...copy, ...copy];
  }, [list]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let anim: Animation | null = null;
    const start = () => {
      if (track.offsetParent === null) return; // hidden → can't measure
      const copyW = (track.scrollWidth - GAP) / 2;
      const period = copyW + GAP;
      if (copyW <= 0) return;
      anim = track.animate(
        [{ transform: 'translateX(0)' }, { transform: `translateX(-${period}px)` }],
        { duration: (period / UM_SPEED) * 1000, iterations: Infinity, easing: 'linear', direction: rev ? 'reverse' : 'normal' },
      );
    };
    const raf = requestAnimationFrame(start);

    // pause while the rail is hovered / focused so a card can be read or clicked
    const rail = track.closest<HTMLElement>('.um-rail');
    const pause = () => anim?.pause();
    const play = () => { if (anim && !rail?.matches(':hover, :focus-within')) anim.play(); };
    rail?.addEventListener('mouseenter', pause);
    rail?.addEventListener('mouseleave', play);
    rail?.addEventListener('focusin', pause);
    rail?.addEventListener('focusout', play);

    return () => {
      cancelAnimationFrame(raf);
      anim?.cancel();
      rail?.removeEventListener('mouseenter', pause);
      rail?.removeEventListener('mouseleave', play);
      rail?.removeEventListener('focusin', pause);
      rail?.removeEventListener('focusout', play);
    };
  }, [cards, rev]);

  if (!list.length) return null;
  return (
    <div className="um-rail">
      <div className={`um-track${rev ? ' um-rev' : ''}`} id={id} ref={trackRef}>
        {cards.map((m, i) => <UpcomingCard key={`${m.id}-${i}`} item={m} onSelect={onSelect} />)}
      </div>
    </div>
  );
}

export interface UpcomingMarqueeProps {
  movies: MediaItem[];
  series: MediaItem[];
  onSelect?: (m: MediaItem) => void;
  onSeeAll?: (cat: string) => void;
}

export default function UpcomingMarquee({ movies, series, onSelect, onSeeAll }: UpcomingMarqueeProps) {
  const t = useT();
  // covers always need art so the landscape cards render
  const m = movies.filter((x) => x.backdrop || x.poster);
  const s = series.filter((x) => x.backdrop || x.poster);
  if (!m.length && !s.length) return null;

  return (
    <div id="upcomingRow">
      {m.length > 0 && (
        <div className="strip reveal in" data-row="upcoming-movie">
          <div className="strip-head">
            <button
              className="strip-title mono"
              type="button"
              data-cat="upcoming_movie"
              onClick={() => onSeeAll?.('upcoming_movie')}
              aria-label={`${t('sec.upcoming_movies')} — ${t('cat.see_all')}`}
            >
              {t('sec.upcoming_movies')} <span className="arr" aria-hidden="true" />
            </button>
          </div>
          <MarqueeRow list={m} rev={false} id="umTrack" onSelect={onSelect} />
        </div>
      )}
      {s.length > 0 && (
        <div className="strip reveal in" data-row="upcoming-series">
          <MarqueeRow list={s} rev id="umTrack2" onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}
