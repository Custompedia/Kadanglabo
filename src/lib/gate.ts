/**
 * The "intro gate" keeps page intro animations waiting while something covers the page
 * (the preloader on first load, the transition curtain on navigation). It opens the moment
 * the cover starts to lift, so intros play in sync with the reveal.
 */
let open = false
let waiters: Array<() => void> = []

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

export function closeGate() {
  open = false
}

export function openGate() {
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
