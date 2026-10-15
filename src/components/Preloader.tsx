import { useRef, useState } from 'react'
import { gsap, useGSAP, reducedMotion } from '../lib/gsap'
import { onPageMounted, openGate } from '../lib/gate'
import { lockScroll } from '../lib/smooth'
import { heroSlides, preloaderFlip, heroImageSizes } from '../data/hero'
import { Img } from './Img'

const STEP = 0.32 // seconds between images; each one wipes in from the top over the previous

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

function loaded(img: HTMLImageElement) {
  const ready =
    img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise<void>((r) => {
          img.addEventListener('load', () => r(), { once: true })
          img.addEventListener('error', () => r(), { once: true })
        })
  // decoded too, so the flipbook never shows a grey placeholder frame
  return ready.then(() => img.decode?.().catch(() => {}))
}

/**
 * First-load intro after shed.design: a small viewport-shaped frame flips through project images,
 * then grows to fill the screen. On the home page it lands exactly on the first hero slide.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)
  const [isHome] = useState(() => window.location.pathname === '/')
  const flip = [...preloaderFlip, heroSlides[0].hero]

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
      const frame = el.querySelector<HTMLElement>('.preloader__frame')!
      const shade = el.querySelector<HTMLElement>('.preloader__shade')
      const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('.preloader__img'))
      const header = document.querySelector('.site-header__bar')
      gsap.set(header, { autoAlpha: 0 })


      const flipbook = contextSafe(
        () =>
          new Promise<void>((resolve) => {
            const tl = gsap.timeline({ onComplete: resolve })
            tl.set(frame, { visibility: 'visible' })
            imgs.forEach((img, i) => {
              if (i === 0) return // the first image is already showing
              tl.fromTo(
                img,
                { clipPath: 'inset(0% 0% 100% 0%)' },
                { clipPath: 'inset(0% 0% 0% 0%)', duration: STEP * 1.25, ease: 'power3.inOut' },
                i * STEP,
              )
            })
            tl.to({}, { duration: STEP * 0.8 })
          }),
      )

      const expand = contextSafe(() => {
        gsap
          .timeline({
            onComplete: () => {
              sessionStorage.setItem('kl-intro-seen', '1')
              setGone(true)
            },
          })
          .to(frame, { scale: 1, duration: 1.1, ease: 'expo.inOut' })
          .to(shade, { opacity: isHome ? 1 : 0, duration: 0.6, ease: 'power2.out' }, 0.5)
          .add(() => {
            lockScroll(false)
            openGate()
          }, isHome ? 0.95 : 0.75)
          .to(header, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' }, 0.95)
          // home: the frame now *is* the hero, so just drop the overlay; elsewhere fade it away
          .to(el, { autoAlpha: 0, duration: isHome ? 0.01 : 0.55, ease: 'power2.out' }, isHome ? 1.12 : 1.1)
      })

      // like shed.design: stay on the blank page until every frame (and the hero image) is decoded,
      // then flip through them and grow straight into the hero
      const run = async () => {
        await Promise.race([Promise.all([...imgs.map(loaded), document.fonts?.ready, firstPageReady()]), wait(4500)])
        if (cancelled) return
        await flipbook()
        if (cancelled) return
        expand()
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
      <div className="preloader__frame">
        {flip.map((id, i) => (
          <Img
            key={id}
            id={id}
            className={`preloader__img${i === flip.length - 1 ? ' preloader__img--hero' : ''}`}
            sizes={i === flip.length - 1 ? heroImageSizes(id) : '40vw'}
            priority
            style={{ backgroundColor: 'transparent', zIndex: i, clipPath: i === 0 ? undefined : 'inset(0% 0% 100% 0%)' }}
          />
        ))}
        <div className="hero__shade preloader__shade" />
      </div>
    </div>
  )
}
