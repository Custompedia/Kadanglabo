import type { RefObject } from 'react'
import { gsap, SplitText, useGSAP, reducedMotion } from './gsap'
import { whenGateOpen } from './gate'

const num = (v: string | undefined, fallback: number) => (v === undefined || v === '' ? fallback : parseFloat(v))

/**
 * Declarative scroll animations, driven by data attributes:
 *  data-split            heading revealed line by line (masked)    data-split="now" → plays immediately
 *  data-fade             fade + rise                                data-delay="0.2"
 *  data-stagger          children fade + rise in sequence
 *  data-reveal           image wrapper wiped open, inner <img> settles from a zoom
 *  data-parallax="10"    element drifts ±10% while its parent crosses the viewport
 *  data-scrub            words light up as you scroll through the paragraph
 */
export function attachReveals(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const now = el.dataset.split === 'now'
    const delay = num(el.dataset.delay, 0)
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.3,
          stagger: 0.09,
          delay,
          ease: 'power4.out',
          scrollTrigger: now ? undefined : { trigger: el, start: 'top 90%', once: true },
        }),
    })
  })

  root.querySelectorAll<HTMLElement>('[data-fade]').forEach((el) => {
    const now = el.dataset.fade === 'now'
    gsap.from(el, {
      y: 34,
      autoAlpha: 0,
      duration: 1.2,
      ease: 'power3.out',
      delay: num(el.dataset.delay, 0),
      scrollTrigger: now ? undefined : { trigger: el, start: 'top 92%', once: true },
    })
  })

  root.querySelectorAll<HTMLElement>('[data-stagger]').forEach((el) => {
    gsap.from(el.children, {
      y: 40,
      autoAlpha: 0,
      duration: 1.1,
      ease: 'power3.out',
      stagger: num(el.dataset.stagger, 0.08),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    })
  })

  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const img = el.querySelector('img')
    const tl = gsap.timeline({
      delay: num(el.dataset.delay, 0),
      scrollTrigger: el.dataset.reveal === 'now' ? undefined : { trigger: el, start: 'top 90%', once: true },
    })
    tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.35, ease: 'expo.inOut' })
    if (img) tl.from(img, { scale: 1.25, duration: 1.9, ease: 'power3.out' }, 0.1)
  })

  root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = num(el.dataset.parallax, 8)
    gsap.fromTo(
      el,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )
  })

  root.querySelectorAll<HTMLElement>('[data-scrub]').forEach((el) => {
    SplitText.create(el, {
      type: 'words',
      autoSplit: true,
      onSplit: (self) =>
        gsap.fromTo(
          self.words,
          { opacity: 0.14 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: true },
          },
        ),
    })
  })
}

/**
 * Sets up a page's animations once the intro gate opens (after the preloader / transition curtain).
 * `setup` is for bespoke timelines; data-attribute reveals inside `scope` are attached automatically.
 */
export function usePageAnimations(
  scope: RefObject<HTMLElement | null>,
  setup?: (root: HTMLElement) => void,
  deps: unknown[] = [],
) {
  useGSAP(
    (_ctx, contextSafe) => {
      const root = scope.current
      if (!root || !contextSafe) return
      const run = contextSafe(() => {
        if (reducedMotion()) return
        setup?.(root)
        attachReveals(root)
      })
      return whenGateOpen(run)
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  )
}
