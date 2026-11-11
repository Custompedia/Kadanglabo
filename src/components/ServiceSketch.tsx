import { useEffect, useRef, useState } from 'react'
import { gsap, reducedMotion } from '../lib/gsap'
import { whenGateOpen } from '../lib/gate'
import { SectionLabel } from './Bits'
import { Img, imgSrc } from './Img'
import { tr } from '../lib/i18n'
import model from '../data/model-parts.json'
import './ServiceSketch.css'

/**
 * Home (02), after Archidomo's sketch block, set on the site grid: a house stands straight on the page and
 * comes about in one six-second take once the section lands on screen. First a pencil draws it, line after
 * line, the long lines before the details. Then the building is laid onto the drawing like a puzzle: every part
 * (window pane, wall panel, floor slab, step, canopy, roof plane ...) glides in from its own direction, from
 * clear to solid, next to parts already in place, until the finished house covers the sketch.
 * Assets: three renders from one camera, turned into sketch, strokes and parts (scripts/build-model-parts.mjs).
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

/* ---- the take, in seconds: 2.3 drawing + 0.3 held + 3.4 building = 6 -------------------------------------- */
const DRAW = 2.3 // the pencil
const STROKE = [0.16, 0.6] // shortest and longest time one stroke takes
const HELD = 0.3 // the finished sketch, left alone
const BUILD = 3.4 // the puzzle
const LAND = 1.0 // one part, from clear and away to solid and home
const TOTAL = DRAW + HELD + BUILD

const PENCIL = 5 // picture px the pencil uncovers around a line's centre
const REACH = [34, 78] // picture px a part travels, nearest and farthest
const SWELL = 0.1 // how much larger a part is when it sets off

/* ---- the sketch as strokes: when each starts and how long it takes ------------------------------------------- */
type Stroke = { pts: number[]; len: number; at: number; dur: number }
const strokes: Stroke[] = (() => {
  const list = (model.strokes as number[][]).map((pts) => {
    let len = 0
    for (let i = 2; i < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1])
    return { pts, len, at: 0, dur: 0 }
  })
  // long lines first (the massing), details after; within that the hand moves from left to right
  const byLength = [...list].sort((a, b) => b.len - a.len)
  const longest = byLength[0]?.len || 1
  const all = list.reduce((sum, s) => sum + s.len, 0) || 1
  let inked = 0
  for (const s of byLength) {
    s.dur = STROKE[0] + (STROKE[1] - STROKE[0]) * Math.sqrt(s.len / longest)
    // its turn comes by how much line was drawn before it, so the pencil keeps one pace from first line to last
    const turn = 0.75 * (inked / all) + 0.25 * (s.pts[0] / model.w)
    s.at = turn * (DRAW - s.dur)
    inked += s.len
  }
  return list
})()

/* ---- the parts: where each comes from and when it sets off --------------------------------------------------- */
// per part on the sheet: x, y · width, height · x, y in the picture · storey
type Part = { sx: number; sy: number; w: number; h: number; x: number; y: number; dx: number; dy: number; at: number }
const parts: Part[] = (model.parts as number[][]).map(([sx, sy, w, h, x, y], n, all) => {
  // every part from its own side: the golden angle never repeats a direction for neighbours in the order
  const angle = n * 2.39996
  const reach = REACH[0] + (REACH[1] - REACH[0]) * ((n * 0.618034) % 1)
  return {
    sx, sy, w, h, x, y,
    dx: Math.cos(angle) * reach,
    dy: Math.sin(angle) * reach,
    at: DRAW + HELD + (n / Math.max(1, all.length - 1)) * (BUILD - LAND),
  }
})

const smooth = (p: number) => p * p * (3 - 2 * p)

