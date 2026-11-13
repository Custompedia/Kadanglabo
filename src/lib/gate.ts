/**
 * The "intro gate" keeps page intro animations waiting while something covers the page
 * (the preloader on first load, the transition curtain on navigation). It opens the moment
 * the cover starts to lift, so intros play in sync with the reveal.
 *
 * Before it opens, the cover calls preparePage() while it still holds still over the page: the page builds its
 * animations then (splitting text, measuring scroll triggers - the heavy part), so that work and the layout it
 * causes happen behind a motionless cover instead of in the first frames of the reveal. The intros themselves
 * still wait for the gate (see usePageAnimations).
 */
let open = false
let prepared = false
let waiters: Array<() => void> = []
let preparers: Array<() => void> = []

export const isGateOpen = () => open

export function whenGateOpen(cb: () => void) {
  if (open) {
    cb()
    return () => {}
  }
  waiters.push(cb)
  return () => {
    waiters = waiters.filter((w) => w !== cb)
  }
}

/** Runs `cb` once the covered page may build its animations (or right away if it already may). */
export function whenPagePrepared(cb: () => void) {
  if (prepared || open) {
    cb()
    return () => {}
  }
  preparers.push(cb)
  return () => {
    preparers = preparers.filter((w) => w !== cb)
  }
}

export function closeGate() {
  open = false
  prepared = false
}

/** The cover is in place and still: let the page set up its animations now. */
export function preparePage() {
  if (prepared) return
  prepared = true
  const pending = preparers
  preparers = []
  pending.forEach((fn) => fn())
}

export function openGate() {
  preparePage() // a page that was not prepared yet builds now, as before
  open = true
  const pending = waiters
  waiters = []
  pending.forEach((fn) => fn())
}

/* Pages announce when they are mounted so the curtain only lifts on a ready page. */
let mountListeners: Array<() => void> = []

export function onPageMounted(cb: () => void) {
  mountListeners.push(cb)
  return () => {
    mountListeners = mountListeners.filter((l) => l !== cb)
  }
}

export function notifyPageMounted() {
  mountListeners.slice().forEach((l) => l())
  window.dispatchEvent(new Event('page:mounted'))
}

/** Resolves on the next animation frame. */
export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))
