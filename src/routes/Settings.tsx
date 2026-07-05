import { useT, useLang } from '../i18n/i18n';
import { useSettings } from '../stores/settings';

/* Settings — interface (language), playback (auto-play next), and subtitles
 * (size + live preview). Persisted via the settings store. A focused, functional
 * subset of the vanilla #settings page. */

export default function Settings() {
  const t = useT();
  const { lang, setLang, languages } = useLang();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);

  return (
    <section className="page active" id="settings" aria-label={t('settings.title')}>
      <div className="cat-head">
        <h2 className="cat-title display" tabIndex={-1}>{t('settings.title')}</h2>
      </div>

      <div className="settings-wrap" style={{ padding: '0 var(--page-pad)', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div>
          <h4 className="m-rail-label">{t('settings.interface')}</h4>
          <label className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
            <span>{t('settings.language')}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ background: '#111', color: '#fff', border: '1px solid #333', borderRadius: 6, padding: '6px 10px' }}>
              {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </label>
          <label className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
            <span>{t('settings.blur_unwatched')}</span>
            <input type="checkbox" checked={settings.blurUnwatched} onChange={(e) => update({ blurUnwatched: e.target.checked })} />
          </label>
        </div>

        <div>
          <h4 className="m-rail-label">{t('settings.playback')}</h4>
          <label className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
            <span>{t('settings.autoplay_next')}</span>
            <input type="checkbox" checked={settings.autoplayNext} onChange={(e) => update({ autoplayNext: e.target.checked })} />
          </label>
        </div>

        <div>
          <h4 className="m-rail-label">{t('settings.subtitles')}</h4>
          <label className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '12px 0' }}>
            <span>{t('settings.sub_size')}</span>
            <input type="range" min={70} max={160} step={5} value={settings.subSize} onChange={(e) => update({ subSize: +e.target.value })} />
          </label>
          <div style={{ position: 'relative', height: 90, background: '#000', border: '1px solid #1a1a1a', borderRadius: 8, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
            <span style={{ fontSize: `${settings.subSize / 100 * 22}px`, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.9)', fontWeight: 600 }}>
              {t('settings.sub_preview')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
