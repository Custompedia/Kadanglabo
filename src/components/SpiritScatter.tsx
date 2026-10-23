import type { CSSProperties } from 'react'
import { gsap, ScrollTrigger, SplitText } from '../lib/gsap'
import { t, tr } from '../lib/i18n'
import { TLink } from '../lib/transition'
import { spiritChapters } from '../data/site'
import { ArrowRight } from './Icons'
import { Img, type ImgKey } from './Img'
import './SpiritScatter.css'

const pad = (n: number) => String(n).padStart(2, '0')

// The field (after the Project archive on Our Work): x / y in % of the tall section, w as a width,
// s = scroll speed (under 1 lags behind = far and faded, over 1 = near). Spread over the whole height in four lanes
// clear of the words (plus a few far ones through the middle), so every chapter has its own photos passing by.
const field: { id: ImgKey; x: number; y: number; w: string; ar: string; s: number }[] = [
  { id: 'labarka-river', x: 5, y: 1.0, w: 'clamp(130px, 16vw, 290px)', ar: '3 / 4', s: 1.25 },
  { id: 'hamzah-front', x: 16, y: 3.5, w: 'clamp(90px, 10.5vw, 190px)', ar: '3 / 4', s: 0.82 },
  { id: 'klinik-front', x: 63, y: 6.1, w: 'clamp(130px, 16vw, 290px)', ar: '1 / 1', s: 1.23 },
  { id: 'balecatur-lobby', x: 77, y: 8.6, w: 'clamp(110px, 13vw, 240px)', ar: '4 / 3', s: 1.16 },
  { id: 'ivanna-front', x: 0, y: 11.2, w: 'clamp(90px, 10.5vw, 190px)', ar: '4 / 3', s: 0.86 },
  { id: 'giripeni-aerial', x: 13, y: 13.7, w: 'clamp(110px, 13vw, 240px)', ar: '3 / 4', s: 1.11 },
  { id: 'labarka-teppanyaki', x: 68, y: 16.2, w: 'clamp(130px, 16vw, 290px)', ar: '1 / 1', s: 1.17 },
  { id: 'muji-front', x: 79, y: 18.8, w: 'clamp(90px, 10.5vw, 190px)', ar: '4 / 3', s: 0.72 },
  { id: 'hmw-dining', x: 6, y: 21.3, w: 'clamp(130px, 16vw, 290px)', ar: '4 / 3', s: 1.11 },
  { id: 'berbah-front', x: 19, y: 23.9, w: 'clamp(110px, 13vw, 240px)', ar: '3 / 4', s: 1.12 },
  { id: 'labarka-gables', x: 65, y: 26.4, w: 'clamp(90px, 10.5vw, 190px)', ar: '3 / 4', s: 0.81 },
  { id: 'firlatata-street', x: 85, y: 28.9, w: 'clamp(110px, 13vw, 240px)', ar: '4 / 3', s: 1.25 },
  { id: 'klinik-corridor', x: 6, y: 31.5, w: 'clamp(130px, 16vw, 290px)', ar: '4 / 3', s: 1.11 },
  { id: 'balecatur-pool', x: 13, y: 34.0, w: 'clamp(90px, 10.5vw, 190px)', ar: '3 / 4', s: 0.71 },
  { id: 'hmw-facade', x: 64, y: 36.6, w: 'clamp(130px, 16vw, 290px)', ar: '1 / 1', s: 1.15 },
  { id: 'tiara-front', x: 78, y: 39.1, w: 'clamp(110px, 13vw, 240px)', ar: '3 / 4', s: 1.19 },
  { id: 'labarka-koi', x: 4, y: 41.6, w: 'clamp(90px, 10.5vw, 190px)', ar: '4 / 3', s: 0.8 },
  { id: 'firlatata-living', x: 20, y: 44.2, w: 'clamp(110px, 13vw, 240px)', ar: '3 / 4', s: 1.13 },
  { id: 'bangunjiwo-front', x: 71, y: 46.7, w: 'clamp(130px, 16vw, 290px)', ar: '1 / 1', s: 1.19 },
  { id: 'klinik-plaza', x: 79, y: 49.3, w: 'clamp(90px, 10.5vw, 190px)', ar: '4 / 3', s: 0.77 },
  { id: 'labarka-path', x: 8, y: 51.8, w: 'clamp(130px, 16vw, 290px)', ar: '3 / 4', s: 1.21 },
  { id: 'giripeni-row', x: 19, y: 54.4, w: 'clamp(110px, 13vw, 240px)', ar: '3 / 4', s: 1.11 },
  { id: 'hmw-garden', x: 65, y: 56.9, w: 'clamp(90px, 10.5vw, 190px)', ar: '1 / 1', s: 0.79 },
  { id: 'balecatur-front', x: 84, y: 59.4, w: 'clamp(110px, 13vw, 240px)', ar: '4 / 3', s: 1.17 },
  { id: 'klinik-tree', x: 5, y: 62.0, w: 'clamp(130px, 16vw, 290px)', ar: '4 / 3', s: 1.17 },
  { id: 'labarka-balcony', x: 17, y: 64.5, w: 'clamp(90px, 10.5vw, 190px)', ar: '3 / 4', s: 0.77 },
  { id: 'wira-front', x: 65, y: 67.1, w: 'clamp(130px, 16vw, 290px)', ar: '1 / 1', s: 1.23 },
  { id: 'giripeni-gate', x: 87, y: 69.6, w: 'clamp(110px, 13vw, 240px)', ar: '4 / 3', s: 1.22 },
  { id: 'hmw-kitchen', x: 1, y: 72.1, w: 'clamp(90px, 10.5vw, 190px)', ar: '4 / 3', s: 0.8 },
  { id: 'balecatur-sign', x: 18, y: 74.7, w: 'clamp(110px, 13vw, 240px)', ar: '3 / 4', s: 1.18 },
  { id: 'klinik-waiting', x: 67, y: 77.2, w: 'clamp(130px, 16vw, 290px)', ar: '3 / 4', s: 1.22 },
  { id: 'labarka-stair', x: 80, y: 79.8, w: 'clamp(90px, 10.5vw, 190px)', ar: '4 / 3', s: 0.81 },
  { id: 'firlatata-day', x: 1, y: 82.3, w: 'clamp(130px, 16vw, 290px)', ar: '4 / 3', s: 1.12 },
  { id: 'hamzah-street', x: 16, y: 84.8, w: 'clamp(110px, 13vw, 240px)', ar: '3 / 4', s: 1.13 },
  { id: 'labarka-exterior', x: 67, y: 87.4, w: 'clamp(90px, 10.5vw, 190px)', ar: '1 / 1', s: 0.73 },
  { id: 'hmw-entry', x: 83, y: 89.9, w: 'clamp(110px, 13vw, 240px)', ar: '3 / 4', s: 1.17 },
  { id: 'giripeni-street', x: 1, y: 92.5, w: 'clamp(130px, 16vw, 290px)', ar: '4 / 3', s: 1.22 },
  { id: 'balecatur-twin', x: 19, y: 95.0, w: 'clamp(90px, 10.5vw, 190px)', ar: '3 / 4', s: 0.84 },
  { id: 'labarka-room', x: 30, y: 14, w: 'clamp(80px, 9vw, 160px)', ar: '4 / 3', s: 0.66 },
  { id: 'hmw-bedroom', x: 44, y: 39, w: 'clamp(80px, 9vw, 160px)', ar: '4 / 3', s: 0.66 },
  { id: 'klinik-signage', x: 34, y: 63, w: 'clamp(80px, 9vw, 160px)', ar: '4 / 3', s: 0.66 },
  { id: 'balecatur-bed', x: 46, y: 86, w: 'clamp(80px, 9vw, 160px)', ar: '4 / 3', s: 0.66 },
]

