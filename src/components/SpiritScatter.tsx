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
// beside the words, a few far ones through the middle and a few near ones that cross it. The far photos pass behind
// the words, the near ones in front of the text - but always under the title, which is never covered.
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
  { id: 'hmw-pool', x: 38, y: 6, w: 'clamp(110px, 12vw, 220px)', ar: '4 / 3', s: 1.28 },
  { id: 'giripeni-living', x: 52, y: 25, w: 'clamp(100px, 11vw, 200px)', ar: '3 / 4', s: 1.24 },
  { id: 'labarka-pond', x: 31, y: 45, w: 'clamp(110px, 12vw, 220px)', ar: '1 / 1', s: 1.3 },
  { id: 'firlatata-front', x: 49, y: 64, w: 'clamp(110px, 12vw, 220px)', ar: '4 / 3', s: 1.26 },
  { id: 'klinik-side', x: 36, y: 84, w: 'clamp(100px, 11vw, 200px)', ar: '3 / 4', s: 1.24 },
]
const near = field.filter((ph) => ph.s >= 1)
const far = field.filter((ph) => ph.s < 1)

/**
 * The sheet behind a chapter: the outline of its lines (each as wide as its words, centred), stacked into one
 * stepped silhouette and drawn with rounded corners, inner corners included. Steps smaller than a corner are evened
 * out so the edge stays calm. `withText` takes the text's lines in too, bridging the gap under the title.
 */
