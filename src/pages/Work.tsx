import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img } from '../components/Img'
import { ProjectCard, SectionLabel } from '../components/Bits'
import { Plus } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { gsap, ScrollTrigger, finePointer, reducedMotion } from '../lib/gsap'
import { scrollToElement } from '../lib/smooth'
import { TLink } from '../lib/transition'
import { sectors } from '../data/site'
import {
  archive,
  areaOf,
  areaStats,
  categoryLabel,
  categoryOrder,
  categoryTitle,
  getProject,
  projects,
  type ArchiveEntry,
  type Category,
} from '../data/projects'

/*
 * Our Work — follows the brief's skema in order:
 * Introduction & Selected projects (Category a/b/c) → Project Archive (Filter · Category · Location · Year · Status).
 */

type Filters = { category: string; location: string; year: string; status: string }
const EMPTY: Filters = { category: 'all', location: 'all', year: 'all', status: 'all' }
const LETTERS = ['a', 'b', 'c']
const PEEK = 12 // archive rows shown before "Tampilkan semua"
const keyOf = (f: Filters) => `${f.category}|${f.location}|${f.year}|${f.status}`

const uniq = <T,>(xs: (T | null)[]) => Array.from(new Set(xs.filter((x): x is T => x !== null)))

const matches = (f: Filters) => (e: ArchiveEntry) =>
  (f.category === 'all' || e.category === f.category) &&
  (f.location === 'all' || areaOf(e.region) === f.location) &&
  (f.year === 'all' || String(e.year) === f.year) &&
  (f.status === 'all' || e.status === f.status)

const intro = `Lebih dari ${Math.floor(archive.length / 10) * 10} proyek sejak 2020, dari rumah tinggal dan perumahan sampai resort, kantor, dan fasilitas kesehatan.`

