import { useState, type CSSProperties } from 'react'
import { DOT_MAP, DOT_MAP_PATH } from '../data/dotMap'
import { ArrowRight } from './Icons'

/*
 * Work > Lokasi proyek: where the projects are, on a dot map of South Sumatra, Java and Bali (Natural Earth land).
 * The studio in Yogyakarta pulses in orange and an arc runs from it to every other place; the list on the left
 * and the pins on the map light each other up, and both open the archive filtered to that place.
 */

type Stop = { key: string; label: string; count: number }

// lon / lat of each place (the town; Bali at the middle of the island)
const COORDS: Record<string, [number, number]> = {
  diy: [110.3695, -7.7956],
  palembang: [104.7458, -2.9761],
  klaten: [110.6061, -7.7056],
  jepara: [110.6684, -6.5944],
  surabaya: [112.7521, -7.2575],
  bali: [115.19, -8.5],
}

// where each pin's name sits, so the Central Java towns (a few pixels apart) never overlap
const SIDE: Record<string, 'r' | 't' | 'bl'> = { diy: 'bl', klaten: 'r', jepara: 't', palembang: 'r', surabaya: 't', bali: 't' }

const toMap = (key: string): [number, number] => {
  const [lon, lat] = COORDS[key]
  return [(lon - DOT_MAP.lon0) * DOT_MAP.k, (DOT_MAP.lat0 - lat) * DOT_MAP.k]
}

// arcs bow to the north, except Bali's, which swings south over the sea instead of crossing Surabaya
const SOUTH = new Set(['bali'])

/** a flight-path arc from the studio, bowed in proportion to its length */
const arc = ([x1, y1]: [number, number], [x2, y2]: [number, number], south = false) => {
  const lift = (Math.hypot(x2 - x1, y2 - y1) * 0.32 + 24) * (south ? -0.7 : 1)
  return `M${x1} ${y1}Q${(x1 + x2) / 2} ${(y1 + y2) / 2 - lift} ${x2} ${y2}`
}

export const STUDIO_AT = (() => {
  const [x, y] = toMap('diy')
  return { x: (x / DOT_MAP.w) * 100, y: (y / DOT_MAP.h) * 100 }
})()

export function ProjectMap({ stops, onPick }: { stops: Stop[]; onPick: (key: string) => void }) {
  const [hl, setHl] = useState<string | null>(null)
  const home = toMap('diy')
  const placed = stops.filter((s) => COORDS[s.key]).map((s) => ({ ...s, at: toMap(s.key) }))
  const hover = (key: string | null) => () => setHl(key)

  return (
    <div className="pmap" data-hl={hl ?? undefined}>
      <ol className="pmap__list">
        {placed.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              className="pmap__row"
              data-on={hl === s.key ? '' : undefined}
              onMouseEnter={hover(s.key)}
              onMouseLeave={hover(null)}
              onFocus={hover(s.key)}
              onBlur={hover(null)}
              onClick={() => onPick(s.key)}
            >
              <span className="pmap__no">{String(i + 1).padStart(2, '0')}</span>
              <span className="pmap__city">
                {s.label}
                {s.key === 'diy' && <span className="pmap__home">Studio</span>}
              </span>
              <span className="t-serif pmap__count">{s.count} proyek</span>
              <ArrowRight className="pmap__arrow" />
            </button>
          </li>
        ))}
      </ol>

      <div className="pmap__map">
        <svg viewBox={`0 0 ${DOT_MAP.w} ${DOT_MAP.h}`} className="pmap__land" aria-hidden="true">
          <path d={DOT_MAP_PATH} />
        </svg>
        <svg viewBox={`0 0 ${DOT_MAP.w} ${DOT_MAP.h}`} className="pmap__routes" aria-hidden="true">
          {placed
            .filter((s) => s.key !== 'diy')
            .map((s) => (
              <path key={s.key} className="pmap__arc" data-on={hl === s.key ? '' : undefined} d={arc(home, s.at, SOUTH.has(s.key))} pathLength={1} />
            ))}
          <circle className="pmap__pulse" cx={home[0]} cy={home[1]} r={13} />
        </svg>
        {/* pins repeat the list for pointer users; keyboard and screen readers use the list */}
        {placed.map((s) => (
          <button
            key={s.key}
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={`pmap__pin pmap__pin--${SIDE[s.key] ?? 't'}`}
            data-on={hl === s.key ? '' : undefined}
            data-home={s.key === 'diy' ? '' : undefined}
            style={{ '--x': `${(s.at[0] / DOT_MAP.w) * 100}%`, '--y': `${(s.at[1] / DOT_MAP.h) * 100}%` } as CSSProperties}
            onMouseEnter={hover(s.key)}
            onMouseLeave={hover(null)}
            onClick={() => onPick(s.key)}
          >
            <span className="pmap__dot" />
            <span className="pmap__tag">{s.key === 'diy' ? 'Yogyakarta' : s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
