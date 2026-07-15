import { useT, useLang } from '../i18n/i18n';
import { useSettings, type Settings as S } from '../stores/settings';
import ColorPicker from '../components/ColorPicker';

/* Settings — faithful port of the vanilla #settings: a 5-card .settings-grid
 * (Interface / Auto-play / Player·Subtitles / Playback preferences / Advanced) with
 * .set-card / .setting-row / .sw toggle switches / .sub-preview / .set-note. All
 * controls persist to the settings store. */

const icons = {
  interface: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 20h8M12 17v3" /></svg>,
  autoplay: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5.5 3.5L10 15.5z" fill="currentColor" stroke="none" /></svg>,
  player: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 14h4M14 14h3M7 11h2M12 11h5" /></svg>,
  playback: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h8M16 8h4M4 16h4M12 16h8" /><circle cx="14" cy="8" r="2.3" /><circle cx="10" cy="16" r="2.3" /></svg>,
  advanced: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M13 15h4" /></svg>,
};

function Card({ icon, head, desc, children }: { icon: React.ReactNode; head: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="set-card">
      <div className="set-card-head">
        <span className="set-ic" aria-hidden="true">{icon}</span>
        <div className="txt">
          <h4 className="set-card-title">{head}</h4>
          <p className="set-card-desc">{desc}</p>
        </div>
      </div>
      <div className="set-card-body">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <span className="sw"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} /><span className="sw-track" /></span>;
}