export default function Work() {
  const root = useRef<HTMLDivElement>(null)
  const results = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()
  const [hovered, setHovered] = useState<string | null>(null)

  const f: Filters = {
    category: params.get('category') ?? 'all',
    location: params.get('location') ?? 'all',
    year: params.get('year') ?? 'all',
    status: params.get('status') ?? 'all',
  }
  const filterKey = keyOf(f)
  // the archive opens past PEEK rows for the result set it was opened on; a new filter starts folded again
  const [openFor, setOpenFor] = useState<string | null>(null)

  const apply = (next: Filters) => {
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) if (v !== 'all') p.set(k, v)
    setParams(p, { replace: true, preventScrollReset: true })
  }
  const set = (key: keyof Filters, value: string) => apply({ ...f, [key]: value })
  /** jump from a category group into the archive with a fresh filter, already open ("Lihat semua") */
  const showInArchive = (next: Partial<Filters>) => {
    const target = { ...EMPTY, ...next }
    apply(target)
    setOpenFor(keyOf(target))
    scrollToElement('#arsip', -60)
  }
  const jump = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    scrollToElement(id, -70)
  }

  const options = useMemo(
    () => ({
      years: uniq(archive.map((a) => a.year)).sort((a, b) => b - a),
      statuses: uniq(archive.map((a) => a.status)),
    }),
    [],
  )

  const rows = archive.filter(matches(f))
  const open = openFor === filterKey || rows.length <= PEEK
  const shown = open ? rows : rows.slice(0, PEEK)
  const hasYears = options.years.length > 0
  const hasActiveFilter = filterKey !== 'all|all|all|all'

  usePageAnimations(root)

  // Re-animate the archive rows whenever a filter changes (the page intro handles the first render).
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    ScrollTrigger.refresh()
    if (reducedMotion() || !results.current) return
    const items = results.current.querySelectorAll('.index-row:not(.index-row--head)')
    if (!items.length) return
    gsap.fromTo(items, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.025, ease: 'expo.out' })
  }, [filterKey])

  // Opening the archive: the rows past the first PEEK follow in one after another
  const wasOpen = useRef(open)
  useEffect(() => {
    const opened = open && !wasOpen.current
    wasOpen.current = open
    if (!opened) return
    ScrollTrigger.refresh()
    if (reducedMotion() || !results.current) return
    const items = [...results.current.querySelectorAll('.index-row:not(.index-row--head)')].slice(PEEK)
    if (!items.length) return // a short result set is open by default: nothing past the first rows
    gsap.fromTo(items, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.02, ease: 'expo.out' })
  }, [open])

  // Archive: floating preview that trails the cursor over rows that have a project page.
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

  const hoveredProject = hovered ? getProject(hovered) : undefined

  return (
    <Page title="Our Work">
      <div ref={root}>
        <PageHero
          title="Our work"
          sub="Proyek terpilih dari tiga kategori: Commercial Design, Hospitality Design, dan Selected Residential Design."
        >
          <nav className="work-nav" aria-label="Bagian halaman" data-fade="now" data-delay="0.6">
            {categoryOrder.map((c, i) => (
              <a key={c} href={`#${c}`} className="chip-btn" onClick={(e) => jump(e, `#${c}`)}>
                {LETTERS[i]}. {categoryTitle[c]}
              </a>
            ))}
            <a href="#arsip" className="chip-btn" onClick={(e) => jump(e, '#arsip')}>
              Arsip proyek
            </a>
          </nav>
        </PageHero>

        {/* Introduction */}
        <section className="work-intro wrap" data-theme="light">
          <SectionLabel>Introduction</SectionLabel>
          <p className="t-lead work-intro__text" data-scrub>
            {intro}
          </p>
          {/* where the work is: each place opens the archive filtered to it */}
          <div className="work-intro__places" data-fade>
            <p className="t-label work-intro__label">Lokasi proyek</p>
            <div className="work-intro__chips">
              {areaStats.map((a) => (
                <button key={a.key} type="button" className="chip-btn" onClick={() => showInArchive({ location: a.key })}>
                  {a.label}
                  <span className="chip-btn__count">{a.count}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Selected projects — Category Project a / b / c */}
        {categoryOrder.map((cat, gi) => {
          const list = projects.filter((p) => p.category === cat)
          const sector = sectors.find((s) => s.key === cat)
          const inArchive = archive.filter((a) => a.category === cat).length
          return (
            <section key={cat} id={cat} className="work-group wrap" data-theme="light">
              <div className="work-group__aside">
                <span className="work-group__letter" data-fade>
                  {LETTERS[gi]}.
                </span>
                <h2 className="work-group__title" data-split>
                  {categoryTitle[cat]}
                </h2>
                {sector && (
                  <p className="t-body-lg work-group__desc" data-fade>
                    {sector.desc}
                  </p>
                )}
                <p className="work-group__meta" data-fade>
                  {list.length} proyek terpilih · {inArchive} proyek di arsip
                </p>
                <button type="button" className="link-line t-label" onClick={() => showInArchive({ category: cat })} data-fade>
                  Lihat semua di arsip →
                </button>
              </div>
              <div className="work-group__grid" data-count={list.length} data-stagger="0.06">
                {list.map((p) => (
                  <ProjectCard
                    key={p.slug}
                    p={p}
                    sizes={list.length === 1 ? '(min-width: 900px) 64vw, 100vw' : '(min-width: 900px) 32vw, (min-width: 640px) 48vw, 100vw'}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {/* Project archive */}
        <section id="arsip" className="archive wrap" data-theme="light">
          <div className="archive__head">
            <div>
              <SectionLabel>Project archive</SectionLabel>
              <h2 className="t-h1 archive__title" data-split>
                Arsip proyek
              </h2>
            </div>
            <p className="archive__count" aria-live="polite">
              <b>{rows.length}</b> dari {archive.length} proyek
            </p>
          </div>

          <div className="filters">
            <div className="filters__cats" role="group" aria-label="Kategori">
              {(['all', ...categoryOrder] as const).map((c) => (
                <button key={c} type="button" className="chip-btn" aria-pressed={f.category === c} onClick={() => set('category', c)}>
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
                  {areaStats.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label} ({a.count})
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
                <button type="button" className="link-line t-label" onClick={() => apply(EMPTY)}>
                  Reset
                </button>
              )}
            </div>
          </div>

          <div ref={results} className="index-table" role="table" aria-label="Arsip proyek">
            <div className="index-row index-row--head" role="row">
              <span role="columnheader">No.</span>
              <span role="columnheader">Proyek</span>
              <span role="columnheader">Kategori</span>
              <span role="columnheader">Lokasi</span>
              {hasYears && <span role="columnheader">Tahun</span>}
              <span role="columnheader">Status</span>
            </div>
            {shown.map((e, i) => {
              const cells = (
                <>
                  <span role="cell" className="index-row__no">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span role="cell" className="index-row__title">
                    {e.title}
                  </span>
                  <span role="cell">{categoryLabel[e.category]}</span>
                  <span role="cell">{e.region ?? '-'}</span>
                  {hasYears && <span role="cell">{e.year ?? '-'}</span>}
                  <span role="cell">{e.status ?? '-'}</span>
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
          {!open && (
            <button type="button" className="archive__more" onClick={() => setOpenFor(filterKey)}>
              <span>
                Tampilkan semua <b>{rows.length}</b> proyek
              </span>
              <Plus className="archive__more-icon" />
            </button>
          )}
        </section>

        <div ref={preview} className="index-preview" data-on={hoveredProject ? '' : undefined} aria-hidden="true">
          {hoveredProject && <Img id={hoveredProject.cover} sizes="300px" />}
        </div>
      </div>
    </Page>
  )
}
