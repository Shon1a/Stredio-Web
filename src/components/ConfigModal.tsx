import { useT } from '../i18n/i18n';
import { useHomeConfig, rowOn, type HomeConfig } from '../stores/homeConfig';
import { HOME_ROWS } from '../lib/home';

/* Configure modal for a home block (Catalog Rows / Streaming Services) — port of the
 * vanilla #catalogOverlay / #providersOverlay: an .auth-overlay card with a live
 * .cfg-preview mini-home that mirrors the checkbox selection, plus the .optrow-list
 * of per-row toggles. Matches the vanilla "preview + pick rows" experience. */

export interface ConfigTarget { block: 'catalogRows' | 'providerRows'; cats: string[]; title: string; kicker: string }

const rowKey = (cat: string) => HOME_ROWS.find((r) => r.cat === cat)?.key || cat;

export default function ConfigModal({ target, onClose }: { target: ConfigTarget; onClose: () => void }) {
  const t = useT();
  const config = useHomeConfig((s) => s.config);
  const toggleRow = useHomeConfig((s) => s.toggleRow);
  const map = config[target.block] as HomeConfig['catalogRows'];
  const enabled = target.cats.filter((c) => rowOn(map, c));

  return (
    <div className="auth-overlay open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-card">
        <button className="auth-dismiss" type="button" aria-label={t('sources.close')} onClick={onClose}>✕</button>
        <div className="auth-brand"><div className="auth-word display">{target.title}</div></div>
        <div className="auth-kicker mono">{target.kicker}</div>

        {/* live preview: a mini home that mirrors the checkboxes below */}
        <div className="cfg-preview" aria-hidden="true">
          <div className="cfg-preview-bar">
            <span className="pvdot red" /><span className="pvdot" /><span className="pvdot" />
            <span className="pv-label">{t('cfg.preview_label')}</span>
          </div>
          <div className="cfg-preview-screen">
            {enabled.length ? enabled.map((cat) => (
              <div className="cfg-preview-row" data-cat={cat} key={cat}>
                <div className="cfg-row-label">{t(rowKey(cat))}</div>
                <div className="cfg-row-strip" style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span key={i} style={{ width: 34, height: 20, borderRadius: 3, background: 'linear-gradient(135deg,#242424,#131313)', flex: '0 0 auto' }} />
                  ))}
                </div>
              </div>
            )) : <div className="cfg-preview-empty">{t('cfg.preview_empty')}</div>}
          </div>
        </div>

        <div className="optrow-block" style={{ marginTop: 18 }}>
          <label className="mono" style={{ display: 'block', fontSize: 13, letterSpacing: '.2em', color: 'var(--text-muted)', marginBottom: 7 }}>{t('catalog.rows_head')}</label>
          <div className="auth-hint mono" style={{ margin: '0 0 12px' }}>{t('catalog.rows_hint')}</div>
          <div className="optrow-list">
            {target.cats.map((cat) => (
              <label className="optrow" key={cat}>
                <input type="checkbox" checked={rowOn(map, cat)} onChange={() => toggleRow(target.block, cat)} />
                <span>{t(rowKey(cat))}</span>
              </label>
            ))}
          </div>
          <button className="auth-submit" type="button" style={{ marginTop: 16 }} onClick={onClose}>
            <span className="auth-submit-label">{t('catalog.save_btn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
