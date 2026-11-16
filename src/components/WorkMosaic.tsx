import { useRef, type CSSProperties } from 'react'
import { gsap, ScrollTrigger, useGSAP, reducedMotion } from '../lib/gsap'
import { categoryTiles } from '../data/pages'
import { TLink } from '../lib/transition'
import { whenGateOpen } from '../lib/gate'
import { useMediaQuery } from '../lib/media'
import { categoryTitle, getProject, type Category } from '../data/projects'
import { Img, type ImgKey } from './Img'
import { ArrowRight } from './Icons'
import { tr } from '../lib/i18n'

/**
 * "View <category>": a dark capsule with a round orange badge whose arrow runs through on hover.
 * GSAP fades and lifts the link itself, so the colour changes live on the inner capsule.
 */
function ExploreButton({ cat, className }: { cat: Category; className: string }) {
  return (
    <TLink to={`/work/${cat}`} className={className}>
      <span className="wm-btn">
        <span className="wm-btn__k">{tr('View', 'Lihat')}</span>
        <span className="wm-btn__name">{categoryTitle[cat]}</span>
        <span className="wm-btn__icon" aria-hidden="true">
          <ArrowRight />
          <ArrowRight />
        </span>
      </span>
    </TLink>
  )
}

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

/** The hand-picked tiles; a tile whose project is no longer live is replaced (see categoryTiles). */
const picked: { key: Category; title: string; tiles: Tile[] }[] = [
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

// what the CMS has live: the picks still on the site, topped up from the category's projects
const groups = picked.map((g) => ({ ...g, tiles: categoryTiles(g.key, g.tiles, slots.length) })).filter((g) => g.tiles.length)
const N = groups.length
// the title switches when the drifting mosaic is halfway between two groups
const indexAt = (p: number) => Math.min(N - 1, Math.floor(p * (N - 1) + 0.5))

export function WorkMosaic() {
  const phone = useMediaQuery('(max-width: 767px)')
  return phone ? <WorkStack /> : <Mosaic />
}

/**
 * Phones: on a narrow screen the drifting mosaic put the giant titles over the photos (and past the
 * screen edge), so the same three categories become a calm stack: counter, title, three photos, link.
 */
function WorkStack() {
  const root = useRef<HTMLElement>(null)

  // Photos come in as on archidomo.fr: each opens from its top-left corner out to the full frame while the
  // picture settles from a slight zoom; the second photo of a row follows a beat later. Set up here (not via
  // data-reveal) so it also runs when the stack only mounts after the screen narrows.
  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current
      if (!el || !contextSafe) return
      const run = contextSafe(() => {
        if (reducedMotion()) return
        el.querySelectorAll<HTMLElement>('.wms__grid').forEach((grid) => {
          grid.querySelectorAll<HTMLElement>('.wms__tile').forEach((tile, i) => {
            const at = i === 2 ? 0.12 : 0
            gsap
              .timeline({ scrollTrigger: { trigger: tile, start: 'top 92%', once: true } })
              .fromTo(
                tile,
                { clipPath: 'polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)' },
                { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: 1.4, ease: 'power4.inOut', clearProps: 'clipPath' },
                at,
              )
              .fromTo(tile.querySelector('img'), { scale: 1.2 }, { scale: 1, duration: 1.5, ease: 'power3.out' }, at)
          })
        })
      })
      return whenGateOpen(run)
    },
    { scope: root },
  )

  return (
    <section ref={root} className="wms wrap" data-theme="light" aria-label={tr('Selected projects by sector', 'Proyek pilihan menurut sektor')}>
      <span className="pill" data-fade>
        (03) {tr('Our work', 'Proyek kami')}
      </span>
      {groups.map((g, gi) => (
        <div key={g.key} className="wms__group">
          <p className="wms__count" data-fade>
            {gi + 1} / {N}
          </p>
          <h2 className="wms__title" data-split>
            {g.title}
          </h2>
          <div className="wms__grid">
            {g.tiles.slice(0, 3).map((t, i) => {
              const p = getProject(t.slug)
              return (
                <TLink key={t.img} to={`/work/${t.slug}`} className={i === 0 ? 'wms__tile wms__tile--wide' : 'wms__tile'}>
                  <Img id={t.img} alt={p?.title ?? ''} sizes={i === 0 ? '100vw' : '50vw'} />
                </TLink>
              )
            })}
          </div>
          <span className="wms__link" data-fade>
            <ExploreButton cat={g.key} className="wms__btn" />
          </span>
        </div>
      ))}
    </section>
  )
}

