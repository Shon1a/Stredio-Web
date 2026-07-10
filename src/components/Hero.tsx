import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MediaItem } from '../lib/types';
import { useT, useGenre } from '../i18n/i18n';
import {
  HERO_MAX, dedupeFeatured, heroBgUrl, heroFallbackGradient, heroThumbUrl,
} from '../lib/hero';

/* Faithful port of the renderHero engine (assets/js/app.js:1043+).
 *
 * The track is a flex row of full-width cells translated in px; edge clones make
 * the loop seamless; per-cell parallax pans each backdrop; autoplay is driven by
 * the CSS `heroDotFill` animation on the active thumb (animationend → next). All
 * of that is imperative, so it runs in one effect against refs — exactly like the
 * vanilla engine, just scoped to this component instead of #hero by id.
 *
 * React owns only the pinned overlay (.hero-inner, remounted per active slide so
 * the rise-in animation restarts) and the static track/thumb markup (memoised on
 * `slides` so state changes never re-render — and thus never clobber — the DOM the
 * engine mutates). Engine methods are stashed on a ref so memoised handlers stay
 * current. */

const HERO_DELAY_MS = 4000;
const PARALLAX = 0.07;
const DRAG_MIN = 8, GO_DIST = 0.18, GO_VEL = 0.5;

interface Ctrl {
  w: number; pos: number; i: number; rm: boolean;
  go: (rawL: number) => void;
}

function HeroInner({ item, onPlay, onAdd }: { item: MediaItem; onPlay?: (m: MediaItem) => void; onAdd?: (m: MediaItem) => void }) {
  const t = useT();
  const genre = useGenre();
  const [logoFail, setLogoFail] = useState(false);
  const showLogo = !!item.titleLogo && !logoFail;
  const plot = item.overview || t('hero.plot_fallback');

  return (
    <div className="hero-inner">
      <h2 className={`hero-title${showLogo ? ' has-logo' : ''}`}>
        {showLogo
          ? <img className="hero-logo" src={item.titleLogo} alt={item.title} onError={() => setLogoFail(true)} />
          : item.title}
      </h2>
      <p className="hero-plot">{plot}</p>
      <div className="hero-meta">
        <span>{item.year}</span>
        <span>{item.rating ? `★ ${item.rating}` : ''}</span>
        <span>{genre(item.genre || '')}</span>
      </div>
      <div className="hero-actions">
        <button className="hero-btn hero-play" type="button" onClick={() => onPlay?.(item)}>
          <span className="ic" aria-hidden="true">▶</span> {t('hero.play')}
        </button>
        <button className="hero-btn hero-add" type="button" onClick={() => onAdd?.(item)}>
          <span className="ic" aria-hidden="true">+</span> <span className="hero-add-t">{t('nav.my_list')}</span>
        </button>
      </div>
    </div>
  );
}

export interface HeroProps {
  items: MediaItem[];
  onPlay?: (m: MediaItem) => void;
  onAdd?: (m: MediaItem) => void;
}

