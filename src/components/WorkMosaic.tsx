import { useRef, type CSSProperties } from 'react'
import { gsap, ScrollTrigger, useGSAP, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { categoryTitle, getProject, type Category } from '../data/projects'
import { Img, type ImgKey } from './Img'

/*
 * Our Work on the home page, after coevalstudio.com/services (reference in the brief):
 * a mosaic of project photos on a modular grid drifts upward while you scroll, and the giant
 * category title (1 / 3 → 3 / 3) collapses letter by letter and grows back as the next one.
 */

type Tile = { img: ImgKey; slug: string }
type Slot = { x: number; y: number; w: number; h: number; mx: number; my: number; mw: number; mh: number }

// 8-column grid (desktop) / 4-column grid (mobile); y in 1/16 of a block, h in half-modules
const slots: Slot[] = [
  { x: 0, y: 1, w: 2, h: 5, mx: 0, my: 0, mw: 2, mh: 4 },
  { x: 5, y: 0, w: 1, h: 3, mx: 3, my: 1, mw: 1, mh: 3 },
  { x: 3, y: 5, w: 2, h: 3, mx: 1, my: 5, mw: 2, mh: 3 },
  { x: 7, y: 4, w: 1, h: 3, mx: 3, my: 7, mw: 1, mh: 3 },
  { x: 1, y: 9, w: 2, h: 3, mx: 0, my: 9, mw: 2, mh: 3 },
  { x: 5, y: 8, w: 2, h: 5, mx: 2, my: 11, mw: 2, mh: 4 },
  { x: 3, y: 12, w: 1, h: 3, mx: 0, my: 13, mw: 1, mh: 3 },
]

const groups: { key: Category; title: string; tiles: Tile[] }[] = [
  {
    key: 'commercial',
    title: 'Commercial',
    tiles: [
      { img: 'klinik-hero', slug: 'klinik-uii' },
      { img: 'klinik-signage', slug: 'klinik-uii' },
      { img: 'klinik-plaza', slug: 'klinik-uii' },
      { img: 'klinik-corridor', slug: 'klinik-uii' },
      { img: 'klinik-tree', slug: 'klinik-uii' },
      { img: 'klinik-waiting', slug: 'klinik-uii' },
      { img: 'klinik-front', slug: 'klinik-uii' },
    ],
  },
  {
    key: 'hospitality',
    title: 'Hospitality',
    tiles: [
      { img: 'labarka-gables', slug: 'la-barka-resort' },
      { img: 'hamzah-front', slug: 'hamzah-batik-malioboro' },
      { img: 'balecatur-pool', slug: 'bale-catur-villa-resto' },
      { img: 'labarka-koi', slug: 'la-barka-resort' },
      { img: 'berbah-front', slug: 'villa-berbah' },
      { img: 'balecatur-lobby', slug: 'bale-catur-villa-resto' },
      { img: 'muji-front', slug: 'muji-rukost' },
    ],
  },
  {
    key: 'residential',
    title: 'Residential',
    tiles: [
      { img: 'hmw-garden', slug: 'hmw-house' },
      { img: 'tiara-front', slug: 'tiara-house-kalasan' },
      { img: 'giripeni-aerial', slug: 'bukit-indah-ceria-giripeni' },
      { img: 'ivanna-front', slug: 'ivanna-house' },
      { img: 'firlatata-front', slug: 'perum-firlatata' },
      { img: 'hmw-dining', slug: 'hmw-house' },
      { img: 'bangunjiwo-front', slug: 'kavling-bangunjiwo' },
    ],
  },
]

const N = groups.length
// the title switches when the drifting mosaic is halfway between two groups
const indexAt = (p: number) => Math.min(N - 1, Math.floor(p * (N - 1) + 0.5))

export function WorkMosaic() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const pattern = el.querySelector<HTMLElement>('.wm__pattern')!
      const block = el.querySelector<HTMLElement>('.wm__block')!
      const stage = el.querySelector<HTMLElement>('.wm__stage')!
      const titles = gsap.utils.toArray<HTMLElement>('.wm__title', el)
      const links = gsap.utils.toArray<HTMLElement>('.wm__explore', el)
      const count = el.querySelector<HTMLElement>('.wm__count-n')!
      let current = 0

      const label = el.querySelector<HTMLElement>('.wm__label')!
      const lastBlock = el.querySelectorAll<HTMLElement>('.wm__block')[N - 1]
      // start: the first photos sit fully below the "(03) Our work" label;
      // end: the last photos stop just above the bottom edge — no photo is ever cut at entry or exit
      const yStart = () => label.offsetTop + label.offsetHeight + 18
      const yEnd = () => {
        const tiles = Array.from(lastBlock.querySelectorAll<HTMLElement>('.wm__tile'))
        const bottom = Math.max(...tiles.map((t) => t.offsetTop + t.offsetHeight))
        return stage.clientHeight - 28 - (lastBlock.offsetTop + bottom)
      }
      // which category is in the middle of the screen, from where the mosaic actually is
      const indexFromY = (y: number) =>
        Math.max(0, Math.min(N - 1, Math.floor((stage.clientHeight / 2 - y) / block.offsetHeight)))

      gsap.set(titles.slice(1), { autoAlpha: 0 })
      gsap.set(links.slice(1), { autoAlpha: 0 })

      const show = (next: number) => {
        if (next === current) return
        const out = titles[current].querySelectorAll('.wm__char')
        const inn = titles[next].querySelectorAll('.wm__char')
        gsap.killTweensOf([...out, ...inn, ...links])
        // outgoing letters flatten into a line, left to right; the new word grows back out of it
        gsap.to(out, { scaleY: 0, duration: 0.45, stagger: 0.025, ease: 'power2.in', overwrite: true })
        gsap.set(titles[next], { autoAlpha: 1 })
        gsap.fromTo(inn, { scaleY: 0 }, { scaleY: 1, duration: 0.7, stagger: 0.035, ease: 'power3.out', delay: 0.3, overwrite: true })
        gsap.to(links[current], { autoAlpha: 0, y: -8, duration: 0.3 })
        gsap.fromTo(links[next], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.45 })
        count.textContent = String(next + 1)
        current = next
      }

      if (reducedMotion()) {
        gsap.set(pattern, { y: yStart })
        ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom', onUpdate: (s) => show(indexAt(s.progress)) })
        return
      }

      gsap.fromTo(
        pattern,
        { y: yStart },
        {
          y: yEnd,
          ease: 'none',
          // follows the rendered (smoothed) position, so title and photos always agree
          onUpdate: () => show(indexFromY(gsap.getProperty(pattern, 'y') as number)),
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
        },
      )

      // the section label introduces the mosaic, then steps aside so photos never run under it
      gsap.to([label, el.querySelector('.wm__hint')], {
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: () => `+=${stage.clientHeight * 0.35}`, scrub: true },
      })

      // first appearance: tiles of the first group rise in, the first word grows
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: 'top 70%', once: true } })
        .from(el.querySelectorAll('.wm__block:first-child .wm__tile'), {
          yPercent: 30,
          autoAlpha: 0,
          duration: 1.1,
          stagger: 0.07,
          ease: 'power3.out',
        })
        .from(titles[0].querySelectorAll('.wm__char'), { scaleY: 0, duration: 0.8, stagger: 0.04, ease: 'power3.out' }, 0.2)
        .from(el.querySelectorAll('.wm__count'), { autoAlpha: 0, y: 10, duration: 0.7 }, 0.5)
    },
    { scope: root },
  )

  return (
    <section ref={root} className="wm" data-theme="light" aria-label="Our work: proyek terpilih per kategori">
      <div className="wm__stage">
        <div className="wm__pattern" aria-hidden="true">
          {groups.map((g, bi) => (
            <div key={g.key} className="wm__block" style={{ '--bi': bi } as CSSProperties}>
              {g.tiles.map((t, i) => {
                const s = slots[i]
                const p = getProject(t.slug)
                return (
                  <TLink
                    key={t.img}
                    to={`/work/${t.slug}`}
                    className="wm__tile"
                    tabIndex={-1}
                    data-cursor="Lihat"
                    style={
                      {
                        '--x': s.x,
                        '--y': s.y,
                        '--w': s.w,
                        '--h': s.h,
                        '--mx': s.mx,
                        '--my': s.my,
                        '--mw': s.mw,
                        '--mh': s.mh,
                      } as CSSProperties
                    }
                  >
                    <Img id={t.img} alt={p?.title ?? ''} sizes="(min-width: 768px) 26vw, 50vw" />
                  </TLink>
                )
              })}
            </div>
          ))}
        </div>

        <div className="wm__ui">
          <span className="pill wm__label wm__fade">(03) Our work</span>
          <p className="wm__count wm__fade" aria-hidden="true">
            <span className="wm__count-n">1</span> / {N}
          </p>
          <h2 className="wm__titles">
            {groups.map((g) => (
              <span key={g.key} className="wm__title">
                <span className="sr-only">{g.title}</span>
                {g.title.split('').map((c, i) => (
                  <span key={i} className="wm__char" aria-hidden="true">
                    {c}
                  </span>
                ))}
              </span>
            ))}
          </h2>
          <div className="wm__links">
            {groups.map((g) => (
              <TLink key={g.key} to={`/work#${g.key}`} className="wm__explore">
                Lihat {categoryTitle[g.key]}
              </TLink>
            ))}
          </div>
          <span className="wm__hint wm__fade" aria-hidden="true">
            Scroll ↓
          </span>
        </div>
      </div>
    </section>
  )
}
