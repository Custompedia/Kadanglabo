import { useEffect, useRef, useState } from 'react'
import { gsap, reducedMotion } from '../lib/gsap'
import { whenGateOpen } from '../lib/gate'
import { SectionLabel } from './Bits'
import { Img, imgSrc } from './Img'
import { tr } from '../lib/i18n'
import model from '../data/model-parts.json'
import './ServiceSketch.css'

/**
 * Home (02), after Archidomo's sketch block, set on the site grid: a house stands straight on the page, first
 * as a line sketch. Once the section lands on screen the building is set onto the sketch part by part (lawn,
 * drive, walls, canopy, roof planes ...), quickly, from the ground up, until the finished house covers the drawing.
 * Assets: three renders from one camera, turned into sketch + parts sheet (scripts/build-model-parts.mjs).
 */
export function animateServiceSketch(page: HTMLElement) {
  const el = page.querySelector<HTMLElement>('.svs')
  if (!el) return
  // the "+" mark turns into place as the note arrives
  el.querySelectorAll<HTMLElement>('.svs__plus').forEach((plus) =>
    gsap.from(plus, {
      rotate: -90,
      autoAlpha: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: plus, start: 'top 92%', once: true },
    }),
  )
}

// per part: x, y on the sheet · width, height · x, y in the picture · storey (1 ground, 2 upper, 3 roof)
const parts = model.parts as [number, number, number, number, number, number, number][]
const HOLD = 0.35 // s the sketch is left alone once the section has landed
const EACH = 0.026 // s from one part to the next
const PAUSE = 0.14 // s of breath between two storeys
const LAND = 0.42 // s a part takes to settle
const DROP = 24 // picture px a part comes down from

export function ServiceSketch() {
  const figure = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  // without motion the house is simply finished; otherwise it waits as a sketch
  const [phase, setPhase] = useState<'sketch' | 'building' | 'built'>(() => (reducedMotion() ? 'built' : 'sketch'))

  useEffect(() => {
    const el = figure.current
    const cv = canvas.current
    if (!el || !cv || reducedMotion()) return
    let live = true
    let run: gsap.core.Tween | undefined
    let sheet: HTMLImageElement | undefined
    const observers: IntersectionObserver[] = []
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)

    /** Parts sheet, fetched a screen ahead so the build never waits for it. */
    const fetchSheet = () => {
      if (sheet) return
      sheet = new Image()
      sheet.decoding = 'async'
      sheet.src = imgSrc('build-parts', el.offsetWidth * dpr())
    }

    const build = () => {
      const ctx = cv.getContext('2d')
      const img = sheet
      if (!ctx || !img?.naturalWidth) return setPhase('built') // no sheet, no show: just the finished house
      cv.width = Math.round(Math.min(el.offsetWidth * dpr(), model.w * 2))
      cv.height = Math.round((cv.width * model.h) / model.w)
      const k = cv.width / model.w // canvas px per picture px
      const m = img.naturalWidth / model.sheet // sheet px per picture px
      const last = parts[parts.length - 1]
      const clock = { t: 0 }
      const total = (parts.length - 1) * EACH + (last[6] - 1) * PAUSE + LAND
      setPhase('building')
      run = gsap.to(clock, {
        t: total,
        duration: total,
        delay: HOLD,
        ease: 'none',
        onUpdate: () => {
          ctx.clearRect(0, 0, cv.width, cv.height)
          for (let n = 0; n < parts.length; n++) {
            const [sx, sy, w, h, x, y, storey] = parts[n]
            const p = (clock.t - n * EACH - (storey - 1) * PAUSE) / LAND
            if (p <= 0) break // parts go up in order: nothing after this one has started
            const near = 1 - Math.min(1, p)
            ctx.globalAlpha = Math.min(1, p * 3)
            ctx.drawImage(img, sx * m, sy * m, w * m, h * m, x * k, (y - DROP * near ** 4) * k, w * k, h * k)
          }
        },
        // the canvas now shows the whole house: hand over to the plain image
        onComplete: () => setPhase('built'),
      })
    }

    const loaded = (img: HTMLImageElement) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((done) => {
            img.addEventListener('load', () => done(), { once: true })
            img.addEventListener('error', () => done(), { once: true })
          })

    const watch = (fn: () => void, options: IntersectionObserverInit) => {
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        fn()
      }, options)
      io.observe(el)
      observers.push(io)
    }

    const off = whenGateOpen(() => {
      watch(fetchSheet, { rootMargin: '100% 0px' })
      // landed: most of the house in view, also where the model is taller than the screen
      watch(
        () => {
          fetchSheet()
          const waits = Array.from(el.querySelectorAll('img'), loaded)
          if (sheet) waits.push(loaded(sheet))
          Promise.all(waits).then(() => live && build())
        },
        { threshold: Math.min(0.7, (0.85 * window.innerHeight) / el.offsetHeight) },
      )
    })
    return () => {
      live = false
      off()
      observers.forEach((io) => io.disconnect())
      run?.kill()
    }
  }, [])

  return (
    <section className="svs wrap" data-theme="light" aria-labelledby="svs-title">
      <header className="svs__head">
        <SectionLabel n="02">{tr('Core services & sectors', 'Layanan & sektor utama')}</SectionLabel>
        <h2 id="svs-title" className="svs__title" data-split>
          {tr('From the first sketch to a finished building.', 'Dari sketsa pertama hingga bangunan berdiri.')}
        </h2>
      </header>

      <div className="svs__stage">
        <p className="svs__aside">
          <span className="svs__plus" aria-hidden="true">+</span>
          {tr('A house by our studio, from sketch to building.', 'Rumah karya studio kami, dari sketsa hingga terbangun.')}
        </p>
        <figure className="svs__model" ref={figure} data-phase={phase}>
          <Img
            id="build-full"
            className="svs__full"
            alt={tr('3D model of a two-storey house by Kadanglabo', 'Model 3D rumah dua lantai karya Kadanglabo')}
            sizes="(min-width: 900px) 60vw, 100vw"
          />
          <Img id="build-sketch" className="svs__sketch" alt="" aria-hidden sizes="(min-width: 900px) 60vw, 100vw" />
          <canvas ref={canvas} className="svs__parts" aria-hidden="true" />
        </figure>
      </div>
    </section>
  )
}
