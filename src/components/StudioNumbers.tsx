import type { CSSProperties } from 'react'
import { Img, type ImgKey } from './Img'
import { SectionLabel } from './Bits'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { company, team } from '../data/site'
import { archive, areaStats, categoryLabel, categoryOrder } from '../data/projects'
import { tr } from '../lib/i18n'

// project photos on the orbit of "Kadanglabo dalam angka" (warm renders, no blue drawings); the orbit shows the
// first --count of them (13 on wide screens, fewer on smaller ones, set in CSS) so the spacing stays even
const ringPhotos: ImgKey[] = [
  'labarka-river',
  'hamzah-front',
  'klinik-front',
  'balecatur-pool',
  'giripeni-aerial',
  'labarka-teppanyaki',
  'muji-front',
  'hmw-facade',
  'firlatata-street',
  'wira-front',
  'ivanna-front',
  'balecatur-lobby',
  'labarka-gables',
]

// every figure comes from the site data, so it stays true when projects or people are added
// (built at render time, so the labels follow the current language)
const figures = () => [
  {
    value: String(company.founded),
    label: tr('Founded', 'Tahun berdiri'),
    note: tr(`Founded by ${company.founder} in late September ${company.founded}`, `Didirikan oleh ${company.founder} akhir September ${company.founded}`),
  },
  {
    value: `${Math.floor(archive.length / 10) * 10}+`,
    label: tr('Projects', 'Proyek'),
    note: tr('Homes, estates, resorts, restaurants, offices and clinics', 'Rumah, perumahan, resort, restoran, kantor, dan klinik'),
  },
  { value: String(areaStats.length), label: tr('Regions', 'Wilayah'), note: areaStats.map((a) => a.label).join(' · ') },
  { value: String(categoryOrder.length), label: tr('Sectors', 'Sektor'), note: categoryOrder.map((c) => categoryLabel[c]).join(' · ') },
  {
    value: String(team.length),
    label: tr('In-house team', 'Tim in-house'),
    note: tr('Architects, drafters, site supervisors and a digital team', 'Arsitek, drafter, pengawas lapangan, dan tim digital'),
  },
]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Kadanglabo in numbers (Home, after the About block): sets up the ring scene inside `page` */
export function animateStudioNumbers(page: HTMLElement): (() => void) | undefined {
  // Kadanglabo in numbers, on every screen size: the stage holds; the project photos fly in from beyond the screen
  // edges onto a tilted orbit (a ring seen from slightly above: an ellipse, the front photos larger and on top, the
  // back ones smaller), the intro steps aside and the figures roll past the centre like a drum, then the photos fly
  // back out. The orbit's radii and the photo size scale per breakpoint in CSS (.numbers in styles.css); without
  // motion (reduced motion) [data-motion] is never set and the figures stay a calm list.
  const numbers = page.querySelector<HTMLElement>('.numbers')
  if (!numbers) return
  const stage = numbers.querySelector<HTMLElement>('.numbers__stage')!
  const ring = numbers.querySelector<HTMLElement>('.numbers__ring')!
  const intro = numbers.querySelector<HTMLElement>('.numbers__intro')!
  const items = gsap.utils.toArray<HTMLElement>('.numbers__item', numbers)
  const allPhotos = gsap.utils.toArray<HTMLElement>('.numbers__photo', numbers)
  const ease = gsap.parseEase('power3.out')
  const easeIn = gsap.parseEase('power3.in')
  const TILT = -5 // degrees the whole orbit leans, so it reads as a ring in space rather than a flat oval
  const cosT = Math.cos((TILT * Math.PI) / 180)
  const sinT = Math.sin((TILT * Math.PI) / 180)
  const depthScale = (a: number) => 1 / (1 - Math.cos(a) * 0.2) // nearer photos (cos a -> 1) are larger
  const TABLE = 360
  let rx = 0 // the orbit's half-width and half-height (the ring box is --rx by --ry in CSS), measured on refresh
  let ry = 0
  let stageH = 0
  let flyOut = 0 // how far a photo travels from the orbit to be fully off screen, from any point of it
  let photos: HTMLElement[] = []
  let order: number[] = []
  // u (0..1, even steps) -> angle on the orbit. Spacing photos by angle bunches them at the narrow sides of the
  // ellipse and leaves gaps at the front and back; spacing them by arc length measured in photo widths (screen length
  // over the depth scale) gives every photo the same breathing room for its size, and the orbit turns evenly
  let arc: number[] = []
  const measure = () => {
    rx = ring.offsetWidth
    ry = ring.offsetHeight
    stageH = stage.clientHeight
    // half the screen diagonal plus the photo's own half-diagonal at its largest (front, flying: 1.25 x 1.5 scale),
    // with room for the 3D turn: past that no corner of the photo can still be inside the frame
    flyOut = Math.hypot(stage.clientWidth, stageH) / 2 + (allPhotos[0]?.offsetWidth ?? 0) * 1.25 + 40
    const count = Math.min(allPhotos.length, parseInt(getComputedStyle(ring).getPropertyValue('--count')) || allPhotos.length)
    photos = allPhotos.slice(0, count)
    allPhotos.forEach((ph, i) => (ph.style.display = i < count ? '' : 'none'))
    // each photo gets its own moment to arrive and to leave, in a shuffled order around the orbit
    order = photos.map((_, i) => ((i * 5) % count) / count)
    const cum = [0]
    for (let j = 1; j <= TABLE; j++) {
      const a = ((j - 0.5) / TABLE) * Math.PI * 2
      const ds = Math.hypot(rx * Math.cos(a), ry * Math.sin(a)) / depthScale(a) // screen length per unit of photo size
      cum.push(cum[j - 1] + ds)
    }
    const total = cum[TABLE]
    arc = []
    let j = 0
    for (let q = 0; q <= TABLE; q++) {
      const target = (q / TABLE) * total
      while (j < TABLE - 1 && cum[j + 1] < target) j++
      const f = (target - cum[j]) / (cum[j + 1] - cum[j] || 1)
      arc.push(((j + f) / TABLE) * Math.PI * 2)
    }
  }
  const angleAt = (u: number) => {
    const w = (((u % 1) + 1) % 1) * TABLE
    const q = Math.floor(w)
    return arc[q] + (arc[q + 1] - arc[q]) * (w - q)
  }
  numbers.dataset.motion = ''
  const render = (p: number) => {
    if (!arc.length) measure()
    const turn = -0.45 * p // the orbit turns (a little under half a lap) as the page scrolls
    photos.forEach((ph, i) => {
      // photos: from fully off screen onto the orbit, and fully off screen again at the end, each along its own
      // spoke (straight out from the centre through its place on the orbit)
      const inAt = order[i] * 0.12
      const outAt = 0.8 + order[i] * 0.1
      const arrive = ease(clamp01((p - inAt) / 0.12))
      const leave = easeIn(clamp01((p - outAt) / 0.1))
      const fly = 1 - arrive + leave // 0 = on the orbit, 1 = off screen
      const a = angleAt(i / photos.length + turn)
      const depth = Math.cos(a) // 1 = nearest the viewer (bottom of the orbit), -1 = farthest (top)
      const ox = rx * Math.sin(a)
      const oy = ry * depth
      const x0 = ox * cosT - oy * sinT
      const y0 = ox * sinT + oy * cosT
      const len = Math.hypot(x0, y0) || 1
      const x = x0 + (x0 / len) * flyOut * fly
      const y = y0 + (y0 / len) * flyOut * fly
      // a photo flying in also comes from closer to the camera, so it starts larger
      const s = depthScale(a) * (1 + 0.5 * fly)
      // before it arrives and once it has left it is hidden outright, so nothing can linger at an edge
      const vis = fly >= 1 ? 'hidden' : ''
      if (ph.style.visibility !== vis) ph.style.visibility = vis
      ph.style.transform =
        `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(4)}) ` +
        `perspective(900px) rotateY(${(Math.sin(a) * 28).toFixed(2)}deg) rotate(${TILT}deg)`
      const z = String(Math.round(100 + depth * 50)) // only when it changes: a new stacking order means a re-sort
      if (ph.style.zIndex !== z) ph.style.zIndex = z
    })
    const out = clamp01((p - 0.16) / 0.06) // the intro holds while the photos gather, then steps away
    const show = clamp01((p - 0.215) / 0.05) // and the first figure rises in right behind it, once the intro is gone
    const pos = clamp01((p - 0.25) / 0.53) * (items.length - 1) // which figure sits in the centre
    // the drum step: a short roll inside the orbit, each figure faded out before it reaches the photos around it
    const step = Math.min(stageH * 0.3, ry * 0.75)
    const fade = 2
    gsap.set(intro, { opacity: 1 - out, y: -70 * out })
    items.forEach((item, i) => {
      const d = i - pos + (1 - show) * 0.35 // the first figure rises into place as it appears
      gsap.set(item, { y: d * step, opacity: clamp01(1 - Math.abs(d) * fade) * show, scale: 1 - Math.min(1, Math.abs(d)) * 0.1 })
    })
  }
  ScrollTrigger.create({
    trigger: numbers,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => render(self.progress),
    onRefresh: (self) => {
      measure()
      render(self.progress)
    },
  })
  // [data-motion] makes the section 400svh tall: every trigger below it (the Our Work mosaic,
  // created when the page mounted) has to measure again, or it thinks the page is already past it
  ScrollTrigger.refresh()

  // The photos wait far beyond the screen edges before they fly in, where the browser's lazy loading never counts
  // them as near: fetch them all once the section is a couple of screens away, so none arrives on screen still empty.
  const fetchAhead = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return
      fetchAhead.disconnect()
      numbers.querySelectorAll<HTMLImageElement>('.numbers__photo img').forEach((img) => (img.loading = 'eager'))
    },
    { rootMargin: '200% 0px' },
  )
  fetchAhead.observe(numbers)
  return () => fetchAhead.disconnect()
}

