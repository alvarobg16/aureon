// Helpers to embed external videos (YouTube, Vimeo, direct MP4 / HLS).

export type ExternalVideoKind = "youtube" | "vimeo" | "direct" | "unknown";

export function detectExternalKind(url: string): ExternalVideoKind {
  if (!url) return "unknown";
  const u = url.trim();
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\//i.test(u)) return "youtube";
  if (/vimeo\.com\//i.test(u)) return "vimeo";
  if (/\.(mp4|webm|ogg|m3u8|mov)(\?.*)?$/i.test(u)) return "direct";
  return "unknown";
}

export function getYouTubeId(url: string): string | null {
  const m =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

export function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

export function getEmbedUrl(url: string): string | null {
  const kind = detectExternalKind(url);
  if (kind === "youtube") {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : null;
  }
  if (kind === "vimeo") {
    const id = getVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}

export function isEmbeddable(url: string): boolean {
  const k = detectExternalKind(url);
  return k === "youtube" || k === "vimeo";
}
