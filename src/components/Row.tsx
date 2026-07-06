import type { MediaItem } from '../lib/types';
import PosterCard from './PosterCard';
import Rail from './Rail';
import { useT } from '../i18n/i18n';

/* A home rail: a header (with the "see all" title) + the shared Rail of PosterCards.
 * Same .strip / .strip-head / .strip-title markup so app.css styles it identically. */

export interface RowProps {
  title: string;
  cat: string;
  items: MediaItem[];
  onSelect?: (item: MediaItem) => void;
  onSeeAll?: (cat: string) => void;
}

export default function Row({ title, cat, items, onSelect, onSeeAll }: RowProps) {
  const t = useT();
  if (!items.length) return null;
  return (
    <div className="strip reveal in" data-row={cat}>
      <div className="strip-head">
        <button className="strip-title mono" type="button" data-cat={cat} onClick={() => onSeeAll?.(cat)} aria-label={`${title} — ${t('cat.see_all')}`}>
          {title} <span className="arr" aria-hidden="true" />
        </button>
      </div>
      <Rail>{items.map((m, i) => <PosterCard key={`${m.id}-${i}`} item={m} seed={i} onSelect={onSelect} />)}</Rail>
    </div>
  );
}
