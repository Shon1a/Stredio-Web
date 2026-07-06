import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useModal } from '../../stores/modal';
import { usePlayer } from '../../stores/player';
import { useLibrary } from '../../stores/library';
import { useMeta } from '../../lib/queries';
import { useT, useGenre } from '../../i18n/i18n';
import { hueBg } from '../../lib/img';
import type { MetaDetail, MediaItem, CastMember } from '../../lib/types';
import { useTrailer } from './useTrailer';
import EpisodeChooser from './EpisodeChooser';
import { collectAddonStreams, type AddonStream } from '../../lib/addonClient';

const qualClass = (q: string) => (q === '4K' ? 'q-4k' : q === '1080p' ? 'q-1080' : 'q-720');

/* Detail modal — faithful port of the #overlay markup + openInfoModal/enrichModalMeta/
 * renderCast/renderRecs (assets/js/app.js). Seeded from the clicked card for an instant
 * paint, then enriched from /api/meta. The episode chooser (TV) is Phase 2b and the
 * stream list + player are Phase 2c/4 — a placeholder note holds that slot for now. */

const SpeakerOff = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><line x1="22" y1="9" x2="16" y2="15" /><line x1="16" y1="9" x2="22" y2="15" /></svg>
);
const SpeakerOn = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
);

function Avatar({ name, profile }: { name?: string; profile?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="m-avatar fallback" role="img" aria-label={name || ''}>
      <span className="m-avatar-ph" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 12.6a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2ZM12 14.4c-5.2 0-9 3.1-9 7.4V24h18v-2.2c0-4.3-3.8-7.4-9-7.4Z" /></svg></span>
      {profile && !broken && <img src={profile} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />}
    </span>
  );
}

function Cast({ meta, isTv }: { meta?: MetaDetail; isTv: boolean }) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const cast: CastMember[] = meta?.cast ?? [];
  const dirName = meta?.director || meta?.creators?.[0]?.name || '';
  const dirPhoto = meta?.creators?.find((c) => c.name === dirName)?.profile;
  const LIMIT = 5;
  if (!cast.length && !dirName) return null;

  return (
    <aside className={`m-cast${expanded ? ' expanded' : ''}`} id="mCast" aria-labelledby="mCastLabel">
      <h4 className="m-rail-label" id="mCastLabel">{t('modal.cast_credits')}</h4>
      {dirName && (
        <div className="m-cast-director">
          <Avatar name={dirName} profile={dirPhoto} />
          <div className="m-cast-body">
            <div className="m-cd-name">{dirName}</div>
            <div className="m-cd-role">{t(isTv ? 'modal.creator' : 'modal.director')}</div>
          </div>
        </div>
      )}
      <div className="m-cast-list">
        {cast.map((c, i) => (
          <div className={`m-cast-item${i >= LIMIT && !expanded ? ' m-hidden' : ''}`} key={i}>
            <Avatar name={c.name} profile={c.profile} />
            <div className="m-cast-body">
              <div className="m-cast-name">{c.name}</div>
              {c.character && <div className="m-cast-char">{t('modal.as', { name: c.character })}</div>}
            </div>
          </div>
        ))}
      </div>
      {cast.length > LIMIT && (
        <button className="m-showall" type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          <span className="m-showall-txt">{t(expanded ? 'modal.show_less' : 'modal.show_all')}</span>
          <span className="m-showall-chev" aria-hidden="true">▾</span>
        </button>
      )}
    </aside>
  );
}

