import { useState } from 'react';
import { useT } from '../i18n/i18n';
import { useHome } from '../lib/queries';
import { STUDIOS } from '../lib/home';
import { LOGO_BASE } from '../lib/img';
import UpcomingMarquee from './UpcomingMarquee';

/* Preview modal for a preview-only official add-on (Studios / Upcoming Radar) — the
 * vanilla #addonPreviewOverlay: an .auth-overlay card with a .cfg-preview "home
 * preview" showing that add-on's actual home contribution. Studios → a scrollable
 * row of mini white-plate .cfg-studio-card logos; Upcoming → the real marquee, sized
 * down via .cfg-preview-screen.is-marquee. */

function StudioCard({ name, logo, scale }: { name: string; logo: string; scale: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="cfg-studio-card" title={name}>
      {!failed && <img src={`${LOGO_BASE}${logo}`} alt={`${name} logo`} loading="lazy" decoding="async" style={{ ['--logo-scale' as string]: scale }} onError={() => setFailed(true)} />}
      <span className="cfg-studio-name" style={failed ? { opacity: 1 } : undefined}>{name}</span>
    </div>
  );
}

export default function PreviewModal({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const t = useT();
  const { data } = useHome();
  const isUpcoming = id === 'upcoming';

  return (
    <div className="auth-overlay open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <button className="auth-dismiss" type="button" aria-label={t('sources.close')} onClick={onClose}>✕</button>
        <div className="auth-brand"><div className="auth-word display">{name}</div></div>
        <div className="auth-kicker mono">{t('addon.preview_kicker')}</div>

        <div className="cfg-preview" aria-hidden="true">
          <div className="cfg-preview-bar">
            <span className="pvdot red" /><span className="pvdot" /><span className="pvdot" />
            <span className="pv-label">{t('cfg.preview_label')}</span>
          </div>
          <div className={`cfg-preview-screen${isUpcoming ? ' is-marquee' : ''}`}>
            {isUpcoming ? (
              <UpcomingMarquee movies={data?.upcoming?.movie ?? []} series={data?.upcoming?.series ?? []} />
            ) : (
              <div className="cfg-preview-row">
                <div className="cfg-row-label">{t('sec.studios')}</div>
                <div className="cfg-studio-row">
                  {STUDIOS.map((s) => <StudioCard key={s.key} name={s.name} logo={s.logo} scale={s.scale} />)}
                </div>
              </div>
            )}
          </div>
        </div>

        <button className="auth-submit" type="button" style={{ marginTop: 16 }} onClick={onClose}>
          <span className="auth-submit-label">{t('catalog.save_btn')}</span>
        </button>
      </div>
    </div>
  );
}
