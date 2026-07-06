import { useHistory } from '../stores/history';
import { useModal } from '../stores/modal';
import { useT } from '../i18n/i18n';
import Poster from './Poster';
import Rail from './Rail';
import type { MediaItem } from '../lib/types';
import type { WatchEntry } from '../stores/history';

/* Continue Watching rail — signed-in only, drawn from the watch-history store.
 * Each card carries a resume progress bar + a corner ✕ (remove), and reopens the
 * detail modal to resume. Port of renderContinueWatching. Hidden when empty. */

export default function ContinueRow({ onSelect: _onSelect }: { onSelect?: (m: MediaItem) => void }) {
  const t = useT();
  const history = useHistory((s) => s.history);
  const progress = useHistory((s) => s.progress);
  const remove = useHistory((s) => s.remove);
  const open = useModal((s) => s.open);

  if (!history.length) return null;

  // reopen the detail modal; for a series, carry the resume episode so OPEN resumes
  // the exact episode (not the show's movie-level key)
  const openEntry = (e: WatchEntry) => {
    const isSeries = (e.type === 'tv' || e.type === 'series') && e.season != null && e.episode != null;
    open({
      id: e.id, type: e.type, title: e.title, year: e.year, rating: e.rating, poster: e.poster, genre: e.genre, seed: 0,
      resumeEp: isSeries ? { season: e.season as number, episode: e.episode as number } : undefined,
    });
  };

  return (
    <div className="strip reveal in" data-row="continue">
      <div className="strip-head"><span className="strip-title static mono">{t('sec.continue')}</span></div>
      <Rail>
        {history.map((e, i) => {
          const key = e.key || String(e.id);
          const p = progress[key];
          const frac = p && p.dur > 0 ? p.pos / p.dur : 0;
          const item: MediaItem = { id: e.id, type: e.type, title: e.title, year: e.year, rating: e.rating, poster: e.poster, genre: e.genre };
          return (
            <div className="pcard" key={`${e.id}-${i}`}>
              <Poster item={item} seed={i} progress={frac} onRemove={() => remove(e.id)} onSelect={() => openEntry(e)} />
              <div className="cap">
                <div className="t">{e.title}</div>
                <div className="meta mono">{e.ep || e.year || ''}</div>
              </div>
            </div>
          );
        })}
      </Rail>
    </div>
  );
}
