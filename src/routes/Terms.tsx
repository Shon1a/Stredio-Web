import { useNavigate } from 'react-router-dom';
import { useT, useLang } from '../i18n/i18n';
import { TERMS_DATA, type TermsBlock } from '../lib/terms';

/* Terms & Conditions — port of the vanilla #terms + renderTerms(): the bilingual
 * TERMS_DATA rendered into .terms-body / .legal-section. Content strings carry
 * simple inline HTML (<b>/<a>) and are trusted static text, so they render via
 * dangerouslySetInnerHTML exactly as the vanilla injected them. */

function Block({ b }: { b: TermsBlock }) {
  if (typeof b === 'string') return <p dangerouslySetInnerHTML={{ __html: b }} />;
  if ('ol' in b) return <ol>{b.ol.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: li }} />)}</ol>;
  if ('ul' in b) return <ul>{b.ul.map((li, i) => <li key={i} dangerouslySetInnerHTML={{ __html: li }} />)}</ul>;
  if ('box' in b) return <div className="legal-contact" dangerouslySetInnerHTML={{ __html: b.box }} />;
  return null;
}

export default function Terms() {
  const t = useT();
  const { lang } = useLang();
  const nav = useNavigate();
  const data = TERMS_DATA[lang] || TERMS_DATA.en;

  return (
    <section className="page active" id="terms" aria-label={t('terms.title')}>
      <div className="legal-wrap">
        <button className="legal-back" type="button" onClick={() => nav('/')}>
          <span aria-hidden="true">←</span> <span>{t('legal.back')}</span>
        </button>
        <h2 className="section-title display">{t('terms.title')}</h2>
        <div className="legal-updated">{t('terms.updated')}</div>
        <div className="terms-body">
          {data.map((s, i) => (
            <div className="legal-section" key={i}>
              <h3 dangerouslySetInnerHTML={{ __html: s.h }} />
              {s.body.map((b, j) => <Block b={b} key={j} />)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
