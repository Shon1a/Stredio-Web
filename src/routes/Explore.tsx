import { useEffect, useMemo, useRef, useState } from 'react';
import { useT, useGenre } from '../i18n/i18n';
import { useGenres } from '../lib/queries';
import { useModal, openItem } from '../stores/modal';
import CatalogGrid from '../components/CatalogGrid';
import type { GridDesc } from '../lib/grid';
import type { MediaItem } from '../lib/types';

/* Explore — the dedicated search page: one centred search field, a filter panel
 * (type pills · genre pills · year/rating sliders), and results in a larger-card
 * grid. Port of the #explore markup + openSearch/openFilter/applyFilters. With no
 * query and no active filter it shows trending, so the page is never blank. */

type TypeFilter = 'all' | 'movie' | 'tv';

export default function Explore() {
  const t = useT();
  const genreT = useGenre();
  const openModal = useModal((s) => s.open);
  const { data: genresData } = useGenres();

  const [raw, setRaw] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [genre, setGenre] = useState<string>('');
  const [year, setYear] = useState(1970);
  const [rating, setRating] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // debounce the search box
  useEffect(() => { const id = setTimeout(() => setQuery(raw.trim()), 300); return () => clearTimeout(id); }, [raw]);

  const desc: GridDesc = useMemo(() => {
    if (query) return { kind: 'search', query, type, title: t('explore.results', { q: query }) };
    const filters: Record<string, string> = {};
    if (genre) filters.genre = genre;
    if (year > 1970) filters.yearGte = String(year);
    if (rating > 0) filters.ratingGte = String(rating);
    if (Object.keys(filters).length || type !== 'all') {
      filters.type = type === 'tv' ? 'tv' : 'movie';
      return { kind: 'filter', filters, title: t('cat.filtered') };
    }
    return { kind: 'category', cat: 'trending_movie', title: t('explore.trending') };
  }, [query, type, genre, year, rating, t]);

  const onSelect = (item: MediaItem) => openModal(openItem(item));
  const clearAll = () => { setType('all'); setGenre(''); setYear(1970); setRating(0); };

  return (
    <section className="page active" id="explore" aria-label="Explore">
      <div className="search explore-search" role="search">
        <span className="search-lead" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </span>
        <input
          id="searchInput" ref={inputRef} type="search" autoComplete="off" spellCheck={false}
          aria-label={t('search.aria')} placeholder={t('search.ph')}
          value={raw} onChange={(e) => setRaw(e.target.value)}
        />
        <button className="filter-toggle" id="filterToggle" aria-expanded={filterOpen} aria-controls="filterPanel" title="Filters" aria-label="Toggle filters" onClick={() => setFilterOpen((v) => !v)}>☰</button>

        <div className={`filter-panel${filterOpen ? ' open' : ''}`} id="filterPanel">
          <div className="fp-row">
            <div className="k">{t('filter.type')}</div>
            <div className="pills" id="typePills">
              {(['all', 'movie', 'tv'] as TypeFilter[]).map((ty) => (
                <button key={ty} className={`pill-btn${type === ty ? ' on' : ''}`} type="button" onClick={() => setType(ty)}>
                  {t(ty === 'all' ? 'filter.all' : ty === 'movie' ? 'filter.movies' : 'filter.series')}
                </button>
              ))}
            </div>
          </div>
          <div className="fp-row">
            <div className="k">{t('filter.genre')}</div>
            <div className="pills" id="genrePills">
              {(genresData?.genres ?? []).map((g) => (
                <button key={g} className={`pill-btn${genre === g ? ' on' : ''}`} type="button" data-genre={g} onClick={() => setGenre(genre === g ? '' : g)}>
                  {genreT(g)}
                </button>
              ))}
            </div>
          </div>
          <div className="fp-row">
            <div className="k"><label htmlFor="yr">{t('filter.year')}</label></div>
            <div>
              <input type="range" min={1970} max={2025} value={year} id="yr" onChange={(e) => setYear(+e.target.value)} aria-label="Release year from" />
              <span className="fp-out" id="yrOut">{year > 1970 ? year : t('filter.any_year')}</span>
            </div>
          </div>
          <div className="fp-row">
            <div className="k"><label htmlFor="rt">{t('filter.rating')}</label></div>
            <div>
              <input type="range" min={0} max={10} step={0.5} value={rating} id="rt" onChange={(e) => setRating(+e.target.value)} aria-label="Minimum rating" />
              <span className="fp-out" id="rtOut">{rating > 0 ? `★ ${rating}+` : t('filter.any_rating')}</span>
            </div>
          </div>
          <div className="fp-foot"><a className="clearall" role="button" tabIndex={0} onClick={clearAll}>{t('filter.clear')}</a></div>
        </div>
      </div>

      <div className="explore-body">
        <h2 className="explore-status" id="exploreStatus" aria-live="polite">{desc.title}</h2>
        <CatalogGrid desc={desc} host="explore" onSelect={onSelect} />
      </div>
    </section>
  );
}
