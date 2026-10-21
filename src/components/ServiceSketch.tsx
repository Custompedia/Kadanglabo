import { gsap } from '../lib/gsap'
import { SectionLabel } from './Bits'
import { Img } from './Img'
import './ServiceSketch.css'

/**
 * Home (02), after Archidomo's sketch block, set on the site grid: a large 3D model stands straight on the
 * page (its backdrop cut away) with a small "+" note beside it.
 * Asset: the site model from the company profile cover (cut out, see scripts/optimize-image.mjs --alpha).
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

export function ServiceSketch() {
  return (
    <section className="svs wrap" data-theme="light" aria-labelledby="svs-title">
      <header className="svs__head">
        <SectionLabel n="02">Core services & sectors</SectionLabel>
        <h2 id="svs-title" className="svs__title" data-split>
          Dari gambar pertama sampai bangunan berdiri.
        </h2>
      </header>

      {/* the model is simply there: no entrance, it scrolls with the page */}
      <div className="svs__stage">
        <p className="svs__aside">
          <span className="svs__plus" aria-hidden="true">+</span>
          Studi model tapak dan massa bangunan, dari gambar studio.
        </p>
        <figure className="svs__model">
          <Img id="draw-model-cut" alt="Model 3D tapak dan massa bangunan dari studio Kadanglabo" sizes="(min-width: 900px) 66vw, 100vw" />
        </figure>
      </div>
    </section>
  )
}
