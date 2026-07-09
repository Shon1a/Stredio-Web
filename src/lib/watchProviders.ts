import type { WatchProvider } from './types';

/* "Where to watch" — we only surface the eight major streaming services below, and
 * each button links straight into the real platform. The server resolves a DIRECT
 * title deep link per service (via JustWatch, e.g. netflix.com/title/81605886) and
 * hands it back as the provider's `link`; we use that when present and fall back to
 * the platform's own title search otherwise. Providers are matched against TMDB's
 * provider names by keyword so channel variants ("HBO Max Amazon Channel",
 * "Paramount+ with Showtime", "Apple TV Plus") collapse onto the canonical service. */

type Spec = { key: string; name: string; match: RegExp; search: (q: string) => string };

// Order here == display order.
const SERVICES: Spec[] = [
  { key: 'netflix', name: 'Netflix', match: /netflix/i, search: (q) => `https://www.netflix.com/search?q=${q}` },
  { key: 'disney', name: 'Disney+', match: /disney/i, search: (q) => `https://www.disneyplus.com/search?q=${q}` },
  { key: 'hbomax', name: 'HBO Max', match: /hbo|\bmax\b/i, search: (q) => `https://play.max.com/search?q=${q}` },
  { key: 'hulu', name: 'Hulu', match: /hulu/i, search: (q) => `https://www.hulu.com/search?q=${q}` },
  { key: 'prime', name: 'Prime Video', match: /prime video|amazon video|amazon prime/i, search: (q) => `https://www.amazon.com/s?k=${q}&i=instant-video` },
  { key: 'paramount', name: 'Paramount+', match: /paramount/i, search: (q) => `https://www.paramountplus.com/search/?query=${q}` },
  { key: 'apple', name: 'Apple TV', match: /apple\s*tv/i, search: (q) => `https://tv.apple.com/search?term=${q}` },
  { key: 'crunchyroll', name: 'Crunchyroll', match: /crunchyroll/i, search: (q) => `https://www.crunchyroll.com/search?q=${q}` },
];

export interface WatchService { key: string; name: string; logo?: string | null; link: string }

/** Keep only the eight canonical services (in display order), collapse channel
 *  variants onto one row each, and link each to the server's direct title deep
 *  link when available — otherwise the platform's own search page for `title`.
 *  Never TMDB. */
export function pickWatchServices(providers: WatchProvider[] | undefined, title: string): WatchService[] {
  const q = encodeURIComponent((title || '').trim());
  const out: WatchService[] = [];
  for (const spec of SERVICES) {
    const hit = (providers ?? []).find((p) => spec.match.test(p.name || ''));
    if (!hit) continue;
    out.push({ key: spec.key, name: spec.name, logo: hit.logo, link: hit.link || spec.search(q) });
  }
  return out;
}
