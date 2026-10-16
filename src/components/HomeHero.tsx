import { useEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, useGSAP, reducedMotion } from '../lib/gsap'
import { whenGateOpen } from '../lib/gate'
import { scrollToElement } from '../lib/smooth'
import { useFitText } from '../lib/useFitText'
import { heroSlides, heroImageSizes } from '../data/hero'
import { Img } from './Img'
import { TAGLINE } from './Header'

const SLIDE = 6.5 // seconds per slide — the image pans up and the capsule fills over this time
const WIPE = 1.4 // seconds for the next slide to wipe in (the old one keeps drifting underneath)
const PAN = (28 / 128) * 100 // images are 128% of the hero height; pan by the extra 28% (in % of the image)
const N = heroSlides.length

function CapsuleSet({ idx, current, filled }: { idx: number; current?: boolean; filled?: boolean }) {
  const p = heroSlides[idx]
  return (
    <span className="hero-capsule__set" data-current={current ? '' : undefined} data-filled={filled ? '' : undefined}>
      <Img id={p.hero} sizes="160px" className="hero-capsule__base" />
      <Img id={p.hero} sizes="160px" className="hero-capsule__fill" />
    </span>
  )
}

/**
 * Home hero after shed.design: giant wordmark under a hairline header, full-bleed project carousel,
 * the next project waiting in a capsule (bottom-left) whose colour fills as the timer, and a round
 * SCROLL button (bottom-right). New slides wipe in from the top.
 */