/* Kadanglabo in numbers: a tilted orbit of project photos turns while the figures roll past (phones to wide screens);
   a calm list of figures when motion is reduced */
export function StudioNumbers() {
  return (
    <section className="numbers" data-theme="light" aria-labelledby="numbers-title">
      <div className="numbers__stage">
        <div className="numbers__ring" style={{ '--n': ringPhotos.length } as CSSProperties} aria-hidden="true">
          {ringPhotos.map((id, i) => (
            <div key={id} className="numbers__photo" style={{ '--i': i } as CSSProperties}>
              <Img id={id} sizes="240px" />
            </div>
          ))}
        </div>
        <div className="numbers__intro wrap">
          <SectionLabel>{tr('Kadanglabo in numbers', 'Kadanglabo dalam angka')}</SectionLabel>
          <h2 id="numbers-title" className="t-h1 numbers__title" data-split>
            {tr('Collaborative architecture, from Yogyakarta to cities beyond.', 'Arsitektur kolaboratif, dari Yogyakarta ke berbagai kota.')}
          </h2>
        </div>
        <ol className="numbers__list wrap">
          {figures().map((f) => (
            <li key={f.label} className="numbers__item">
              <span className="numbers__value" data-fade>
                {f.value}
              </span>
              <span className="numbers__text" data-fade data-delay="0.1">
                <span className="numbers__label">{f.label}</span>
                <span className="t-serif numbers__note">{f.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
