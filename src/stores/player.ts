import { create } from 'zustand';

/* What the video player is currently playing. null → closed. A source can be an
 * HLS manifest (.m3u8) or a progressive file (mp4/mkv/webm); the player probes
 * window.Hls for HLS and falls back to native. Real add-on streams (and their
 * subtitle tracks) are fed in from Phase 4; for now the detail modal opens the
 * bundled demo. */

export interface SubtitleTrack {
  lang: string;
  label: string;
  url: string;
}

export interface PlaySource {
  url: string;
  kind?: 'hls' | 'url';
  title?: string;
  subtitle?: string;      // shown under the title (e.g. "S1 · E1 — The Heirs of the Dragon")
  subtitles?: SubtitleTrack[];
}

interface PlayerState {
  source: PlaySource | null;
  play: (s: PlaySource) => void;
  close: () => void;
}

export const usePlayer = create<PlayerState>((set) => ({
  source: null,
  play: (source) => set({ source }),
  close: () => set({ source: null }),
}));