export default function Settings() {
  const t = useT();
  const { lang, setLang, languages } = useLang();
  const settings = useSettings((s) => s.settings);
  const update = useSettings((s) => s.update);
  const set = <K extends keyof S>(k: K) => (v: S[K]) => update({ [k]: v } as Partial<S>);

  // subtitle preview outline (approximated with 4-corner text shadows)
  const ow = settings.subOutlineW;
  const oc = settings.subOutline;
  const outline = ow > 0
    ? `${-ow}px ${-ow}px 0 ${oc}, ${ow}px ${-ow}px 0 ${oc}, ${-ow}px ${ow}px 0 ${oc}, ${ow}px ${ow}px 0 ${oc}`
    : 'none';

  return (
    <section className="page active" id="settings" aria-label={t('settings.title')}>
      <h2 className="section-title display">{t('settings.title')}</h2>
      <p className="section-sub">{t('settings.sub')}</p>

      <div className="settings-grid">
        <Card icon={icons.interface} head={t('settings.interface_head')} desc={t('settings.interface_desc')}>
          <div className="setting-row">
            <label>{t('settings.website_language')}</label>
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
              {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
          <div className="setting-row">
            <label>{t('settings.blur_unwatched')}</label>
            <Toggle checked={settings.blurUnwatched} onChange={set('blurUnwatched')} label={t('settings.blur_unwatched')} />
          </div>
        </Card>

        <Card icon={icons.autoplay} head={t('settings.autoplay_head')} desc={t('settings.autoplay_desc')}>
          <div className="setting-row">
            <label>{t('settings.autoplay_next')}</label>
            <Toggle checked={settings.autoplayNext} onChange={set('autoplayNext')} label={t('settings.autoplay_next')} />
          </div>
          <div className="setting-row">
            <label>{t('settings.next_popup')}</label>
            <div className="ctl-group">
              <select value={settings.nextPopup} onChange={(e) => update({ nextPopup: +e.target.value })} aria-label={t('settings.next_popup')}>
                {[5, 10, 15, 20, 30, 35, 45, 60].map((n) => <option key={n} value={n}>{n} seconds</option>)}
              </select>
              <span className="clock-ring" aria-hidden="true" />
            </div>
          </div>
        </Card>

        <Card icon={icons.player} head={t('settings.player_head')} desc={t('settings.player_desc')}>
          <div className="set-subhead">{t('settings.group_subtitles')}</div>
          <div className="setting-row">
            <label>{t('settings.sub_lang')}</label>
            <select value={settings.subLang} onChange={(e) => update({ subLang: e.target.value as S['subLang'] })} aria-label={t('settings.sub_lang')}>
              <option value="off">{t('settings.sub_off')}</option>
              <option value="en">{t('settings.opt_english')}</option>
              <option value="ka">ქართული</option>
              <option value="ru">Русский</option>
            </select>
          </div>

          <div className="set-subhead">{t('settings.group_appearance')}</div>
          <div className="sub-preview">
            <div className="sp-label">{t('settings.preview')}</div>
            <div className="sp-line">
              <span className="sp-cue" style={{ fontSize: `${(settings.subSize / 100) * 20}px`, color: settings.subColor, background: settings.subBg, textShadow: outline, padding: '2px 8px', borderRadius: 3 }}>
                {t('settings.preview_text')}
              </span>
            </div>
          </div>

          <div className="set-subhead">{t('settings.group_controls')}</div>
          <div className="setting-row">
            <label>{t('settings.sub_size')}</label>
            <select value={settings.subSize} onChange={(e) => update({ subSize: +e.target.value })} aria-label={t('settings.sub_size')}>
              {[75, 90, 100, 115, 130, 150, 175, 200].map((n) => <option key={n} value={n}>{n}%</option>)}
            </select>
          </div>
          <div className="setting-row">
            <label>{t('settings.sub_color')}</label>
            <ColorPicker value={settings.subColor} onChange={set('subColor')} label={t('settings.sub_color')} />
          </div>
          <div className="setting-row">
            <label>{t('settings.sub_bg')}</label>
            <div className="ctl-group">
              <span className="swatch" style={{ background: settings.subBg }} aria-hidden="true" />
              <select value={settings.subBg} onChange={(e) => update({ subBg: e.target.value })} aria-label={t('settings.sub_bg')}>
                <option value="transparent">{t('settings.transparent')}</option>
                <option value="rgba(0,0,0,.6)">{t('settings.bg_dim')}</option>
                <option value="#000000">{t('settings.bg_black')}</option>
                <option value="#ffffff">{t('settings.bg_white')}</option>
              </select>
            </div>
          </div>
          <div className="setting-row">
            <label>{t('settings.sub_outline')}</label>
            <div className="ctl-group">
              <ColorPicker value={settings.subOutline} onChange={set('subOutline')} label={t('settings.sub_outline')} />
              <select className="set-outline-w" value={settings.subOutlineW} onChange={(e) => update({ subOutlineW: +e.target.value })} aria-label={t('settings.sub_outline_w')}>
                {[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card icon={icons.playback} head={t('settings.playback_head')} desc={t('settings.playback_desc')}>
          <div className="setting-row">
            <label>{t('settings.auto_quality')}</label>
            <select className="sel-signal" value={settings.autoQuality} onChange={(e) => update({ autoQuality: e.target.value as S['autoQuality'] })}>
              <option value="best">{t('settings.opt_best')}</option>
              <option value="4k">{t('settings.opt_4k')}</option>
              <option value="1080">{t('settings.opt_1080')}</option>
            </select>
          </div>
          <div className="setting-row">
            <label>{t('settings.language')}</label>
            <select value={settings.audioLang} onChange={(e) => update({ audioLang: e.target.value as S['audioLang'] })}>
              <option value="en">{t('settings.opt_english')}</option>
              <option value="original">{t('settings.opt_original')}</option>
            </select>
          </div>
          <div className="set-note">
            <svg className="note-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
            <span>{t('settings.network_note')}</span>
          </div>
        </Card>

        <Card icon={icons.advanced} head={t('settings.advanced_head')} desc={t('settings.advanced_desc')}>
          <div className="setting-row">
            <label>{t('settings.external_player')}</label>
            <select value={settings.externalPlayer} onChange={(e) => update({ externalPlayer: e.target.value as S['externalPlayer'] })} aria-label={t('settings.external_player')}>
              <option value="disabled">{t('settings.disabled')}</option>
              <option value="vlc">VLC</option>
              <option value="infuse">Infuse</option>
              <option value="outplayer">Outplayer</option>
              <option value="nplayer">nPlayer</option>
            </select>
          </div>
        </Card>
      </div>
    </section>
  );
}
