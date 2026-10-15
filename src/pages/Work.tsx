import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img } from '../components/Img'
import { ProjectCard } from '../components/Bits'
import { usePageAnimations } from '../lib/anim'
import { gsap, ScrollTrigger, finePointer, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { archive, categoryLabel, getProject, projects, type ArchiveEntry, type Category } from '../data/projects'

type Filters = { category: string; location: string; year: string; status: string }

const uniq = <T,>(xs: (T | null)[]) => Array.from(new Set(xs.filter((x): x is T => x !== null)))

const matches = (f: Filters) => (e: Pick<ArchiveEntry, 'category' | 'region' | 'year' | 'status'>) =>
  (f.category === 'all' || e.category === f.category) &&
  (f.location === 'all' || e.region === f.location) &&
  (f.year === 'all' || String(e.year) === f.year) &&
  (f.status === 'all' || e.status === f.status)

export default function Work() {
  const root = useRef<HTMLDivElement>(null)
  const results = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()
  const [hovered, setHovered] = useState<string | null>(null)
  const [footerInView, setFooterInView] = useState(false)

  const f: Filters = {
    category: params.get('category') ?? 'all',
    location: params.get('location') ?? 'all',
    year: params.get('year') ?? 'all',
    status: params.get('status') ?? 'all',
  }
  const view = params.get('view') === 'index' ? 'index' : 'featured'
  const filterKey = `${view}|${f.category}|${f.location}|${f.year}|${f.status}`

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'all' || (key === 'view' && value === 'featured')) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true, preventScrollReset: true })
  }

  const options = useMemo(
    () => ({
      locations: uniq(archive.map((a) => a.region)).sort(),
      years: uniq(archive.map((a) => a.year)).sort((a, b) => b - a),
      statuses: uniq(archive.map((a) => a.status)),
    }),
    [],
  )

  const featured = projects.filter(matches(f))
  const rows = archive.filter(matches(f))
  const hasYears = options.years.length > 0
  const hasActiveFilter = f.category !== 'all' || f.location !== 'all' || f.year !== 'all' || f.status !== 'all'

  usePageAnimations(root)

  // Re-animate results whenever the filter / view changes (not on first render — the page intro handles that).
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    ScrollTrigger.refresh()
    if (reducedMotion() || !results.current) return
    const items = results.current.querySelectorAll('.project-card, .index-row:not(.index-row--head)')
    gsap.fromTo(items, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.035, ease: 'expo.out' })
  }, [filterKey])

  // Index view: floating preview that trails the cursor.
  useEffect(() => {
    const el = preview.current
    if (!el || !finePointer()) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' })
    const move = (e: PointerEvent) => {
      xTo(e.clientX + 24)
      yTo(e.clientY - 90)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  // Tuck the Featured/Index switch away once the footer CTA scrolls in.
  useEffect(() => {
    const footer = document.querySelector('.site-footer')
    if (!footer) return
    const io = new IntersectionObserver(([entry]) => setFooterInView(entry.isIntersecting), {
      rootMargin: '0px 0px -12% 0px',
    })
    io.observe(footer)
    return () => io.disconnect()
  }, [])

  const hoveredProject = hovered ? getProject(hovered) : undefined

  return (
    <Page title="Our Work">
      <div ref={root}>
        <PageHero
          title="Our work"
          sub="Introduction & selected projects — proyek terpilih dari tiga sektor: commercial, hospitality, dan residential."
        />

        <section className="work wrap" data-theme="light">
          <div className="filters" data-fade="now" data-delay="0.6">
            <div className="filters__cats" role="group" aria-label="Kategori">
              {(['all', 'commercial', 'hospitality', 'residential'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="chip-btn"
                  aria-pressed={f.category === c}
                  onClick={() => set('category', c)}
                >
                  {c === 'all' ? 'Semua' : categoryLabel[c as Category]}
                  <span className="chip-btn__count">
                    {c === 'all' ? archive.length : archive.filter((a) => a.category === c).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="filters__selects">
              <label className="select">
                <span className="sr-only">Lokasi</span>
                <select value={f.location} onChange={(e) => set('location', e.target.value)}>
                  <option value="all">Semua lokasi</option>
                  {options.locations.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {hasYears && (
                <label className="select">
                  <span className="sr-only">Tahun</span>
                  <select value={f.year} onChange={(e) => set('year', e.target.value)}>
                    <option value="all">Semua tahun</option>
                    {options.years.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="select">
                <span className="sr-only">Status</span>
                <select value={f.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="all">Semua status</option>
                  {options.statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              {hasActiveFilter && (
                <button type="button" className="link-line t-label" onClick={() => setParams(view === 'index' ? { view: 'index' } : {}, { replace: true, preventScrollReset: true })}>
                  Reset
                </button>
              )}
            </div>
          </div>

          <div ref={results} className="work__results">
            {view === 'featured' ? (
              featured.length ? (
                <div className="work__grid" data-stagger="0.06">
                  {featured.map((p) => (
                    <ProjectCard key={p.slug} p={p} />
                  ))}
                </div>
              ) : (
                <p className="work__empty">
                  Belum ada proyek unggulan dengan filter ini.{' '}
                  <button type="button" className="link-line" onClick={() => set('view', 'index')}>
                    Lihat di Index
                  </button>
                </p>
              )
            ) : (
              <div className="index-table" role="table" aria-label="Arsip proyek">
                <div className="index-row index-row--head" role="row">
                  <span role="columnheader">No.</span>
                  <span role="columnheader">Proyek</span>
                  <span role="columnheader">Kategori</span>
                  <span role="columnheader">Lokasi</span>
                  {hasYears && <span role="columnheader">Tahun</span>}
                  <span role="columnheader">Status</span>
                </div>
                {rows.map((e, i) => {
                  const cells = (
                    <>
                      <span role="cell" className="index-row__no">{String(i + 1).padStart(2, '0')}</span>
                      <span role="cell" className="index-row__title">{e.title}</span>
                      <span role="cell">{categoryLabel[e.category]}</span>
                      <span role="cell">{e.region ?? '—'}</span>
                      {hasYears && <span role="cell">{e.year ?? '—'}</span>}
                      <span role="cell">{e.status ?? '—'}</span>
                    </>
                  )
                  return e.slug ? (
                    <TLink
                      key={e.title}
                      to={`/work/${e.slug}`}
                      className="index-row index-row--link"
                      role="row"
                      onMouseEnter={() => setHovered(e.slug!)}
                      onMouseLeave={() => setHovered(null)}
                      data-cursor="Lihat"
                    >
                      {cells}
                    </TLink>
                  ) : (
                    <div key={e.title} className="index-row" role="row">
                      {cells}
                    </div>
                  )
                })}
                {!rows.length && <p className="work__empty">Tidak ada proyek dengan filter ini.</p>}
              </div>
            )}
          </div>
        </section>

        <div className="view-toggle" role="group" aria-label="Tampilan" data-hidden={footerInView ? '' : undefined}>
          <button type="button" aria-pressed={view === 'featured'} onClick={() => set('view', 'featured')}>
            Featured
          </button>
          <button type="button" aria-pressed={view === 'index'} onClick={() => set('view', 'index')}>
            Index
          </button>
        </div>

        <div ref={preview} className="index-preview" data-on={hoveredProject && view === 'index' ? '' : undefined} aria-hidden="true">
          {hoveredProject && <Img id={hoveredProject.cover} sizes="300px" />}
        </div>
      </div>
    </Page>
  )
}