/**
 * Home (01) About x Kadanglabo spirit. The section is a few screens tall: project photos drift past at their own
 * depths while the middle holds still, and each stretch of scroll changes the chapter. The change is told in steps,
 * so every line stays readable: the old words drop away one by one, the new title rises word by word from a slight
 * tilt, then its text follows line by line. Without motion the chapters simply stack.
 */
export function animateSpirit(page: HTMLElement) {
  const section = page.querySelector<HTMLElement>('.sp')
  if (!section) return
  section.dataset.motion = '' // the tall held field (SpiritScatter.css); set before later triggers are measured

  // depth: every photo moves at its own speed through the whole section
  const travel = () => section.offsetHeight + window.innerHeight
  gsap.utils.toArray<HTMLElement>('.sp__photo', section).forEach((el) => {
    const s = Number(el.dataset.speed)
    gsap.fromTo(
      el,
      { y: () => ((s - 1) * travel()) / 2 },
      {
        y: () => (-(s - 1) * travel()) / 2,
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      },
    )
  })

  // each visible photo opens once it actually comes into view (photos hidden on phones get no reveal at all:
  // a scroll trigger on a display:none element sits at 0 and breaks the refresh of the triggers after it)
  const frames = gsap.utils.toArray<HTMLElement>('.sp__frame', section).filter((f) => f.offsetParent !== null)
  frames.forEach((f) => gsap.set(f, { clipPath: 'inset(100% 0% 0% 0%)' }))
  // (watched on the photo's wrapper: Chrome counts the frame's own clip-path, so a closed frame never "intersects")
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        io.unobserve(e.target)
        const frame = e.target.firstElementChild!
        gsap
          .timeline()
          .to(frame, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.35, ease: 'expo.inOut' })
          .from(frame.querySelector('img'), { scale: 1.25, duration: 1.9, ease: 'power3.out' }, 0.1)
      }),
    { threshold: 0.15 },
  )
  frames.forEach((f) => io.observe(f.parentElement!))

  const chs = gsap.utils.toArray<HTMLElement>('.sp__ch', section)
  const n = chs.length
  const count = section.querySelector<HTMLElement>('.sp__count-track')!
  let active = 0
  let tl: gsap.core.Timeline | null = null

  // title: words inside masked lines; text: masked lines. Re-split when the width changes; the chapters that are
  // not showing keep their words and lines lowered out of sight
  const words: HTMLElement[][] = chs.map(() => [])
  const lines: HTMLElement[][] = chs.map(() => [])
  const hideWords = (w: Element[]) => gsap.set(w, { yPercent: 110, rotate: 5 })
  const splits = chs.flatMap((ch, i) => [
    SplitText.create(ch.querySelector('.sp__title'), {
      type: 'lines,words',
      mask: 'lines',
      linesClass: 'split-line',
      wordsClass: 'sp__word',
      aria: 'none',
      autoSplit: true,
      onSplit: (self) => {
        words[i] = self.words as HTMLElement[]
        if (i !== active) hideWords(self.words)
      },
    }),
    SplitText.create(ch.querySelector('.sp__body'), {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      aria: 'none',
      autoSplit: true,
      onSplit: (self) => {
        lines[i] = self.lines as HTMLElement[]
        if (i !== active) gsap.set(self.lines, { yPercent: 105 })
      },
    }),
  ])
  chs.forEach((ch, i) => i && gsap.set(ch, { autoAlpha: 0 }))

  /** The incoming half of a change: the title word by word, then the text line by line. */
  const bringIn = (tl: gsap.core.Timeline, i: number, at: number) =>
    tl
      .fromTo(words[i], { yPercent: 110, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.055, ease: 'expo.out' }, at)
      .fromTo(lines[i], { yPercent: 105 }, { yPercent: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, at + 0.3)

  // the first chapter arrives with the field
  const intro = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 55%', once: true } })
  hideWords(words[0])
  gsap.set(lines[0], { yPercent: 105 })
  bringIn(intro, 0, 0)

  const show = (to: number) => {
    if (to === active) return
    intro.progress(1)
    tl?.progress(1)
    const from = active
    const dir = to > from ? 1 : -1
    active = to
    const out = chs[from]
    tl = gsap
      .timeline({ onComplete: () => void gsap.set(out, { autoAlpha: 0 }) })
      .set(chs[to], { autoAlpha: 1 })
      // out: the text sinks first, then the title's words lift away one after another
      .to(lines[from], { yPercent: -105 * dir, duration: 0.45, stagger: 0.04, ease: 'power3.in' }, 0)
      .to(words[from], { yPercent: -110 * dir, rotate: -3 * dir, duration: 0.55, stagger: 0.03, ease: 'power3.in' }, 0.05)
      .to(count, { yPercent: (-100 * to) / n, duration: 0.9, ease: 'expo.inOut' }, 0.2)
    bringIn(tl, to, 0.5)
  }

  // one chapter per stretch of scroll while the stage holds
  const st = ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => show(Math.min(n - 1, Math.floor(self.progress * n))),
  })

  return () => {
    io.disconnect()
    st.kill()
    tl?.kill()
    splits.forEach((s) => s.revert())
    delete section.dataset.motion
  }
}

