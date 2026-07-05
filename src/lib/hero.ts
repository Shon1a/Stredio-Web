import type { MediaItem } from './types';
import { imgW, HUES } from './img';

/* Hero helpers ported from assets/js/app.js (heroBg / heroBgFallback /
 * pickFeatured / dedupeFeatured). */

/** matches the server's /api/hero cap + the admin picker */
export const HERO_MAX = 8;

/** DPR-aware backdrop rendition: TMDB serves backdrops in w780/w1280/original
 *  only, so pick the smallest that still covers the device's real pixel width.
 *  Returns '' if the title has no art (→ branded gradient fallback). */
export function heroBgUrl(it: MediaItem): string {
  const url = it.backdrop || it.poster || '';
  if (!url) return '';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const need = (window.innerWidth || 1280) * dpr;
  const size = need <= 820 ? 'w780' : need <= 1440 ? 'w1280' : 'original';
  return imgW(url, size);
}

/** branded neutral dark-grey gradient shown before/instead of a real backdrop */
export function heroFallbackGradient(it: MediaItem): string {
  const s = String(it.title || '');
  const sum = [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
  const h = HUES[Math.abs(sum) % HUES.length];
  return `linear-gradient(135deg,hsl(0 0% ${14 + (h % 6)}%),hsl(0 0% ${6 + (h % 6)}%))`;
}

/** small thumbnail rendition for the hero dot strip */
export function heroThumbUrl(it: MediaItem): string {
  const b = (it.backdrop || '').replace('/t/p/original/', '/t/p/w300/');
  return b || it.poster || '';
}

/** preserve the given order (admin-curated / trending feed): drop blanks +
 *  title duplicates, cap to n. */
export function dedupeFeatured(list: MediaItem[] | undefined, n = HERO_MAX): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const m of list || []) {
    const title = String(m?.title ?? '');
    if (!m || seen.has(title)) continue;
    seen.add(title);
    out.push(m);
    if (out.length >= n) break;
  }
  return out;
}
