import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useT } from '../i18n/i18n';
import { useAuth } from '../stores/auth';

const GATED = ['/addons', '/settings', '/library'];

/* Full chrome, faithful to index.html so app.css styles it identically:
 *   .shell > [ railbar · nav-backdrop · aside · main > (topbar · <Outlet/> · footer) ]
 * The left icon rail is the desktop primary nav (expands on hover); the <aside>
 * drawer is the mobile nav (slides in when body loses `nav-closed`); the topbar
 * collapses to height:0 on desktop and shows the brand + hamburger on mobile.
 * Nav routes through React Router. The decorative #topbarFrame SVG and the
 * #authControl chip are left as empty hooks (auth lands in Phase 5). */

const railIcons: Record<string, ReactNode> = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
  tv: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="7" width="19" height="12.5" rx="2" /><path d="M8 3.5 12 7l4-3.5" /></svg>,
  anime: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 12V3" /><path d="M12 12l7.8 4.5" /></svg>,
  movies: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></svg>,
  categories: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.6" /><rect x="14" y="3" width="7" height="7" rx="1.6" /><rect x="3" y="14" width="7" height="7" rx="1.6" /><rect x="14" y="14" width="7" height="7" rx="1.6" /></svg>,
  myspace: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></svg>,
};

const RAIL: Array<{ rail: string; to: string; key: string }> = [
  { rail: 'home', to: '/', key: 'nav.home' },
  { rail: 'search', to: '/explore', key: 'nav.search' },
  { rail: 'tv', to: '/tv', key: 'nav.tv' },
  { rail: 'anime', to: '/anime', key: 'nav.anime' },
  { rail: 'movies', to: '/movies', key: 'nav.movies' },
  { rail: 'categories', to: '/categories', key: 'nav.categories' },
  { rail: 'myspace', to: '/library', key: 'myspace.title' },
];

const TOPNAV: Array<{ to: string; key: string }> = [
  { to: '/', key: 'nav.home' },
  { to: '/tv', key: 'nav.tv_shows' },
  { to: '/movies', key: 'nav.movies' },
  { to: '/categories', key: 'nav.new_popular' },
  { to: '/library', key: 'nav.my_list' },
];

