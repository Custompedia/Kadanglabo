import type { ImgHTMLAttributes } from 'react'
import images from '../data/images.json'

export type ImgKey = keyof typeof images
type Meta = { w: number; h: number; c: string; s: number[] }

const data = images as Record<ImgKey, Meta>

export const imgMeta = (id: ImgKey) => data[id]

/** Smallest generated width that is >= target (falls back to the largest). */
export function imgSrc(id: ImgKey, target = 1280) {
  const { s } = data[id]
  const w = s.find((x) => x >= target) ?? s[s.length - 1]
  return `/img/${id}-${w}.webp`
}

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'width' | 'height' | 'id'> & {
  id: ImgKey
  /** above-the-fold image: eager + high fetch priority (the preloader waits for it) */
  priority?: boolean
}

/**
 * Responsive WebP image (generated in /public/img as {id}-{width}.webp).
 * The dominant colour is painted as background while the file loads.
 */
export function Img({ id, alt = '', sizes = '100vw', priority, style, ...rest }: Props) {
  const m = data[id]
  return (
    <img
      src={imgSrc(id, 1280)}
      srcSet={m.s.map((w) => `/img/${id}-${w}.webp ${w}w`).join(', ')}
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
