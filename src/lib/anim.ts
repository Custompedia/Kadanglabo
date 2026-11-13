import type { RefObject } from 'react'
import { gsap, SplitText, useGSAP, reducedMotion } from './gsap'
import { isGateOpen, whenGateOpen, whenPagePrepared } from './gate'

const num = (v: string | undefined, fallback: number) => (v === undefined || v === '' ? fallback : parseFloat(v))

/**
 * Declarative scroll animations, driven by data attributes:
 *  data-split            heading revealed line by line (masked)    data-split="now" → plays immediately
 *  data-split="chars"    page titles: the letters arrive from scattered spots and settle into the word (Saisei)
 *  data-fade             fade + rise                                data-delay="0.2"
 *  data-stagger          children fade + rise in sequence
 *  data-reveal           image wrapper wiped open, inner <img> settles from a zoom
 *  data-parallax="10"    element drifts ±10% while its parent crosses the viewport
 *  data-scrub            words light up as you scroll through the paragraph
 */
export function attachReveals(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('[data-split="chars"]').forEach((el) => {
    SplitText.create(el, {
      type: 'chars,words',
      charsClass: 'split-char',
      aria: 'none',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.chars, {
          x: () => gsap.utils.random(-140, 140),
          y: () => gsap.utils.random(-90, 90),
          rotation: () => gsap.utils.random(-28, 28),
          autoAlpha: 0,
          duration: 1.4,
          ease: 'expo.out',
          delay: num(el.dataset.delay, 0.1),
          stagger: { each: 0.028, from: 'random' },
        }),
    })
  })

  root.querySelectorAll<HTMLElement>('[data-split]:not([data-split="chars"])').forEach((el) => {
    const now = el.dataset.split === 'now'
    const delay = num(el.dataset.delay, 0)
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      aria: 'none', // line / word wrappers read naturally; no aria-label on paragraphs (not allowed there)
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
      aria: 'none',
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

/** Every tween and timeline a context has created, including those of nested contexts (e.g. SplitText's). */
function animationsOf(ctx: gsap.Context): gsap.core.Animation[] {
  const out: gsap.core.Animation[] = []
  const walk = (items: unknown[]) =>
    items.forEach((item) => {
      if (item instanceof gsap.core.Animation) out.push(item)
      else if (item && Array.isArray((item as gsap.Context).data)) walk((item as gsap.Context).data)
    })
  walk(ctx.data)
  return out
}

/**
 * Sets up a page's animations while the preloader / transition curtain still covers the page (see preparePage);
 * their intros play once the intro gate opens, as the cover lifts.
 * `setup` is for bespoke timelines and may return a cleanup (e.g. an observer to disconnect);
 * data-attribute reveals inside `scope` are attached automatically.
 */
export function usePageAnimations(
  scope: RefObject<HTMLElement | null>,
  setup?: (root: HTMLElement) => void | (() => void),
  deps: unknown[] = [],
) {
  useGSAP(
    (ctx, contextSafe) => {
      const root = scope.current
      if (!root || !contextSafe) return
      let undo: void | (() => void)
      let offHeld = () => {}
      const run = contextSafe(() => {
        if (reducedMotion()) return
        const before = new Set(animationsOf(ctx))
        undo = setup?.(root)
        attachReveals(root)
        if (isGateOpen()) return
        // Built behind the cover (see preparePage): everything that already started running - intros on a timer,
        // reveals whose trigger is already on screen - holds at its first frame and goes on when the cover lifts,
        // exactly as if it had been created then. Scrubbed and not-yet-reached animations are left to ScrollTrigger.
        const held = animationsOf(ctx).filter((a) => !before.has(a) && a.parent === gsap.globalTimeline && !a.paused())
        held.forEach((a) => a.pause())
        offHeld = whenGateOpen(() => held.forEach((a) => a.resume()))
      })
      const off = whenPagePrepared(run)
      return () => {
        off()
        offHeld()
        if (typeof undo === 'function') undo()
      }
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  )
}
