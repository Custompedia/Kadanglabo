import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Img } from './Img'
import { ArrowRight } from './Icons'
import { gsap, ScrollTrigger, finePointer, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { archive, areaOf, areaStats, categoryLabel, categoryOrder, statusLabel, type ArchiveEntry, type Category } from '../data/projects'
import { t, tr } from '../lib/i18n'

/*
 * The project archive: filters (sector chips, location, year, status, kept in the address) and the table, with a
 * photo trailing the cursor over rows that have one. Our Work shows the first rows and a way to the full archive
 * page (/work/archive); that page shows every row.
 */

export type Filters = { category: string; location: string; year: string; status: string }
export const EMPTY: Filters = { category: 'all', location: 'all', year: 'all', status: 'all' }
const keyOf = (f: Filters) => `${f.category}|${f.location}|${f.year}|${f.status}`
const uniq = <T,>(xs: (T | null)[]) => Array.from(new Set(xs.filter((x): x is T => x !== null)))

const matches = (f: Filters) => (e: ArchiveEntry) =>
  (f.category === 'all' || e.category === f.category) &&
  (f.location === 'all' || areaOf(e.region) === f.location) &&
  (f.year === 'all' || String(e.year) === f.year) &&
  (f.status === 'all' || e.status === f.status)

/** The address query for a set of filters ("" when none). */
export const filterQuery = (f: Partial<Filters>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...EMPTY, ...f })) if (v !== 'all') p.set(k, v)
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function ArchiveTable({ id, limit }: { id?: string; limit?: number }) {
  const results = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()
  const [hovered, setHovered] = useState<string | null>(null)
  // photos that have finished downloading and decoding: the preview only shows once its photo is really there
  const [ready, setReady] = useState<ReadonlySet<string>>(() => new Set())
  const lastShown = useRef<string | null>(null)
  if (hovered && ready.has(hovered)) lastShown.current = hovered
  const previewId = lastShown.current
  const markReady = (id: string, img: HTMLImageElement) =>
    void (img.decode?.() ?? Promise.resolve())
      .catch(() => {})
      .then(() => setReady((s) => (s.has(id) ? s : new Set(s).add(id))))

  const f: Filters = {
    category: params.get('category') ?? 'all',
    location: params.get('location') ?? 'all',
    year: params.get('year') ?? 'all',
    status: params.get('status') ?? 'all',
  }
  const filterKey = keyOf(f)
  const apply = (next: Filters) => setParams(new URLSearchParams(filterQuery(next)), { replace: true, preventScrollReset: true })
  const set = (key: keyof Filters, value: string) => apply({ ...f, [key]: value })

  const options = useMemo(
    () => ({
      years: uniq(archive.map((a) => a.year)).sort((a, b) => b - a),
      statuses: uniq(archive.map((a) => a.status)),
    }),
    [],
  )
  const rows = archive.filter(matches(f))
  const shown = limit ? rows.slice(0, limit) : rows
  const hasYears = options.years.length > 0
  const hasActiveFilter = filterKey !== keyOf(EMPTY)

  // re-animate the rows whenever a filter changes (the page intro handles the first render)
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    ScrollTrigger.refresh()
    if (reducedMotion() || !results.current) return
    const items = results.current.querySelectorAll('.index-row:not(.index-row--head)')
    if (items.length) gsap.fromTo(items, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.025, ease: 'expo.out' })
  }, [filterKey])

  // the photo that trails the cursor over rows that have one
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

  return (
    <section id={id} className="archive wrap" data-theme="light" aria-label={tr('Project archive', 'Arsip proyek')}>
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
              <span className="chip-btn__count">{c === 'all' ? archive.length : archive.filter((a) => a.category === c).length}</span>
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
              onMouseEnter={() => setHovered(e.cover ?? null)}
              onMouseLeave={() => setHovered(null)}
              data-cursor={tr('View', 'Lihat')}
            >
              {cells}
            </TLink>
          ) : (
            <div key={e.title} className="index-row" role="row" onMouseEnter={() => e.cover && setHovered(e.cover)} onMouseLeave={() => setHovered(null)}>
              {cells}
            </div>
          )
        })}
        {!rows.length && <p className="work__empty">{tr('No matches. Try other filters.', 'Tidak ada hasil. Coba filter lain.')}</p>}
      </div>

      {limit && rows.length > limit && (
        <TLink to={`/work/archive${filterQuery(f)}`} className="archive__more">
          <span>
            {tr('See the whole archive', 'Lihat seluruh arsip')} · <b>{rows.length}</b> {tr('projects', 'proyek')}
          </span>
          <ArrowRight className="archive__more-icon" />
        </TLink>
      )}

      <div ref={preview} className="index-preview" data-on={hovered && ready.has(hovered) ? '' : undefined} aria-hidden="true">
        {/* the photo on show is always one that is there; while the next one loads (unseen, underneath) the last one
            stays put, also through the fade-out, so the preview never shows an empty frame */}
        {previewId && <Img key={previewId} id={previewId} sizes="300px" loading="eager" />}
        {hovered && hovered !== previewId && (
          <Img
            key={`next-${hovered}`}
            id={hovered}
            sizes="300px"
            loading="eager"
            style={{ position: 'absolute', inset: 0, opacity: 0 }}
            onLoad={(e) => markReady(hovered, e.currentTarget)}
          />
        )}
      </div>
    </section>
  )
}
