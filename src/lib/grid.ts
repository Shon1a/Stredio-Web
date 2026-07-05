/* Drill-down / Explore grid descriptors + URL builder — the React port of the
 * vanilla GRID controller's gridUrl(). One descriptor drives category, studio,
 * search and filter loads through the same paginated grid. */

export type GridDesc =
  | { kind: 'category'; cat: string; title: string }
  | { kind: 'studio'; studio: string; title: string }
  | { kind: 'search'; query: string; type: 'all' | 'movie' | 'tv'; title: string }
  | { kind: 'filter'; filters: Record<string, string>; title: string };

export function gridUrl(desc: GridDesc, page: number, lang: string): string {
  if (desc.kind === 'category') {
    return `/api/browse?cat=${encodeURIComponent(desc.cat)}&page=${page}&lang=${lang}&full=1`;
  }
  if (desc.kind === 'studio') {
    return `/api/browse?cat=studio&studio=${encodeURIComponent(desc.studio)}&page=${page}&lang=${lang}&full=1`;
  }
  if (desc.kind === 'search') {
    const ty = desc.type && desc.type !== 'all' ? `&type=${desc.type}` : '';
    return `/api/search?q=${encodeURIComponent(desc.query)}&page=${page}&lang=${lang}${ty}`;
  }
  const sp = new URLSearchParams(desc.filters);
  sp.set('page', String(page));
  sp.set('lang', lang);
  return '/api/catalog?' + sp.toString();
}
