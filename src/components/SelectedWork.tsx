import { useRef } from 'react'
import { gsap, useGSAP, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { categoryLabel, getProject, type Project } from '../data/projects'
import { ArrowRight } from './Icons'
import { Img, type ImgKey } from './Img'

/* Flagship projects for the home page — a different photo from the hero carousel for each. */
const picks: { slug: string; img: ImgKey }[] = [
  { slug: 'la-barka-resort', img: 'labarka-river' },
  { slug: 'klinik-uii', img: 'klinik-plaza' },
  { slug: 'hmw-house', img: 'hmw-pool' },
  { slug: 'bale-catur-villa-resto', img: 'balecatur-pool2' },
  { slug: 'perum-firlatata', img: 'firlatata-day' },
]

const items = picks.map(({ slug, img }) => ({ p: getProject(slug) as Project, img }))
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Selected projects as full-screen panels that stack while scrolling (after the Saisei reference in
 * the brief): each panel sticks, the next one rises over it, the covered one recedes and darkens.
 * Stacking is plain CSS `position: sticky`; GSAP only adds the depth and the title reveals.
 */
export function SelectedWork() {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el || reducedMotion()) return
      const panels = gsap.utils.toArray<HTMLElement>('.sw-panel', el)

      panels.forEach((panel, i) => {
        const next = panels[i + 1]

        // photo drifts into place while the panel rises
        gsap.fromTo(
          panel.querySelector('.sw-panel__parallax'),
          { yPercent: -8 },
          { yPercent: 0, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'top top', scrub: true } },
        )

        // title, meta and button come up once the panel is mostly on screen
        gsap
          .timeline({
            scrollTrigger: { trigger: panel, start: 'top 45%', toggleActions: 'play none none reverse' },
            defaults: { ease: 'power3.out' },
          })
          .from(panel.querySelector('.sw-panel__line'), { yPercent: 105, duration: 1.1 }, 0)
          .from(panel.querySelectorAll('.sw-panel__fade'), { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.15)

        // while the next panel covers this one, this one recedes and darkens
        if (next) {
          gsap
            .timeline({ scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } })
            .to(panel.querySelector('.sw-panel__link'), { scale: 0.9, ease: 'none' }, 0)
            .to(panel.querySelector('.sw-panel__dim'), { opacity: 0.6, ease: 'none' }, 0)
        }
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} className="sw">
      {items.map(({ p, img }, i) => (
        <article key={p.slug} className="sw-panel" data-theme="dark">
          <TLink to={`/work/${p.slug}`} className="sw-panel__link" data-cursor="Lihat" aria-label={`${p.title} — lihat proyek`}>
            <div className="sw-panel__media">
              <div className="sw-panel__parallax">
                <Img id={img} alt={p.title} sizes="100vw" />
              </div>
            </div>
            <span className="sw-panel__shade" aria-hidden="true" />

            <div className="sw-panel__top wrap">
              <span className="pill sw-panel__fade">{categoryLabel[p.category]}</span>
              <span className="sw-panel__count sw-panel__fade">
                {pad(i + 1)} / {pad(items.length)}
              </span>
            </div>

            <div className="sw-panel__bottom wrap">
              <div>
                <p className="sw-panel__meta sw-panel__fade">
                  {p.typology}
                  {p.location ? ` — ${p.location.replace(', Daerah Istimewa Yogyakarta', '')}` : ''}
                </p>
                <h3 className="sw-panel__title">
                  <span className="sw-panel__mask">
                    <span className="sw-panel__line">{p.title}</span>
                  </span>
                </h3>
              </div>
              <span className="btn-pill btn-pill--lg sw-panel__cta sw-panel__fade">
                Lihat proyek <ArrowRight className="h-[0.8em] w-auto" />
              </span>
            </div>
          </TLink>
          <span className="sw-panel__dim" aria-hidden="true" />
        </article>
      ))}
    </div>
  )
}
