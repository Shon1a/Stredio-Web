import { useT } from '../i18n/i18n';
import { useHome } from '../lib/queries';
import StudioRow from './StudioRow';
import UpcomingMarquee from './UpcomingMarquee';

/* Preview modal for a preview-only official add-on (Studios / Upcoming Radar) — the
 * vanilla #addonPreviewOverlay: an .auth-overlay card with a .cfg-preview "home
 * preview" screen showing that add-on's actual home contribution (the studio rail /
 * the upcoming marquee). */

export default function PreviewModal({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const t = useT();
  const { data } = useHome();
  return (
    <div className="auth-overlay open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-card" style={{ maxWidth: 920 }}>
        <button className="auth-dismiss" type="button" aria-label={t('sources.close')} onClick={onClose}>✕</button>
        <div className="auth-brand"><div className="auth-word display">{name}</div></div>
        <div className="auth-kicker mono">{t('cfg.preview_label')}</div>

        <div className="cfg-preview" aria-hidden="true">
          <div className="cfg-preview-bar">
            <span className="pvdot red" /><span className="pvdot" /><span className="pvdot" />
            <span className="pv-label">{t('cfg.preview_label')}</span>
          </div>
          <div className="cfg-preview-screen" style={{ padding: '8px 0' }}>
            {id === 'studios'
              ? <StudioRow onOpen={() => {}} />
              : <UpcomingMarquee movies={data?.upcoming?.movie ?? []} series={data?.upcoming?.series ?? []} />}
          </div>
        </div>

        <button className="auth-submit" type="button" style={{ marginTop: 16 }} onClick={onClose}>
          <span className="auth-submit-label">{t('catalog.save_btn')}</span>
        </button>
      </div>
    </div>
  );
}
