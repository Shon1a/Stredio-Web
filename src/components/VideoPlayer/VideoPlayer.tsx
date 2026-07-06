import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer } from '../../stores/player';
import { useHistory } from '../../stores/history';
import { useT } from '../../i18n/i18n';
import { loadHls, isHlsUrl, type HlsInstance } from '../../lib/hls';

/* Core video player — reproduces the #playerOverlay markup/classes (so app.css
 * styles it) with HLS.js + native playback and the essential controls: play/pause,
 * scrubber (buffered + played + tooltip), ±10s, volume/mute, time, speed, quality
 * (HLS levels), subtitles, PiP, fullscreen, keyboard, and auto-hide chrome.
 *
 * Deferred to Phase 4 (need real streams / touch / series context): the touch
 * gesture HUD, picture-enhance (grain + unsharp convolution), and the skip-intro /
 * in-player episode panel. Their markup hooks are left in place. */

const Worm = (
  <svg className="vp-pl" viewBox="0 0 128 128" width="128" height="128" aria-hidden="true">
    <defs><linearGradient id="vpPlGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f4f4f7" /><stop offset="100%" stopColor="#8d8d95" /></linearGradient></defs>
    <circle className="vp-pl__ring" r="56" cx="64" cy="64" fill="none" strokeWidth="16" strokeLinecap="round" />
    <path className="vp-pl__worm" d="M92,15.492S78.194,4.967,66.743,16.887c-17.231,17.938-28.26,96.974-28.26,96.974L119.85,59.892l-99-31.588,57.528,89.832L97.8,19.349,13.636,88.51l89.012,16.015S81.908,38.332,66.1,22.337C50.114,6.156,36,15.492,36,15.492a56,56,0,1,0,56,0Z" fill="none" stroke="url(#vpPlGrad)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="44 1111" strokeDashoffset="10" />
  </svg>
);
const IcPlay = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>;
const IcPause = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>;
const IcBack = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12.5 7V4l-5 5 5 5V11a4.5 4.5 0 1 1-4.5 4.5H6A6 6 0 1 0 12.5 7z" /></svg>;
const IcFwd = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M11.5 7V4l5 5-5 5V11A4.5 4.5 0 1 0 16 15.5h1.5A6 6 0 1 1 11.5 7z" /></svg>;
const IcMute = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4z" /><path d="M16 8.5a4 4 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M18.5 6a7 7 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
const IcGear = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M19.4 13a7.8 7.8 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-1.7-1l-.4-2.6h-3.8l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.8 7.8 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 1.7 1l.4 2.6h3.8l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.4zM12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4z" /></svg>;
const IcPip = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M3 5h18v14H3V5zm2 2v10h14V7H5zm6 4h7v5h-7v-5z" /></svg>;
const IcFs = <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM6 15v3h3v2H4v-5h2zm12 0h2v5h-5v-2h3v-3z" /></svg>;

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = Math.floor(s % 60);
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return (h ? `${h}:` : '') + `${mm}:${String(ss).padStart(2, '0')}`;
}

interface Level { i: number; height?: number }

