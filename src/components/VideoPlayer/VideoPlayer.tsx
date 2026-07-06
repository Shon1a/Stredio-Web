import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer } from '../../stores/player';
import { useHistory } from '../../stores/history';
import { useSettings } from '../../stores/settings';
import { useT } from '../../i18n/i18n';
import { loadHls, isHlsUrl, type HlsInstance } from '../../lib/hls';
import { toVttBlobUrl } from '../../lib/subtitles';

// friendly name for an HLS audio rendition + a snapped quality label (matches vanilla)
const AUDIO_NAMES: Record<string, string> = { eng: 'English', en: 'English', rus: 'Russian', ru: 'Russian', ka: 'ქართული', kat: 'ქართული', geo: 'ქართული', ukr: 'Ukrainian', uk: 'Ukrainian', tur: 'Turkish', fre: 'French', fr: 'French', ger: 'German', de: 'German', ita: 'Italian', jpn: 'Japanese', ja: 'Japanese', kor: 'Korean', spa: 'Spanish', es: 'Spanish' };
function audioName(a: { name?: string; lang?: string }, i: number): string { return a.name || AUDIO_NAMES[(a.lang || '').toLowerCase()] || a.lang || `Track ${i + 1}`; }
function levelLabel(l: { height?: number; width?: number; bitrate?: number }): string {
  const eq = Math.max(l.height || 0, l.width ? Math.round((l.width * 9) / 16) : 0);
  if (eq >= 1900) return '2160p'; if (eq >= 1300) return '1440p'; if (eq >= 900) return '1080p';
  if (eq >= 650) return '720p'; if (eq >= 400) return '480p'; if (eq >= 300) return '360p';
  if (eq > 0) return '240p'; return l.bitrate ? Math.round(l.bitrate / 1000) + 'k' : '?';
}
function applyAudioPref(hls: HlsInstance, pref: string) {
  if (!pref || pref === 'original') return;
  const re = new RegExp(pref, 'i');
  const i = hls.audioTracks.findIndex((a) => re.test((a.name || '') + ' ' + (a.lang || '')));
  if (i >= 0 && hls.audioTrack !== i) { try { hls.audioTrack = i; } catch { /* ignore */ } }
}

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

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// each menu section's collapsible gear-header icon + a single checkable option row
const AccIc = <svg className="vp-acc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;

