import { useRef, useState } from 'react'
import { gsap, useGSAP, reducedMotion } from '../lib/gsap'
import { onPageMounted, openGate } from '../lib/gate'
import { lockScroll } from '../lib/smooth'
import { heroSlides, heroImageSizes } from '../data/hero'
import { BrandMark } from './BrandMark'
import { TAGLINE } from './Header'
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
 * 1. the K mark draws itself (navy ring, then the three orange pieces),
 * 2. it slides left while the KADANGLABO wordmark wipes in on its right, tagline below,
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

      const mark = el.querySelector<HTMLElement>('.intro-logo__mark')!
      const word = el.querySelector<HTMLElement>('.intro-logo__word')!
      const panel = el.querySelector<HTMLElement>('.preloader__hero')
      const heroImg = el.querySelector<HTMLImageElement>('.preloader__hero img')

      // start with the mark alone in the centre of the screen
      const shift = (word.offsetWidth + parseFloat(getComputedStyle(word).marginLeft)) / 2

      const logo = gsap
        .timeline({ delay: 0.25 })
        .set(mark, { x: shift })
        .fromTo(
          '.intro-logo .bm-ring',
          { strokeDasharray: 1, strokeDashoffset: 1 },
          { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' },
          0,
        )
        .from(
          '.intro-logo .bm-piece',
          { scale: 0, autoAlpha: 0, transformOrigin: '50% 50%', duration: 0.75, stagger: 0.12, ease: 'back.out(1.8)' },
          0.7,
        )
        .to(mark, { x: 0, duration: 0.9, ease: 'expo.inOut' }, 1.5)
        .fromTo(
          word,
          { clipPath: 'inset(0% 100% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.inOut' },
          2.1, // only once the mark has (almost) cleared the space, so they never overlap
        )
        .from('.intro-logo__tagline', { yPercent: 110, duration: 0.8, ease: 'power3.out' }, 2.75)
        .to({}, { duration: 0.55 }) // hold the finished logo for a beat

      const exit = contextSafe(() => {
        gsap
          .timeline({
            onComplete: () => {
              sessionStorage.setItem('kl-intro-seen', '1')
              setGone(true)
            },
          })
          .to('.intro-logo', { yPercent: -40, autoAlpha: 0, duration: 0.7, ease: 'power3.in' }, 0)
          .fromTo(
            panel,
            { clipPath: 'inset(100% 0% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' },
            0.35,
          )
          .fromTo(heroImg, { scale: 1.15 }, { scale: 1, duration: 1.6, ease: 'power3.out' }, 0.35)
          .add(() => {
            lockScroll(false)
            openGate()
          }, 1.2)
          .to(header, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 1.2)
          // home: the panel already shows the first hero slide, so simply drop the overlay;
          // other pages: fade the overlay away to reveal the page
          .to(el, { autoAlpha: 0, duration: isHome ? 0.01 : 0.6, ease: 'power2.out' }, isHome ? 1.5 : 1.25)
      })

      const run = async () => {
        await Promise.all([
          logo.then(),
          Promise.race([Promise.all([loaded(heroImg), document.fonts?.ready, firstPageReady()]), wait(5000)]),
        ])
        if (!cancelled) exit()
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
        <div className="intro-logo__row">
          <BrandMark className="intro-logo__mark" ringColor="#3C4C74" />
          <img src="/brand/kadanglabo-wordmark.svg" alt="" className="intro-logo__word" width={1046} height={110} />
        </div>
        <span className="intro-logo__mask">
          <span className="intro-logo__tagline">{TAGLINE}</span>
        </span>
      </div>

      <div className="preloader__hero">
        {isHome && (
          <Img
            id={heroId}
            className="preloader__img--hero"
            sizes={heroImageSizes(heroId)}
            priority
            style={{ backgroundColor: 'transparent' }}
          />
        )}
        <div className="hero__shade" />
      </div>
    </div>
  )
}