export default function AppShell() {
  const t = useT();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const user = useAuth((s) => s.user);
  const openAuth = useAuth((s) => s.openAuth);
  const logout = useAuth((s) => s.logout);

  // the drawer is shown when body loses `nav-closed` (see app.css)
  useEffect(() => {
    document.body.classList.toggle('nav-closed', !navOpen);
  }, [navOpen]);
  useEffect(() => () => { document.body.classList.remove('nav-closed'); }, []);

  // reflect auth state on <body> so app.css shows/hides the sign-in icon + admin links
  useEffect(() => {
    document.body.classList.toggle('authed', !!user);
    document.body.classList.toggle('is-admin', !!user?.isAdmin);
  }, [user]);

  const go = (to: string) => {
    if (to.startsWith('/admin')) { window.location.href = to; return; }
    if (GATED.includes(to) && !user) { openAuth(to); setNavOpen(false); return; } // sign-in gate
    nav(to);
    setNavOpen(false);
  };
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <div className="shell">
      {/* LEFT ICON RAIL — desktop primary nav */}
      <nav className="railbar" id="railbar" aria-label="Primary navigation">
        <div className="rail-nav">
          {RAIL.map((r) => (
            <a
              key={r.rail}
              className={`rail-item${r.rail === 'myspace' ? ' rail-myspace' : ''}${isActive(r.to) ? ' active' : ''}`}
              role="button" tabIndex={0} data-rail={r.rail}
              onClick={() => go(r.to)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(r.to); } }}
            >
              <span className="rail-ic">{railIcons[r.rail]}</span>
              <span className="rail-lbl">{t(r.key)}</span>
            </a>
          ))}
        </div>
      </nav>

      <div className="nav-backdrop" id="navBackdrop" onClick={() => setNavOpen(false)} />

      {/* MOBILE DRAWER */}
      <aside aria-label="Main navigation">
        <button className="aside-close" id="asideClose" title="Close menu" aria-label="Close menu" onClick={() => setNavOpen(false)}>✕</button>
        <span className="brand display" aria-label="stredio" style={{ pointerEvents: 'none' }}>
          <img src="/assets/stredio-logo.svg" alt="stredio" />
        </span>
        <div className="nav-group nav-cat-group">
          <h4>{t('nav.watch_head')}</h4>
          {TOPNAV.map((n) => (
            <a key={n.to} className={`nav-item nav-cat${isActive(n.to) ? ' active' : ''}`} role="button" tabIndex={0} onClick={() => go(n.to)}>
              <span className="dot" aria-hidden="true" /><span>{t(n.key)}</span>
            </a>
          ))}
        </div>
        <div className="nav-group">
          <h4>{t('nav.menu')}</h4>
          <a className={`nav-item${pathname === '/' ? ' active' : ''}`} role="button" tabIndex={0} onClick={() => go('/')}>
            <span className="dot" aria-hidden="true" /><span>{t('nav.catalog')}</span>
          </a>
          <a className="nav-item gated" role="button" tabIndex={0} onClick={() => go('/addons')}>
            <span className="dot" aria-hidden="true" /><span>{t('nav.addons')}</span><span className="lock" aria-hidden="true">🔒︎</span>
          </a>
          <a className="nav-item gated" role="button" tabIndex={0} onClick={() => go('/settings')}>
            <span className="dot" aria-hidden="true" /><span>{t('nav.settings')}</span><span className="lock" aria-hidden="true">🔒︎</span>
          </a>
          <a className="nav-item admin-only" role="button" tabIndex={0} onClick={() => go('/admin')}>
            <span className="dot" aria-hidden="true" /><span>{t('nav.admin')}</span><span className="lock" aria-hidden="true" style={{ opacity: 0.7 }}>⚙︎</span>
          </a>
        </div>
      </aside>

      <main>
        <header id="topbar">
          <svg className="topbar-frame" id="topbarFrame" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" />
          <span className="brand-logo" aria-label="stredio" style={{ pointerEvents: 'none' }}>
            <img src="/assets/stredio-logo.svg" alt="stredio" />
          </span>
          <nav className="topnav" id="topnav" aria-label="Primary">
            {TOPNAV.map((n) => (
              <a key={n.to} className={`topnav-link${isActive(n.to) ? ' active' : ''}`} role="button" tabIndex={0} onClick={() => go(n.to)}>
                {t(n.key)}
              </a>
            ))}
          </nav>
          <button className="menu-btn" id="navToggle" title="Toggle menu" aria-label="Toggle navigation menu" onClick={() => setNavOpen((v) => !v)}>☰</button>
          <button className="nav-icon" id="searchIcon" type="button" aria-label="Search" onClick={() => go('/explore')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </button>
          <button className="nav-icon" id="userIcon" type="button" aria-label={t('auth.signin')} onClick={() => openAuth()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
          </button>
          <button className="nav-icon" id="chatIcon" type="button" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          </button>
          <div className="auth-control" id="authControl">
            {user && (
              <div style={{ position: 'relative' }} onMouseLeave={() => setAcctOpen(false)}>
                <button
                  type="button" aria-haspopup="menu" aria-expanded={acctOpen} aria-label={t('auth.account')}
                  onClick={() => setAcctOpen((o) => !o)}
                  style={{ width: 34, height: 34, borderRadius: '50%', background: '#fff', color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}
                >
                  {(user.name || user.email || '?').charAt(0).toUpperCase()}
                </button>
                {acctOpen && (
                  <div role="menu" style={{ position: 'absolute', top: '110%', right: 0, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, minWidth: 150, padding: 6, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
                    {user.isAdmin && (
                      <a role="menuitem" style={{ padding: '8px 10px', color: '#ccc', cursor: 'pointer', fontSize: 14 }} onClick={() => { setAcctOpen(false); window.location.href = '/admin'; }}>{t('nav.admin')}</a>
                    )}
                    <button role="menuitem" style={{ padding: '8px 10px', background: 'none', border: 'none', color: '#ccc', textAlign: 'left', cursor: 'pointer', fontSize: 14 }} onClick={() => { setAcctOpen(false); logout(); }}>{t('auth.logout')}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <Outlet />

        <footer className="site-footer">
          <div className="sf-disclaimer">{t('footer.disclaimer')}</div>
          <div className="sf-links">
            <a id="footerTerms" role="button" tabIndex={0} onClick={() => go('/terms')}>{t('footer.terms_link')}</a>
            <a id="footerLegal" role="button" tabIndex={0} onClick={() => go('/legal')}>{t('footer.legal_link')}</a>
          </div>
        </footer>
      </main>
    </div>
  );
}
