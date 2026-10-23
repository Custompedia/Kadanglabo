import { areaStats } from '../data/projects'
import { gsap } from '../lib/gsap'
import { tr } from '../lib/i18n'
import './ProjectReach.css'

const locations = ['diy', 'palembang', 'klaten', 'jepara', 'surabaya', 'bali']
  .map((key) => areaStats.find((area) => area.key === key))
  .filter((area): area is (typeof areaStats)[number] => Boolean(area))
  .map((area) => ({ ...area, label: area.key === 'diy' ? 'Yogyakarta' : area.label }))

/** Each row: its hairline draws, the name rises, the number counts up, the rest fades in. */
export function animateProjectReach(page: HTMLElement) {
  page.querySelectorAll<HTMLElement>('.reach-place').forEach((row) => {
    const count = row.querySelector<HTMLElement>('.reach-place__count')
    const to = Number(count?.dataset.count ?? 0)
    const tally = { value: 0 }
    gsap
      .timeline({ scrollTrigger: { trigger: row, start: 'top 90%', once: true } })
      .from(row.querySelector('.reach-place__rule'), { scaleX: 0, transformOrigin: 'left', duration: 1.1, ease: 'power3.inOut' }, 0)
      .from(row.querySelector('.reach-place__name'), { yPercent: 115, duration: 1, ease: 'power4.out' }, 0.12)
      .fromTo(
        tally,
        { value: 0 },
        {
          value: to,
          duration: 1.1,
          ease: 'power3.out',
          immediateRender: false, // the real number stays until the row actually plays
          onUpdate: () => {
            if (count) count.textContent = String(Math.round(tally.value))
          },
        },
        0.25,
      )
      .from(
        row.querySelectorAll('.reach-place__index, .reach-place__unit, .reach-place__arrow, .reach-place__note'),
        { y: 12, autoAlpha: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' },
        0.3,
      )
  })
}

export function ProjectReach({ selectedLocation, onChoose }: { selectedLocation: string; onChoose: (key: string) => void }) {
  return (
    <section className="reach" aria-labelledby="reach-title">
      {/* left: the statement; right: the places, so a row never runs half empty across the page */}
      <header className="reach__header">
        <span className="pill" data-fade>
          {tr('Project locations', 'Lokasi proyek')}
        </span>
        <h3 id="reach-title" className="reach__lead" data-split>
          {tr('From Yogyakarta', 'Dari Yogyakarta')}
          <br />
          {tr(`to ${locations.length - 1} more cities.`, `ke ${locations.length - 1} kota lain.`)}
        </h3>
        <p className="reach__intro" data-fade>
          {tr('Different places. One approach: Contextual Design.', 'Beragam tempat, satu pendekatan: Desain Kontekstual.')}
          <span>{tr('Choose a region to see our projects.', 'Pilih wilayah untuk melihat proyek kami.')}</span>
        </p>
      </header>
      <ol className="reach__locations">
        {locations.map((location, index) => (
          <li key={location.key} className="reach-place" data-home={location.key === 'diy' ? '' : undefined}>
            <span className="reach-place__rule" aria-hidden="true" />
            <button
              type="button"
              className="reach-place__button"
              data-selected={selectedLocation === location.key}
              onClick={() => onChoose(location.key)}
              aria-label={tr(
                `View ${location.count} ${location.count === 1 ? 'project' : 'projects'} in ${location.label}`,
                `Lihat ${location.count} proyek di ${location.label}`,
              )}
            >
              <span className="reach-place__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="reach-place__identity">
                <span className="reach-place__mask">
                  <span className="reach-place__name">{location.label}</span>
                </span>
                {location.key === 'diy' && <span className="reach-place__note">{tr('Studio base', 'Lokasi studio')}</span>}
              </span>
              <span className="reach-place__total">
                <span className="reach-place__count" data-count={location.count}>
                  {location.count}
                </span>
                <span className="reach-place__unit">{tr(location.count === 1 ? 'project' : 'projects', 'proyek')}</span>
              </span>
              <span className="reach-place__arrow" aria-hidden="true">
                <span className="reach-place__arrow-glyph">↗</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
