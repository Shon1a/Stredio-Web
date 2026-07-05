import { useEffect, useRef, useState, type RefObject } from 'react';
import { useT } from '../../i18n/i18n';

/* Port of the modal trailer engine (assets/js/app.js: mountTrailer / teardownTrailer
 * / ytSrc / the window 'message' listener). A muted youtube-nocookie iframe is
 * injected into the slot; it reveals ONLY when the embed reports the PLAYING state
 * (so region-blocked / removed / embedding-disabled videos degrade to the backdrop
 * cover instead of showing an error). Loops in JS on ENDED. Mute toggles via the
 * IFrame API (no src reload, so sound never restarts the trailer). */

const REVEAL_DELAY = 4000;

function ytSrc(key: string, muted: boolean): string {
  return 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(key) +
    '?autoplay=1&' + (muted ? 'mute=1' : 'mute=0') +
    '&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&enablejsapi=1';
}

export function useTrailer(
  slotRef: RefObject<HTMLDivElement | null>,
  heroRef: RefObject<HTMLDivElement | null>,
  trailerKey: string | undefined,
  title: string,
) {
  const t = useT();
  const [muted, setMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const muteFnRef = useRef<((m: boolean) => void) | null>(null);
  const revealed = useRef(false);
  // keep the latest title without re-running the mount effect (which would reload the trailer)
  const titleRef = useRef(title);
  titleRef.current = title;

  useEffect(() => {
    const slot = slotRef.current, hero = heroRef.current;
    revealed.current = false;
    setMuted(true);
    hero?.classList.remove('has-trailer');
    iframeRef.current = null;
    if (!trailerKey || !slot) return;

    const ifr = document.createElement('iframe');
    ifr.title = t('modal.trailer_title', { title: titleRef.current || '' });
    ifr.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    ifr.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    ifr.setAttribute('tabindex', '-1');
    ifr.setAttribute('aria-hidden', 'true');
    ifr.addEventListener('load', () => {
      try { ifr.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: trailerKey, channel: 'widget' }), '*'); } catch { /* ignore */ }
    });
    ifr.src = ytSrc(trailerKey, true);
    slot.appendChild(ifr);
    iframeRef.current = ifr;

    const ytPost = (func: string, args?: unknown[]) => {
      try { ifr.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: args || [] }), '*'); } catch { /* ignore */ }
    };
    muteFnRef.current = (m: boolean) => { if (m) ytPost('mute'); else { ytPost('unMute'); ytPost('setVolume', [100]); } };

    const onMsg = (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== ifr.contentWindow) return;
      let d: unknown = e.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
      const msg = d as { event?: string; info?: { playerState?: number } | number };
      if (!msg) return;
      if (msg.event === 'onError') { ifr.src = 'about:blank'; ifr.remove(); iframeRef.current = null; hero?.classList.remove('has-trailer'); return; }
      const st = msg.event === 'onStateChange'
        ? (msg.info as number)
        : (msg.event === 'infoDelivery' && msg.info ? (msg.info as { playerState?: number }).playerState : undefined);
      if (st === 1 && !revealed.current) {
        revealed.current = true;
        setTimeout(() => {
          if (iframeRef.current !== ifr) return;
          ifr.classList.add('on');
          hero?.classList.add('has-trailer');
        }, REVEAL_DELAY);
      }
      if (st === 0) { ytPost('seekTo', [0, true]); ytPost('playVideo'); }
    };
    window.addEventListener('message', onMsg);

    return () => {
      window.removeEventListener('message', onMsg);
      try { ifr.src = 'about:blank'; } catch { /* ignore */ }
      ifr.remove();
      iframeRef.current = null;
      hero?.classList.remove('has-trailer');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailerKey]);

  const toggleMute = () => setMuted((m) => { const nm = !m; muteFnRef.current?.(nm); return nm; });
  return { muted, toggleMute };
}
