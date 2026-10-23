import type { CSSProperties } from 'react'
import { Img, type ImgKey } from './Img'
import { SectionLabel } from './Bits'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { company, team } from '../data/site'
import { archive, areaStats, categoryLabel, categoryOrder } from '../data/projects'
import { tr } from '../lib/i18n'

// project photos on the ring of "Kadanglabo dalam angka" (warm renders, no blue drawings)
const ringPhotos: ImgKey[] = [
  'labarka-river',
  'hamzah-front',
  'klinik-front',
  'ivanna-front',
  'balecatur-lobby',
  'giripeni-aerial',
  'labarka-teppanyaki',
  'muji-front',
  'draw-model',
  'hmw-facade',
  'labarka-koi',
  'firlatata-street',
  'balecatur-pool',
  'berbah-front',
  'labarka-gables',
  'wira-front',
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
export function animateStudioNumbers(page: HTMLElement) {
  // Kadanglabo in numbers, on every screen size: the stage holds; the project photos fly in from beyond the screen
  // edges into a turning ring, the intro steps aside and the figures roll past the centre like a drum, then the
  // photos fly back out. Ring size and type scale per breakpoint in CSS (.numbers in styles.css); without motion
  // (reduced motion) [data-motion] is never set and the figures stay a calm list.
  const numbers = page.querySelector<HTMLElement>('.numbers')
  if (!numbers) return
  const stage = numbers.querySelector<HTMLElement>('.numbers__stage')!
  const ring = numbers.querySelector<HTMLElement>('.numbers__ring')!
  const intro = numbers.querySelector<HTMLElement>('.numbers__intro')!
  const items = gsap.utils.toArray<HTMLElement>('.numbers__item', numbers)
  const photos = gsap.utils.toArray<HTMLElement>('.numbers__photo', numbers)
  // each photo gets its own moment to arrive and to leave, in a shuffled order around the ring
  const order = photos.map((_, i) => ((i * 7) % photos.length) / photos.length)
  const ease = gsap.parseEase('power3.out')
  const easeIn = gsap.parseEase('power3.in')
  numbers.dataset.motion = ''
  const render = (p: number) => {
    // photos: from far outside (k = 2.6 x the ring radius) into the ring, and out again at the end
    photos.forEach((ph, i) => {
      const inAt = order[i] * 0.12
      const outAt = 0.8 + order[i] * 0.1
      const arrive = ease(clamp01((p - inAt) / 0.12))
      const leave = easeIn(clamp01((p - outAt) / 0.1))
      ph.style.setProperty('--k', (1 + 1.6 * (1 - arrive) + 1.6 * leave).toFixed(4))
    })
    const out = clamp01((p - 0.16) / 0.06) // the intro holds while the photos gather, then steps away
    const show = clamp01((p - 0.2) / 0.05) // and the first figure rises in right behind it
    const pos = clamp01((p - 0.25) / 0.53) * (items.length - 1) // which figure sits in the centre
    // the drum step: on wide screens the ring's top and bottom are off screen, so the figures roll the full
    // height; on phones the whole ring is visible and the figures stay inside it (the ring is --r wide in CSS)
    const step = Math.min(stage.clientHeight * 0.42, ring.offsetWidth * 1.1)
    const fade = step < stage.clientHeight * 0.42 ? 1.3 : 0.85
    gsap.set(ring, { rotation: -150 * p })
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
    onRefresh: (self) => render(self.progress),
  })
  // [data-motion] makes the section 400svh tall: every trigger below it (the Our Work mosaic,
  // created when the page mounted) has to measure again, or it thinks the page is already past it
  ScrollTrigger.refresh()
}

/* Kadanglabo in numbers: a ring of project photos turns while the figures roll past (phones to wide screens);
   a calm list of figures when motion is reduced */
export function StudioNumbers() {
  return (
    <section className="numbers" data-theme="light" aria-labelledby="numbers-title">
      <div className="numbers__stage">
        <div className="numbers__ring" style={{ '--n': ringPhotos.length } as CSSProperties} aria-hidden="true">
          {ringPhotos.map((id, i) => (
            <div key={id} className="numbers__photo" style={{ '--i': i } as CSSProperties}>
              <Img id={id} sizes="190px" />
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
