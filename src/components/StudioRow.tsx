import { useState } from 'react';
import { STUDIOS, type Studio } from '../lib/home';
import { LOGO_BASE } from '../lib/img';
import { useT } from '../i18n/i18n';
import Rail from './Rail';

/* Studios logo row — port of studioRowHTML. A rail of studio logo plates; each
 * opens that studio's drill-down (/browse/studio:<key>). Same .studio-card markup
 * so app.css styles the full-colour logo plates + per-logo optical --logo-scale. */

function StudioCard({ s, onOpen }: { s: Studio; onOpen: (key: string, name: string) => void }) {
  const t = useT();
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="studio-card" tabIndex={0} role="button"
      data-studio={s.key} data-name={s.name}
      aria-label={`${s.name} — ${t('cat.browse_titles')}`}
      onClick={() => onOpen(s.key, s.name)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(s.key, s.name); } }}
    >
      {!failed && <img src={`${LOGO_BASE}${s.logo}`} loading="lazy" alt={`${s.name} logo`} style={{ ['--logo-scale' as string]: s.scale }} onError={() => setFailed(true)} />}
      <span className="studio-name" style={failed ? { opacity: 1, position: 'static', background: 'none' } : undefined}>{s.name}</span>
    </div>
  );
}

export default function StudioRow({ onOpen }: { onOpen: (key: string, name: string) => void }) {
  const t = useT();
  return (
    <div className="strip reveal in" data-row="studio">
      <div className="strip-head"><span className="strip-title static mono">{t('sec.studios')}</span></div>
      <Rail>{STUDIOS.map((s) => <StudioCard key={s.key} s={s} onOpen={onOpen} />)}</Rail>
    </div>
  );
}
