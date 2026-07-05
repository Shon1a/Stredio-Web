import type { MediaItem } from '../lib/types';
import { useT } from '../i18n/i18n';
import Poster from './Poster';

/* Rail card = the shared Poster tile + a caption line (title, then "★rating · year ·
 * type"), matching the vanilla pcard used on the home rails. */

export interface PosterCardProps {
  item: MediaItem;
  seed: number;
  onSelect?: (item: MediaItem) => void;
}

export default function PosterCard({ item, seed, onSelect }: PosterCardProps) {
  const t = useT();
  const isTv = item.type === 'tv' || item.type === 'series';
  const typeLabel = t(isTv ? 'type.series' : 'type.movie');
  const meta = [
    item.rating ? `★ ${item.rating}` : '',
    item.year ? String(item.year) : '',
    typeLabel,
  ].filter(Boolean).join(' · ');

  return (
    <div className="pcard">
      <Poster item={item} seed={seed} onSelect={onSelect} />
      <div className="cap">
        <div className="t">{item.title}</div>
        <div className="meta mono">{meta}</div>
      </div>
    </div>
  );
}