export function SpiritScatter() {
  const n = spiritChapters.length
  return (
    <section id="intro" className="sp" data-theme="light" aria-labelledby="sp-title" style={{ '--n': n } as CSSProperties}>
      <div className="sp__photos" aria-hidden="true">
        {field.map((ph) => (
          <div
            key={ph.id}
            className="sp__photo"
            data-speed={ph.s}
            style={{ '--x': `${ph.x}%`, '--y': `${ph.y}%`, '--w': ph.w, '--ar': ph.ar, '--o': ph.s < 0.95 ? 0.5 : 1 } as CSSProperties}
          >
            <div className="sp__frame">
              <Img id={ph.id} sizes="(min-width: 768px) 17vw, 34vw" />
            </div>
          </div>
        ))}
      </div>

      <div className="sp__stage">
        <h2 id="sp-title" className="pill sp__pill" data-fade>
          <span className="pill__n">(01)</span>
          Kadanglabo spirit
          <span className="sp__count" aria-hidden="true">
            <span className="sp__count-mask">
              <span className="sp__count-track">
                {spiritChapters.map((_, i) => (
                  <span key={i}>{pad(i + 1)}</span>
                ))}
              </span>
            </span>
            / {pad(n)}
          </span>
        </h2>

        <div className="sp__chs">
          {spiritChapters.map((c) => (
            <article key={c.title.en} className="sp__ch">
              <h3 className="sp__title">{t(c.title)}</h3>
              <p className="sp__body">{t(c.body)}</p>
            </article>
          ))}
        </div>

        <TLink to="/about" className="sp__btn" data-fade>
          <span className="sp__btn-k">Kadanglabo</span>
          {tr('About us', 'Tentang kami')}
          <ArrowRight className="sp__btn-icon" />
        </TLink>
      </div>
    </section>
  )
}
