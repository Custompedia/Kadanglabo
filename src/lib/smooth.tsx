import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, reducedMotion } from './gsap'

let lenis: Lenis | null = null

export const getLenis = () => lenis

/** Smooth scrolling (Lenis) driven by the GSAP ticker so ScrollTrigger stays in sync. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (reducedMotion()) return
    const instance = new Lenis({ lerp: 0.105, wheelMultiplier: 0.95, touchMultiplier: 1.15, autoRaf: false })
    lenis = instance
    instance.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => instance.raf(time * 1000)
    // first on the ticker: Lenis moves the page (window.scrollTo) before GSAP renders this frame's tweens, so the
    // scroll does not have to recalculate the styles those tweens just wrote; the scroll-linked tweens then render
    // in the same tick, from the new position
    gsap.ticker.add(tick, false, true)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      instance.destroy()
      lenis = null
    }
  }, [])
  return <>{children}</>
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true })
  window.scrollTo(0, 0)
}

export function scrollToElement(target: HTMLElement | string, offset = -90) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset, duration: 1.4, force: true })
  else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' })
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop()
    else lenis.start()
  }
  document.documentElement.classList.toggle('is-locked', locked)
}
