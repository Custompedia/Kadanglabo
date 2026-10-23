import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img, type ImgKey } from '../components/Img'
import { SectionLabel } from '../components/Bits'
import { ProjectReach, animateProjectReach } from '../components/ProjectReach'
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
  type Project,
  statusLabel,
} from '../data/projects'
import { t, tr } from '../lib/i18n'

/*
 * Our Work — follows the brief's skema in order:
 * Introduction & Selected projects (Category a/b/c) → Project Archive (Filter · Category · Location · Year · Status).
 */

type Filters = { category: string; location: string; year: string; status: string }
const EMPTY: Filters = { category: 'all', location: 'all', year: 'all', status: 'all' }
const PEEK = 12 // archive rows shown before "Tampilkan semua"
const keyOf = (f: Filters) => `${f.category}|${f.location}|${f.year}|${f.status}`

const uniq = <T,>(xs: (T | null)[]) => Array.from(new Set(xs.filter((x): x is T => x !== null)))

const matches = (f: Filters) => (e: ArchiveEntry) =>
  (f.category === 'all' || e.category === f.category) &&
  (f.location === 'all' || areaOf(e.region) === f.location) &&
  (f.year === 'all' || String(e.year) === f.year) &&
  (f.status === 'all' || e.status === f.status)

// "All Work" scatter before the archive (after Telha Clarke): project photos at different depths drift past the
// title. x / y in % of the section, w as a width, s = scroll speed (under 1 lags behind = far, over 1 = near).
const scatter: { id: ImgKey; x: number; y: number; w: string; ar: string; s: number }[] = [
  { id: 'labarka-river', x: 3, y: 7, w: 'clamp(110px, 13vw, 230px)', ar: '4 / 3', s: 0.8 },
  { id: 'hamzah-front', x: 71, y: 3, w: 'clamp(130px, 16vw, 280px)', ar: '3 / 4', s: 1.18 },
  { id: 'klinik-front', x: 33, y: 15, w: 'clamp(90px, 10vw, 180px)', ar: '4 / 3', s: 0.7 },
  { id: 'ivanna-front', x: 86, y: 24, w: 'clamp(90px, 10vw, 180px)', ar: '1 / 1', s: 0.85 },
  { id: 'balecatur-lobby', x: 12, y: 33, w: 'clamp(120px, 15vw, 260px)', ar: '3 / 4', s: 1.22 },
  { id: 'giripeni-aerial', x: 63, y: 42, w: 'clamp(100px, 12vw, 210px)', ar: '4 / 3', s: 0.75 },
  { id: 'muji-front', x: 1, y: 58, w: 'clamp(100px, 11vw, 200px)', ar: '1 / 1', s: 0.9 },
  { id: 'labarka-teppanyaki', x: 77, y: 60, w: 'clamp(130px, 17vw, 300px)', ar: '4 / 3', s: 1.25 },
  { id: 'hmw-facade', x: 36, y: 71, w: 'clamp(110px, 13vw, 230px)', ar: '3 / 4', s: 0.8 },
  { id: 'firlatata-street', x: 16, y: 83, w: 'clamp(100px, 12vw, 210px)', ar: '4 / 3', s: 1.1 },
  { id: 'berbah-front', x: 67, y: 85, w: 'clamp(90px, 10vw, 180px)', ar: '4 / 3', s: 0.72 },
]

/** One selected project in the staggered layout (after Kononenko's Work page): photo, name, typology · place */
function WorkPiece({ p, img, extra }: { p: Project; img?: ImgKey; extra?: boolean }) {
  return (
    <TLink to={`/work/${p.slug}`} className="wp" data-cursor={tr('View', 'Lihat')} aria-label={extra ? `${p.title}, ${tr('more photos', 'foto lainnya')}` : undefined}>
      <span className="wp__inner">
        <span className="wp__media" data-reveal>
          {/* the reveal settles the image; the hover zoom lives on this wrapper so the two never fight */}
          <span className="wp__zoom">
            <Img id={img ?? p.cover} alt={extra ? '' : p.title} sizes="(min-width: 900px) 56vw, 100vw" />
          </span>
        </span>
        {!extra && (
          <span className="wp__cap">
            <span className="wp__name">{p.title}</span>
            <span className="t-serif wp__meta">{[t(p.typology), p.region].filter(Boolean).join(' · ')}</span>
          </span>
        )}
      </span>
    </TLink>
  )
}

/** A category with a single selected project (Commercial: only Klinik UII in the client's Drive) shows more of
    that project's own photos, so the group reads as a set instead of one lonely picture */
const MORE_FROM_ONE = 4
// a hand-picked mix where the gallery opens with near-identical views: one more exterior angle, then the inside
const MORE_PICKS: Record<string, ImgKey[]> = {
  'klinik-uii': ['klinik-side', 'klinik-corridor', 'klinik-waiting', 'klinik-dental'],
}
const moreFrom = (p: Project): ImgKey[] =>
  MORE_PICKS[p.slug] ??
  Array.from(new Set(p.gallery.flatMap((b) => (b.t === 'pair' ? b.imgs : b.t === 'full' || b.t === 'offset' ? [b.img] : []))))
    .filter((id) => id !== p.cover)
    .slice(0, MORE_FROM_ONE)

