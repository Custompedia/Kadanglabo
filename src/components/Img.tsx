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
 * Responsive WebP image ({id}-{width}.webp in /img or /media).
 * The dominant colour is painted as background while the file loads.
 */
export function Img({ id, alt = '', sizes = '100vw', priority, style, ...rest }: Props) {
  if (!id) return null
  const m = imgMeta(id)
  const dir = base(id)
  return (
    <img
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
