import { useRef, useState } from 'react'
import { gsap, useGSAP, reducedMotion } from '../lib/gsap'
import { onPageMounted, openGate } from '../lib/gate'
import { lockScroll } from '../lib/smooth'
import { heroSlides, heroImageSizes } from '../data/hero'
import { MARK_PIECES, MARK_RING } from '../data/brandMark'
import { LOGO_VIEWBOX, TAGLINE_PATH, WORD_NAVY, WORD_ORANGE } from '../data/logoLockup'
import { Img } from './Img'

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function firstPageReady() {
  return new Promise<void>((resolve) => {
    if (document.getElementById('main')) return resolve()
    const off = onPageMounted(() => {
      off()
      resolve()
    })
  })
}

function loaded(img: HTMLImageElement | null) {
  if (!img) return Promise.resolve()
  const ready =
    img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise<void>((r) => {
          img.addEventListener('load', () => r(), { once: true })
          img.addEventListener('error', () => r(), { once: true })
        })
  return ready.then(() => img.decode?.().catch(() => {}))
}

/**
 * First-load logo intro:
 * 1. the K mark pops in (navy half-ring, then the three orange pieces, same spring),
 * 2. it slides to its place in the official lockup while KADANGLABO wipes in on its right,
 *    then the tagline wipes in underneath — exactly as in "LOGO KADANGLABO biru oren.png",
 * 3. the logo lifts away and the first hero photo rises from the bottom — on the home page
 *    that panel *is* the hero, so the hand-over is seamless.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)
  const [isHome] = useState(() => window.location.pathname === '/')
  const heroId = heroSlides[0].hero

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current
      if (!el || !contextSafe) return
      if (reducedMotion()) {
        openGate()
        setGone(true)
        return
      }
      let cancelled = false
      lockScroll(true)
      const header = document.querySelector('.site-header__bar')
      gsap.set(header, { autoAlpha: 0 })

      const mark = el.querySelector<SVGGElement>('.il-mark')!
      const panel = el.querySelector<HTMLElement>('.preloader__hero')
      const heroImg = el.querySelector<HTMLImageElement>('.preloader__hero img')

      // the mark starts alone in the centre of the lockup (svg units: lockup 1609 wide, mark ≈330)
      const logo = gsap
        .timeline({ delay: 0.25 })
        .set(mark, { x: 1609 / 2 - 165 })
        // the navy half-ring pops in exactly like the orange pieces, then the pieces follow
        .from(
          '.il-ring',
          { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%', duration: 0.75, ease: 'back.out(1.8)' },
          0,
        )
        .from(
          '.il-piece',
          { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%', duration: 0.75, stagger: 0.12, ease: 'back.out(1.8)' },
          0.3,
        )
        .to(mark, { x: 0, duration: 0.9, ease: 'expo.inOut' }, 1.3)
        // wordmark and tagline wipe in left → right, only once the mark has cleared their space
        .fromTo('#il-clip-word rect', { attr: { width: 0 } }, { attr: { width: 1300 }, duration: 0.9, ease: 'power3.inOut' }, 1.9)
        .fromTo('#il-clip-tag rect', { attr: { width: 0 } }, { attr: { width: 1300 }, duration: 0.9, ease: 'power3.inOut' }, 2.35)
        .to({}, { duration: 0.6 }) // hold the finished logo for a beat

      const exit = contextSafe(() => {
        const tl = gsap
          .timeline({ onComplete: () => setGone(true) })
          .to('.intro-logo', { yPercent: -40, autoAlpha: 0, duration: 0.7, ease: 'power3.in' }, 0)
          .add(() => {
            lockScroll(false)
            openGate()
          }, 1.2)
          .set(header, { autoAlpha: 1 }, 1.2)
          // home: the panel already shows the first hero slide, so simply drop the overlay;
          // other pages: fade the overlay away to reveal the page
          .to(el, { autoAlpha: 0, duration: isHome ? 0.01 : 0.6, ease: 'power2.out' }, isHome ? 1.5 : 1.25)
        if (panel) tl.fromTo(panel, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' }, 0.35)
        if (heroImg) tl.fromTo(heroImg, { scale: 1.15 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0.35)
      })

      // home: the hero intro animates the header items; elsewhere ease them in after the intro
      const easeHeaderIn = () => {
        if (isHome) return
        gsap.from(document.querySelectorAll('.site-header__bar > *:not(.site-header__line)'), {
          yPercent: -60,
          autoAlpha: 0,
          duration: 1.1,
          stagger: 0.08,
          ease: 'power3.out',
          delay: 1.3,
        })
      }

      const run = async () => {
        await Promise.all([
          logo.then(),
          Promise.race([Promise.all([loaded(heroImg), document.fonts?.ready, firstPageReady()]), wait(5000)]),
        ])
        if (!cancelled) {
          exit()
          easeHeaderIn()
        }
      }
      run()

      return () => {
        cancelled = true
      }
    },
    { scope: root },
  )

  if (gone) return null

  return (
    <div ref={root} className="preloader" aria-hidden="true">
      <div className="intro-logo">
        <svg viewBox={LOGO_VIEWBOX} className="intro-logo__svg" fillRule="evenodd">
          <defs>
            <clipPath id="il-clip-word">
              <rect x="330" y="0" width="0" height="180" />
            </clipPath>
            <clipPath id="il-clip-tag">
              <rect x="330" y="180" width="0" height="144" />
            </clipPath>
          </defs>
          <g className="il-mark">
            <path className="il-ring" d={MARK_RING} fill="none" stroke="#3C4C74" strokeWidth={8} strokeLinejoin="round" pathLength={1} />
            {MARK_PIECES.map((d) => (
              <path key={d.slice(0, 16)} className="il-piece" d={d} fill="#EC6434" />
            ))}
          </g>
          <g clipPath="url(#il-clip-word)">
            <path d={WORD_NAVY} fill="#3C4C74" />
            <path d={WORD_ORANGE} fill="#EC6434" />
          </g>
          <g clipPath="url(#il-clip-tag)">
            <path d={TAGLINE_PATH} fill="#3C4C74" />
          </g>
        </svg>
      </div>

      {isHome && (
        <div className="preloader__hero">
          <Img
            id={heroId}
            className="preloader__img--hero"
            sizes={heroImageSizes(heroId)}
            priority
            style={{ backgroundColor: 'transparent' }}
          />
          <div className="hero__shade" />
        </div>
      )}
    </div>
  )
}
