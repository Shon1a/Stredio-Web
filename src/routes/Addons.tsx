import { useState } from 'react';
import { useT } from '../i18n/i18n';
import { useAddons } from '../stores/addons';
import { useHomeConfig } from '../stores/homeConfig';
import { useOfficial, type OfficialAddon } from '../stores/official';
import { CATALOG_CATS, PROVIDER_CATS } from '../lib/home';
import ConfigModal, { type ConfigTarget } from '../components/ConfigModal';
import PreviewModal from '../components/PreviewModal';

/* Add-on Catalog — faithful port of the vanilla #addons. The OFFICIAL list is now
 * sourced from the Shon1a/Stredio-official-addons repo via the Stredio-Heart WASM
 * merge (useOfficial store) instead of being hardcoded, so it's the repo's source of
 * truth (and future official add-ons appear automatically). The four protected
 * home-feature ids gate the home blocks (home-config store); any appended official
 * add-on shows as a default metadata provider. Community cards install by URL. */

// the four protected home-feature ids and how catalog/providers map to a home block
const PROTECTED = new Set(['catalog', 'providers', 'studios', 'upcoming']);
const CONFIG_MAP: Record<string, { block: 'catalogRows' | 'providerRows'; cats: string[] }> = {
  catalog: { block: 'catalogRows', cats: CATALOG_CATS },
  providers: { block: 'providerRows', cats: PROVIDER_CATS },
};
type OfficialKey = 'catalog' | 'providers' | 'studios' | 'upcoming';

const PuzzleIcon = (
  <span className="ic" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.6 2.6 0 0 1 0 5.2H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.6 2.6 0 0 1 5.2 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z" /></svg>
  </span>
);

export default function Addons() {
  const t = useT();
  const installed = useAddons((s) => s.installed);
  const install = useAddons((s) => s.install);
  const removeAddon = useAddons((s) => s.remove);
  const config = useHomeConfig((s) => s.config);
  const setOfficial = useHomeConfig((s) => s.setOfficial);
  const official = useOfficial((s) => s.list);

  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [cfg, setCfg] = useState<ConfigTarget | null>(null);
  const [preview, setPreview] = useState<{ id: string; name: string } | null>(null);

  const onInstall = async () => {
    if (!url.trim()) return;
    setBusy(true); setErr('');
    try { await install(url); setUrl(''); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  // t with fallback (missing key → the supplied default rather than the raw key)
  const tf = (key: string, fb: string) => { const v = t(key); return v === key ? fb : v; };
  const isOn = (a: OfficialAddon) => (PROTECTED.has(a.id) ? config[a.id as OfficialKey] : (a.defaultInstalled ?? true));
  const officialOn = official.filter(isOn).length;

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
          <span className="addon-sec-count">{t('addons.count_installed', { n: officialOn, total: official.length })}</span>
        </div>
        <div className="addon-grid" id="officialAddons">
          {official.map((a) => {
            const on = isOn(a);
            const cfgInfo = CONFIG_MAP[a.id];
            const ver = a.ver || (a.version ? 'v' + a.version : '');
            const typeLabel = tf('addon.' + a.id + '.type', (a.kind || '').toUpperCase());
            const desc = tf('addon.' + a.id + '.desc', a.name);
            const tags = a.tags || [];
            return (
              <div className={`addon${on ? ' installed' : ''}`} data-addon={a.id} key={a.id}>
                {PuzzleIcon}
                <div className="body">
                  <div className="name">{a.name} <span className="ver">{ver}</span> <span className={`badge ${on ? 'ok' : 'muted'}`}>{on ? t('addons.installed_tag') : t('addons.available')}</span></div>
                  <div className="desc">{typeLabel ? <><span className="mono">{typeLabel}</span> — </> : null}{desc}</div>
                  <div className="tags">{tags.map((tg) => <span className="tag" key={tg}>{tf('tag.' + tg, tg)}</span>)}</div>
                </div>
                <div className="acts">
                  {a.preview ? (
                    <button className="minibtn" type="button" onClick={() => setPreview({ id: a.id, name: a.name })}>{t('addons.preview')}</button>
                  ) : on && cfgInfo ? (
                    <button className="minibtn" type="button" onClick={() => setCfg({ block: cfgInfo.block, cats: cfgInfo.cats, title: a.name, kicker: t('catalog.modal_kicker') })}>{t('addons.configure')}</button>
                  ) : null}
                  {PROTECTED.has(a.id) ? (
                    <button className={`minibtn ${on ? 'danger' : 'install'}`} type="button" onClick={() => setOfficial(a.id as OfficialKey, !on)}>
                      {on ? t('addons.remove') : t('addons.install_short')}
                    </button>
                  ) : (
                    <span className="minibtn is-default" aria-disabled="true">{t('addons.installed_tag')}</span>
                  )}
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

      {cfg && <ConfigModal target={cfg} onClose={() => setCfg(null)} />}
      {preview && <PreviewModal id={preview.id} name={preview.name} onClose={() => setPreview(null)} />}
    </section>
  );
}
