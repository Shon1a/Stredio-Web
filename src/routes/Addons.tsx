import { useState } from 'react';
import { useT } from '../i18n/i18n';
import { useAddons } from '../stores/addons';

/* Add-ons — official (built-in home-row toggles) + community (install-by-URL,
 * browser-direct manifest fetch). Local for now; cross-device server sync arrives
 * with auth in Phase 5. The official-collection CDN loader is also a Phase 5/6 item. */

const OFFICIAL = [
  { id: 'catalog', name: 'Catalog Rows', desc: 'Trending & top-rated movie/show rows on the home screen.' },
  { id: 'providers', name: 'Streaming Services', desc: 'Netflix, Disney+, Prime, Apple TV+, Max, Paramount+, Crunchyroll rows.' },
  { id: 'studios', name: 'Studios', desc: 'Browse by studio — Marvel, Pixar, Warner, DC and more.' },
  { id: 'upcoming', name: 'Upcoming Radar', desc: 'The auto-scrolling upcoming movies & series marquee.' },
];

export default function Addons() {
  const t = useT();
  const installed = useAddons((s) => s.installed);
  const install = useAddons((s) => s.install);
  const remove = useAddons((s) => s.remove);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const onInstall = async () => {
    if (!url.trim()) return;
    setBusy(true); setErr('');
    try { await install(url); setUrl(''); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  return (
    <section className="page active" id="addons" aria-label={t('addons.title')}>
      <div className="cat-head">
        <h2 className="cat-title display" tabIndex={-1}>{t('addons.title')}</h2>
      </div>

      <div style={{ padding: '0 var(--page-pad)', display: 'flex', flexDirection: 'column', gap: 26, maxWidth: 900 }}>
        <div>
          <h4 className="m-rail-label">{t('addons.official')}</h4>
          <div className="addon-grid" id="officialAddons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
            {OFFICIAL.map((a) => (
              <div className="addon-card" key={a.id} style={{ border: '1px solid #1e1e1e', borderRadius: 10, padding: 14, background: '#0c0c0c' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{a.desc}</div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#4ea' }}>{t('addons.installed')}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="m-rail-label">{t('addons.community')}</h4>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="url" value={url} placeholder={t('addons.install_ph')}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onInstall(); }}
              style={{ flex: 1, background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 8, padding: '10px 12px' }}
            />
            <button className="loadmore" onClick={onInstall} disabled={busy}>{busy ? t('grid.loading') : t('addons.install')}</button>
          </div>
          {err && <div style={{ color: '#e66', fontSize: 13, marginBottom: 8 }}>{err}</div>}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{t('addons.sync_note')}</div>

          {installed.length ? (
            <div className="addon-grid" id="communityAddons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
              {installed.map((a) => (
                <div className="addon-card" key={a.id} style={{ border: '1px solid #1e1e1e', borderRadius: 10, padding: 14, background: '#0c0c0c' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.manifest.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{a.manifest.description || a.manifest.id}</div>
                  <button className="cat-back" style={{ marginTop: 10 }} onClick={() => remove(a.id)}>✕ {t('mylist.remove').split(' ')[0]}</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{t('addons.none')}</p>
          )}
        </div>
      </div>
    </section>
  );
}
