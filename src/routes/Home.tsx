import { useNavigate } from 'react-router-dom';
import { useHome } from '../lib/queries';
import { useT } from '../i18n/i18n';
import { HOME_ROWS } from '../lib/home';
import Row from '../components/Row';
import Hero from '../components/Hero';
import UpcomingMarquee from '../components/UpcomingMarquee';
import StudioRow from '../components/StudioRow';
import ContinueRow from '../components/ContinueRow';
import { useModal, openItem } from '../stores/modal';
import { useLibrary } from '../stores/library';
import type { MediaItem } from '../lib/types';

/* Home = the featured hero + the categorised rows. This Phase-1 pass ships the
 * real rows (via /api/home) with faithful PosterCards and rail scrolling. The
 * Hero, the Upcoming marquee, Continue Watching and add-on rows are the
 * Phase-1b / Phase-4 follow-ups noted below. */

export default function Home() {
  const t = useT();
  const { data, isLoading, isError, error } = useHome();
  const openModal = useModal((s) => s.open);
  const nav = useNavigate();
  const toggleList = useLibrary((s) => s.toggle);
  const onSelect = (item: MediaItem) => openModal(openItem(item));
  const onAdd = (item: MediaItem) => toggleList({ id: item.id, type: item.type, title: item.title, year: item.year, rating: item.rating, poster: item.poster });
  const onSeeAll = (cat: string) => nav(`/browse/${cat}`);

  if (isLoading) return <section className="page active" id="browse"><p style={{ padding: 24, color: '#888' }}>{t('common.loading')}</p></section>;
  if (isError) {
    return (
      <section className="page active" id="browse">
        <div style={{ padding: 24, color: '#e66' }}>
          <p>Could not reach /api/home.</p>
          <pre style={{ color: '#a55', fontSize: 12 }}>{String(error)}</pre>
          <p style={{ color: '#666', fontSize: 12 }}>Start the backend (or set VITE_API_BASE) — the pipe is wired.</p>
        </div>
      </section>
    );
  }

  const rows = data?.rows ?? {};
  const heroItems = (data?.hero?.results ?? []).filter((m) => m.backdrop || m.poster);
  const upMovies = data?.upcoming?.movie ?? [];
  const upSeries = data?.upcoming?.series ?? [];

  return (
    <section className="page active" id="browse" aria-label="Browse catalog">
      <div id="home">
        {heroItems.length > 0 && <Hero items={heroItems} onPlay={onSelect} onAdd={onAdd} />}
        <UpcomingMarquee movies={upMovies} series={upSeries} onSelect={onSelect} onSeeAll={onSeeAll} />
        <ContinueRow onSelect={onSelect} />
        <div id="strips">
          {HOME_ROWS.map((row) => {
            const list = (rows[row.cat]?.results ?? []).filter((m) => m.poster);
            if (!list.length) return null;
            return (
              <Row
                key={row.cat}
                cat={row.cat}
                title={t(row.key)}
                items={list}
                onSelect={onSelect}
                onSeeAll={onSeeAll}
              />
            );
          })}
          {/* Studios logo row — after the category/provider rows, as in the vanilla layout */}
          <StudioRow onOpen={(key) => nav(`/browse/studio:${key}`)} />
        </div>
      </div>
    </section>
  );
}