const intro = () => {
  const n = Math.floor(archive.length / 10) * 10
  return tr(
    `More than ${n} projects since 2020, from family homes and housing estates to resorts, offices and healthcare facilities.`,
    `Lebih dari ${n} proyek sejak 2020, dari rumah tinggal dan perumahan sampai resort, kantor, dan fasilitas kesehatan.`,
  )
}

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

  usePageAnimations(root, (page) => {
    animateProjectReach(page)
    // Selected projects: the second picture of each pair drifts a little faster than the first (wide screens)
    const wide = window.matchMedia('(min-width: 900px)')
    gsap.utils.toArray<HTMLElement>('.wp:nth-child(even) .wp__inner', page).forEach((el) => {
      gsap.fromTo(
        el,
        { y: () => (wide.matches ? 70 : 0) },
        {
          y: () => (wide.matches ? -70 : 0),
          ease: 'none',
          scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        },
      )
    })

    // Archive intro: every photo moves at its own speed, so the field reads in depth while the title holds
    const field = page.querySelector<HTMLElement>('.arch-intro')!
    const travel = () => field.offsetHeight + window.innerHeight
    gsap.utils.toArray<HTMLElement>('.arch-intro__photo', field).forEach((el) => {
      const s = Number(el.dataset.speed)
      gsap.fromTo(
        el,
        { y: () => ((s - 1) * travel()) / 2 },
        {
          y: () => (-(s - 1) * travel()) / 2,
          ease: 'none',
          scrollTrigger: { trigger: field, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        },
      )
    })

  })

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
    <Page title={tr('Our Work', 'Proyek')}>
      <div ref={root}>
        <PageHero
          title={tr('Our work', 'Proyek')}
          sub={tr(
            'Selected projects across three sectors: Commercial Design, Hospitality Design and Selected Residential Design.',
            'Proyek pilihan dari tiga sektor: Commercial Design, Hospitality Design, dan Selected Residential Design.',
          )}
        >
          <nav className="work-nav" aria-label={tr('On this page', 'Di halaman ini')} data-fade="now" data-delay="0.6">
            {categoryOrder.map((c) => (
              <TLink key={c} to={`/work/${c}`} className="chip-btn">
                {categoryTitle[c]}
              </TLink>
            ))}
            <a href="#arsip" className="chip-btn" onClick={(e) => jump(e, '#arsip')}>
              {tr('Project archive', 'Arsip proyek')}
            </a>
          </nav>
        </PageHero>

        {/* Introduction */}
        <section className="work-intro wrap" data-theme="light">
          <SectionLabel>{tr('Introduction', 'Pengantar')}</SectionLabel>
          <p className="t-lead work-intro__text" data-scrub>
            {intro()}
          </p>
          <ProjectReach selectedLocation={f.location} onChoose={(location) => showInArchive({ location })} />
        </section>

        {/* Selected projects, Category a / b / c: a head band, then the pictures in a staggered layout (Kononenko) */}
        {categoryOrder.map((cat, gi) => {
          const list = projects.filter((p) => p.category === cat)
          const sector = sectors.find((s) => s.key === cat)
          const inArchive = archive.filter((a) => a.category === cat).length
          return (
            <section key={cat} id={cat} className="work-group wrap" data-theme="light">
              <header className="work-group__head">
                <div className="work-group__name">
                  <span className="t-serif work-group__index" data-fade>
                    {gi + 1} / {categoryOrder.length}
                  </span>
                  <h2 className="work-group__title" data-split>
                    <TLink to={`/work/${cat}`} className="work-group__title-link">
                      {categoryTitle[cat]}
                    </TLink>
                  </h2>
                </div>
                <div className="work-group__side">
                  {sector && (
                    <p className="t-body-lg work-group__desc" data-fade>
                      {t(sector.desc)}
                    </p>
                  )}
                  <p className="work-group__meta" data-fade>
                    {tr(`${list.length} selected · ${inArchive} in the archive`, `${list.length} terpilih · ${inArchive} dalam arsip`)}
                  </p>
                  <div className="work-group__links" data-fade>
                    <TLink to={`/work/${cat}`} className="link-line t-label">
                      {tr(`All ${categoryLabel[cat]} work`, `Semua proyek ${categoryLabel[cat]}`)} →
                    </TLink>
                    <button type="button" className="link-line t-label" onClick={() => showInArchive({ category: cat })}>
                      {tr('View in the archive', 'Lihat di arsip')}
                    </button>
                  </div>
                </div>
              </header>
              {(() => {
                const extras = list.length === 1 ? moreFrom(list[0]) : []
                return (
                  <div className="work-flow" data-count={list.length + extras.length}>
                    {list.map((p) => (
                      <WorkPiece key={p.slug} p={p} />
                    ))}
                    {extras.map((id) => (
                      <WorkPiece key={id} p={list[0]} img={id} extra />
                    ))}
                  </div>
                )
              })()}
            </section>
          )
        })}

        {/* Project archive, opened by Telha Clarke's "All Work": the title holds while project photos drift past */}
        <section id="archive" className="arch-intro" data-theme="light" aria-labelledby="archive-title">
          <div className="arch-intro__photos" aria-hidden="true">
            {scatter.map((sp) => (
              <div
                key={sp.id}
                className="arch-intro__photo"
                data-speed={sp.s}
                style={{ '--x': `${sp.x}%`, '--y': `${sp.y}%`, '--w': sp.w, '--ar': sp.ar, '--o': sp.s < 0.95 ? 0.5 : 1 } as CSSProperties}
              >
                <div className="arch-intro__frame" data-reveal>
                  <Img id={sp.id} sizes="(min-width: 768px) 17vw, 34vw" />
                </div>
              </div>
            ))}
          </div>
          <div className="arch-intro__stage">
            <SectionLabel>{tr('Project archive', 'Arsip proyek')}</SectionLabel>
            <div className="arch-intro__heading">
              <h2 id="archive-title" className="arch-intro__title" data-split>
                {tr('Project archive', 'Arsip proyek')}
              </h2>
              <span className="arch-intro__count" data-fade data-delay="0.3">
                ({archive.length})
              </span>
            </div>
            <p className="t-serif arch-intro__sub" data-fade>
              {tr('Every project since 2020, from family homes to healthcare facilities.', 'Semua proyek sejak 2020, dari rumah tinggal sampai fasilitas kesehatan.')}
            </p>
            <button type="button" className="arch-intro__btn" onClick={() => scrollToElement('#arsip', -60)} data-fade>
              <span className="arch-intro__btn-k">{tr('Archive', 'Arsip')}</span>
              {tr('View all', 'Lihat semua')}
              <Plus className="arch-intro__btn-icon" />
            </button>
          </div>
        </section>

        <section id="arsip" className="archive wrap" data-theme="light" aria-label={tr('Project archive', 'Arsip proyek')}>
          <div className="archive__head">
            <p className="t-label archive__label">{tr('Filter the archive', 'Filter arsip')}</p>
            <p className="archive__count" aria-live="polite">
              <b>{rows.length}</b> {tr('of', 'dari')} {archive.length} {tr('projects', 'proyek')}
            </p>
          </div>

          <div className="filters">
            <div className="filters__cats" role="group" aria-label={tr('Sector', 'Sektor')}>
              {(['all', ...categoryOrder] as const).map((c) => (
                <button key={c} type="button" className="chip-btn" aria-pressed={f.category === c} onClick={() => set('category', c)}>
                  {c === 'all' ? tr('All', 'Semua') : categoryLabel[c as Category]}
                  <span className="chip-btn__count">
                    {c === 'all' ? archive.length : archive.filter((a) => a.category === c).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="filters__selects">
              <label className="select">
                <span className="sr-only">{tr('Location', 'Lokasi')}</span>
                <select value={f.location} onChange={(e) => set('location', e.target.value)}>
                  <option value="all">{tr('All locations', 'Semua lokasi')}</option>
                  {areaStats.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label} ({a.count})
                    </option>
                  ))}
                </select>
              </label>
              {hasYears && (
                <label className="select">
                  <span className="sr-only">{tr('Year', 'Tahun')}</span>
                  <select value={f.year} onChange={(e) => set('year', e.target.value)}>
                    <option value="all">{tr('All years', 'Semua tahun')}</option>
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
                  <option value="all">{tr('All statuses', 'Semua status')}</option>
                  {options.statuses.map((s) => (
                    <option key={s} value={s}>
                      {t(statusLabel[s])}
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

          <div ref={results} className="index-table" role="table" aria-label={tr('Project archive', 'Arsip proyek')}>
            <div className="index-row index-row--head" role="row">
              <span role="columnheader">No.</span>
              <span role="columnheader">{tr('Project', 'Proyek')}</span>
              <span role="columnheader">{tr('Sector', 'Sektor')}</span>
              <span role="columnheader">{tr('Location', 'Lokasi')}</span>
              {hasYears && <span role="columnheader">{tr('Year', 'Tahun')}</span>}
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
                  <span role="cell">{e.status ? t(statusLabel[e.status]) : '-'}</span>
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
                  data-cursor={tr('View', 'Lihat')}
                >
                  {cells}
                </TLink>
              ) : (
                <div key={e.title} className="index-row" role="row">
                  {cells}
                </div>
              )
            })}
            {!rows.length && <p className="work__empty">{tr('No matches. Try other filters.', 'Tidak ada hasil. Coba filter lain.')}</p>}
          </div>
          {!open && (
            <button type="button" className="archive__more" onClick={() => setOpenFor(filterKey)}>
              <span>
                {tr('Show all', 'Tampilkan semua')} <b>{rows.length}</b> {tr('projects', 'proyek')}
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
