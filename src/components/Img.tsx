import type { ImgHTMLAttributes } from 'react'
import images from '../data/images.json'

/**
 * An image id: a key of the bundled manifest (src/data/images.json, files in /public/img), or the id of an image
 * uploaded through the CMS (files in R2, served at /media). Both have the same sizes and naming.
 */
export type ImgKey = keyof typeof images | (string & {})
type Meta = { w: number; h: number; c: string; s: number[] }

const bundled = images as Record<string, Meta>
const uploaded: Record<string, Meta> = {}

/** Sizes of the CMS images the loaded content uses (src/lib/content.ts). */
export const registerMedia = (m: Record<string, Meta>) => Object.assign(uploaded, m)

const FALLBACK: Meta = { w: 1600, h: 1000, c: 'transparent', s: [1280] }
export const imgMeta = (id: ImgKey): Meta => bundled[id] ?? uploaded[id] ?? FALLBACK
const base = (id: ImgKey) => (bundled[id] ? '/img' : '/media')

/** Smallest generated width that is >= target (falls back to the largest). */
export function imgSrc(id: ImgKey, target = 1280) {
  const { s } = imgMeta(id)
  const w = s.find((x) => x >= target) ?? s[s.length - 1]
  return `${base(id)}/${id}-${w}.webp`
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'width' | 'height' | 'id'> & {
  id: ImgKey
  /** above-the-fold image: eager + high fetch priority (the preloader waits for it) */
  priority?: boolean
}

/**
 * `sizes` for an eager photo that covers a full-width frame `svh` tall (and at least `minPx` tall): the photo is drawn
 * at whichever is wider, the screen or the frame's height at the photo's own shape - on a portrait phone a landscape
 * photo is cropped hard, so it needs a far wider file than "100vw" would fetch (see heroImageSizes for the home hero).
 */
export function coverSizes(id: ImgKey, svh: number, minPx = 0) {
  const { w, h } = imgMeta(id)
  const r = w / h
  return `max(100vw, ${(r * svh).toFixed(2)}svh${minPx ? `, ${(r * minPx).toFixed(2)}px` : ''})`
}

/*
 * Exact sizes for lazy photos. The `sizes` written in the markup is an estimate of the frame's width, but a photo that
 * covers a frame of another shape (a landscape shot in a portrait frame) is drawn wider than its frame, so the
 * browser would pick a file that looks soft; elsewhere the estimate is too generous and wastes memory. Once laid out,
 * every lazy photo reports its real box (ResizeObserver: no extra layout pass, and it runs before the browser decides
 * to fetch a lazy image), and `sizes` becomes the width it is actually drawn at, so the browser picks the smallest
 * file that is still sharp on this screen. It follows resizes, too. Eager photos (the hero) keep their own sizes: they
 * are already downloading by then.
 */
const ratioOf = new WeakMap<Element, number>()
const fitObserver =
  typeof ResizeObserver === 'function'
    ? new ResizeObserver((entries) => {
        for (const e of entries) {
          const img = e.target as HTMLImageElement
          const { width: w, height: h } = e.contentRect
          if (w < 1 || h < 1) continue // not shown (display: none, a collapsed slot): keep the estimate
          const cover = getComputedStyle(img).objectFit === 'cover'
          const drawn = cover ? Math.max(w, h * (ratioOf.get(img) ?? w / h)) : w
          const next = `${Math.ceil(drawn)}px`
          if (img.sizes !== next) img.sizes = next
        }
      })
    : null

function fitWhenLazy(img: HTMLImageElement | null) {
  if (!img || !fitObserver) return
  if (img.loading !== 'lazy') return
  ratioOf.set(img, Number(img.getAttribute('width')) / Number(img.getAttribute('height'))) // the photo's own shape
  fitObserver.observe(img)
  return () => fitObserver.unobserve(img)
}

/**
 * Responsive WebP image ({id}-{width}.webp in /img or /media).
 * The dominant colour is painted as background while the file loads.
 */
export function Img({ id, alt = '', sizes = '100vw', priority, style, ...rest }: Props) {
  if (!id) return null
  const m = imgMeta(id)
  const dir = base(id)
  return (
    <img
      ref={fitWhenLazy}
      src={imgSrc(id, 1280)}
      srcSet={m.s.map((w) => `${dir}/${id}-${w}.webp ${w}w`).join(', ')}
      sizes={sizes}
      width={m.w}
      height={m.h}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      data-priority={priority ? '' : undefined}
      draggable={false}
      style={{ backgroundColor: m.c, ...style }}
      {...rest}
    />
  )
}