function drawSheet(ch: HTMLElement, withText: boolean) {
  const path = ch.querySelector<SVGPathElement>('.sp__sheet path')
  const title = ch.querySelector<HTMLElement>('.sp__title')
  const body = ch.querySelector<HTMLElement>('.sp__body')
  if (!path || !title || !body) return
  const box = ch.getBoundingClientRect()
  const fs = parseFloat(getComputedStyle(title).fontSize)
  const bs = parseFloat(getComputedStyle(body).fontSize)
  const R = Math.max(14, fs * 0.2)
  const rows: { half: number; t: number; b: number }[] = []
  const take = (el: HTMLElement, padX: number) =>
    el.querySelectorAll<HTMLElement>('.split-line').forEach((line) => {
      const w = line.getBoundingClientRect().width // x is untouched by the lines' vertical moves
      const t = line.parentElement!.getBoundingClientRect().top - box.top // the mask does not move
      if (w > 0) rows.push({ half: w / 2 + padX, t, b: t + line.offsetHeight })
    })
  take(title, fs * 0.2)
  if (withText) take(body, bs * 1.2)
  if (!rows.length) return path.setAttribute('d', '')

  // one piece: each row meets the next (gaps bridged, overlaps split), then room above the caps and below the last line
  for (let i = 0; i < rows.length - 1; i++) {
    const m = rows[i].b < rows[i + 1].t ? rows[i + 1].t : (rows[i].b + rows[i + 1].t) / 2
    rows[i].b = rows[i + 1].t = m
  }
  rows[0].t -= fs * 0.1
  rows[rows.length - 1].b += withText ? bs * 0.9 : fs * 0.16
  // even out steps too small to hold a corner
  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < rows.length - 1; i++)
      if (Math.abs(rows[i].half - rows[i + 1].half) < R * 2.2) rows[i].half = rows[i + 1].half = Math.max(rows[i].half, rows[i + 1].half)

  const cx = box.width / 2
  const pts: number[][] = []
  rows.forEach((r) => pts.push([cx + r.half, r.t], [cx + r.half, r.b]))
  for (let i = rows.length - 1; i >= 0; i--) pts.push([cx - rows[i].half, rows[i].b], [cx - rows[i].half, rows[i].t])
  const at = (i: number) => pts[(i + pts.length) % pts.length]
  const corners = pts.filter((p, i) => {
    const [a, b] = [at(i - 1), at(i + 1)]
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]))
  })
  const n = corners.length
  const f = (q: number[]) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`
  let d = ''
  corners.forEach((p, i) => {
    const a = corners[(i - 1 + n) % n]
    const b = corners[(i + 1) % n]
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1
    const r = Math.min(R, la / 2, lb / 2)
    const p1 = [p[0] + ((a[0] - p[0]) / la) * r, p[1] + ((a[1] - p[1]) / la) * r]
    const p2 = [p[0] + ((b[0] - p[0]) / lb) * r, p[1] + ((b[1] - p[1]) / lb) * r]
    d += `${i ? 'L' : 'M'}${f(p1)} Q${f(p)} ${f(p2)} `
  })
  path.setAttribute('d', d + 'Z')
}

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
        const img = frame.querySelector('img')!
        // open only once the photo is there (a slow connection would otherwise open onto its flat colour)
        const open = () =>
          gsap
            .timeline()
            .to(frame, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.35, ease: 'expo.inOut' })
            .from(img, { scale: 1.25, duration: 1.9, ease: 'power3.out' }, 0.1)
        if (img.complete) open()
        else {
          img.loading = 'eager'
          const t = window.setTimeout(open, 6000)
          img.addEventListener('load', () => (window.clearTimeout(t), open()), { once: true })
          img.addEventListener('error', () => (window.clearTimeout(t), open()), { once: true })
        }
      }),
    { threshold: 0.15 },
  )
  frames.forEach((f) => io.observe(f.parentElement!))

  // soft focus at the edges: a photo is blurred while it enters at the bottom and as it leaves at the top, and sharp
  // through the middle of the screen. Worked out from the scroll position alone (each photo's place in the section,
  // measured once per refresh, plus its current drift), so nothing is measured while scrolling; set only on scroll
  // and only when the blur actually changes (whole pixels, so a photo is re-rastered as rarely as possible).
  const lens = gsap.utils
    .toArray<HTMLElement>('.sp__photo', section)
    .filter((p) => p.offsetParent !== null)
    .map((p) => ({ p, frame: p.firstElementChild as HTMLElement, mid: 0, blur: -1 }))
  let sectionTop = 0
  const measureLens = () => {
    sectionTop = section.getBoundingClientRect().top + window.scrollY
    lens.forEach((l) => (l.mid = l.p.offsetTop + l.p.offsetHeight / 2))
  }
  const focus = () => {
    const vh = window.innerHeight
    const top = sectionTop - window.scrollY
    for (const l of lens) {
      const y = top + l.mid + (gsap.getProperty(l.p, 'y') as number) // the photo's centre on screen
      const d = Math.abs(y / vh - 0.5) * 2 // 0 in the middle, 1 at the top or bottom edge
      if (d > 1.6) continue // far off screen
      const k = gsap.utils.clamp(0, 1, (d - 0.4) / 0.6)
      const blur = Math.round(k * k * 12)
      if (blur === l.blur) continue
      l.blur = blur
      l.frame.style.filter = blur ? `blur(${blur}px)` : ''
    }
  }
  const lensSt = ScrollTrigger.create({
    trigger: section,
    start: 'top bottom',
    end: 'bottom top',
    onRefresh: () => (measureLens(), focus()),
    onUpdate: focus,
  })

  // the stage is drawn twice, on two layers that line up exactly: the text on the lower one (near photos pass over
  // it), the label, title and button on the upper one (nothing passes over them). Each copy hides the other's part.
  const titleChs = gsap.utils.toArray<HTMLElement>('.sp__layer--top .sp__ch', section)
  const bodyChs = gsap.utils.toArray<HTMLElement>('.sp__layer--text .sp__ch', section)
  const chs = titleChs.map((ch, i) => [ch, bodyChs[i]])
  const n = chs.length
  const count = section.querySelector<HTMLElement>('.sp__layer--top .sp__count-track')!
  let active = 0
  let tl: gsap.core.Timeline | null = null

  // title: words inside masked lines; text: masked lines. Re-split when the width changes; the chapters that are
  // not showing keep their words and lines lowered out of sight
  const words: HTMLElement[][] = chs.map(() => [])
  const lines: HTMLElement[][] = chs.map(() => [])
  const hideWords = (w: Element[]) => gsap.set(w, { yPercent: 110, rotate: 5 })
  // the paper sheet behind each chapter: one rounded shape around its lines (drawSheet). The upper copy wraps the
  // title only, the lower one the title and the text together, so near photos cross the text but not the title.
  const sheets = chs.map((pair) => pair.map((ch) => ch.querySelector<SVGSVGElement>('.sp__sheet')!))
  let raf = 0
  const redraw = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => chs.forEach(([top, text]) => (drawSheet(top, false), drawSheet(text, true))))
  }
  void document.fonts?.ready.then(redraw)

  // (the hidden copies are split the same way, so both layers keep exactly the same lines)
  const twin = (el: Element | null) =>
    SplitText.create(el, {
      type: 'lines,words',
      mask: 'lines',
      linesClass: 'split-line',
      aria: 'none',
      autoSplit: true,
      onSplit: redraw,
    })
  const splits = titleChs.flatMap((ch, i) => [
    twin(bodyChs[i].querySelector('.sp__title')),
    twin(ch.querySelector('.sp__body')),
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
        redraw()
      },
    }),
    SplitText.create(bodyChs[i].querySelector('.sp__body'), {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      aria: 'none',
      autoSplit: true,
      onSplit: (self) => {
        lines[i] = self.lines as HTMLElement[]
        if (i !== active) gsap.set(self.lines, { yPercent: 105 })
        redraw()
      },
    }),
  ])
  chs.forEach((ch, i) => i && gsap.set(ch, { autoAlpha: 0 }))

  /** The incoming half of a change: the title word by word, then the text line by line. */
  const bringIn = (tl: gsap.core.Timeline, i: number, at: number) =>
    tl
      .fromTo(sheets[i], { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, at)
      .fromTo(words[i], { yPercent: 110, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.055, ease: 'expo.out' }, at)
      .fromTo(lines[i], { yPercent: 105 }, { yPercent: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, at + 0.3)

  // the first chapter arrives with the field
  const intro = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top 55%', once: true } })
  hideWords(words[0])
  gsap.set(sheets[0], { opacity: 0 })
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
      .to(sheets[from], { opacity: 0, duration: 0.4, ease: 'power2.in' }, 0.3)
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
    lensSt.kill()
    cancelAnimationFrame(raf)
    lens.forEach((l) => (l.frame.style.filter = ''))
    tl?.kill()
    splits.forEach((s) => s.revert())
    delete section.dataset.motion
  }
}

function Photos({ list, layer }: { list: typeof field; layer: 'far' | 'near' }) {
  return (
    <div className={`sp__photos sp__photos--${layer}`} aria-hidden="true">
      {list.map((ph) => (
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
  )
}

/** One copy of the stage. `top` shows the label, title and button; the other copy shows only the text. */
function Stage({ top }: { top?: boolean }) {
  const n = spiritChapters.length
  return (
    <div className={`sp__layer sp__layer--${top ? 'top' : 'text'}`}>
      <div className="sp__stage">
        <h2 id={top ? 'sp-title' : undefined} className="pill sp__pill" data-fade={top ? '' : undefined}>
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
              <svg className="sp__sheet" aria-hidden="true">
                <path />
              </svg>
              <h3 className="sp__title">{t(c.title)}</h3>
              <p className="sp__body">{t(c.body)}</p>
            </article>
          ))}
        </div>

        <TLink to="/about" className="sp__btn" data-fade={top ? '' : undefined} tabIndex={top ? undefined : -1}>
          <span className="sp__btn-k">Kadanglabo</span>
          {tr('About us', 'Tentang kami')}
          <ArrowRight className="sp__btn-icon" />
        </TLink>
      </div>
    </div>
  )
}

export function SpiritScatter() {
  return (
    <section id="intro" className="sp" data-theme="light" aria-labelledby="sp-title" style={{ '--n': spiritChapters.length } as CSSProperties}>
      {/* back to front: far photos, the text, near photos, then the label, title and button above everything */}
      <Photos list={far} layer="far" />
      <Stage top />
      <Stage />
      <Photos list={near} layer="near" />
    </section>
  )
}