export default function VideoPlayer() {
  const t = useT();
  const source = usePlayer((s) => s.source);
  const close = usePlayer((s) => s.close);
  const record = useHistory((s) => s.record);
  const putProgress = useHistory((s) => s.putProgress);
  const getResume = useHistory((s) => s.getResume);
  const flush = useHistory((s) => s.flush);

  const overlayRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const recordedRef = useRef(false);   // record watch-history once per opened source
  const lastProgRef = useRef(0);       // throttle progress writes
  const resumedRef = useRef(false);    // seek-to-resume once per source

  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [levels, setLevels] = useState<Level[]>([]);
  const [curLevel, setCurLevel] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'speed' | 'quality' | 'subs'>('main');
  const [ccOn, setCcOn] = useState(false);
  const [fs, setFs] = useState(false);
  const [hideUi, setHideUi] = useState(false);

  // attach the source (HLS via hls.js, else native)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !source) return;
    let cancelled = false;
    recordedRef.current = false; resumedRef.current = false; lastProgRef.current = 0;
    setLoading(true); setPlaying(false); setCur(0); setDur(0); setBuffered(0); setLevels([]); setCurLevel(-1); setMenuOpen(false); setMenuView('main');
    const url = source.url;
    const nativeHls = v.canPlayType('application/vnd.apple.mpegurl');
    const useHls = (source.kind === 'hls' || isHlsUrl(url)) && !nativeHls;

    if (useHls) {
      loadHls().then((Hls) => {
        if (cancelled || !v) return;
        if (Hls && Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(v);
          hls.on('hlsManifestParsed', () => {
            setLevels(hls.levels.map((l, i) => ({ i, height: l.height })));
            v.play().catch(() => {});
          });
          hls.on('hlsLevelSwitched', () => setCurLevel(hls.currentLevel));
        } else {
          v.src = url; v.play().catch(() => {});
        }
      });
    } else {
      v.src = url; v.play().catch(() => {});
    }

    return () => {
      cancelled = true;
      flush(); // persist any pending resume-progress when the source changes / player closes
      if (hlsRef.current) { try { hlsRef.current.destroy(); } catch { /* ignore */ } hlsRef.current = null; }
      try { v.removeAttribute('src'); v.load(); } catch { /* ignore */ }
    };
  }, [source, flush]);

  const bump = useCallback(() => {
    setHideUi(false);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => { if (!videoRef.current?.paused) setHideUi(true); }, 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }, []);
  const nudge = useCallback((d: number) => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + d)); }, []);
  const toggleMute = useCallback(() => { const v = videoRef.current; if (v) v.muted = !v.muted; }, []);
  const toggleFs = useCallback(() => {
    const el = overlayRef.current; if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.();
  }, []);
  const togglePip = useCallback(async () => {
    const v = videoRef.current; if (!v) return;
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await v.requestPictureInPicture(); } catch { /* ignore */ }
  }, []);
  const setLevel = (i: number) => { const h = hlsRef.current; if (h) h.currentLevel = i; setCurLevel(i); setMenuOpen(false); };
  const setSpeed = (r: number) => { const v = videoRef.current; if (v) v.playbackRate = r; setRate(r); setMenuOpen(false); };
  const toggleCC = () => {
    const v = videoRef.current; if (!v || !v.textTracks.length) return;
    const on = !ccOn;
    for (let i = 0; i < v.textTracks.length; i++) v.textTracks[i].mode = on && i === 0 ? 'showing' : 'hidden';
    setCcOn(on);
  };

  // scrub
  const seekToClient = useCallback((clientX: number) => {
    const bar = barRef.current, v = videoRef.current; if (!bar || !v || !v.duration) return;
    const r = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    v.currentTime = ratio * v.duration;
  }, []);
  const onBarPointerDown = (e: React.PointerEvent) => {
    seekToClient(e.clientX);
    const move = (ev: PointerEvent) => seekToClient(ev.clientX);
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // keyboard + fullscreen listener while open
  useEffect(() => {
    if (!source) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (document.fullscreenElement) document.exitFullscreen(); else close(); return; }
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft') nudge(-10);
      else if (e.key === 'ArrowRight') nudge(10);
      else if (e.key === 'm') toggleMute();
      else if (e.key === 'f') toggleFs();
      bump();
    };
    const onFs = () => setFs(!!document.fullscreenElement);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); };
  }, [source, close, togglePlay, nudge, toggleMute, toggleFs, bump]);

  if (!source) return <div className="vp-overlay" id="playerOverlay" />;

  const pct = dur ? (cur / dur) * 100 : 0;
  const bufPct = dur ? (buffered / dur) * 100 : 0;
  const hasSubs = !!source.subtitles?.length;

  return (
    <div
      className={`vp-overlay open${hideUi ? ' hide-ui' : ''}`}
      id="playerOverlay"
      ref={overlayRef}
      onPointerMove={bump}
      onClick={(e) => { if (e.target === videoRef.current) togglePlay(); }}
    >
      <video
        id="playerVideo"
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDur(v.duration || 0);
          // resume where we left off (once), if there's saved progress for this title
          if (!resumedRef.current && source.media?.key) {
            resumedRef.current = true;
            const r = getResume(source.media.key);
            if (r && r.pos > 0 && r.pos < (v.duration || Infinity)) v.currentTime = r.pos;
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setCur(v.currentTime);
          // throttle resume-progress writes to ~once/5s
          const now = v.currentTime;
          if (source.media?.key && v.currentTime > 8 && Math.abs(now - lastProgRef.current) >= 5) {
            lastProgRef.current = now;
            putProgress(source.media.key, v.currentTime, v.duration || 0);
          }
        }}
        onProgress={(e) => { const v = e.currentTarget; if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1)); }}
        onPlay={() => {
          setPlaying(true); bump();
          if (!recordedRef.current && source.media) {
            recordedRef.current = true;
            const m = source.media;
            record({ id: m.id, title: m.title, poster: m.poster, year: m.year, type: m.type, genre: m.genre, rating: m.rating, ep: m.ep, key: m.key, season: m.season, episode: m.episode });
          }
        }}
        onPause={() => { setPlaying(false); setHideUi(false); }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onVolumeChange={(e) => { setVol(e.currentTarget.volume); setMuted(e.currentTarget.muted); }}
        onEnded={() => setPlaying(false)}
      >
        {source.subtitles?.map((s, i) => (
          <track key={i} kind="subtitles" src={s.url} srcLang={s.lang} label={s.label} default={i === 0} />
        ))}
      </video>

      <div className="vp-grain" id="vpGrain" aria-hidden="true" />

      {loading && (
        <div className="vp-loading" id="vpLoading" role="status" aria-live="polite">
          {Worm}
          <div className="lt">{t('player.preparing')}</div>
          <div className="ls" />
        </div>
      )}

      <div className="vp-ui">
        <div className="vp-top">
          <div>
            <div className="vp-title" id="playerTitle">{source.title || ''}</div>
            <div className="vp-subtitle" id="vpSubtitle">{source.subtitle || ''}</div>
          </div>
          <div className="vp-top-right">
            <div className="vp-status" id="playerStatus" role="status" aria-live="polite" />
            <button className="vp-icon" id="vpClose" title="Close (Esc)" aria-label={t('player.close')} onClick={close}>✕</button>
          </div>
        </div>

        <button className={`vp-center${playing ? ' hidden' : ''}`} aria-label="Play / Pause" onClick={togglePlay}>
          <span className="ic">{playing ? IcPause : IcPlay}</span>
        </button>

        <div className="vp-bottom">
          <div className="vp-progress" id="vpProgress" ref={barRef} onPointerDown={onBarPointerDown}>
            <div className="vp-bar">
              <div className="vp-buffered" id="vpBuffered" style={{ width: `${bufPct}%` }} />
              <div className="vp-played" id="vpPlayed" style={{ width: `${pct}%` }} />
              <div className="vp-thumb" id="vpThumb" style={{ left: `${pct}%` }} />
            </div>
          </div>
          <div className="vp-controls">
            <button className="vp-icon" id="vpPlay" aria-label={t('ctl.play_a')} onClick={togglePlay}>{playing ? IcPause : IcPlay}</button>
            <button className="vp-icon" id="vpBack" aria-label={t('ctl.back_a')} onClick={() => nudge(-10)}>{IcBack}</button>
            <button className="vp-icon" id="vpFwd" aria-label={t('ctl.fwd_a')} onClick={() => nudge(10)}>{IcFwd}</button>
            <div className="vp-vol">
              <button className="vp-icon" id="vpMute" aria-label={t('ctl.mute_a')} aria-pressed={muted} onClick={toggleMute}>{IcMute}</button>
              <input type="range" className="vp-vol-slider" id="vpVol" min={0} max={1} step={0.02} value={muted ? 0 : vol} aria-label={t('ctl.vol_a')}
                onChange={(e) => { const v = videoRef.current; if (v) { v.volume = +e.target.value; v.muted = +e.target.value === 0; } }} />
            </div>
            <div className="vp-time"><span id="vpCur">{fmt(cur)}</span> / <span id="vpDur">{fmt(dur)}</span></div>
            <div className="vp-spacer" />
            {hasSubs && (
              <button className={`vp-icon cc${ccOn ? ' on' : ''}`} id="vpCC" aria-label={t('ctl.subs_a')} aria-pressed={ccOn} onClick={toggleCC}>CC</button>
            )}
            <div className="vp-menu-wrap">
              <button className="vp-icon" id="vpGear" aria-label={t('ctl.settings_a')} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen((o) => !o); setMenuView('main'); }}>{IcGear}</button>
              <div className={`vp-menu${menuOpen ? ' open' : ''}`} id="vpMenu" role="menu">
                {menuView === 'main' && (
                  <>
                    <button className="vp-menu-row" role="menuitem" onClick={() => setMenuView('speed')}><span>{t('ctl.speed')}</span><span className="vp-menu-val">{rate === 1 ? t('ctl.normal') : `${rate}×`}</span></button>
                    {levels.length > 0 && (
                      <button className="vp-menu-row" role="menuitem" onClick={() => setMenuView('quality')}><span>{t('ctl.quality')}</span><span className="vp-menu-val">{curLevel < 0 ? t('ctl.auto') : `${levels.find((l) => l.i === curLevel)?.height ?? ''}p`}</span></button>
                    )}
                  </>
                )}
                {menuView === 'speed' && SPEEDS.map((r) => (
                  <button key={r} className={`vp-menu-row${r === rate ? ' on' : ''}`} role="menuitemradio" aria-checked={r === rate} onClick={() => setSpeed(r)}>{r === 1 ? t('ctl.normal') : `${r}×`}</button>
                ))}
                {menuView === 'quality' && (
                  <>
                    <button className={`vp-menu-row${curLevel < 0 ? ' on' : ''}`} role="menuitemradio" aria-checked={curLevel < 0} onClick={() => setLevel(-1)}>{t('ctl.auto')}</button>
                    {levels.map((l) => (
                      <button key={l.i} className={`vp-menu-row${l.i === curLevel ? ' on' : ''}`} role="menuitemradio" aria-checked={l.i === curLevel} onClick={() => setLevel(l.i)}>{l.height ? `${l.height}p` : `Level ${l.i + 1}`}</button>
                    ))}
                  </>
                )}
              </div>
            </div>
            {document.pictureInPictureEnabled && (
              <button className="vp-icon" id="vpPip" aria-label={t('ctl.pip_a')} onClick={togglePip}>{IcPip}</button>
            )}
            <button className="vp-icon" id="vpFs" aria-label={t('ctl.fs_a')} aria-pressed={fs} onClick={toggleFs}>{IcFs}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
