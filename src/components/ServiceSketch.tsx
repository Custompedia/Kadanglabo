import { gsap } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { serviceGroups } from '../data/site'
import { SectionLabel } from './Bits'
import { Img } from './Img'
import './ServiceSketch.css'

/**
 * Home (02), after Archidomo's sketch block, set on the site grid: a large 3D model stands straight on the
 * page (its backdrop cut away), a drawing card and a finished visual of equal size line up under it, and
 * the services follow as "+" notes under them.
 * Assets: the site model from the company profile cover and the interior axonometric from its
 * "Our Service" page (both cut out, see scripts/optimize-image.mjs --alpha), plus a Perum Firlatata render.
 */
export function animateServiceSketch(page: HTMLElement) {
  const el = page.querySelector<HTMLElement>('.svs')
  if (!el) return
  // the "+" marks turn into place as each note arrives
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

      <div className="svs__row">
        <figure className="svs__card">
          <div className="svs__card-frame" data-reveal>
            <Img id="draw-interior-cut" alt="Gambar aksonometri interior hunian dari studio Kadanglabo" sizes="(min-width: 900px) 32vw, 50vw" />
          </div>
          <figcaption className="svs__cap">Desain interior</figcaption>
        </figure>
        <figure className="svs__photo">
          <div className="svs__photo-frame" data-reveal data-delay="0.15">
            <Img id="firlatata-living" alt="Perum Firlatata - ruang keluarga dan dapur" sizes="(min-width: 900px) 40vw, 50vw" />
          </div>
          <figcaption className="svs__cap">Visualisasi 3D, Perum Firlatata</figcaption>
        </figure>
      </div>

      <div className="svs__notes" data-stagger="0.1">
        {serviceGroups.map((g) => (
          <div key={g.group} className="svs__note">
            <span className="svs__plus" aria-hidden="true">+</span>
            <p className="svs__note-head">
              {g.group} <span className="svs__note-count">{g.items.length}</span>
            </p>
            <ul className="svs__note-list">
              {g.items.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ))}
        <TLink to="/services" className="link-line t-label svs__link">
          Our services →
        </TLink>
      </div>
    </section>
  )
}