function Recs({ meta, onOpen }: { meta?: MetaDetail; onOpen: (r: MediaItem) => void }) {
  const t = useT();
  const recs = (meta?.recommendations ?? []).filter((r) => r && (r.backdrop || r.poster));
  if (!recs.length) return null;
  return (
    <div className="m-recs" id="mRecs">
      <h4 className="m-rail-label m-recs-label">{t('modal.you_may_like')}</h4>
      <div className="rec-grid">
        {recs.map((r) => {
          const img = r.backdrop || r.poster;
          const tp = r.type === 'tv' ? 'SERIES' : 'MOVIE';
          const metaLine = r.year ? `${r.year} • ${tp}` : tp;
          return (
            <button className="rec-card" type="button" key={String(r.id)} onClick={() => onOpen(r)}>
              <span className="rec-thumb">
                {img && <img src={img} loading="lazy" decoding="async" alt="" />}
                {r.rating ? <span className="rec-rate">★ {r.rating}</span> : null}
              </span>
              <span className="rec-cap">
                <span className="rec-title">{r.title}</span>
                <span className="rec-meta">{metaLine}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DetailModal() {
  const t = useT();
  const genre = useGenre();
  const target = useModal((s) => s.target);
  const open = useModal((s) => s.open);
  const close = useModal((s) => s.close);
  const playSource = usePlayer((s) => s.play);
  const mylist = useLibrary((s) => s.mylist);
  const toggleList = useLibrary((s) => s.toggle);

  const heroRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamsRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [bdLoaded, setBdLoaded] = useState(false);
  const [pickedEp, setPickedEp] = useState<{ season: number; ep: number } | null>(null);
  const [streams, setStreams] = useState<AddonStream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);

  const isTv = target?.type === 'tv' || target?.type === 'series';
  const { data: meta } = useMeta(target?.id, target?.type);
  const { muted, toggleMute } = useTrailer(slotRef, heroRef, meta?.trailerKey || undefined, meta?.title || target?.title || '');

  // reset backdrop fade + scroll on each new title; seed the picked episode from a
  // Continue-Watching resume so OPEN builds the exact-episode key (id:S#E#)
  useEffect(() => {
    setBdLoaded(false);
    setPickedEp(target?.resumeEp ? { season: target.resumeEp.season, ep: target.resumeEp.episode } : null);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [target?.id, target?.resumeEp?.season, target?.resumeEp?.episode]);

  // client-direct add-on streams: ask every installed stream add-on for this title's
  // sources (movie → tt…; series → tt…:season:episode, once an episode is picked)
  useEffect(() => {
    const imdb = meta?.imdb;
    if (!imdb) { setStreams([]); return; }
    if (isTv && !pickedEp) { setStreams([]); return; }
    const videoId = isTv && pickedEp ? `${imdb}:${pickedEp.season}:${pickedEp.ep}` : imdb;
    const type = isTv ? 'series' : 'movie';
    let alive = true;
    setStreamsLoading(true); setStreams([]);
    collectAddonStreams(videoId, type)
      .then((s) => { if (alive) setStreams(s); })
      .finally(() => { if (alive) setStreamsLoading(false); });
    return () => { alive = false; };
  }, [meta?.imdb, isTv, pickedEp]);

  // picking an episode brings its freshly-loaded sources into view (matches vanilla)
  useEffect(() => { if (pickedEp) streamsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [pickedEp]);

  // close the modal when the route changes (navigating away dismisses it)
  const { pathname } = useLocation();
  useEffect(() => { close(); }, [pathname, close]);

  // Escape to close + focus the close button on open
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => closeBtnRef.current?.focus(), 40);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(id); };
  }, [target, close]);

  if (!target) return <div className="overlay" id="overlay" aria-hidden="true" />;

  const titleLogo = meta?.titleLogo;
  const title = meta?.title || target.title || '';
  const rating = meta?.rating ?? target.rating;
  const year = meta?.year ?? target.year;
  const genreChips = meta?.genre ?? (target.genre ? [target.genre] : []);
  const plot = meta ? (meta.plot || meta.tagline || t('modal.no_synopsis')) : t('modal.loading_synopsis');

  const epTotal = (meta?.seasonList ?? []).reduce((a, s) => a + (s.episodes || 0), 0);
  const added = mylist.some((m) => String(m.id) === String(target.id));
  const onAdd = () => toggleList({ id: target.id, type: target.type, title, year, rating, poster: meta?.poster || target.poster });

  const buildMedia = () => {
    const key = pickedEp ? `${target.id}:S${pickedEp.season}E${pickedEp.ep}` : String(target.id);
    return { id: target.id, key, title, poster: meta?.poster || target.poster, year, type: target.type, genre: target.genre, rating, ep: pickedEp ? `S${pickedEp.season}E${pickedEp.ep}` : undefined, season: pickedEp?.season ?? null, episode: pickedEp?.ep ?? null };
  };
  const playStream = (s: AddonStream) => playSource({
    url: s.url, kind: s.kind, title,
    subtitle: pickedEp ? `S${pickedEp.season} · E${pickedEp.ep}` : undefined,
    media: buildMedia(),
    subtitles: s.subtitles?.map((x) => ({ lang: x.lang, label: x.lang || 'Subtitle', url: x.url })),
  });
  // OPEN plays the first available add-on stream; falls back to the bundled demo when
  // no stream add-on is installed / returns nothing.
  const onOpen = () => {
    if (streams.length) playStream(streams[0]);
    else playSource({ url: '/assets/demo.mp4', title, subtitle: pickedEp ? `S${pickedEp.season} · E${pickedEp.ep}` : undefined, media: buildMedia() });
  };

  return (
    <div
      className="overlay open"
      id="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mTitle"
      aria-hidden="false"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="modal">
        <div className="m-scroll" id="mScroll" ref={scrollRef}>
          {/* HERO */}
          <div className="m-hero" id="mHero" ref={heroRef}>
            <div className="poster m-hero-bg" id="mPoster" aria-hidden="true" style={{ background: hueBg(target.seed || 0) }}>
              {target.poster && (
                <div className="art" style={{ position: 'absolute', inset: 0 }}>
                  <img className="m-ambient" src={target.poster} loading="lazy" alt="" />
                </div>
              )}
              {meta?.backdrop && (
                <div className="art" style={{ position: 'absolute', inset: 0 }}>
                  <img className={bdLoaded ? 'm-backdrop rdy' : 'm-backdrop'} src={meta.backdrop} alt="" decoding="async" onLoad={() => setBdLoaded(true)} />
                </div>
              )}
            </div>
            <div className="m-hero-trailer-slot" id="mTrailerSlot" ref={slotRef} aria-hidden="true" />
            <div className="m-hero-scrim" aria-hidden="true" />
            <button className="close m-disc" id="closeModal" ref={closeBtnRef} type="button" aria-label={t('modal.close_aria')} onClick={close}>✕</button>
            <button className="m-mute m-disc" id="mMuteBtn" type="button" aria-pressed={muted} aria-label={t(muted ? 'modal.unmute' : 'modal.mute')} onClick={toggleMute}>
              <span className="m-mute-ic" aria-hidden="true">{muted ? SpeakerOff : SpeakerOn}</span>
            </button>
            <div className="m-hero-inner">
              <div className="m-kicker" id="mKicker">{t(isTv ? 'modal.now_streaming' : 'modal.now_showing')}</div>
              <h2 id="mTitle" className={titleLogo ? 'has-logo' : ''}>
                {titleLogo ? <img className="title-logo" src={titleLogo} alt={title} /> : title}
              </h2>
              <div className="meta m-meta" id="mMeta">
                {rating ? <><span className="star">★</span> {rating}</> : null}
                {year ? <span>{year}</span> : null}
                {meta?.runtime ? <span>{meta.runtime}</span> : null}
                {isTv && meta?.seasons ? (
                  <span>{[meta.seasons === 1 ? t('modal.season_one') : t('modal.seasons_count', { n: meta.seasons }), epTotal ? t('modal.episodes_count', { n: epTotal }) : ''].filter(Boolean).join(' · ')}</span>
                ) : null}
              </div>
              <div className="m-genres" id="mGenres">
                {genreChips.map((g) => <span className="chip" key={g}>{genre(g)}</span>)}
              </div>
              <div className="m-hero-actions">
                <button className="hero-btn hero-play" id="mWatch" type="button" onClick={onOpen}>
                  <span className="ic" aria-hidden="true">▶</span><span>{t('modal.watch')}</span>
                </button>
                <button className={`hero-add m-disc${added ? ' on' : ''}`} id="mAdd" type="button" aria-pressed={added} aria-label={t(added ? 'mylist.remove' : 'mylist.add')} onClick={onAdd}>{added ? '✓' : '+'}</button>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div className="m-body">
            <div className="m-main">
              {meta?.tagline && <div className="m-tagline" id="mTagline">{meta.tagline}</div>}
              <p className="plot m-plot" id="mPlot">{plot}</p>

              {isTv && meta && <EpisodeChooser meta={meta} initial={target.resumeEp} onEpisode={(season, ep) => setPickedEp({ season, ep })} />}

              <div className="m-streams" ref={streamsRef}>
                <div className="m-rail-head">
                  <h4 className="m-rail-label">{t('modal.streams')}</h4>
                </div>
                <div id="streamList">
                  {isTv && !pickedEp ? (
                    <div className="demo-note">{t('modal.pick_episode')}</div>
                  ) : streamsLoading ? (
                    <div className="stream-source-label">{t('modal.loading_synopsis')}</div>
                  ) : streams.length ? (
                    streams.map((s, i) => (
                      <button className="addon-stream" type="button" key={i} aria-label={s.label} onClick={() => playStream(s)}>
                        <span className={`quality-badge ${qualClass(s.quality)}`}>{s.quality || 'SD'}</span>
                        <span className="stream-info">
                          <span className="stream-title">{s.label}</span>
                          <span className="stream-detail">{[s.size, s.source].filter(Boolean).join(' · ')}</span>
                        </span>
                        <span className="addon-stream-chevron" aria-hidden="true">›</span>
                      </button>
                    ))
                  ) : (
                    <div className="demo-note">{t('modal.no_streams')}</div>
                  )}
                </div>
              </div>
            </div>

            <Cast meta={meta} isTv={isTv} />
          </div>

          <Recs meta={meta} onOpen={(r) => { scrollRef.current?.scrollTo({ top: 0 }); open({ id: r.id, type: r.type, title: r.title, year: r.year, rating: r.rating, poster: r.poster, seed: 0 }); }} />
        </div>
      </div>
    </div>
  );
}
