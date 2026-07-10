import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { langName } from '../../lib/addonClient';

/* The SOURCES language picker (#langTabs) — a custom listbox that buckets add-on
 * streams by language. Port of the vanilla .lang-select / .lang-select-trigger /
 * .lang-cur / .flag / .lang-menu / .lang-opt markup. */

export default function StreamLangSelect({ langs, value, onChange }: { langs: string[]; value: string; onChange: (l: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = langs.includes(value) ? value : langs[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className={`lang-select${open ? ' open' : ''}`} id="langTabs" ref={ref}>
      <button type="button" className="lang-select-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="lang-cur" data-lang={cur}><i className={`flag flag-${cur}`} />{langName(cur)}</span>
        <span className="lang-chev" aria-hidden="true">▾</span>
      </button>
      <ul className="lang-menu" role="listbox">
        {langs.map((l, i) => (
          <li key={l} className="lang-opt" role="option" tabIndex={-1} data-lang={l} aria-selected={l === cur} style={{ '--i': i } as CSSProperties} onClick={() => { onChange(l); setOpen(false); }}>
            <i className={`flag flag-${l}`} />{langName(l)}
          </li>
        ))}
      </ul>
    </div>
  );
}
