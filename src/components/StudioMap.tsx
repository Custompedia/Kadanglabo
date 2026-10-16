import { useState } from 'react'
import { mapsEmbed, mapsLink } from '../data/site'
import { MARK_PIECES, MARK_RING } from '../data/brandMark'

/**
 * Illustrated, schematic map of the studio's location on Jl. Kaliurang (after the drawn map on
 * shed.design/contact). "Lihat peta" swaps in the real Google Map only when asked — no heavy embed on load.
 */
export function StudioMap() {
  const [live, setLive] = useState(false)

  return (
    <div className="studio-map">
      {live ? (
        <iframe
          title="Lokasi studio Kadanglabo di Google Maps"
          src={mapsEmbed}
          className="studio-map__frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <svg viewBox="0 0 1200 620" preserveAspectRatio="xMidYMid slice" className="studio-map__svg" role="img" aria-label="Peta skematis lokasi studio Kadanglabo di Jl. Kaliurang KM 9, Sleman">
          <defs>
            <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.3" fill="currentColor" opacity="0.35" />
            </pattern>
            <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.25" />
            </pattern>
          </defs>
          <rect width="1200" height="620" className="studio-map__bg" />
          {/* fields & blocks */}
          <path d="M40 60h250v150H40zM860 70h290v120H860zM70 430h260v150H70zM900 410h240v170H900z" fill="url(#dots)" />
          <path d="M360 90h170v110H360zM700 250h150v120H700zM380 420h150v120H380zM700 450h140v110H700z" fill="url(#hatch)" />
          {/* minor streets */}
          <g className="studio-map__minor">
            <path d="M0 240 C200 250 420 230 590 240 S900 255 1200 230" />
            <path d="M0 395 C260 380 430 400 610 392 S960 380 1200 400" />
            <path d="M330 0 C340 160 320 300 345 620" />
            <path d="M860 0 C850 200 880 360 860 620" />
            <path d="M610 240 L760 120 L1000 110" />
            <path d="M610 392 L470 520 L250 600" />
            <path d="M150 0 C170 120 120 300 160 620" />
            <path d="M1040 0 C1010 180 1060 380 1030 620" />
          </g>
          {/* Ring Road Utara */}
          <path d="M0 560 C300 548 600 575 900 556 S1100 548 1200 552" className="studio-map__road studio-map__road--ring" />
          <text x="70" y="540" className="studio-map__label">RING ROAD UTARA</text>
          {/* Jl. Kaliurang (south → north) */}
          <path id="kaliurang" d="M560 620 C575 470 590 360 600 250 S628 70 640 0" className="studio-map__road" />
          <text className="studio-map__label" dy="-16">
            <textPath href="#kaliurang" startOffset="66%">JL. KALIURANG</textPath>
          </text>
          {[
            { y: 470, t: 'KM 8' },
            { y: 160, t: 'KM 10' },
          ].map((m) => (
            <g key={m.t}>
              <circle cx={m.y === 470 ? 576 : 619} cy={m.y} r="6" className="studio-map__km" />
              <text x={(m.y === 470 ? 576 : 619) + 16} y={m.y + 5} className="studio-map__small">{m.t}</text>
            </g>
          ))}
          <text x="890" y="455" className="studio-map__area">SINDUHARJO</text>
          <text x="890" y="482" className="studio-map__small">NGAGLIK · SLEMAN</text>
          <text x="650" y="40" className="studio-map__small">↑ KALIURANG / MERAPI</text>
          <text x="595" y="605" className="studio-map__small">↓ UGM / KOTA</text>
          {/* compass */}
          <g transform="translate(1120 70)">
            <circle r="26" className="studio-map__compass" />
            <path d="M0 -18 L7 6 L0 1 L-7 6Z" className="studio-map__needle" />
            <text y="44" textAnchor="middle" className="studio-map__small">U</text>
          </g>
          {/* studio pin */}
          <g transform="translate(602 300)">
            <circle r="46" className="studio-map__pin" />
            <svg x="-25" y="-25" width="50" height="50" viewBox="-6 -6 342 336" aria-hidden="true">
              <path d={MARK_RING} fill="none" stroke="#ffffff" strokeWidth="10" strokeLinejoin="round" />
              {MARK_PIECES.map((d) => (
                <path key={d.slice(0, 12)} d={d} fill="#EC6434" />
              ))}
            </svg>
            <text x="64" y="-6" className="studio-map__pin-label">KADANGLABO STUDIO</text>
            <text x="64" y="18" className="studio-map__small">KM 9 No.11 · Ruko 3</text>
          </g>
          <text x="1180" y="606" textAnchor="end" className="studio-map__note">Peta skematis, bukan skala</text>
        </svg>
      )}
      {!live && (
        <button type="button" className="studio-map__btn" onClick={() => setLive(true)} data-cursor="Peta">
          Lihat
          <br />
          peta
        </button>
      )}
      <div className="studio-map__actions">
        <a href={mapsLink} target="_blank" rel="noreferrer" className="btn-pill btn-pill--navy">
          Buka di Google Maps ↗
        </a>
      </div>
    </div>
  )
}
