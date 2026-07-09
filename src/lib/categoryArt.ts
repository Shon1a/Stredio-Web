import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { imgW } from './img';
import { useLang } from '../i18n/i18n';
import type { MediaItem } from './types';

/* Category-card artwork — pulls a handful of backdrops for a category so the
 * Categories hub can paint a blended poster collage behind each tile (instead
 * of a flat gradient). Collections/networks read /api/browse; genres read
 * /api/catalog?genre=. Cached for hours: the imagery barely changes and we
 * never want the hub to feel like it's "loading a grid". The gradient tile is
 * always visible first — art fades in on top once these resolve. */

export type ArtSrc =
  | { kind: 'browse'; cat: string; skip?: number }
  | { kind: 'genre'; g: string; skip?: number };

function artUrl(src: ArtSrc, lang: string): string {
  if (src.kind === 'genre') {
    return `/api/catalog?${new URLSearchParams({ genre: src.g, page: '1', lang })}`;
  }
  return `/api/browse?${new URLSearchParams({ cat: src.cat, page: '1', lang })}`;
}

export function useCategoryArt(key: string, src: ArtSrc, count = 1) {
  const { lang } = useLang();
  return useQuery({
    queryKey: ['cat-art', key, lang],
    // artwork is effectively static — keep it warm so revisits are instant
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<string[]> => {
      const data = await api<{ results?: MediaItem[] }>(artUrl(src, lang));
      // `skip` lets two cards backed by the same feed (e.g. Movies vs Trending,
      // both trending_movie) show different stills instead of duplicating.
      const items = (data.results ?? []).slice(src.skip ?? 0);
      const shots: string[] = [];
      for (const it of items) {
        const raw = (it.backdrop || it.poster) as string | undefined;
        // tiles render a ~150px-wide strip of 3 stills; w300 is ample even at 2× DPR
        // and roughly halves the bytes vs the old w500.
        if (raw) shots.push(imgW(raw, 'w300'));
        if (shots.length >= count) break;
      }
      return shots;
    },
  });
}
