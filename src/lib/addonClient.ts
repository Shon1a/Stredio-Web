import { useAddons, type AddonRecord } from '../stores/addons';
import type { MediaItem } from './types';

/* Client-direct add-on transport — port of the vanilla addon fetch layer
 * (assets/js/app.js). The BROWSER fetches an installed add-on's streams and
 * catalogs DIRECTLY (the server is never involved). This is what makes an
 * installed community add-on actually do something: supply stream sources for a
 * title, and catalog rows for the home screen. */

export interface AddonStream {
  source: string;
  label: string;
  quality: string;
  size: string | null;
  kind: 'hls' | 'url';
  url: string;
  langs: string[];
  subtitles?: Array<{ url: string; lang: string }>;
}

const installed = (): AddonRecord[] => useAddons.getState().installed;

export function addonBaseUrl(manifestUrl: string): string {
  return String(manifestUrl || '').replace(/[^/]*$/, '');
}

export function addonHasResource(a: AddonRecord, resource: string, type?: string): boolean {
  const m = a?.manifest || {};
  const res = (m.resources || []).map((r) => (typeof r === 'string' ? r : (r as { name?: string })?.name)).filter(Boolean) as string[];
  return res.includes(resource) && (!type || (m.types || []).includes(type));
}

async function fetchAddonJSON<T>(base: string, path: string): Promise<T> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(base + path, { headers: { accept: 'application/json' }, signal: ctrl.signal });
    if (!r.ok) throw new Error('addon ' + r.status);
    return await r.json() as T;
  } finally { clearTimeout(to); }
}

function detectQuality(t: string): string {
  t = (t || '').toLowerCase();
  if (/(2160|\b4k\b|uhd)/.test(t)) return '4K';
  if (/1080/.test(t)) return '1080p';
  if (/720/.test(t)) return '720p';
  if (/480/.test(t)) return '480p';
  return '';
}
function extractSize(t: string): string | null {
  const m = (t || '').match(/(\d+(?:\.\d+)?)\s?(gb|mb)/i);
  return m ? m[1] + ' ' + m[2].toUpperCase() : null;
}

const FLAG_LANG: Record<string, string> = { GB: 'en', US: 'en', AU: 'en', CA: 'en', IE: 'en', NZ: 'en', RU: 'ru', UA: 'uk', GE: 'ka', FR: 'fr', DE: 'de', IT: 'it', ES: 'es', MX: 'es', PT: 'pt', BR: 'pt', JP: 'ja', KR: 'ko', CN: 'zh', TR: 'tr', PL: 'pl', NL: 'nl' };
function parseStreamLangs(text: string): string[] {
  const out: string[] = [];
  const re = /([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text || ''))) {
    const cc = String.fromCharCode(m[1].codePointAt(0)! - 0x1F1E6 + 65) + String.fromCharCode(m[2].codePointAt(0)! - 0x1F1E6 + 65);
    const l = FLAG_LANG[cc] || cc.toLowerCase();
    if (l && out.indexOf(l) < 0) out.push(l);
  }
  return out;
}

interface RawStream { name?: string; title?: string; description?: string; url?: string; behaviorHints?: { streamType?: string; lang?: string }; subtitles?: Array<{ url?: string; lang?: string }> }

function mapAddonStream(s: RawStream, addonName: string): AddonStream | null {
  const label = [s.name, s.title, s.description].filter(Boolean).join('\n');
  const url = s.url || '';
  if (!url) return null;
  const bh = s.behaviorHints || {};
  const isHls = bh.streamType === 'hls' || /\.(m3u8|txt)(\?|$)/i.test(url) || /\/hls\//i.test(url);
  const flagLangs = parseStreamLangs(label);
  const langs = bh.lang ? [bh.lang] : (flagLangs.length ? flagLangs : ['en']);
  return {
    source: addonName,
    label: label || 'Source',
    quality: detectQuality(label),
    size: extractSize(label),
    kind: isHls ? 'hls' : 'url',
    url,
    langs,
    subtitles: Array.isArray(s.subtitles) ? s.subtitles.map((x) => ({ url: x.url || '', lang: x.lang || '' })).filter((x) => x.url) : undefined,
  };
}

/** Ask every installed stream add-on for its streams for one video id, in parallel,
 *  entirely in the browser. `videoId` is the IMDb id (or `tt…:season:episode`). */
export async function collectAddonStreams(videoId: string, type: 'movie' | 'series'): Promise<AddonStream[]> {
  const addons = installed().filter((a) => addonHasResource(a, 'stream', type));
  if (!addons.length) return [];
  const path = 'stream/' + type + '/' + encodeURIComponent(videoId) + '.json';
  const per = await Promise.all(addons.map(async (a) => {
    try {
      const data = await fetchAddonJSON<{ streams?: RawStream[] }>(addonBaseUrl(a.url), path);
      return (data.streams || []).map((s) => mapAddonStream(s, a.manifest?.name || 'Add-on')).filter(Boolean) as AddonStream[];
    } catch { return []; }
  }));
  return per.flat();
}

interface CatalogMeta { id: string; name?: string; poster?: string; releaseInfo?: string; year?: string; imdbRating?: string; genres?: string[] | string; genre?: string[] | string; type?: string }

function mapCatalogMeta(m: CatalogMeta): MediaItem {
  const genres = m.genres || m.genre || [];
  return {
    id: m.id,
    type: (m.type === 'series' ? 'series' : 'movie'),
    title: m.name || 'Untitled',
    year: String(m.releaseInfo || m.year || '').slice(0, 4) || '',
    rating: m.imdbRating ? +parseFloat(m.imdbRating).toFixed(1) : 0,
    genre: (Array.isArray(genres) ? genres[0] : genres) || '',
    poster: m.poster || undefined,
  };
}

export interface AddonCatalog { addonId: string; addonName: string; type: string; id: string; name: string; base: string }

/** Enumerate the catalogs declared by installed community add-ons (skips add-ons
 *  with no catalog resource). Each becomes a home row. */
export function listAddonCatalogs(): AddonCatalog[] {
  const out: AddonCatalog[] = [];
  for (const a of installed()) {
    if (!addonHasResource(a, 'catalog')) continue;
    for (const c of (a.manifest?.catalogs || []) as Array<{ type: string; id: string; name?: string }>) {
      out.push({ addonId: a.id, addonName: a.manifest?.name || 'Add-on', type: c.type, id: c.id, name: c.name || a.manifest?.name || 'Add-on', base: addonBaseUrl(a.url) });
    }
  }
  return out;
}

/** Fetch one catalog's items (poster-card shape) directly from the add-on. */
export async function fetchAddonCatalog(c: AddonCatalog): Promise<MediaItem[]> {
  try {
    const data = await fetchAddonJSON<{ metas?: CatalogMeta[] }>(c.base, `catalog/${c.type}/${encodeURIComponent(c.id)}.json`);
    return (data.metas || []).map(mapCatalogMeta).filter((m) => m.poster);
  } catch { return []; }
}
