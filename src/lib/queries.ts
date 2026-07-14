import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { HomePayload, Row, MediaItem, MediaType, MetaDetail, SeasonEpisodes } from './types';
import { useLang } from '../i18n/i18n';
import { usePlayer } from '../stores/player';

/* Query hooks — one per backend read. The `lang` query param is threaded from
 * the active UI language so the API can localize titles/logos. As screens land
 * in later phases they consume these; a couple are wired now to prove the path. */

// Refetch-on-focus gate: while the full-screen player is open on top, the page
// behind it is hidden, so a focus bounce (fullscreen/PiP toggle, the modal's
// trailer iframe) must NOT fan out into home/meta refetches. Resumes on close.
const refetchFocusUnlessPlaying = () => !usePlayer.getState().source;

export function useHome() {
  const { lang } = useLang();
  return useQuery({
    queryKey: ['home', lang],
    queryFn: () => api<HomePayload>(`/api/home?lang=${encodeURIComponent(lang)}`),
    // admin-editable content (covers, titles, Featured Hero) — mirror the API's
    // max-age=60 and refresh on tab focus so admin edits appear within ~a minute
    staleTime: 60 * 1000,
    refetchOnWindowFocus: refetchFocusUnlessPlaying,
  });
}

export function useBrowse(cat: string, page = 1, opts: { studio?: string; full?: boolean } = {}) {
  const { lang } = useLang();
  return useQuery({
    queryKey: ['browse', cat, page, opts, lang],
    queryFn: () => {
      const p = new URLSearchParams({ cat, page: String(page), lang });
      if (opts.studio) p.set('studio', opts.studio);
      if (opts.full) p.set('full', '1');
      return api<{ cat: string; totalPages: number; results: MediaItem[] }>(`/api/browse?${p}`);
    },
  });
}

export function useSearch(q: string, page = 1, type: MediaType | 'all' = 'all') {
  const { lang } = useLang();
  return useQuery({
    queryKey: ['search', q, page, type, lang],
    enabled: q.trim().length > 0,
    queryFn: () => {
      const p = new URLSearchParams({ q, page: String(page), lang });
      if (type !== 'all') p.set('type', type);
      return api<Row & { page: number }>(`/api/search?${p}`);
    },
  });
}

export function useMeta(id: string | number | undefined, type?: MediaItem['type']) {
  const { lang } = useLang();
  return useQuery({
    queryKey: ['meta', id, type, lang],
    enabled: id != null && id !== '',
    queryFn: () => {
      const p = new URLSearchParams({ lang });
      if (type === 'tv' || type === 'series') p.set('type', 'tv');
      return api<MetaDetail>(`/api/meta/${id}?${p}`);
    },
    // admin cover/title overrides — refresh quickly instead of caching 10 min
    staleTime: 60 * 1000,
    refetchOnWindowFocus: refetchFocusUnlessPlaying,
  });
}

export function useGenres() {
  const { lang } = useLang();
  return useQuery({
    queryKey: ['genres', lang],
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: () => api<{ genres: string[] }>(`/api/genres`),
  });
}

export function useSeason(id: string | number | undefined, season: number | undefined) {
  const { lang } = useLang();
  return useQuery({
    queryKey: ['season', id, season, lang],
    enabled: id != null && id !== '' && season != null,
    queryFn: () => api<SeasonEpisodes>(`/api/tv/${id}/season/${season}?lang=${encodeURIComponent(lang)}`),
  });
}