export function HomeHero() {
  const root = useRef<HTMLElement>(null)
  const fit = useRef<HTMLSpanElement>(null)
  const [cur, setCur] = useState(0)
  const [mounted, setMounted] = useState(2)
  const [leaving, setLeaving] = useState<number | null>(null)
  const curRef = useRef(0)
  const timer = useRef<gsap.core.Tween | null>(null)
  const pans = useRef<gsap.core.Tween[]>([])
  const running = useRef(false)
  const inView = useRef(true)
  const busy = useRef(false)
  useFitText(fit)

  const next = (cur + 1) % N

  const { contextSafe } = useGSAP(
    (_ctx, safe) => {
      const el = root.current
      if (!el || !safe) return

      if (!reducedMotion()) {
        const scrub = { trigger: el, start: 'top top', end: 'bottom top', scrub: true }
        gsap.to('.hero__media', { yPercent: 14, ease: 'none', scrollTrigger: scrub })
        gsap.to('.hero__title', { yPercent: -28, ease: 'none', scrollTrigger: scrub })
      }

      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: 'bottom top',
        onToggle: (self) => {
          inView.current = self.isActive
          if (self.isActive) [timer.current, ...pans.current].forEach((t) => t?.resume())
          else [timer.current, ...pans.current].forEach((t) => t?.pause())
        },
      })

      const intro = safe(() => {
        if (reducedMotion()) return
        const line = document.querySelector('.site-header__line')
        const controls = el.querySelectorAll('.hero-capsule, .hero-scroll')
        const header = document.querySelectorAll('.site-header__bar > *:not(.site-header__line)')
        // one calm sequence: letters rise in a wave → header settles in → controls fade up
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
        tl.from(el.querySelectorAll('.hero__char'), { yPercent: 105, duration: 1.3, stagger: 0.05 }, 0.1)
        if (line) tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'power2.inOut' }, 0.2)
        tl.from(header, { yPercent: -60, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.45)
        tl.from(controls, { y: 24, autoAlpha: 0, duration: 1.1, stagger: 0.1 }, 0.9)
          .add(() => {
            running.current = true
            startTimer()
          }, 1.2)
      })
      return whenGateOpen(intro)
    },
    { scope: root },
  )

  /** Continuous, linear drift from the bottom of the photo to its top — it never stops mid-transition. */
  const pan = contextSafe((img: Element | null | undefined) => {
    if (!img || reducedMotion()) return
    const t = gsap.fromTo(
      img,
      { yPercent: 0 },
      {
        yPercent: PAN,
        duration: SLIDE + WIPE,
        ease: 'none',
        onComplete: () => {
          pans.current = pans.current.filter((x) => x !== t)
        },
      },
    )
    pans.current.push(t)
    if (!inView.current) t.pause()
  })

  const advance = contextSafe(() => {
    if (busy.current || !root.current) return
    const slides = Array.from(root.current.querySelectorAll<HTMLElement>('.hero__slide'))
    const i = curRef.current
    const n = (i + 1) % N
    const from = slides[i]
    const to = slides[n]
    if (!from || !to) return
    busy.current = true
    timer.current?.kill()
    const img = to.querySelector('img')
    gsap.set(to, { zIndex: 3, visibility: 'visible', clipPath: 'inset(0% 0% 100% 0%)' })
    gsap.set(from, { zIndex: 2 })
    pan(img) // the new photo is already moving while it wipes in
    gsap.fromTo(img, { scale: 1.08 }, { scale: 1, duration: WIPE + 0.6, ease: 'power2.out' })
    gsap.to(to, {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: WIPE,
      ease: 'power2.inOut',
      onComplete: () => {
        gsap.set(from, { visibility: 'hidden', zIndex: 1 })
        busy.current = false
      },
    })
    curRef.current = n
    setLeaving(n)
    setCur(n)
    setMounted((m) => Math.max(m, Math.min(N, n + 2)))
  })

  const startTimer = contextSafe(() => {
    if (!running.current || reducedMotion() || !root.current) return
    const fill = root.current.querySelector('.hero-capsule__set[data-current] .hero-capsule__fill')
    if (!fill) return
    timer.current?.kill()
    // first slide: start its drift here (later slides start theirs in advance())
    if (!pans.current.length) pan(root.current.querySelectorAll('.hero__slide')[curRef.current]?.querySelector('img'))
    timer.current = gsap.fromTo(
      fill,
      { clipPath: 'inset(0% 100% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: SLIDE, ease: 'none', onComplete: advance },
    )
    if (!inView.current) timer.current.pause()
  })

  // a new capsule image is in the DOM → restart its fill; drop the previous one after its wipe
  useEffect(() => {
    startTimer()
    if (leaving === null) return
    const id = window.setTimeout(() => setLeaving(null), 900)
    return () => window.clearTimeout(id)
  }, [cur])

  return (
    <section ref={root} className="hero" data-theme="dark">
      <div className="hero__media">
        {heroSlides.slice(0, mounted).map((p, k) => (
          <div key={p.slug} className="hero__slide">
            <Img id={p.hero} alt={p.title} priority={k === 0} loading="eager" sizes={heroImageSizes(p.hero)} className="hero__img" />
          </div>
        ))}
        <div className="hero__shade" />
      </div>

      <h1 className="hero__title" aria-label="Kadanglabo - A Collaborative Architectural Solution">
        <span ref={fit} className="hero__fit" aria-hidden="true">
          <span className="hero__mask">
            <span className="hero__word">
              {'Kadang'.split('').map((c, i) => (
                <span key={i} className="hero__char">
                  {c}
                </span>
              ))}
            </span>
          </span>
          <span className="hero__mask">
            <span className="hero__word hero__word--accent">
              {'Labo'.split('').map((c, i) => (
                <span key={i} className="hero__char">
                  {c}
                </span>
              ))}
            </span>
          </span>
        </span>
      </h1>
      <p className="hero__tagline-m">{TAGLINE}</p>

      <button
        type="button"
        className="hero-capsule"
        onClick={() => advance()}
        aria-label={`Proyek berikutnya: ${heroSlides[next].title}`}
        data-cursor="Next"
      >
        <span className="hero-capsule__body">
          {leaving !== null && leaving !== next && <CapsuleSet key={`leaving-${leaving}`} idx={leaving} filled />}
          <CapsuleSet key={`next-${next}`} idx={next} current />
        </span>
      </button>

      <button type="button" className="hero-scroll" onClick={() => scrollToElement('#intro', 0)} aria-label="Gulir ke About">
        <span className="hero-scroll__body">
          <svg viewBox="0 0 100 100" className="hero-scroll__ring" aria-hidden="true">
            <defs>
              <path id="scroll-circle" d="M50 50 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0" />
            </defs>
            <text>
              <textPath href="#scroll-circle" textLength="236" lengthAdjust="spacing">SCROLL • EXPLORE • SCROLL • EXPLORE •</textPath>
            </text>
          </svg>
          <span className="hero-scroll__arrow" aria-hidden="true">↓</span>
        </span>
      </button>
    </section>
  )
}
