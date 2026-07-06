import { useState } from 'react';
import { useT } from '../i18n/i18n';
import { useAddons } from '../stores/addons';
import { useHomeConfig, rowOn, type HomeConfig } from '../stores/homeConfig';
import { HOME_ROWS, CATALOG_CATS, PROVIDER_CATS } from '../lib/home';

/* Add-on Catalog — faithful port of the vanilla #addons: .section-title.addons-head
 * (puzzle mark) + .section-sub, then two .addon-section blocks (Official / Community)
 * of .addon cards with .ic/.body/.name/.ver/.badge/.desc/.tags/.acts/.minibtn, and an
 * .install-box. Official cards toggle the home blocks (home-config store) + expose
 * per-row config; Community cards install by URL (browser-direct) + sync when signed in. */

type OfficialKey = 'catalog' | 'providers' | 'studios' | 'upcoming';
interface Official { id: OfficialKey; name: string; ver: string; type: string; desc: string; tags: string[]; block?: 'catalogRows' | 'providerRows'; cats?: string[] }

const OFFICIAL: Official[] = [
  { id: 'catalog', name: 'Catalog Rows', ver: '1.0', type: 'CATALOG', desc: 'Trending & top-rated movie and show rows on the home screen.', tags: ['Movies', 'Series'], block: 'catalogRows', cats: CATALOG_CATS },
  { id: 'providers', name: 'Streaming Services', ver: '1.0', type: 'CATALOG', desc: 'Netflix, Disney+, Prime, Apple TV+, Max, Paramount+, Crunchyroll rows.', tags: ['Providers'], block: 'providerRows', cats: PROVIDER_CATS },
  { id: 'studios', name: 'Studios', ver: '1.0', type: 'CATALOG', desc: 'Browse by studio — Marvel, Pixar, Warner, DC and more.', tags: ['Studios'] },
  { id: 'upcoming', name: 'Upcoming Radar', ver: '1.0', type: 'CATALOG', desc: 'The auto-scrolling upcoming movies & series marquee.', tags: ['Upcoming'] },
];

const PuzzleIcon = (
  <span className="ic" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h4V5a2 2 0 1 1 4 0v2h4a1 1 0 0 1 1 1v4h2a2 2 0 1 1 0 4h-2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 1 0-4 0v2H5a1 1 0 0 1-1-1v-4h2a2 2 0 1 0 0-4H4z" /></svg>
  </span>
);

export default function Addons() {
  const t = useT();
  const installed = useAddons((s) => s.installed);
  const install = useAddons((s) => s.install);
  const removeAddon = useAddons((s) => s.remove);
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

  const officialOn = OFFICIAL.filter((a) => config[a.id]).length;
  const rowLabel = (cat: string) => HOME_ROWS.find((r) => r.cat === cat)?.key;

  return (
    <section className="page active" id="addons" aria-label={t('addons.title')}>
      <h2 className="section-title display addons-head">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 30, height: 30 }}><path d="M4 7h4V5a2 2 0 1 1 4 0v2h4a1 1 0 0 1 1 1v4h2a2 2 0 1 1 0 4h-2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 1 0-4 0v2H5a1 1 0 0 1-1-1v-4h2a2 2 0 1 0 0-4H4z" /></svg>
        <span>{t('addons.title')}</span>
      </h2>
      <p className="section-sub">
        <span>{t('addons.sub')}</span>{' '}
        <span className="mono" style={{ color: 'var(--accent)' }}>{t('addons.installed_count', { n: officialOn + installed.length })}</span>
      </p>

      {/* Official */}
      <div className="addon-section">
        <div className="addon-sec-head">
          <h3 className="addon-sec-title">{t('addons.official_head')}</h3>
          <span className="addon-sec-count">{t('addons.count_installed', { n: officialOn, total: OFFICIAL.length })}</span>
        </div>
        <div className="addon-grid" id="officialAddons">
          {OFFICIAL.map((a) => {
            const on = config[a.id];
            const rowMap = a.block ? (config[a.block] as HomeConfig['catalogRows']) : undefined;
            return (
              <div className={`addon${on ? ' installed' : ''}`} data-addon={a.id} key={a.id}>
                {PuzzleIcon}
                <div className="body">
                  <div className="name">{a.name} <span className="ver">{a.ver}</span> <span className={`badge ${on ? 'ok' : 'muted'}`}>{on ? t('addons.installed_tag') : t('addons.available')}</span></div>
                  <div className="desc"><span className="mono">{a.type}</span> — {a.desc}</div>
                  <div className="tags">{a.tags.map((tg) => <span className="tag" key={tg}>{tg}</span>)}</div>
                  {on && a.block && a.cats && expanded === a.id && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {a.cats.map((cat) => {
                        const key = rowLabel(cat);
                        return (
                          <label key={cat} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                            <input type="checkbox" checked={rowOn(rowMap!, cat)} onChange={() => toggleRow(a.block!, cat)} />
                            {key ? t(key) : cat}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="acts">
                  {on && a.block && (
                    <button className="minibtn" type="button" onClick={() => setExpanded(expanded === a.id ? null : a.id)} aria-expanded={expanded === a.id}>{t('addons.configure')}</button>
                  )}
                  <button className={`minibtn ${on ? 'danger' : 'install'}`} type="button" onClick={() => setOfficial(a.id, !on)}>
                    {on ? t('addons.remove') : t('addons.install_short')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="addon-divider" aria-hidden="true" />

      {/* Community */}
      <div className="addon-section">
        <div className="addon-sec-head">
          <h3 className="addon-sec-title">{t('addons.community_head')}</h3>
          <span className="addon-sec-count">{t('addons.count_installed', { n: installed.length, total: installed.length })}</span>
        </div>
        <p className="addon-sec-disclaimer">{t('addons.community_disclaimer')}</p>
        <div className="addon-grid" id="communityAddons">
          {installed.map((a) => (
            <div className="addon installed" data-addon={a.id} key={a.id}>
              {PuzzleIcon}
              <div className="body">
                <div className="name">{a.manifest.name} <span className="ver">{a.manifest.version || ''}</span> <span className="badge ok">{t('addons.installed_tag')}</span></div>
                <div className="desc">{a.manifest.description || a.manifest.id}</div>
                <div className="tags">{(a.manifest.types || []).map((tp) => <span className="tag" key={String(tp)}>{String(tp)}</span>)}</div>
              </div>
              <div className="acts">
                <button className="minibtn danger" type="button" onClick={() => removeAddon(a.id)}>{t('addons.remove')}</button>
              </div>
            </div>
          ))}
        </div>
        {!installed.length && <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{t('addons.none')}</p>}
        <div className="mono" style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{t('addons.sync_note')}</div>
      </div>

      <h4 style={{ fontSize: 16, letterSpacing: '.18em', color: 'var(--text-muted)', margin: '38px 0 12px' }}>{t('addons.install_head')}</h4>
      <div className="install-box">
        <input
          placeholder="https://example.com/manifest.json" value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onInstall(); }}
        />
        <button className="enter" style={{ border: '1px solid var(--accent)', borderRadius: 4 }} onClick={onInstall} disabled={busy}>
          {busy ? t('grid.loading') : t('addons.install_btn')}
        </button>
      </div>
      {err && <div style={{ color: '#e66', fontSize: 13, marginTop: 8 }}>{err}</div>}
      <div className="mono" style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{t('addons.install_eg')}</div>
    </section>
  );
}
