/* Shrinking and re-encoding a photograph in the browser, before it is uploaded.
 *
 * WHY THIS IS ONE FILE AND NOT THREE
 * There were three copies of this: `toSquareJpeg` in ProfileForm, a second
 * `toSquareJpeg` in the committee's version of the same form, and `downscale` in
 * PhotoProposeForm. A fourth uploader — the committee's gallery form, which is
 * the one that will handle almost every photograph this site ever gets — had no
 * copy at all and sent the raw file off the phone. So the most-used path was the
 * only unoptimised one, which is what happens to a rule kept in three places.
 *
 * WEBP, NOT JPEG
 * Same visual quality for roughly 25-35% fewer bytes, which is the whole of what
 * was asked for: smaller files, no visible loss. Every browser that can run this
 * site can decode WebP, and all the current ones can encode it too.
 *
 * The encode is VERIFIED rather than assumed. `canvas.toBlob(cb, 'image/webp')`
 * in a browser that cannot encode WebP does not fail — it silently hands back a
 * PNG, which for a photograph is several times LARGER than the JPEG it replaced.
 * So the returned blob's own type is checked and JPEG is used instead when WebP
 * did not happen. Never trust the format you asked for.
 *
 * IT WILL NOT MAKE A FILE BIGGER
 * If the result comes out larger than what came in and no resizing was needed,
 * the original is returned untouched. Somebody uploading an already-optimised
 * 80KB WebP should not get a 200KB re-encode of it back, and re-encoding a file
 * that is already small enough only throws away quality for nothing.
 */

export type Compressed = {
  blob: Blob
  /** For the storage key. The extension has to match the bytes or the CDN serves
   *  a Content-Type the browser then refuses to render. */
  ext: 'webp' | 'jpg' | 'png'
  contentType: string
  /** What actually happened, for the line of text shown to whoever is waiting. */
  before: number
  after: number
}

export type CompressOptions = {
  /** Longest edge of the result, in pixels. Never upscales. */
  maxEdge: number
  /** Crop to a square first. The crop is TOP-anchored — see below. */
  square?: boolean
  /** 0-1. 0.82 for WebP is about where artefacts stop being findable on a
   *  photograph; JPEG needs a little more for the same result. */
  quality?: number
}

const EXT: Record<string, Compressed['ext']> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

/** True when the browser can actually encode WebP, cached after the first ask. */
let webpEncodes: boolean | null = null
async function canEncodeWebp(): Promise<boolean> {
  if (webpEncodes !== null) return webpEncodes
  const probe = document.createElement('canvas')
  probe.width = probe.height = 8
  const blob = await new Promise<Blob | null>((r) => probe.toBlob(r, 'image/webp', 0.8))
  webpEncodes = blob?.type === 'image/webp'
  return webpEncodes
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode the image.'))),
      type, quality,
    ),
  )
}

export async function compressImage(
  file: File,
  { maxEdge, square = false, quality }: CompressOptions,
): Promise<Compressed> {
  const bitmap = await createImageBitmap(file)

  /* Read the source size NOW, into plain numbers. `bitmap.close()` below sets
     both to 0, and the "did we actually resize anything" test at the end used to
     read them afterwards — so it compared the output size against 0, decided
     every image had been resized, and the guard that refuses to hand back a
     bigger file never ran once. A 132KB JPEG came back as a 165KB WebP. */
  const srcW = bitmap.width
  const srcH = bitmap.height

  let sx = 0, sy = 0, sw = srcW, sh = srcH
  if (square) {
    /* THE CROP IS TOP-ANCHORED, and that is not a detail.
       Every card on this site displays a portrait with `object-position: 50% 0`,
       so nothing is ever taken off the top at display time. A centre crop here
       would take it off before the file was even stored — the one loss the
       display rule cannot undo — and on a portrait photographed in portrait
       orientation that is the top of somebody's head. Centred left to right,
       and the square starts at the very top of the frame. */
    const side = Math.min(srcW, srcH)
    sx = (srcW - side) / 2
    sy = 0
    sw = sh = side
  }

  // Never upscale: a 300px photograph asked to fill a 1600px box just gets
  // bigger on disk and blurrier on screen.
  const scale = Math.min(1, maxEdge / Math.max(sw, sh))
  const dw = Math.max(1, Math.round(sw * scale))
  const dh = Math.max(1, Math.round(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext('2d')
  if (!ctx) { bitmap.close?.(); throw new Error('This browser cannot resize the image.') }
  /* Both on, because the default in some browsers is a nearest-neighbour
     shrink that speckles skin and text. It costs a few milliseconds once. */
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh)
  bitmap.close?.()

  const webp = await canEncodeWebp()
  const type = webp ? 'image/webp' : 'image/jpeg'
  const q = quality ?? (webp ? 0.82 : 0.85)
  let blob = await encode(canvas, type, q)

  /* The verify. A browser that cannot encode WebP returns a PNG from a WebP
     request without complaining, and a PNG of a photograph is enormous. */
  if (blob.type !== type) {
    webpEncodes = false
    blob = await encode(canvas, 'image/jpeg', quality ?? 0.85)
  }

  /* Nothing needed resizing and the re-encode barely helps: keep the original.
     A re-encode is a fresh generation of lossy compression, so it is only worth
     taking when it buys something. Measured on this site's own files: an
     already-optimised 256KB WebP came back at 254KB — a 1% gain for a second
     lossy pass, which is a bad trade. Ten percent is the line; below it the
     original wins. Above it — a 14KB PNG-ish JPEG down to 12KB — take the saving.

     Only applies when nothing was resized. Once the picture has been shrunk the
     re-encode is not optional: the original is the wrong size. */
  const resized = dw !== srcW || dh !== srcH || square
  if (!resized && blob.size > file.size * 0.9 && EXT[file.type]) {
    return {
      blob: file, ext: EXT[file.type], contentType: file.type,
      before: file.size, after: file.size,
    }
  }

  return {
    blob,
    ext: EXT[blob.type] ?? 'jpg',
    contentType: blob.type || 'image/jpeg',
    before: file.size,
    after: blob.size,
  }
}

/** "4.2 MB → 310 KB", for the line of text shown to whoever is waiting. */
export function describeSaving({ before, after }: Pick<Compressed, 'before' | 'after'>): string {
  const kb = (n: number) => n >= 1048576
    ? `${(n / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`
  if (after >= before) return kb(after)
  return `${kb(before)} → ${kb(after)} (${Math.round((1 - after / before) * 100)}% smaller)`
}
