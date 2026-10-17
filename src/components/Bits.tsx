import { useRef, type ReactNode } from 'react'
import { gsap, useGSAP, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { categoryLabel, type Project } from '../data/projects'
import { team } from '../data/site'
import { Img } from './Img'

/** Numbered section label, e.g. "(01) Introduction". */
export function SectionLabel({ n, children, className = '' }: { n?: string; children: ReactNode; className?: string }) {
  return (
    <span className={`pill ${className}`} data-fade>
      {n && <span className="pill__n">({n})</span>}
      {children}
    </span>
  )
}

/** Number that counts up once it scrolls into view. */
export function Counter({ to, suffix = '', className }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useGSAP(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    const o = { v: 0 }
    el.textContent = `0${suffix}`
    gsap.to(o, {
      v: to,
      duration: 2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => {
        el.textContent = `${Math.round(o.v)}${suffix}`
      },
    })
  })
  return (
    <span ref={ref} className={className}>
      {to}
      {suffix}
    </span>
  )
}

/** The people behind the form: overlapping team portraits and a line about who answers (next to inquiry forms). */
export function TeamStack({ shown = 5 }: { shown?: number }) {
  const rest = team.length - shown
  return (
    <div className="team-stack" data-fade>
      <div className="team-stack__faces">
        {team.slice(0, shown).map((m) => (
          <span key={m.name} className="team-stack__face" title={`${m.name}, ${m.role}`}>
            <Img id={m.img} alt={m.name} sizes="52px" />
          </span>
        ))}
        {rest > 0 && <span className="team-stack__more">+{rest}</span>}
      </div>
      <p className="team-stack__text">
        Dijawab langsung oleh tim kami: arsitek, drafter, sampai pengawas lapangan.
      </p>
    </div>
  )
}

/** Grid card used on Work, related projects, etc. */
export function ProjectCard({ p, sizes = '(min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw' }: { p: Project; sizes?: string }) {
  return (
    <TLink to={`/work/${p.slug}`} className="project-card group" data-cursor="Lihat">
      <div className="project-card__media">
        <Img id={p.cover} alt={p.title} sizes={sizes} className="project-card__img" />
        <div className="project-card__tags">
          <span className="pill pill--solid">{categoryLabel[p.category]}</span>
          <span className="pill pill--solid max-sm:hidden">{p.typology}</span>
        </div>
      </div>
      <p className="project-card__caption">
        <span className="project-card__title">{p.title}</span>
        <span className="t-serif project-card__line"> - {p.tagline}</span>
      </p>
    </TLink>
  )
}
