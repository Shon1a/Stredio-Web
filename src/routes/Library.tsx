import { useT } from '../i18n/i18n';
import { useLibrary } from '../stores/library';
import { useModal, openItem } from '../stores/modal';
import Poster from '../components/Poster';
import type { MediaItem } from '../lib/types';

/* My Space — the account hub; for now it surfaces the watchlist (My List). The
 * continue-watching rail + account card land with auth in Phase 5. */

export default function Library() {
  const t = useT();
  const mylist = useLibrary((s) => s.mylist);
  const openModal = useModal((s) => s.open);
  const onSelect = (item: MediaItem) => openModal(openItem(item));

  return (
    <section className="page active" id="myspace" aria-label={t('myspace.title')}>
      <div className="cat-head">
        <h2 className="cat-title display" tabIndex={-1}>{t('myspace.title')}</h2>
      </div>

      <h4 className="m-rail-label" style={{ padding: '0 var(--page-pad)' }}>{t('myspace.my_list')}</h4>
      {mylist.length ? (
        <div className="grid" id="catGrid">
          {mylist.map((m, i) => (
            <div className="gcard" key={`${m.id}-${i}`}>
              <Poster item={m as MediaItem} seed={i} onSelect={onSelect} />
              <div className="cap">
                <div className="t">{m.title}</div>
                <div className="y mono">{m.year}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: 17, padding: '18px var(--page-pad)' }}>{t('mylist.empty')}</p>
      )}
    </section>
  );
}
