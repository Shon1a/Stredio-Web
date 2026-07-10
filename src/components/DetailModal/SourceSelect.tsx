import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useT } from '../../i18n/i18n';

/* Source picker — a staggered dropdown (hover.dev "Staggered Dropdown" style)
 * that replaces the old .m-src-toggle segmented control. The trigger shows the
 * active source; opening flips the chevron and reveals both options, each
 * sliding in on a staggered delay (see .m-src-select / .m-src-opt in app.css). */

type Src = 'services' | 'addons';

export default function SourceSelect({ value, onChange }: { value: Src; onChange: (s: Src) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const opts: { id: Src; label: string }[] = [
    { id: 'services', label: t('modal.tab_streaming') },
    { id: 'addons', label: t('modal.tab_addons') },
  ];
  const cur = opts.find((o) => o.id === value) ?? opts[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className={`m-src-select${open ? ' open' : ''}`} ref={ref}>
      <button type="button" className="m-src-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="m-src-cur">{cur.label}</span>
        <span className="m-src-chev" aria-hidden="true">▾</span>
      </button>
      <ul className="m-src-menu" role="listbox" aria-label={t('modal.streams')}>
        {opts.map((o, i) => (
          <li
            key={o.id}
            className={`m-src-opt${o.id === value ? ' on' : ''}`}
            role="option"
            aria-selected={o.id === value}
            tabIndex={-1}
            style={{ '--i': i } as CSSProperties}
            onClick={() => { onChange(o.id); setOpen(false); }}
          >
            {o.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