function OptRow({ on, label, sub, onClick }: { on: boolean; label: string; sub?: string; onClick: () => void }) {
  return (
    <div className={`vp-opt${on ? ' on' : ''}`} role="menuitemradio" aria-checked={on} tabIndex={0}
      onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
      <span className="ck">{on ? '✓' : ''}</span>{label}{sub ? <span className="sub">{sub}</span> : null}
    </div>
  );
}

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
  const settings = useSettings((s) => s.settings);
  const updateSettings = useSettings((s) => s.update);
  const kernelRef = useRef<SVGFEConvolveMatrixElement>(null);

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
  const [currentSub, setCurrentSub] = useState(-1); // -1 = subtitles off
  const [audioTracks, setAudioTracks] = useState<Array<{ i: number; name: string }>>([]);
  const [curAudio, setCurAudio] = useState(0);
  const [acc, setAcc] = useState<Record<string, boolean>>({}); // expanded accordion sections
  const [fs, setFs] = useState(false);
  const [hideUi, setHideUi] = useState(false);
  const [vtt, setVtt] = useState<Array<{ lang: string; label: string; url: string }>>([]);
  const ccOn = currentSub >= 0;

  // attach the source (HLS via hls.js, else native)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !source) return;
    let cancelled = false;
    recordedRef.current = false; resumedRef.current = false; lastProgRef.current = 0;
    setLoading(true); setPlaying(false); setCur(0); setDur(0); setBuffered(0); setLevels([]); setCurLevel(-1); setMenuOpen(false); setHideUi(false); setAudioTracks([]); setCurAudio(0);
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
            // apply the preferred-quality setting (else stay on auto)
            const pref = settings.autoQuality;
            if (pref !== 'best') {
              const want = pref === '4k' ? 2160 : 1080;
              let best = -1, bestH = -1;
              hls.levels.forEach((l, i) => { const h = l.height ?? 0; if (h <= want && h > bestH) { bestH = h; best = i; } });
              if (best >= 0) hls.currentLevel = best;
            }
            // audio renditions + preferred audio language
            if (hls.audioTracks && hls.audioTracks.length > 1) {
              applyAudioPref(hls, settings.audioLang);
              setAudioTracks(hls.audioTracks.map((a, i) => ({ i, name: audioName(a, i) })));
              setCurAudio(hls.audioTrack);
            }
            v.play().catch(() => {});
          });
          hls.on('hlsLevelSwitched', () => setCurLevel(hls.currentLevel));
          hls.on('hlsAudioTrackSwitched', () => setCurAudio(hls.audioTrack));
          hls.on('hlsAudioTracksUpdated', () => {
            if (hls.audioTracks && hls.audioTracks.length > 1) { setAudioTracks(hls.audioTracks.map((a, i) => ({ i, name: audioName(a, i) }))); setCurAudio(hls.audioTrack); }
          });
        } else {
          v.src = url; v.play().catch(() => {});
        }
      });
    } else {
      v.src = url; v.play().catch(() => {});
    }

    return () => {
      cancelled = true;
      window.clearTimeout(hideTimer.current); // don't let a pending auto-hide fire into the next open
      flush(); // persist any pending resume-progress when the source changes / player closes
      if (hlsRef.current) { try { hlsRef.current.destroy(); } catch { /* ignore */ } hlsRef.current = null; }
      try { v.removeAttribute('src'); v.load(); } catch { /* ignore */ }
    };
  }, [source, flush]);

  // convert add-on subtitle tracks (SRT / gzipped) to same-origin VTT blob URLs so
  // the browser can actually render them
  useEffect(() => {
    const subs = source?.subtitles;
    if (!subs?.length) { setVtt([]); return; }
    let alive = true;
    const created: string[] = [];
    Promise.all(subs.map(async (s) => {
      const url = await toVttBlobUrl(s.url);
      if (url) created.push(url);
      return url ? { lang: s.lang, label: s.label, url } : null;
    })).then((tracks) => { if (alive) setVtt(tracks.filter(Boolean) as Array<{ lang: string; label: string; url: string }>); });
    return () => { alive = false; created.forEach((u) => URL.revokeObjectURL(u)); };
  }, [source]);

  // honor the default-subtitles-language setting once tracks exist
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const want = settings.subLang;
    let shown = -1;
    for (let i = 0; i < v.textTracks.length; i++) {
      const match = want !== 'off' && !!vtt[i]?.lang?.toLowerCase().startsWith(want);
      v.textTracks[i].mode = match && shown < 0 ? 'showing' : 'hidden';
      if (match && shown < 0) shown = i;
    }
    setCurrentSub(shown);
  }, [vtt, settings.subLang]);

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
  const setLevel = (i: number) => { const h = hlsRef.current; if (h) h.currentLevel = i; setCurLevel(i); };
  const setSpeed = (r: number) => { const v = videoRef.current; if (v) v.playbackRate = r; setRate(r); };
  const selectSub = (i: number) => {
    const v = videoRef.current; if (!v) return;
    for (let k = 0; k < v.textTracks.length; k++) v.textTracks[k].mode = k === i ? 'showing' : 'hidden';
    setCurrentSub(i);
  };
  const toggleCC = () => { if (!vtt.length) return; selectSub(ccOn ? -1 : Math.max(0, currentSub)); };
  const selectAudio = (i: number) => { const h = hlsRef.current; if (h) { try { h.audioTrack = i; } catch { /* ignore */ } } setCurAudio(i); };
  const toggleAcc = (sec: string) => setAcc((a) => ({ ...a, [sec]: !a[sec] }));

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

  // picture-enhance: rewrite the unsharp-mask convolution kernel from the clarity
  // slider (identity at 0 → 3×3 Laplacian sharpen at 1; energy-preserving so it
  // doesn't shift brightness)
  useEffect(() => {
    const k = kernelRef.current; if (!k) return;
    const c = settings.clarity;
    k.setAttribute('kernelMatrix', `0 ${-c} 0 ${-c} ${1 + 4 * c} ${-c} 0 ${-c} 0`);
  }, [settings.clarity]);

  if (!source) return <div className="vp-overlay" id="playerOverlay" />;

  const pct = dur ? (cur / dur) * 100 : 0;
  const bufPct = dur ? (buffered / dur) * 100 : 0;
  const hasSubs = vtt.length > 0;

  // ::cue styling from the subtitle settings (color / bg / size / outline)
  const ow = settings.subOutlineW, oc = settings.subOutline;
  const cueOutline = ow > 0 ? `text-shadow:${-ow}px ${-ow}px 0 ${oc},${ow}px ${-ow}px 0 ${oc},${-ow}px ${ow}px 0 ${oc},${ow}px ${ow}px 0 ${oc};` : '';
  const cueCss = `#playerVideo::cue{color:${settings.subColor};background-color:${settings.subBg};font-size:${settings.subSize}%;${cueOutline}}`;

  return (
    <div
      className={`vp-overlay open${hideUi ? ' hide-ui' : ''}${settings.enhance ? ' enhance-on' : ''}`}
      id="playerOverlay"
      ref={overlayRef}
      style={{ ['--grain' as string]: settings.enhance ? settings.grain : 0 }}
      onPointerMove={bump}
      onClick={(e) => { if (e.target === videoRef.current) togglePlay(); }}
    >
      {/* unsharp-mask filter for the Clarity control (kernel rewritten live above) */}
      <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <filter id="vpSharpen" colorInterpolationFilters="sRGB">
          <feConvolveMatrix ref={kernelRef} order="3" preserveAlpha="true" kernelMatrix="0 0 0 0 1 0 0 0 0" />
        </filter>
      </svg>
      <video
        id="playerVideo"
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        style={{ filter: settings.enhance && settings.clarity > 0 ? 'url(#vpSharpen)' : undefined }}
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
        {vtt.map((s, i) => (
          <track key={i} kind="subtitles" src={s.url} srcLang={s.lang} label={s.label} />
        ))}
      </video>

      {/* subtitle appearance from Settings, applied to the cue text */}
      <style>{cueCss}</style>

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
              <button className="vp-icon" id="vpGear" aria-label={t('ctl.settings_a')} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>{IcGear}</button>
              <div className={`vp-menu${menuOpen ? ' open' : ''}`} id="vpMenu" role="menu">
                {/* Subtitles */}
                <div className={`vp-acc${acc.subs ? ' open' : ''}`}>
                  <button className="vp-acc-head" aria-expanded={acc.subs} onClick={() => toggleAcc('subs')}>
                    {AccIc}<span className="vp-acc-label">{t('menu.subtitles')}</span>
                    <span className="vp-acc-val">{currentSub < 0 ? t('menu.off') : (vtt[currentSub]?.label || vtt[currentSub]?.lang || '')}</span>
                  </button>
                  <div className="vp-acc-body">
                    <OptRow on={currentSub < 0} label={t('menu.off')} onClick={() => selectSub(-1)} />
                    {vtt.length === 0 && <div className="vp-opt" style={{ opacity: 0.5 }}>{t('menu.no_subs_found')}</div>}
                    {vtt.map((s, i) => <OptRow key={i} on={i === currentSub} label={s.label || s.lang || `${t('menu.track')}${i + 1}`} onClick={() => selectSub(i)} />)}
                  </div>
                </div>
                {/* Audio language (HLS renditions) */}
                {audioTracks.length > 1 && (
                  <div className={`vp-acc${acc.audio ? ' open' : ''}`}>
                    <button className="vp-acc-head" aria-expanded={acc.audio} onClick={() => toggleAcc('audio')}>
                      {AccIc}<span className="vp-acc-label">{t('menu.audio_lang')}</span>
                      <span className="vp-acc-val">{audioTracks.find((a) => a.i === curAudio)?.name || ''}</span>
                    </button>
                    <div className="vp-acc-body">
                      {audioTracks.map((a) => <OptRow key={a.i} on={a.i === curAudio} label={a.name} onClick={() => selectAudio(a.i)} />)}
                    </div>
                  </div>
                )}
                {/* Playback speed */}
                <div className={`vp-acc${acc.speed ? ' open' : ''}`}>
                  <button className="vp-acc-head" aria-expanded={acc.speed} onClick={() => toggleAcc('speed')}>
                    {AccIc}<span className="vp-acc-label">{t('menu.speed')}</span><span className="vp-acc-val">{rate}×</span>
                  </button>
                  <div className="vp-acc-body">
                    <div className="vp-speeds">
                      {SPEEDS.map((r) => <button key={r} type="button" className={`vp-speed${r === rate ? ' on' : ''}`} onClick={() => setSpeed(r)}>{r}×</button>)}
                    </div>
                  </div>
                </div>
                {/* Quality (HLS levels) */}
                {levels.length > 1 && (
                  <div className={`vp-acc${acc.quality ? ' open' : ''}`}>
                    <button className="vp-acc-head" aria-expanded={acc.quality} onClick={() => toggleAcc('quality')}>
                      {AccIc}<span className="vp-acc-label">{t('menu.quality')}</span>
                      <span className="vp-acc-val">{curLevel < 0 ? t('menu.auto') : levelLabel(levels.find((l) => l.i === curLevel) || {})}</span>
                    </button>
                    <div className="vp-acc-body">
                      <OptRow on={curLevel < 0} label={t('menu.auto')} onClick={() => setLevel(-1)} />
                      {[...levels].sort((a, b) => (b.height || 0) - (a.height || 0)).map((l) => <OptRow key={l.i} on={l.i === curLevel} label={levelLabel(l)} onClick={() => setLevel(l.i)} />)}
                    </div>
                  </div>
                )}
                {/* Picture enhance */}
                <div className={`vp-acc${acc.enhance ? ' open' : ''}`}>
                  <button className="vp-acc-head" aria-expanded={acc.enhance} onClick={() => toggleAcc('enhance')}>
                    {AccIc}<span className="vp-acc-label">{t('menu.enhance')}</span>
                    <span className="vp-acc-val">{settings.enhance ? `${Math.round(settings.grain * 100)}%` : t('menu.off')}</span>
                  </button>
                  <div className="vp-acc-body">
                    <OptRow on={settings.enhance} label={t('menu.enhance_on')} onClick={() => updateSettings({ enhance: !settings.enhance })} />
                    <div className={`vp-enh-slider${settings.enhance ? '' : ' off'}`}>
                      <input type="range" min={0} max={0.35} step={0.01} value={settings.grain} disabled={!settings.enhance} onChange={(e) => updateSettings({ grain: +e.target.value })} aria-label={t('ctl.grain')} />
                      <span className="vp-enh-val">{Math.round(settings.grain * 100)}%</span>
                    </div>
                    <OptRow on={settings.clarity > 0} label={t('menu.clarity')} onClick={() => updateSettings({ clarity: settings.clarity > 0 ? 0 : 0.5 })} />
                    <div className={`vp-enh-slider${settings.clarity > 0 ? '' : ' off'}`}>
                      <input type="range" min={0} max={1} step={0.05} value={settings.clarity} disabled={settings.clarity <= 0} onChange={(e) => updateSettings({ clarity: +e.target.value })} aria-label={t('ctl.clarity')} />
                      <span className="vp-enh-val">{Math.round(settings.clarity * 100)}%</span>
                    </div>
                  </div>
                </div>
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