export default function Hero({ items, onPlay, onAdd }: HeroProps) {
  const t = useT();
  const slides = useMemo(() => dedupeFeatured(items, HERO_MAX), [items]);
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsTrackRef = useRef<HTMLDivElement>(null);
  const ctrl = useRef<Ctrl>({ w: 0, pos: 0, i: 0, rm: false, go: () => {} });

  const looped = slides.length > 1;
  const N = slides.length;

  // static cells: [clone(last)] real0..realN-1 [clone(first)] — memoised on slides
  const trackEl = useMemo(() => {
    const renderSlide = (it: MediaItem, dataI: number, key: string, o: { active?: boolean; clone?: boolean; defer?: boolean }) => {
      const bg = heroBgUrl(it);
      const eager = o.active && !o.defer;
      const bgStyle: CSSProperties = { backgroundImage: eager ? `url('${bg}')` : heroFallbackGradient(it) };
      const dataBg = bg && !eager ? bg : undefined;
      return (
        <div key={key} className={`hero-slide${o.active ? ' active' : ''}${o.clone ? ' hero-clone' : ''}`} data-i={dataI} aria-hidden="true">
          <div className="hero-media"><div className="hero-bg" data-bg={dataBg} style={bgStyle} /></div>
        </div>
      );
    };
    const cells = [];
    if (looped) cells.push(renderSlide(slides[N - 1], N - 1, 'cl', { clone: true, defer: true }));
    slides.forEach((s, i) => cells.push(renderSlide(s, i, `r${i}`, { active: i === 0, defer: i !== 0 })));
    if (looped) cells.push(renderSlide(slides[0], 0, 'cf', { clone: true, defer: true }));
    return (
      <div className="hero-track" ref={trackRef} style={{ transform: `translateX(${looped ? '-100%' : '0'})` }}>
        {cells}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides]);

  const thumbsEl = useMemo(() => {
    if (!looped) return null;
    return (
      <div className="hero-thumbs" role="group" aria-label={t('ui.featured_titles')}>
        <button className="hero-thumb-arrow l" type="button" tabIndex={-1} aria-label={t('ui.scroll_left')} onClick={() => ctrl.current.go(ctrl.current.i - 1)}>‹</button>
        <div className="hero-thumbs-track" id="heroThumbsTrack" ref={thumbsTrackRef}>
          {slides.map((s, i) => (
            <button key={i} className={`hero-thumb${i === 0 ? ' active' : ''}`} type="button" data-i={i} aria-current={i === 0 ? 'true' : 'false'} aria-label={`${t('ui.show')} ${s.title}`} onClick={() => ctrl.current.go(i)}>
              {heroThumbUrl(s) ? <img src={heroThumbUrl(s)} alt="" loading="lazy" decoding="async" /> : null}
            </button>
          ))}
        </div>
        <button className="hero-thumb-arrow r" type="button" tabIndex={-1} aria-label={t('ui.scroll_right')} onClick={() => ctrl.current.go(ctrl.current.i + 1)}>›</button>
      </div>
    );
    // t included so the nav-strip aria labels re-localize on language switch (this is a
    // static strip, unlike trackEl which must NOT re-render — that's why only trackEl
    // keeps the [slides]-only dep)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, t]);

  // ---- the imperative engine ----
  useEffect(() => {
    const root = rootRef.current, track = trackRef.current;
    if (!root || !track || !N) return;

    const c = ctrl.current;
    c.rm = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    c.pos = looped ? 1 : 0;
    c.i = 0;
    c.w = 0;

    const cellList = () => Array.from(track.querySelectorAll<HTMLElement>(':scope > .hero-slide'));

    const parallax = (basePx: number) => {
      const W = c.w || 1;
      cellList().forEach((sl, col) => {
        const media = sl.querySelector<HTMLElement>('.hero-media');
        if (!media) return;
        if (c.rm) { media.style.transform = ''; return; }
        let rel = (col * W + basePx) / W;
        rel = Math.max(-1, Math.min(1, rel));
        media.style.transform = `translate3d(${(-PARALLAX * rel * W).toFixed(2)}px,0,0)`;
      });
    };

    const place = (pos: number, animate: boolean, dragPx = 0) => {
      c.pos = pos;
      const W = c.w || root.clientWidth || 1;
      const base = -pos * W + dragPx;
      track.classList.toggle('animating', !!animate);
      track.style.transform = `translate3d(${base.toFixed(2)}px,0,0)`;
      parallax(base);
    };

    const ensureSlideBg = (cell: HTMLElement | undefined) => {
      const bgEl = cell?.querySelector<HTMLElement>('.hero-bg');
      if (!bgEl || !bgEl.dataset.bg) return;
      const url = bgEl.dataset.bg; delete bgEl.dataset.bg;
      const pre = new Image();
      const paint = () => { bgEl.style.backgroundImage = `url('${url}')`; };
      pre.src = url;
      if (pre.decode) pre.decode().then(paint).catch(paint);
      else { pre.onload = paint; pre.onerror = paint; }
    };

    const setActiveSlide = (L: number) => {
      const cells = cellList();
      const ac = L + (looped ? 1 : 0);
      ensureSlideBg(cells[ac]); ensureSlideBg(cells[ac + 1]); ensureSlideBg(cells[ac - 1]);
      // A wrap glides onto the edge CLONE, not the real slide, so the clone must run the
      // same Ken Burns in sync — otherwise it holds the end frame (scale 1.14) while the
      // real slide restarts from 1.06, and the seamless jump pops the zoom back out.
      const cloneCol = looped ? (L === 0 ? N + 1 : L === N - 1 ? 0 : -1) : -1;
      if (cloneCol >= 0) ensureSlideBg(cells[cloneCol]);
      cells.forEach((sl, col) => sl.classList.toggle('active', col === ac || col === cloneCol));
      root.querySelectorAll<HTMLElement>('.hero-thumb').forEach((d, i) => {
        const on = i === L;
        d.classList.toggle('active', on);
        d.setAttribute('aria-current', on ? 'true' : 'false');
        if (on && thumbsTrackRef.current) {
          const tt = thumbsTrackRef.current;
          tt.scrollTo({ left: Math.max(0, d.offsetLeft - tt.clientWidth / 2 + d.clientWidth / 2), behavior: 'smooth' });
        }
      });
      setActive(L); // React → swap the pinned overlay (restarts heroRise)
    };

    const animateTo = (cell: number, wrapTo: number | null) => {
      place(cell, true);
      if (wrapTo == null) return;
      const land = () => { track.removeEventListener('transitionend', onEnd); place(wrapTo + 1, false); };
      const onEnd = (e: TransitionEvent) => { if (e.target === track && e.propertyName === 'transform') land(); };
      track.addEventListener('transitionend', onEnd);
      setTimeout(() => { if (c.pos === cell) { track.removeEventListener('transitionend', onEnd); land(); } }, 820);
    };

    const go = (rawL: number) => {
      if (N < 2) return;
      const realL = ((rawL % N) + N) % N;
      const wrap = rawL < 0 || rawL > N - 1;
      setActiveSlide(realL);
      c.i = realL;
      animateTo(rawL + 1, wrap ? realL : null);
    };
    c.go = go;

    const layout = () => { c.w = root.clientWidth || track.clientWidth || 1; place(c.pos, false); };
    const raf = requestAnimationFrame(layout);
    setActiveSlide(0);

    // Hold autoplay until the first real interaction. Each auto-advance rotates a fresh
    // full-viewport backdrop into view, and ensureSlideBg paints it for the first time —
    // a new Largest Contentful Paint candidate every 4s, so LCP kept climbing (8–11s in
    // the panel) even though slide 0 already paints at ~1.6s. Holding on slide 0 lets LCP
    // settle on that first paint; the visitor's first pointer/key/wheel/scroll both
    // finalizes LCP and releases autoplay for the rest of the session. (The `autohold`
    // class only pauses the thumb-fill clock that drives the advance — see app.css.)
    root.classList.add('autohold');
    let engaged = false;
    // genuine user gestures only — NOT 'scroll', which also fires from programmatic
    // scrolls (e.g. the thumb strip's scrollTo in setActiveSlide) and would release the
    // hold instantly. 'wheel' already covers real scroll intent.
    const engageEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    const offEngage = () => engageEvents.forEach((ev) => window.removeEventListener(ev, engage));
    const engage = () => { if (engaged) return; engaged = true; root.classList.remove('autohold'); offEngage(); };
    engageEvents.forEach((ev) => window.addEventListener(ev, engage, { passive: true }));

    // ---- wiring ----
    const onAnim = (e: AnimationEvent) => { if (e.animationName === 'heroDotFill') go(c.i + 1); };
    const pause = (p: boolean) => root.classList.toggle('paused', p);
    const onEnter = () => pause(true), onLeave = () => pause(false);
    const onFocusIn = () => pause(true), onFocusOut = () => pause(false);
    root.addEventListener('animationend', onAnim);
    root.addEventListener('mouseenter', onEnter);
    root.addEventListener('mouseleave', onLeave);
    root.addEventListener('focusin', onFocusIn);
    root.addEventListener('focusout', onFocusOut);
    window.addEventListener('resize', layout, { passive: true });

    // ---- drag / swipe ----
    const rubber = (px: number) => { const W = c.w || 1; return W * Math.tanh(px / W); };
    let dx0 = 0, dy0 = 0, drag = false, axis: 'x' | 'y' | null = null, ddx = 0, pType = '', lastX = 0, lastT = 0, vx = 0;
    const onDown = (e: PointerEvent) => {
      if (N < 2) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dx0 = e.clientX; dy0 = e.clientY; drag = true; axis = null; ddx = 0; vx = 0;
      lastX = e.clientX; lastT = e.timeStamp || 0; pType = e.pointerType;
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - dx0, dy = e.clientY - dy0;
      if (axis === null) {
        if (Math.abs(dx) < DRAG_MIN && Math.abs(dy) < DRAG_MIN) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (axis === 'x') { root.classList.add('dragging', 'paused'); try { root.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
      }
      if (axis !== 'x') return;
      e.preventDefault();
      ddx = dx;
      const tm = e.timeStamp || 0;
      if (tm > lastT) { vx = (e.clientX - lastX) / (tm - lastT); lastX = e.clientX; lastT = tm; }
      place(c.pos, false, rubber(dx));
    };
    const endDrag = () => {
      if (!drag) return; drag = false;
      const wasX = axis === 'x';
      root.classList.remove('dragging');
      if (wasX) {
        const W = c.w || root.clientWidth || 1;
        const far = Math.abs(ddx) > W * GO_DIST, flick = Math.abs(vx) > GO_VEL;
        if ((far || flick) && Math.sign(ddx || -vx) !== 0) {
          const dir = ddx < 0 || (ddx === 0 && vx < 0) ? 1 : -1;
          go(c.i + dir);
        } else {
          place(c.pos, true);
        }
      }
      if (wasX && Math.abs(ddx) > DRAG_MIN) {
        const supp = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
        root.addEventListener('click', supp, { capture: true, once: true });
        setTimeout(() => root.removeEventListener('click', supp, true), 350);
      }
      axis = null; ddx = 0; vx = 0;
      pause(pType === 'mouse' && (root.matches(':hover') || root.contains(document.activeElement)));
    };
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove, { passive: false });
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);

    return () => {
      cancelAnimationFrame(raf);
      offEngage();
      root.removeEventListener('animationend', onAnim);
      root.removeEventListener('mouseenter', onEnter);
      root.removeEventListener('mouseleave', onLeave);
      root.removeEventListener('focusin', onFocusIn);
      root.removeEventListener('focusout', onFocusOut);
      window.removeEventListener('resize', layout);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', endDrag);
      root.removeEventListener('pointercancel', endDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides]);

  if (!N) return null;
  const current = slides[active] || slides[0];

  return (
    <div className="hero" id="hero" ref={rootRef} aria-label={t('ui.featured_title')} style={{ '--hero-delay': `${HERO_DELAY_MS / 1000}s` } as CSSProperties}>
      {trackEl}
      {current && <HeroInner key={active} item={current} onPlay={onPlay} onAdd={onAdd} />}
      {thumbsEl}
    </div>
  );
}
