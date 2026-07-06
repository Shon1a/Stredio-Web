/* Client-side subtitle prep — port of the vanilla subtitleBlobUrl/srtToVttC. Add-ons
 * hand back SRT (often gzipped); browsers only render VTT via <track>, so we fetch,
 * gunzip if needed, convert SRT→VTT, and hand the player a same-origin blob: URL (no
 * CORS on the track). A subtitle host without permissive CORS simply can't be read
 * and is skipped. */

function srtToVtt(srt: string): string {
  const body = String(srt).replace(/\r+/g, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return /^\s*WEBVTT/.test(body) ? body : 'WEBVTT\n\n' + body;
}

interface DecompressionStreamCtor { new (format: string): ReadableWritablePair<Uint8Array, Uint8Array> }

export async function toVttBlobUrl(srcUrl: string): Promise<string | null> {
  try {
    const r = await fetch(srcUrl);
    if (!r.ok) return null;
    let buf = new Uint8Array(await r.arrayBuffer());
    const gz = /\.gz($|\?)/i.test(srcUrl) || (buf[0] === 0x1f && buf[1] === 0x8b);
    const DS = (window as unknown as { DecompressionStream?: DecompressionStreamCtor }).DecompressionStream;
    if (gz && DS) {
      try {
        const stream = new Blob([buf]).stream().pipeThrough(new DS('gzip'));
        buf = new Uint8Array(await new Response(stream).arrayBuffer());
      } catch { /* not actually gzip — use as-is */ }
    }
    const vtt = srtToVtt(new TextDecoder('utf-8').decode(buf));
    return URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
  } catch { return null; }
}
