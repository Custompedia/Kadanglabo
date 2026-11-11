import { useEffect, useRef, useState } from 'react'
import { gsap, reducedMotion } from '../lib/gsap'
import { whenGateOpen } from '../lib/gate'
import { SectionLabel } from './Bits'
import { Img, type ImgKey } from './Img'
import { tr } from '../lib/i18n'
import './ServiceSketch.css'

/**
 * Home (02), after Archidomo's sketch block, set on the site grid: a house model stands straight on the page
 * and builds itself as it scrolls into view. First the ground floor, then the upper floor settles on it, then
 * the roof. The steps beside it take the house apart again, so every floor can be looked into.
 * Assets: three renders from one camera, cut into stacking layers (scripts/build-model-layers.mjs).
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

// bottom to top: each layer only holds what its render adds to the one below
const layers: ImgKey[] = ['build-ground', 'build-upper', 'build-roof']
const STEP = 950 // ms between two layers landing

export function ServiceSketch() {
  const model = useRef<HTMLElement>(null)
  const timers = useRef<number[]>([])
  // how many layers stand. Without motion the house is simply finished; otherwise it waits, empty, to be built
  const [level, setLevel] = useState(() => (reducedMotion() ? layers.length : 0))
  const levelNow = useRef(level)
  levelNow.current = level

  const stop = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }
  /** Build up one layer at a time; taking the house apart lifts everything above at once. */
  const buildTo = (target: number) => {
    stop()
    const from = levelNow.current
    if (target <= from) return setLevel(target)
    for (let n = from + 1; n <= target; n++) {
      timers.current.push(window.setTimeout(() => setLevel(n), (n - from - 1) * STEP))
    }
  }

  // the first build: once the model is well inside the screen and its layers have loaded
  useEffect(() => {
    const el = model.current
    if (!el || reducedMotion()) return
    let live = true
    let io: IntersectionObserver | undefined
    const off = whenGateOpen(() => {
      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          io?.disconnect()
          const loaded = Array.from(el.querySelectorAll('img'), (img) =>
            img.complete
              ? null
              : new Promise((done) => {
                  img.addEventListener('load', done, { once: true })
                  img.addEventListener('error', done, { once: true })
                }),
          )
          Promise.all(loaded).then(() => {
            if (live && levelNow.current === 0) buildTo(layers.length)
          })
        },
        // most of the house in view, also where the model is taller than the screen
        { threshold: Math.min(0.7, (0.85 * window.innerHeight) / el.offsetHeight) },
      )
      io.observe(el)
    })
    return () => {
      live = false
      off()
      io?.disconnect()
      stop()
    }
  }, [])

  const steps = [tr('Ground floor', 'Lantai dasar'), tr('Upper floor', 'Lantai atas'), tr('Roof', 'Atap')]

  return (
    <section className="svs wrap" data-theme="light" aria-labelledby="svs-title">
      <header className="svs__head">
        <SectionLabel n="02">{tr('Core services & sectors', 'Layanan & sektor utama')}</SectionLabel>
        <h2 id="svs-title" className="svs__title" data-split>
          {tr('From the first sketch to a finished building.', 'Dari sketsa pertama hingga bangunan berdiri.')}
        </h2>
      </header>

      <div className="svs__stage">
        <div className="svs__aside">
          <p className="svs__note">
            <span className="svs__plus" aria-hidden="true">+</span>
            {tr('A house by our studio, built floor by floor.', 'Rumah karya studio kami, dibangun lantai demi lantai.')}
          </p>
          <div className="svs__steps" role="group" aria-label={tr('Show the model up to', 'Tampilkan model sampai')}>
            {steps.map((label, i) => (
              <button
                key={label}
                type="button"
                className="svs__step"
                data-built={i < level ? '' : undefined}
                aria-pressed={level === i + 1}
                onClick={() => buildTo(i + 1)}
              >
                <span className="svs__step-n">0{i + 1}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
        <figure className="svs__model" ref={model}>
          {layers.map((id, i) => (
            <Img
              key={id}
              id={id}
              className="svs__layer"
              data-off={i < level ? undefined : ''}
              aria-hidden={i > 0 ? true : undefined}
              alt={
                i === 0
                  ? tr(
                      '3D model of a two-storey house by Kadanglabo, shown floor by floor from the ground floor to the roof',
                      'Model 3D rumah dua lantai karya Kadanglabo, ditampilkan lantai demi lantai dari lantai dasar hingga atap',
                    )
                  : ''
              }
              sizes="(min-width: 900px) 60vw, 100vw"
            />
          ))}
        </figure>
      </div>
    </section>
  )
}
