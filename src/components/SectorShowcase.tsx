import { useRef, useState } from 'react'
import { ScrollTrigger, useGSAP, finePointer } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { sectors } from '../data/site'
import { archive } from '../data/projects'
import { Img } from './Img'

/**
 * The three core sectors as a giant list (after shed.design's services block):
 * hovering — or scrolling past on touch screens — swaps the image to that sector's flagship project.
 */
export function SectorShowcase() {
  const list = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0) // which image/description is shown
  const [lit, setLit] = useState<number | null>(null) // highlighted title — only once the visitor points at one

  useGSAP(
    () => {
      if (finePointer()) return
      const rows = Array.from(list.current?.querySelectorAll<HTMLElement>('.sector-row') ?? [])
      rows.forEach((row, i) =>
        ScrollTrigger.create({
          trigger: row,
          start: 'top 62%',
          end: 'bottom 62%',
          onToggle: (self) => {
            if (self.isActive) {
              setActive(i)
              setLit(i)
            }
          },
        }),
      )
    },
    { scope: list },
  )

  return (
    <div className="sectors">
      <div ref={list} className="sectors__list">
        {sectors.map((s, i) => (
          <TLink
            key={s.key}
            to={`/work#${s.key}`}
            className="sector-row"
            data-active={i === lit ? '' : undefined}
            onMouseEnter={() => {
              setActive(i)
              setLit(i)
            }}
            onFocus={() => {
              setActive(i)
              setLit(i)
            }}
            onMouseLeave={() => setLit(null)}
            onBlur={() => setLit(null)}
          >
            <span className="sector-row__title">{s.title}</span>
            <span className="sector-row__more">
              <span>
                <span className="sector-row__desc">{s.desc}</span>
                <span className="sector-row__count">{archive.filter((a) => a.category === s.key).length} proyek</span>
              </span>
            </span>
          </TLink>
        ))}
      </div>
      <div className="sectors__media">
        <div className="sectors__frame">
          {sectors.map((s, i) => (
            <Img
              key={s.key}
              id={s.img}
              alt={s.imgAlt}
              sizes="(min-width: 768px) 38vw, 100vw"
              className="sectors__img"
              data-on={i === active ? '' : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