function Chars({ text }: { text: string }) {
  return text.split('').map((c, i) => (
    <span key={i} className="wm__char" aria-hidden="true">
      {c}
    </span>
  ))
}

function Mosaic() {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const el = root.current
      if (!el) return
      const pattern = el.querySelector<HTMLElement>('.wm__pattern')!
      const block = el.querySelector<HTMLElement>('.wm__block')!
      const stage = el.querySelector<HTMLElement>('.wm__stage')!
      const titles = gsap.utils.toArray<HTMLElement>('.wm__titles--base .wm__title', el)
      // the same words in orange, seen only where they cross a photo (see the photo mask below)
      const hitWords = el.querySelector<HTMLElement>('.wm__titles--hit')!
      const hitTitles = gsap.utils.toArray<HTMLElement>('.wm__title', hitWords)
      const charsOf = (i: number) => [...titles[i].querySelectorAll('.wm__char'), ...hitTitles[i].querySelectorAll('.wm__char')]
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

      gsap.set([...titles.slice(1), ...hitTitles.slice(1)], { autoAlpha: 0 })
      gsap.set(links.slice(1), { autoAlpha: 0 })

      // The orange word over the photos. The orange copy lies exactly on the ink word and is masked by an image of
      // the photos' rectangles, drawn once per layout in the pattern's coordinates. While scrolling only the mask's
      // position follows the photos: no shape is recomputed and only the word-sized mask is drawn again (the old
      // version recut a clip path through both words on every frame, which made the scroll stutter).
      let maskX = 0
      let maskY = 0
      let lastMask = ''
      const cutWindow = () => {
        const stageBox = stage.getBoundingClientRect()
        const words = hitWords.getBoundingClientRect()
        const width = pattern.offsetWidth
        let height = 0
        let rects = ''
        el.querySelectorAll<HTMLElement>('.wm__block').forEach((b) =>
          b.querySelectorAll<HTMLElement>('.wm__tile').forEach((t) => {
            const y = b.offsetTop + t.offsetTop
            height = Math.max(height, y + t.offsetHeight)
            rects += `<rect x='${t.offsetLeft}' y='${y}' width='${t.offsetWidth}' height='${t.offsetHeight}'/>`
          }),
        )
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${rects}</svg>`
        hitWords.style.maskImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
        // where the pattern's corner is, seen from the word's corner (before the pattern moves)
        maskX = pattern.offsetLeft - (words.left - stageBox.left)
        maskY = pattern.offsetTop - (words.top - stageBox.top)
        lastMask = ''
      }
      const follow = (y: number) => {
        const at = `${maskX}px ${Math.round(maskY + y)}px`
        if (at === lastMask) return
        lastMask = at
        hitWords.style.maskPosition = at
      }
      cutWindow()
      const refit = () => (cutWindow(), follow(gsap.getProperty(pattern, 'y') as number))
      ScrollTrigger.addEventListener('refresh', refit)
      const stopCut = () => ScrollTrigger.removeEventListener('refresh', refit)

      // Lazy photos only load (and decode) as they drift into view, which stalled the scroll mid-section. A screen
      // before the section arrives, every photo of the mosaic is fetched and decoded up front instead.
      // (onToggle, not onEnter: also fires when the page opens below the section and is scrolled back up into it)
      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom+=100%',
        onToggle: (self) => {
          if (!self.isActive) return
          self.kill()
          el.querySelectorAll<HTMLImageElement>('.wm__tile img').forEach((img) => {
            img.loading = 'eager'
            img.decode().catch(() => {})
          })
        },
      })

      const show = (next: number) => {
        if (next === current) return
        const out = charsOf(current)
        const inn = charsOf(next)
        gsap.killTweensOf([...out, ...inn, ...links])
        // outgoing letters flatten into a line, left to right; the new word grows back out of it
        gsap.to(out, { scaleY: 0, duration: 0.45, stagger: 0.025, ease: 'power2.in', overwrite: true })
        gsap.set([titles[next], hitTitles[next]], { autoAlpha: 1 })
        gsap.fromTo(inn, { scaleY: 0 }, { scaleY: 1, duration: 0.7, stagger: 0.035, ease: 'power3.out', delay: 0.3, overwrite: true })
        gsap.to(links[current], { autoAlpha: 0, y: -8, duration: 0.3 })
        gsap.fromTo(links[next], { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.45 })
        count.textContent = String(next + 1)
        current = next
      }

      if (reducedMotion()) {
        gsap.set(pattern, { y: yStart })
        follow(yStart())
        ScrollTrigger.create({ trigger: el, start: 'top top', end: 'bottom bottom', onUpdate: (s) => show(indexAt(s.progress)) })
        return stopCut
      }

      gsap.fromTo(
        pattern,
        { y: yStart },
        {
          y: yEnd,
          ease: 'none',
          // follows the rendered (smoothed) position, so title and photos always agree
          onUpdate: () => {
            const y = gsap.getProperty(pattern, 'y') as number
            follow(y)
            show(indexFromY(y))
          },
          scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
        },
      )

      // the section label introduces the mosaic, then steps aside so photos never run under it
      gsap.to([label, el.querySelector('.wm__hint')], {
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top top', end: () => `+=${stage.clientHeight * 0.35}`, scrub: true },
      })

      // first appearance: tiles of the first group rise in, the first word grows. The orange shows once the photos
      // have landed (its window is cut to where they end up, not to where they rise from)
      gsap.set(hitWords, { autoAlpha: 0 })
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: 'top 70%', once: true } })
        .from(el.querySelectorAll('.wm__block:first-child .wm__tile'), {
          yPercent: 30,
          autoAlpha: 0,
          duration: 1.1,
          stagger: 0.07,
          ease: 'power3.out',
        })
        .from(charsOf(0), { scaleY: 0, duration: 0.8, stagger: 0.04, ease: 'power3.out' }, 0.2)
        .from(el.querySelectorAll('.wm__count'), { autoAlpha: 0, y: 10, duration: 0.7 }, 0.5)
        .to(hitWords, { autoAlpha: 1, duration: 0.5 }, '>-0.3')

      return stopCut
    },
    { scope: root },
  )

  return (
    <section ref={root} className="wm" data-theme="light" aria-label={tr('Selected projects by sector', 'Proyek pilihan menurut sektor')}>
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
                    data-cursor={tr('View', 'Lihat')}
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
                    <Img id={t.img} alt={p?.title ?? ''} sizes="(min-width: 768px) 26vw, 50vw" maxW={1280} />
                  </TLink>
                )
              })}
            </div>
          ))}
        </div>

        <div className="wm__ui">
          <span className="pill wm__label wm__fade">(03) {tr('Our work', 'Proyek kami')}</span>
          <p className="wm__count wm__fade" aria-hidden="true">
            <span className="wm__count-n">1</span> / {N}
          </p>
          <h2 className="wm__titles wm__titles--base">
            {groups.map((g) => (
              <span key={g.key} className="wm__title">
                <span className="sr-only">{g.title}</span>
                <Chars text={g.title} />
              </span>
            ))}
          </h2>
          {/* the orange copy of the word, seen only through the photos (a mask that follows them) */}
          <div className="wm__titles wm__titles--hit" aria-hidden="true">
            {groups.map((g) => (
              <span key={g.key} className="wm__title">
                <Chars text={g.title} />
              </span>
            ))}
          </div>
          <div className="wm__links">
            {groups.map((g) => (
              <ExploreButton key={g.key} cat={g.key} className="wm__explore" />
            ))}
          </div>
          <span className="wm__hint wm__fade" aria-hidden="true">
            {tr('Scroll', 'Gulir')} ↓
          </span>
        </div>
      </div>
    </section>
  )
}
