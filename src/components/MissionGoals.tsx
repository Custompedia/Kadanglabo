import { mission, goals } from '../data/site'
import { gsap } from '../lib/gsap'
import { Img } from './Img'
import { SectionLabel } from './Bits'
import './MissionGoals.css'

const chapters = [
  {
    id: 'mission',
    label: 'Mission',
    heading: 'Desain yang kontekstual, proses yang terintegrasi.',
    items: [
      { title: 'Kontekstual', img: 'labarka-exterior', body: mission[0] },
      { title: 'Terintegrasi', img: 'draw-model', body: mission[1] },
      { title: 'Responsif', img: 'balecatur-lobby', body: mission[2] },
    ],
  },
  {
    id: 'goals',
    label: 'Our goals',
    heading: 'Lingkungan yang responsif, bangunan yang tepat guna.',
    items: [
      { title: 'Responsif', img: 'labarka-river', body: goals[0] },
      { title: 'Tepat guna', img: 'hmw-dining', body: goals[1] },
    ],
  },
] as const

/** Replay the entrance whenever a row re-enters; the stationary wrapper keeps trigger positions stable. */
export function animateMissionGoals(page: HTMLElement) {
  page.querySelectorAll<HTMLElement>('.purpose-row').forEach((row, i) => {
    const strip = row.querySelector<HTMLElement>('.purpose-strip')!
    const fromLeft = i % 2 === 0
    gsap
      .timeline({
        scrollTrigger: {
          trigger: row,
          start: 'top 80%',
          end: 'bottom top',
          toggleActions: 'restart none restart reset',
        },
      })
      .fromTo(
        strip,
        {
          xPercent: fromLeft ? -14 : 14,
          y: 42,
          autoAlpha: 0,
          clipPath: fromLeft ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)',
        },
        {
          xPercent: 0,
          y: 0,
          autoAlpha: 1,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.35,
          ease: 'power3.inOut',
        },
        0,
      )
      .fromTo(
        strip.querySelector('img'),
        { scale: 1.3, xPercent: fromLeft ? -5 : 5 },
        { scale: 1, xPercent: 0, duration: 2, ease: 'power3.out' },
        0.15,
      )
      .fromTo(
        strip.querySelector('.purpose-strip__title'),
        { yPercent: 115, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 0.95, ease: 'power4.out' },
        0.65,
      )
      .fromTo(
        strip.querySelectorAll('.table__no, .table__brings'),
        { y: 26, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.85, stagger: 0.1, ease: 'power3.out' },
        0.85,
      )
  })
}

export function MissionGoals() {
  return (
    <div className="purpose wrap" data-theme="light">
      {chapters.map((chapter) => (
        <section key={chapter.id} className="purpose-chapter" aria-labelledby={`${chapter.id}-title`}>
          <SectionLabel>{chapter.label}</SectionLabel>
          <h2 id={`${chapter.id}-title`} className="t-h1 collab__title purpose-heading mt-6" data-split>
            {chapter.heading}
          </h2>
          <ol className="table purpose-strips">
            {chapter.items.map((item, i) => (
              <li key={item.title} className="purpose-row">
                <div className="table__strip purpose-strip">
                  <Img id={item.img} alt="" sizes="(min-width: 1200px) 1100px, 100vw" />
                  <span className="table__strip-shade" aria-hidden="true" />
                  <span className="table__no" aria-hidden="true">
                    0{i + 1}
                  </span>
                  <h3 className="table__who">
                    <span className="purpose-strip__title">{item.title}</span>
                  </h3>
                  <p className="t-serif table__brings">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
