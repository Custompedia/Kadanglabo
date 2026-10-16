import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gsap, ScrollTrigger, useGSAP, reducedMotion } from '../lib/gsap'
import { lockScroll } from '../lib/smooth'
import { TLink } from '../lib/transition'
import { showreel, trailer } from '../data/site'
import { getProject } from '../data/projects'
import { ArrowUpRight } from './Icons'
import { Img, imgSrc } from './Img'

const STEP = 3.4 // seconds each render is on screen
const XF = 1.1 // crossfade between renders

const frames = showreel.map((f) => ({ ...f, title: getProject(f.slug)?.title ?? '' }))

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M7 4.5v15l12.5-7.5z" />
    </svg>
  )
}

/**
 * Left half of the "Kadanglabo spirit" row (shed.design layout).
 * With a real trailer configured (data/site.ts) it plays the video muted and the round button opens it
 * with sound. Until then it is a showreel: the studio's renders cross-fade with a slow push-in / pull-out,
 * and the round button opens the project currently on screen.
 */
export function ShowReel() {
  const root = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const [open, setOpen] = useState(false)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return

      // the frame opens up once it scrolls into view
      if (!reducedMotion()) {
        gsap.fromTo(
          el,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.35,
            ease: 'expo.inOut',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          },
        )
      }
      if (trailer || reducedMotion()) return

      const els = gsap.utils.toArray<HTMLElement>('.reel__frame', el)
      let cur = 0
      let live: gsap.core.Tween[] = []
      let running = false

      // Ken Burns: alternate push-in and pull-out, with a slight drift sideways
      const drift = (k: number) => {
        const inward = k % 2 === 0
        return gsap.fromTo(
          els[k].querySelector('img'),
          { scale: inward ? 1.14 : 1.02, xPercent: inward ? -1.5 : 1.5 },
          { scale: inward ? 1.02 : 1.14, xPercent: inward ? 1.5 : -1.5, duration: STEP + XF, ease: 'none' },
        )
      }

      const show = (k: number, first = false) => {
        gsap.set(els, { zIndex: 1 })
        gsap.set(els[cur], { zIndex: 2 })
        gsap.set(els[k], { zIndex: 3 })
        const tweens = [drift(k)]
        if (!first) tweens.push(gsap.fromTo(els[k], { autoAlpha: 0 }, { autoAlpha: 1, duration: XF, ease: 'power2.inOut' }))
        live = [...live.filter((t) => t.isActive()), ...tweens]
        if (!running) live.forEach((t) => t.pause())
        cur = k
        setI(k)
      }

      gsap.set(els.slice(1), { autoAlpha: 0 })
      show(0, true)
      const next = gsap.delayedCall(STEP, () => {
        show((cur + 1) % els.length)
        next.restart(true)
      })
      next.pause()

      // only animate while the reel is on screen
      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          running = self.isActive
          next.paused(!running)
          live.forEach((t) => t.paused(!running))
        },
      })
    },
    { scope: root },
  )

  // trailer lightbox: lock the page, close on Esc
  useEffect(() => {
    if (!open) return
    lockScroll(true)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      lockScroll(false)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = frames[i]

  return (
    <div ref={root} className="reel">
      {trailer ? (
        <video
          className="reel__video"
          src={trailer.src}
          poster={imgSrc(trailer.poster, 1280)}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        frames.map((f, k) => (
          <div key={f.img} className="reel__frame">
            <Img id={f.img} alt={k === i ? f.title : ''} sizes="(min-width: 768px) 66vw, 100vw" />
          </div>
        ))
      )}
      <span className="reel__shade" aria-hidden="true" />

      {trailer ? (
        <button type="button" className="reel__btn" onClick={() => setOpen(true)} aria-label="Putar video Kadanglabo">
          <PlayIcon />
        </button>
      ) : (
        <>
          <span key={current.img} className="pill pill--solid reel__caption">
            {current.title}
          </span>
          <TLink to={`/work/${current.slug}`} className="reel__btn" aria-label={`Lihat proyek ${current.title}`} data-cursor="Lihat">
            <ArrowUpRight />
          </TLink>
        </>
      )}

      {open &&
        trailer &&
        createPortal(
          <div className="reel-modal" role="dialog" aria-modal="true" aria-label="Video Kadanglabo" onClick={() => setOpen(false)}>
            <video
              className="reel-modal__video"
              src={trailer.src}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
            <button type="button" className="reel-modal__close" onClick={() => setOpen(false)}>
              ✕ Close
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}
