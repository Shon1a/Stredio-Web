import { useState } from 'react';
import { useT } from '../i18n/i18n';
import { useAddons } from '../stores/addons';
import { useHomeConfig, rowOn, type HomeConfig } from '../stores/homeConfig';
import { HOME_ROWS, CATALOG_CATS, PROVIDER_CATS } from '../lib/home';

/* Add-ons — Official (the built-in blocks that gate Home content, toggled +
 * configured via the home-config store) and Community (install-by-URL, browser-
 * direct manifest fetch, synced server-side when signed in). */

type OfficialKey = 'catalog' | 'providers' | 'studios' | 'upcoming';
interface Official { id: OfficialKey; name: string; desc: string; block?: 'catalogRows' | 'providerRows'; cats?: string[] }

const OFFICIAL: Official[] = [
  { id: 'catalog', name: 'Catalog Rows', desc: 'Trending & top-rated movie/show rows on the home screen.', block: 'catalogRows', cats: CATALOG_CATS },
  { id: 'providers', name: 'Streaming Services', desc: 'Netflix, Disney+, Prime, Apple TV+, Max, Paramount+, Crunchyroll rows.', block: 'providerRows', cats: PROVIDER_CATS },
  { id: 'studios', name: 'Studios', desc: 'Browse by studio — Marvel, Pixar, Warner, DC and more.' },
  { id: 'upcoming', name: 'Upcoming Radar', desc: 'The auto-scrolling upcoming movies & series marquee.' },
];

const cardStyle: React.CSSProperties = { border: '1px solid #1e1e1e', borderRadius: 10, padding: 14, background: '#0c0c0c' };
const rowLabel = (cat: string) => HOME_ROWS.find((r) => r.cat === cat)?.key;

export default function Addons() {
  const t = useT();
  const installed = useAddons((s) => s.installed);
  const install = useAddons((s) => s.install);
  const remove = useAddons((s) => s.remove);
  const config = useHomeConfig((s) => s.config);
  const setOfficial = useHomeConfig((s) => s.setOfficial);
  const toggleRow = useHomeConfig((s) => s.toggleRow);

  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [expanded, setExpanded] = useState<OfficialKey | null>(null);

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
          <div className="addon-grid" id="officialAddons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {OFFICIAL.map((a) => {
              const on = config[a.id];
              const rowMap = a.block ? (config[a.block] as HomeConfig['catalogRows']) : undefined;
              return (
                <div className="addon-card" key={a.id} style={cardStyle}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{a.desc}</div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className={on ? 'cat-back' : 'loadmore'} onClick={() => setOfficial(a.id, !on)}>
                      {on ? `✕ ${t('addons.remove')}` : `+ ${t('addons.enable')}`}
                    </button>
                    {on && a.block && (
                      <button className="cat-back" onClick={() => setExpanded(expanded === a.id ? null : a.id)} aria-expanded={expanded === a.id}>
                        {t('addons.configure')} ▾
                      </button>
                    )}
                  </div>
                  {on && a.block && a.cats && expanded === a.id && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {a.cats.map((cat) => {
                        const key = rowLabel(cat);
                        return (
                          <label key={cat} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#ccc' }}>
                            <input type="checkbox" checked={rowOn(rowMap!, cat)} onChange={() => toggleRow(a.block!, cat)} />
                            {key ? t(key) : cat}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
            <div className="addon-grid" id="communityAddons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
              {installed.map((a) => (
                <div className="addon-card" key={a.id} style={cardStyle}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{a.manifest.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{a.manifest.description || a.manifest.id}</div>
                  <button className="cat-back" style={{ marginTop: 10 }} onClick={() => remove(a.id)}>✕ {t('addons.remove')}</button>
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
