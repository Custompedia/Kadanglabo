/**
 * Image warm-up: once a page's intro has played, the photos further down are fetched quietly in the background, so
 * they are already there when the visitor scrolls to their section instead of loading in front of them.
 *
 * - waits until the page is uncovered and the browser is idle, so the photos in view keep the bandwidth first
 * - nearest first: what lies just below the screen, then further down, then whatever is above
 * - three at a time, so a slow connection is never flooded; held while the visitor is scrolling, so the fetching
 *   never competes with the frames they are watching
 * - each photo is decoded as soon as it lands (off the main thread), so showing it later costs nothing
 * - skipped with Save-Data, and for photos that are not shown at all (display: none, e.g. on phones) or sit in the menu
 * - starts over for every page; leaving the page stops the queue
 */
let run = 0
let lastScroll = 0
window.addEventListener('scroll', () => (lastScroll = performance.now()), { passive: true })

const loaded = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0
const PARALLEL = 3
const STALL = 15000 // ms before a photo that never answers gives its slot to the next one

export function warmUpImages() {
  const id = ++run
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (conn?.saveData) return () => void run++

  const start = () => {
    if (id !== run) return
    const y = window.scrollY
    const queue = Array.from(document.querySelectorAll<HTMLImageElement>('#main img[loading="lazy"]'))
      .filter((img) => !loaded(img) && img.offsetParent !== null && !img.closest('.menu'))
      .map((img) => {
        const top = img.getBoundingClientRect().top + y
        return { img, rank: top >= y ? top - y : 1e7 + (y - top) }
      })
      .sort((a, b) => a.rank - b.rank)
      .map((q) => q.img)

    let next = 0
    let active = 0
    let held = 0
    const pump = () => {
      if (id !== run) return
      // the visitor is scrolling: wait until they pause
      if (performance.now() - lastScroll < 400) {
        if (!held) held = window.setTimeout(() => ((held = 0), pump()), 450)
        return
      }
      while (id === run && active < PARALLEL && next < queue.length) {
        const img = queue[next++]
        if (loaded(img) || !img.isConnected) continue
        active++
        let freed = false
        const done = () => {
          if (freed) return
          freed = true
          window.clearTimeout(stall)
          active--
          pump()
        }
        const stall = window.setTimeout(done, STALL)
        img.addEventListener('load', () => void (img.decode?.() ?? Promise.resolve()).then(done, done), { once: true })
        img.addEventListener('error', done, { once: true })
        img.loading = 'eager' // starts the download now; the browser keeps it at a low priority
      }
    }
    pump()
  }

  const idle = (cb: () => void) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb, { timeout: 2500 }) : setTimeout(cb, 600)
  const begin = () => idle(start)
  if (document.readyState === 'complete') begin()
  else window.addEventListener('load', begin, { once: true })

  return () => {
    run++ // stops the queue of this page
    window.removeEventListener('load', begin)
  }
}
