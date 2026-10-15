import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger, useGSAP, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { ArrowRight } from './Icons'
import { Img, type ImgKey } from './Img'

export type RingItem = { slug: string; title: string; meta: string; img: ImgKey }

/**
 * A ring of project images built with CSS 3D transforms (no WebGL) — inspired by the
 * project ring on clouarchitects.com. It drifts on its own, spins with scroll and can be dragged.
 */
export function ProjectRing({ items }: { items: RingItem[] }) {
  const stage = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const moved = useRef(false)
  const geoRef = useRef({ w: 260, r: 700 })
  const [geo, setGeo] = useState(geoRef.current)
  const [active, setActive] = useState(0)
  const n = items.length
  const step = 360 / n

  useLayoutEffect(() => {
    const calc = () => {
      const vw = window.innerWidth
      const w = Math.round(Math.max(150, Math.min(330, vw * (vw < 768 ? 0.44 : 0.2))))
      const r = Math.round(((w * 1.1) * n) / (2 * Math.PI))
      geoRef.current = { w, r }
      setGeo({ w, r })
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [n])

  useGSAP(
    () => {
      const stageEl = stage.current
      const ringEl = ring.current
      if (!stageEl || !ringEl) return
      const cards = Array.from(ringEl.children) as HTMLElement[]
      const drift = reducedMotion() ? 0 : -0.0055 // degrees per ms
      let angle = 0
      let target = 0
      let last = -1
      let dragging = false
      let startX = 0
      let startTarget = 0
      let lastScroll = window.scrollY

      const render = (dt: number) => {
        if (!dragging) target += drift * dt
        angle += (target - angle) * 0.08
        ringEl.style.transform = `translateZ(${-geoRef.current.r}px) rotateX(-6deg) rotateY(${angle}deg)`
        let best = 0
        let bestD = 999
        cards.forEach((card, i) => {
          const rel = ((((i * step + angle) % 360) + 540) % 360) - 180
          const d = Math.abs(rel)
          card.style.opacity = String(1 - (Math.min(d, 160) / 160) * 0.75)
          if (d < bestD) {
            bestD = d
            best = i
          }
        })
        if (best !== last) {
          last = best
          setActive(best)
        }
      }
      const tick = (_time: number, dt: number) => render(Math.min(dt, 48))

      ScrollTrigger.create({
        trigger: stageEl,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => (self.isActive ? gsap.ticker.add(tick) : gsap.ticker.remove(tick)),
        onUpdate: () => {
          const y = window.scrollY
          target -= (y - lastScroll) * 0.045
          lastScroll = y
        },
      })
      render(0)

      const onDown = (e: PointerEvent) => {
        dragging = true
        moved.current = false
        startX = e.clientX
        startTarget = target
        stageEl.dataset.dragging = ''
      }
      const onMove = (e: PointerEvent) => {
        if (!dragging) return
        const dx = e.clientX - startX
        if (Math.abs(dx) > 6) moved.current = true
        target = startTarget + dx * 0.16
      }
      const onUp = () => {
        dragging = false
        delete stageEl.dataset.dragging
      }
      stageEl.addEventListener('pointerdown', onDown)
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      return () => {
        gsap.ticker.remove(tick)
        stageEl.removeEventListener('pointerdown', onDown)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }
    },
    { scope: stage, dependencies: [n] },
  )

  const current = items[active]
  const h = Math.round(geo.w * 1.25)

  return (
    <div className="ring">
      <div ref={stage} className="ring__stage" style={{ height: h + geo.w * 0.5 }}>
        <div ref={ring} className="ring__spin" style={{ width: geo.w, height: h }}>
          {items.map((it, i) => (
            <TLink
              key={it.slug}
              to={`/work/${it.slug}`}
              className="ring__card"
              style={{ width: geo.w, height: h, transform: `rotateY(${i * step}deg) translateZ(${geo.r}px)` }}
              data-cursor="Drag"
              aria-label={it.title}
              onClick={(e) => {
                if (moved.current) e.preventDefault()
              }}
            >
              <Img id={it.img} sizes="330px" className="ring__img" />
            </TLink>
          ))}
        </div>
      </div>
      <div className="ring__caption wrap" aria-live="polite">
        <div key={current.slug} className="ring__caption-inner">
          <span className="t-label opacity-60">{String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          <h3 className="ring__title">{current.title}</h3>
          <span className="t-serif ring__meta">{current.meta}</span>
        </div>
        <TLink to={`/work/${current.slug}`} className="btn-pill btn-pill--ghost">
          Lihat proyek <ArrowRight className="h-[0.8em] w-auto" />
        </TLink>
      </div>
    </div>
  )
}
