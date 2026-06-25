// Carga de ffmpeg.wasm desde assets ESTÁTICOS del propio dominio (/ffmpeg/*).
//
// Por qué este enfoque es definitivo:
//  - No depende de blob: URLs (que provocaban "Cannot find module 'blob:...'"
//    en el worker al intentar resolver imports relativos).
//  - No depende de CDNs externos (que pueden caer o cambiar nombres de chunk).
//  - Mismo origen → no se requieren cabeceras COOP/COEP ni SharedArrayBuffer
//    (usamos el build single-thread de @ffmpeg/core 0.12.10).
//  - Funciona idéntico en preview Lovable y en producción publicada.
//
// Los archivos viven en /public/ffmpeg/:
//   - ffmpeg-core.js   (build UMD single-thread)
//   - ffmpeg-core.wasm
//   - worker.js        (worker oficial 814.ffmpeg.js renombrado)

let _ffmpegPromise: Promise<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ffmpeg: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchFile: any;
}> | null = null;

export function resetFFmpeg() {
  _ffmpegPromise = null;
}

export async function loadFFmpeg(onStage?: (s: string) => void) {
  if (_ffmpegPromise) {
    onStage?.("Motor de vídeo en caché…");
    return _ffmpegPromise;
  }
  onStage?.("Cargando motor de vídeo…");

  _ffmpegPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { fetchFile } = await import("@ffmpeg/util");

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const base = `${origin}/ffmpeg`;

    const ffmpeg = new FFmpeg();
    ffmpeg.on("log", ({ message }) => {
      if (typeof window !== "undefined" && (window as unknown as { __FFMPEG_DEBUG?: boolean }).__FFMPEG_DEBUG) {
        // eslint-disable-next-line no-console
        console.debug("[ffmpeg]", message);
      }
    });

    try {
      await ffmpeg.load({
        coreURL: `${base}/ffmpeg-core.js`,
        wasmURL: `${base}/ffmpeg-core.wasm`,
        classWorkerURL: `${base}/worker.js`,
      });
    } catch (e) {
      _ffmpegPromise = null;
      throw new Error(
        "No se pudo cargar el motor de vídeo. Recarga la página y vuelve a intentarlo. (" +
          String((e as Error)?.message ?? e) +
          ")",
      );
    }

    return { ffmpeg, fetchFile };
  })();

  return _ffmpegPromise;
}

export async function encodeNormalizedSegment(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ffmpeg: any,
  start: number,
  dur: number,
  outName: string,
  container: "ts" | "mp4",
) {
  const args = [
    "-ss", String(Math.max(0, start)),
    "-i", "input.mp4",
    "-t", String(Math.max(0.1, dur)),
    "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30",
    "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "128k",
  ];
  if (container === "ts") {
    args.push("-bsf:v", "h264_mp4toannexb", "-f", "mpegts", outName);
  } else {
    args.push("-movflags", "+faststart", outName);
  }
  await ffmpeg.exec(args);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export const sanitizeFilename = (s: string) =>
  s.replace(/[^a-z0-9_\-]+/gi, "_").slice(0, 40) || "clip";
