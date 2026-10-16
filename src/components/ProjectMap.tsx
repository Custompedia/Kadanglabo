import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { gsap, useGSAP, finePointer, reducedMotion } from '../lib/gsap'
import { LAND, MAP, mapXY } from '../data/indonesiaMap'
import type { Area } from '../data/projects'

export type AreaStat = Area & { count: number }

const GRID_LON = [104, 106, 108, 110, 112, 114, 116]
const GRID_LAT = [-2, -4, -6, -8]
const ISLANDS = [
  { t: 'Sumatera', lon: 104.35, lat: -4.35 },
  { t: 'Jawa', lon: 109.15, lat: -7.3 },
  { t: 'Kalimantan', lon: 113.4, lat: -2.45 },
]
const SEAS = [
  { t: 'Laut Jawa', lon: 109.7, lat: -5.05 },
  { t: 'Samudra Hindia', lon: 107.3, lat: -8.9 },
]

const sx = (lon: number) => mapXY(lon, 0).x * (MAP.width / 100)
const sy = (lat: number) => mapXY(0, lat).y * (MAP.height / 100)

type Props = { areas: AreaStat[]; active: string; onSelect: (key: string) => void }

/**
 * "Peta proyek" — a light, CSS-3D take on the Sobha Privy Collection 3D map: a tilted map plane with
 * one pin per area; pin height follows the number of projects. No WebGL.
 */
export function ProjectMap({ areas, active, onSelect }: Props) {
  const stage = useRef<HTMLDivElement>(null)
  const plane = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const max = Math.max(1, ...areas.map((a) => a.count))
  const total = areas.reduce((s, a) => s + a.count, 0)

  // 1 "u" = 1% of the plane width — 3D heights need a length (translateZ can't take %)
  useEffect(() => {
    const el = plane.current
    if (!el) return
    const ro = new ResizeObserver(() => el.style.setProperty('--u', `${el.clientWidth / 100}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useGSAP(
    () => {
      const el = plane.current
      const st = stage.current
      if (!el || !st) return
      const pins = el.querySelectorAll('.pin')
      if (reducedMotion()) return

      gsap.fromTo(
        el,
        { '--tilt': '6deg' },
        { '--tilt': '42deg', ease: 'none', scrollTrigger: { trigger: st, start: 'top 95%', end: 'top 30%', scrub: 1 } },
      )
      gsap.fromTo(
        pins,
        { '--grow': 0 },
        { '--grow': 1, duration: 1.4, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: st, start: 'top 55%', once: true } },
      )

      if (!finePointer()) return
      const state = { rz: 0, rx: 0 }
      const apply = () => {
        el.style.setProperty('--rz', `${state.rz}deg`)
        el.style.setProperty('--rx', `${state.rx}deg`)
      }
      const toZ = gsap.quickTo(state, 'rz', { duration: 1.1, ease: 'power3', onUpdate: apply })
      const toX = gsap.quickTo(state, 'rx', { duration: 1.1, ease: 'power3', onUpdate: apply })
      const move = (e: PointerEvent) => {
        const r = st.getBoundingClientRect()
        toZ(((e.clientX - r.left) / r.width - 0.5) * -6)
        toX(((e.clientY - r.top) / r.height - 0.5) * 6)
      }
      const leave = () => {
        toZ(0)
        toX(0)
      }
      st.addEventListener('pointermove', move)
      st.addEventListener('pointerleave', leave)
      return () => {
        st.removeEventListener('pointermove', move)
        st.removeEventListener('pointerleave', leave)
      }
    },
    { scope: stage },
  )

  const isOn = (key: string) => hover === key || active === key

  return (
    <div className="pmap">
      <div ref={stage} className="pmap__stage">
        <div ref={plane} className="pmap__plane">
          <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} className="pmap__svg" aria-hidden="true">
            <rect width={MAP.width} height={MAP.height} className="pmap__sea" />
            <g className="pmap__grid">
              {GRID_LON.map((lon) => (
                <line key={lon} x1={sx(lon)} x2={sx(lon)} y1={0} y2={MAP.height} />
              ))}
              {GRID_LAT.map((lat) => (
                <line key={lat} y1={sy(lat)} y2={sy(lat)} x1={0} x2={MAP.width} />
              ))}
            </g>
            <path d={LAND} className="pmap__land" />
            {ISLANDS.map((p) => (
              <text key={p.t} x={sx(p.lon)} y={sy(p.lat)} className="pmap__island" textAnchor="middle">
                {p.t}
              </text>
            ))}
            {SEAS.map((p) => (
              <text key={p.t} x={sx(p.lon)} y={sy(p.lat)} className="pmap__seaname" textAnchor="middle">
                {p.t}
              </text>
            ))}
          </svg>

          {areas.map((a) => {
            const { x, y } = mapXY(a.lon, a.lat)
            const hk = 3.2 + 10.5 * Math.sqrt(a.count / max)
            return (
              <div
                key={a.key}
                className="pin"
                data-align={a.align}
                data-active={isOn(a.key) ? '' : undefined}
                style={{ left: `${x}%`, top: `${y}%`, '--hk': hk } as CSSProperties}
              >
                <span className="pin__dot" />
                <span className="pin__stem" />
                <button
                  type="button"
                  className="pin__label"
                  onClick={() => onSelect(a.key)}
                  onMouseEnter={() => setHover(a.key)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(a.key)}
                  onBlur={() => setHover(null)}
                  aria-label={`${a.label}: ${a.count} proyek, lihat di arsip`}
                >
                  <span className="pin__name">{a.label}</span>
                  <b>{a.count}</b>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="pmap__side">
        <ul className="pmap-list">
          {areas.map((a) => (
            <li key={a.key}>
              <button
                type="button"
                data-active={isOn(a.key) ? '' : undefined}
                onClick={() => onSelect(a.key)}
                onMouseEnter={() => setHover(a.key)}
                onMouseLeave={() => setHover(null)}
              >
                <span>{a.label}</span>
                <span className="pmap-list__count">{a.count} proyek</span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="pmap__note">
          {total} proyek dengan lokasi tercatat. Garis pantai: Natural Earth.
        </p>
      </div>
    </div>
  )
}
