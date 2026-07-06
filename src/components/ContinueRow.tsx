import { useHistory } from '../stores/history';
import { useT } from '../i18n/i18n';
import Poster from './Poster';
import type { MediaItem } from '../lib/types';

/* Continue Watching rail — signed-in only, drawn from the watch-history store.
 * Each card carries a resume progress bar + a corner ✕ (remove), and reopens the
 * detail modal to resume. Port of renderContinueWatching. Hidden when empty. */

export default function ContinueRow({ onSelect }: { onSelect?: (m: MediaItem) => void }) {
  const t = useT();
  const history = useHistory((s) => s.history);
  const progress = useHistory((s) => s.progress);
  const remove = useHistory((s) => s.remove);

  if (!history.length) return null;

  return (
    <div className="strip reveal in" data-row="continue">
      <div className="strip-head"><span className="strip-title static mono">{t('sec.continue')}</span></div>
      <div className="strip-rail">
        <div className="strip-row">
          {history.map((e, i) => {
            const key = e.key || String(e.id);
            const p = progress[key];
            const frac = p && p.dur > 0 ? p.pos / p.dur : 0;
            const item: MediaItem = { id: e.id, type: e.type, title: e.title, year: e.year, rating: e.rating, poster: e.poster, genre: e.genre };
            return (
              <div className="pcard" key={`${e.id}-${i}`}>
                <Poster item={item} seed={i} progress={frac} onRemove={() => remove(e.id)} onSelect={onSelect} />
                <div className="cap">
                  <div className="t">{e.title}</div>
                  <div className="meta mono">{e.ep || e.year || ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
