import { useRef, useState } from 'react'
import { ScrollTrigger, useGSAP, finePointer } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { sectors } from '../data/site'
import { Img } from './Img'

/**
 * The three core sectors as a giant list (after shed.design's services block):
 * hovering — or scrolling past on touch screens — swaps the image to that sector's flagship project.
 */
export function SectorShowcase() {
  const list = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useGSAP(
    () => {
      if (finePointer()) return
      const rows = Array.from(list.current?.querySelectorAll<HTMLElement>('.sector-row') ?? [])
      rows.forEach((row, i) =>
        ScrollTrigger.create({
          trigger: row,
          start: 'top 62%',
          end: 'bottom 62%',
          onToggle: (self) => self.isActive && setActive(i),
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
            to={`/work?category=${s.key}`}
            className="sector-row"
            data-active={i === active ? '' : undefined}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
          >
            <span className="sector-row__title">{s.title}</span>
            <span className="sector-row__meta">{s.typologies.join(' · ')}</span>
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
        <p className="sectors__desc">
          <span className="t-label">{sectors[active].label}</span>
          <span className="block mt-2">{sectors[active].desc}</span>
        </p>
      </div>
    </div>
  )
}
