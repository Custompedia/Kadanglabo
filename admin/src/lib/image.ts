import { upload } from './api'
import { mutate } from './useFetch'

/*
 * Every upload is resized here, in the browser, exactly like scripts/optimize-image.mjs does for the site's own
 * images: fit inside 1920 × 1920 (never enlarged), WebP at 640 / 960 / 1280 / 1920 below the master width plus the master
 * width itself, and the dominant colour for the placeholder. The original travels along and is kept privately.
 */

const MAX = 1920
const WIDTHS = [640, 960, 1280, 1920] // 960 between: frames of ~700-950px need not decode a 1280 file
const QUALITY = 0.8
export const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

export interface Uploaded {
  id: string
  w: number
  h: number
  c: string
  s: number[]
}

async function encode(bitmap: ImageBitmap, w: number, h: number) {
  const canvas = new OffscreenCanvas(w, h)
  const g = canvas.getContext('2d')!
  g.imageSmoothingQuality = 'high'
  g.drawImage(bitmap, 0, 0, w, h)
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: QUALITY })
  if (blob.type !== 'image/webp') throw new Error('Browser ini tidak bisa membuat WebP. Pakai Chrome, Edge, atau Firefox terbaru.')
  return blob
}

function dominant(bitmap: ImageBitmap) {
  const canvas = new OffscreenCanvas(24, 24)
  const g = canvas.getContext('2d')!
  g.drawImage(bitmap, 0, 0, 24, 24)
  const d = g.getImageData(0, 0, 24, 24).data
  let r = 0, gg = 0, b = 0
  for (let i = 0; i < d.length; i += 4) (r += d[i]), (gg += d[i + 1]), (b += d[i + 2])
  const n = d.length / 4
  return '#' + [r, gg, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')
}

/** Resize, encode and upload one image file. `onProgress` gets 0..1 (the first 30% is the resizing). */
export async function uploadImage(file: File, onProgress: (share: number) => void = () => {}): Promise<Uploaded> {
  if (!file.type.startsWith('image/')) throw new Error(`“${file.name}” bukan file gambar.`)
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`“${file.name}” tidak bisa dibuka. Gunakan JPG, PNG, atau WebP (HEIC dari iPhone belum didukung).`)
  }
  const scale = Math.min(1, MAX / bitmap.width, MAX / bitmap.height)
  const mw = Math.round(bitmap.width * scale)
  const mh = Math.round(bitmap.height * scale)
  const sizes = [...WIDTHS.filter((w) => w < mw), mw]

  const form = new FormData()
  for (const [i, w] of sizes.entries()) {
    form.append(`w${w}`, await encode(bitmap, w, Math.round((mh * w) / mw)), `${w}.webp`)
    onProgress(((i + 1) / sizes.length) * 0.3)
  }
  form.append('meta', JSON.stringify({ filename: file.name, w: mw, h: mh, color: dominant(bitmap), sizes }))
  form.append('original', file, file.name)
  bitmap.close()

  const r = await upload<Uploaded>('/media', form, (p) => onProgress(0.3 + p * 0.7))
  mutate('/media')
  mutate('/storage')
  return r
}
