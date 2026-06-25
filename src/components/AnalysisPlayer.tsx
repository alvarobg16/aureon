import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { detectExternalKind, getYouTubeId, getVimeoId } from "@/lib/videoEmbed";

export type PlayerHandle = {
  play: () => void;
  pause: () => void;
  readonly paused: boolean;
  currentTime: number;
  readonly duration: number;
  playbackRate: number;
  addEventListener: (ev: string, cb: () => void) => void;
  removeEventListener: (ev: string, cb: () => void) => void;
};

type Props = {
  src: string;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: () => void;
  onLoadedMetadata?: () => void;
};

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise<void>((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });
  return ytApiPromise;
}

let vimeoApiPromise: Promise<any> | null = null;
function loadVimeoSDK(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if ((window as any).Vimeo?.Player) return Promise.resolve((window as any).Vimeo);
  if (vimeoApiPromise) return vimeoApiPromise;
  vimeoApiPromise = new Promise<any>((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://player.vimeo.com/api/player.js";
    tag.onload = () => resolve((window as any).Vimeo);
    document.body.appendChild(tag);
  });
  return vimeoApiPromise;
}

export const AnalysisPlayer = forwardRef<PlayerHandle, Props>(function AnalysisPlayer(
  { src, onPlay, onPause, onTimeUpdate, onLoadedMetadata },
  ref,
) {
  const kind = detectExternalKind(src);
  const useHtml5 = kind === "direct" || kind === "unknown";

  const videoRef = useRef<HTMLVideoElement>(null);
  const ytContainerRef = useRef<HTMLDivElement>(null);
  const vimeoContainerRef = useRef<HTMLDivElement>(null);
  const playerObjRef = useRef<any>(null);
  const [, force] = useState(0);

  useImperativeHandle(ref, (): PlayerHandle => {
    if (useHtml5) {
      const el = videoRef.current;
      return {
        play: () => el?.play(),
        pause: () => el?.pause(),
        get paused() { return el?.paused ?? true; },
        get currentTime() { return el?.currentTime ?? 0; },
        set currentTime(t: number) { if (el) el.currentTime = t; },
        get duration() { return el?.duration ?? 0; },
        get playbackRate() { return el?.playbackRate ?? 1; },
        set playbackRate(r: number) { if (el) el.playbackRate = r; },
        addEventListener: (ev, cb) => el?.addEventListener(ev, cb),
        removeEventListener: (ev, cb) => el?.removeEventListener(ev, cb),
      };
    }
    if (kind === "youtube") {
      const p = playerObjRef.current;
      const obj = playerObjRef.current;
      const listeners: Record<string, Array<() => void>> = obj ? (obj.__listeners ||= {}) : {};
      return {
        play: () => p?.playVideo?.(),
        pause: () => p?.pauseVideo?.(),
        get paused() {
          if (!p?.getPlayerState) return true;
          // 1 = playing, 3 = buffering
          const s = p.getPlayerState();
          return s !== 1 && s !== 3;
        },
        get currentTime() { return p?.getCurrentTime?.() ?? 0; },
        set currentTime(t: number) { p?.seekTo?.(t, true); },
        get duration() { return p?.getDuration?.() ?? 0; },
        get playbackRate() { return p?.getPlaybackRate?.() ?? 1; },
        set playbackRate(r: number) { p?.setPlaybackRate?.(r); },
        addEventListener: (ev, cb) => { (listeners[ev] ||= []).push(cb); },
        removeEventListener: (ev, cb) => {
          const arr = listeners[ev]; if (!arr) return;
          const i = arr.indexOf(cb); if (i >= 0) arr.splice(i, 1);
        },
      };
    }
    // Vimeo
    const p = playerObjRef.current;
    const obj: any = p;
    const cache: { paused: boolean; currentTime: number; duration: number; playbackRate: number } =
      obj ? (obj.__cache ||= { paused: true, currentTime: 0, duration: 0, playbackRate: 1 }) : { paused: true, currentTime: 0, duration: 0, playbackRate: 1 };
    const listeners: Record<string, Array<() => void>> = obj ? (obj.__listeners ||= {}) : {};
    return {
      play: () => p?.play?.(),
      pause: () => p?.pause?.(),
      get paused() { return cache.paused; },
      get currentTime() { return cache.currentTime; },
      set currentTime(t: number) { p?.setCurrentTime?.(t); cache.currentTime = t; },
      get duration() { return cache.duration; },
      get playbackRate() { return cache.playbackRate; },
      set playbackRate(r: number) { p?.setPlaybackRate?.(r); cache.playbackRate = r; },
      addEventListener: (ev, cb) => { (listeners[ev] ||= []).push(cb); },
      removeEventListener: (ev, cb) => {
        const arr = listeners[ev]; if (!arr) return;
        const i = arr.indexOf(cb); if (i >= 0) arr.splice(i, 1);
      },
    };
  });

  // Mount YouTube
  useEffect(() => {
    if (kind !== "youtube") return;
    let destroyed = false;
    let interval: any;
    (async () => {
      await loadYouTubeAPI();
      if (destroyed || !ytContainerRef.current) return;
      const id = getYouTubeId(src);
      if (!id) return;
      const player = new window.YT.Player(ytContainerRef.current, {
        videoId: id,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 1 },
        events: {
          onReady: () => {
            playerObjRef.current = player;
            force(n => n + 1);
            onLoadedMetadata?.();
            // poll for time updates
            interval = setInterval(() => {
              onTimeUpdate?.();
              const ls = (playerObjRef.current?.__listeners || {})["timeupdate"];
              ls?.forEach((cb: () => void) => cb());
            }, 200);
          },
          onStateChange: (e: any) => {
            if (e.data === 1) onPlay?.();
            else if (e.data === 2) onPause?.();
            const evName = e.data === 1 ? "play" : e.data === 2 ? "pause" : null;
            if (evName) {
              const ls = (playerObjRef.current?.__listeners || {})[evName];
              ls?.forEach((cb: () => void) => cb());
            }
          },
        },
      });
      playerObjRef.current = player;
    })();
    return () => {
      destroyed = true;
      if (interval) clearInterval(interval);
      try { playerObjRef.current?.destroy?.(); } catch { /* noop */ }
      playerObjRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, kind]);

  // Mount Vimeo
  useEffect(() => {
    if (kind !== "vimeo") return;
    let destroyed = false;
    (async () => {
      const Vimeo = await loadVimeoSDK();
      if (destroyed || !vimeoContainerRef.current || !Vimeo) return;
      const id = getVimeoId(src);
      if (!id) return;
      const player = new Vimeo.Player(vimeoContainerRef.current, {
        id: Number(id), responsive: true,
      });
      playerObjRef.current = player;
      const cache = (playerObjRef.current.__cache ||= { paused: true, currentTime: 0, duration: 0, playbackRate: 1 });
      const fire = (ev: string) => {
        const ls = (playerObjRef.current?.__listeners || {})[ev];
        ls?.forEach((cb: () => void) => cb());
      };
      player.on("loaded", async () => {
        cache.duration = await player.getDuration();
        onLoadedMetadata?.();
        force(n => n + 1);
      });
      player.on("timeupdate", (d: any) => {
        cache.currentTime = d.seconds;
        cache.duration = d.duration;
        onTimeUpdate?.();
        fire("timeupdate");
      });
      player.on("play", () => { cache.paused = false; onPlay?.(); fire("play"); });
      player.on("pause", () => { cache.paused = true; onPause?.(); fire("pause"); });
    })();
    return () => {
      destroyed = true;
      try { playerObjRef.current?.destroy?.(); } catch { /* noop */ }
      playerObjRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, kind]);

  if (kind === "youtube") {
    return <div ref={ytContainerRef} className="w-full h-full" />;
  }
  if (kind === "vimeo") {
    return <div ref={vimeoContainerRef} className="w-full h-full" />;
  }
  return (
    <video
      ref={videoRef}
      src={src}
      className="w-full h-full"
      onPlay={onPlay}
      onPause={onPause}
      onTimeUpdate={onTimeUpdate}
      onLoadedMetadata={onLoadedMetadata}
      playsInline
      controls={false}
    />
  );
});
