import { useNavigate, useParams } from 'react-router-dom';
import { useT } from '../i18n/i18n';
import { useModal, openItem } from '../stores/modal';
import { HOME_ROWS, STUDIOS } from '../lib/home';
import CatalogGrid from '../components/CatalogGrid';
import type { GridDesc } from '../lib/grid';
import type { MediaItem } from '../lib/types';

/* Browse drill-down — the full paginated grid for one category, reached from a
 * row's "see all" or the rail's TV/Movies/Anime surfaces. Port of the #catview
 * markup (cat-head + back button + grid). */

// title for a category: prefer its home-row label, else prettify the slug
function titleFor(cat: string, t: (k: string) => string): string {
  const row = HOME_ROWS.find((r) => r.cat === cat);
  if (row) return t(row.key);
  const extra: Record<string, string> = {
    upcoming_movie: 'sec.upcoming_movies',
    trending_tv: 'nav.tv_shows', trending_movie: 'nav.movies', trending_anime: 'nav.anime',
  };
  if (extra[cat]) return t(extra[cat]);
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* topLevel = a primary rail destination (TV / Movies / Anime): a plain section title
 * with the larger explore-grid cards and NO back button. Otherwise a drill-down
 * (reached from "see all"): the #catview cat-head with a Back button + the grid. */
export default function Browse({ cat: catProp, topLevel }: { cat?: string; topLevel?: boolean }) {
  const t = useT();
  const nav = useNavigate();
  const params = useParams();
  const openModal = useModal((s) => s.open);
  const cat = catProp || params.cat || 'trending_movie';
  // studio drill-down: cat === "studio:<key>"
  const isStudio = cat.startsWith('studio:');
  const studioKey = isStudio ? cat.slice('studio:'.length) : '';
  const title = isStudio ? (STUDIOS.find((s) => s.key === studioKey)?.name || studioKey) : titleFor(cat, t);
  const desc: GridDesc = isStudio
    ? { kind: 'studio', studio: studioKey, title }
    : { kind: 'category', cat, title };
  const onSelect = (item: MediaItem) => openModal(openItem(item));

  if (topLevel) {
    return (
      <section className="page active" id="browse" aria-label={title}>
        <h2 className="section-title display" style={{ padding: '0 var(--page-pad)' }}>{title}</h2>
        <div className="explore-body">
          <CatalogGrid desc={desc} host="explore" onSelect={onSelect} />
        </div>
      </section>
    );
  }

  return (
    <section className="page active" id="browse" aria-label={title}>
      <div id="catview">
        <div className="cat-head">
          <button className="cat-back" type="button" aria-label="Back" onClick={() => nav(-1)}>
            <span className="cat-back-ic" aria-hidden="true">←</span> <span>{t('cat.back')}</span>
          </button>
          <h2 className="cat-title display" id="catTitle" tabIndex={-1}>{title}</h2>
        </div>
        <CatalogGrid desc={desc} host="cat" onSelect={onSelect} />
      </div>
    </section>
  );
}
