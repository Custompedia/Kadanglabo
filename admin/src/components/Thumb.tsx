import { ImageSquare } from '@phosphor-icons/react'
import { useFetch } from '../lib/useFetch'
import type { MediaItem } from '../lib/types'

/** Every image in the library by id (one request, shared by every thumbnail on the page). */
export function useMediaMap() {
  const { data, reload } = useFetch<{ items: MediaItem[] }>('/media')
  const map = new Map((data?.items ?? []).map((m) => [m.id, m]))
  return { map, items: data?.items, reload }
}

/** URL of an image at about `target` px wide. */
export function mediaUrl(m: Pick<MediaItem, 'id' | 'sizes'> | undefined, id: string, target = 640) {
  const sizes = m?.sizes ?? [640]
  const w = sizes.find((s) => s >= target) ?? sizes[sizes.length - 1]
  return `/media/${id}-${w}.webp`
}

/** A small preview of a library image; an empty frame when there is none. */
export function Thumb({ id, className = 'size-10 rounded-md', target = 320 }: { id: string | null | undefined; className?: string; target?: number }) {
  const { map } = useMediaMap()
  if (!id)
    return (
      <span className={`grid shrink-0 place-items-center bg-kumo-recessed text-kumo-inactive ${className}`}>
        <ImageSquare size={16} />
      </span>
    )
  const m = map.get(id)
  return (
    <img
      src={mediaUrl(m, id, target)}
      alt=""
      loading="lazy"
      draggable={false}
      className={`shrink-0 object-cover ${className}`}
      style={{ backgroundColor: m?.color ?? 'var(--color-kumo-recessed, #eee)' }}
    />
  )
}