export function ServiceSketch() {
  const figure = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  // without motion the house is simply finished
  const [built, setBuilt] = useState(reducedMotion)

  useEffect(() => {
    const el = figure.current
    const cv = canvas.current
    if (!el || !cv || reducedMotion()) return
    let live = true
    let take: gsap.core.Tween | undefined
    let sheet: HTMLImageElement | undefined
    const observers: IntersectionObserver[] = []
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)
    const sketch = el.querySelector<HTMLImageElement>('.svs__sketch')

    /** Parts sheet, fetched a screen ahead so the take never waits for it. */
    const fetchSheet = () => {
      if (sheet) return
      sheet = new Image()
      sheet.decoding = 'async'
      sheet.src = imgSrc('build-parts', el.offsetWidth * dpr())
    }

    const roll = () => {
      const ctx = cv.getContext('2d')
      const img = sheet
      if (!ctx || !sketch?.naturalWidth || !img?.naturalWidth) return setBuilt(true) // nothing to show it with
      cv.width = Math.round(Math.min(el.offsetWidth * dpr(), model.w * 2))
      cv.height = Math.round((cv.width * model.h) / model.w)
      const k = cv.width / model.w // canvas px per picture px
      const m = img.naturalWidth / model.sheet // sheet px per picture px

      // what the pencil has uncovered so far; the sketch image shows through it
      const paper = document.createElement('canvas')
      paper.width = cv.width
      paper.height = cv.height
      const pencil = paper.getContext('2d')
      if (!pencil) return setBuilt(true)
      pencil.lineWidth = PENCIL * k
      pencil.lineCap = 'round'
      pencil.lineJoin = 'round'
      const done = new Uint8Array(strokes.length)

      const draw = (t: number) => {
        for (let n = 0; n < strokes.length; n++) {
          const s = strokes[n]
          if (done[n] || t < s.at) continue
          const p = Math.min(1, (t - s.at) / s.dur)
          let left = s.len * smooth(p) // the hand starts and stops gently
          pencil.beginPath()
          pencil.moveTo(s.pts[0] * k, s.pts[1] * k)
          for (let i = 2; i < s.pts.length && left > 0; i += 2) {
            const [ax, ay, bx, by] = [s.pts[i - 2], s.pts[i - 1], s.pts[i], s.pts[i + 1]]
            const seg = Math.hypot(bx - ax, by - ay) || 1
            const f = Math.min(1, left / seg)
            pencil.lineTo((ax + (bx - ax) * f) * k, (ay + (by - ay) * f) * k)
            left -= seg
          }
          pencil.stroke()
          if (p === 1) done[n] = 1
        }
        // towards the end the whole sheet clears: grain and dots no stroke passed over
        const rest = (t - (DRAW - 0.35)) / (0.35 + HELD * 0.6)
        if (rest > 0) {
          pencil.globalAlpha = Math.min(1, rest) * 0.25
          pencil.fillRect(0, 0, paper.width, paper.height)
          pencil.globalAlpha = 1
        }
      }

      const clock = { t: 0 }
      take = gsap.to(clock, {
        t: TOTAL,
        duration: TOTAL,
        ease: 'none',
        onUpdate: () => {
          const t = clock.t
          if (t < DRAW + HELD) draw(t)
          ctx.clearRect(0, 0, cv.width, cv.height)
          // the sketch, as far as the pencil has come
          ctx.globalAlpha = 1
          ctx.drawImage(paper, 0, 0)
          ctx.globalCompositeOperation = 'source-in'
          ctx.drawImage(sketch, 0, 0, cv.width, cv.height)
          ctx.globalCompositeOperation = 'source-over'
          // the parts, in the order they set off
          for (const part of parts) {
            const p = (t - part.at) / LAND
            if (p <= 0) break
            const away = p >= 1 ? 0 : (1 - p) ** 4 // fast out of the distance, slow into place
            const size = 1 + SWELL * away
            ctx.globalAlpha = p >= 1 ? 1 : smooth(Math.min(1, p / 0.85)) // clear to solid, over the whole glide
            ctx.drawImage(
              img,
              part.sx * m, part.sy * m, part.w * m, part.h * m,
              (part.x + part.dx * away - (part.w * (size - 1)) / 2) * k,
              (part.y + part.dy * away - (part.h * (size - 1)) / 2) * k,
              part.w * size * k,
              part.h * size * k,
            )
          }
        },
        // the canvas now shows the whole house: hand over to the plain image
        onComplete: () => setBuilt(true),
      })
    }

    const loaded = (img: HTMLImageElement) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((ready) => {
            img.addEventListener('load', () => ready(), { once: true })
            img.addEventListener('error', () => ready(), { once: true })
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
      // landed: a good half of the house in view, also where the model is taller than the screen
      watch(
        () => {
          fetchSheet()
          const waits = Array.from(el.querySelectorAll('img'), loaded)
          if (sheet) waits.push(loaded(sheet))
          Promise.all(waits).then(() => live && roll())
        },
        { threshold: Math.min(0.55, (0.8 * window.innerHeight) / el.offsetHeight) },
      )
    })
    return () => {
      live = false
      off()
      observers.forEach((io) => io.disconnect())
      take?.kill()
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
        <figure className="svs__model" ref={figure} data-built={built ? '' : undefined}>
          <Img
            id="build-full"
            className="svs__full"
            alt={tr('3D model of a two-storey house by Kadanglabo', 'Model 3D rumah dua lantai karya Kadanglabo')}
            sizes="(min-width: 900px) 60vw, 100vw"
          />
          {/* only read by the canvas: the pencil uncovers it stroke by stroke */}
          <Img id="build-sketch" className="svs__sketch" alt="" aria-hidden sizes="(min-width: 900px) 60vw, 100vw" />
          <canvas ref={canvas} className="svs__parts" aria-hidden="true" />
        </figure>
      </div>
    </section>
  )
}
