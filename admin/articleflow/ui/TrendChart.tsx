import { nf, shortDate } from './flow'

/*
 * Clicks and impressions per day, drawn by hand (no chart library). The two lines have their own scale, so the
 * shape of each is readable; the exact numbers are in the tiles above and in the label read by screen readers.
 * The chart is always drawn: without data it is the same 28 days with both lines resting on the 0 line, and `note`
 * (e.g. Google not connected yet) sits quietly in the middle, so the page keeps its shape from the first day.
 */
type Day = { date: string; clicks: number; impressions: number }

const W = 680
const H = 190
const PAD = 8
const DAYS = 28
const BASE = H - PAD // the 0 line

const y = (v: number, max: number) => BASE - (max ? v / max : 0) * (H - PAD * 2)
function path(values: number[], max: number) {
  const step = values.length > 1 ? W / (values.length - 1) : 0
  return values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${y(v, max).toFixed(1)}`).join(' ')
}

/** Yesterday in Yogyakarta (WIB), the last full day Google can have: where an empty axis ends. */
const yesterday = () => new Date(Date.now() + 7 * 3600_000 - 864e5).toISOString().slice(0, 10)
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10)

/** Tech's days, or 28 empty days ending at the end of the window (yesterday when there is none), with any known day filled in. */
function axis(daily: Day[], end: string | null): Day[] {
  if (daily.length >= 2) return daily
  const last = end ?? yesterday()
  const known = new Map(daily.map((d) => [d.date, d]))
  return Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(last, i - DAYS + 1)
    return known.get(date) ?? { date, clicks: 0, impressions: 0 }
  })
}

export function TrendChart({ daily, end = null, note = null }: { daily: Day[]; end?: string | null; note?: string | null }) {
  const days = axis(daily, end)
  const clicks = days.map((d) => d.clicks)
  const views = days.map((d) => d.impressions)
  const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  const viewLine = path(views, Math.max(...views))
  const n = days.length
  const marks = [...new Set([0, 1, 2, 3, 4].map((k) => Math.round(((n - 1) * k) / 4)))]
  const sum = total(clicks) + total(views)
  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          className="af-chart"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Grafik ${n} hari, ${shortDate(days[0].date)} sampai ${shortDate(days[n - 1].date)}: ${sum ? `${nf.format(total(clicks))} klik dan ${nf.format(total(views))} tayangan` : 'belum ada klik dan tayangan'}.${note ? ` ${note}.` : ''}`}
        >
          <g stroke="#ededed" strokeWidth="1">
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <path key={f} d={`M0 ${(BASE - f * (H - PAD * 2)).toFixed(1)}H${W}`} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
          {/* the 0 line, a shade darker than the others */}
          <path d={`M0 ${BASE}H${W}`} stroke="#d4d4d4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {sum > 0 && <path d={`${viewLine} L${W} ${BASE} L0 ${BASE} Z`} fill="#fdeee7" />}
          <path d={viewLine} fill="none" stroke="#f4a27a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={path(clicks, Math.max(...clicks))} fill="none" stroke="#d34614" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {note && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-4" aria-hidden="true">
            <span className="max-w-full rounded-full bg-kumo-base/90 px-3 py-1 text-center text-xs text-kumo-subtle ring-1 ring-kumo-hairline">{note}</span>
          </div>
        )}
      </div>
      {/* the dates as text of the page, so they stay readable at any width */}
      <figcaption className="mt-2 flex justify-between gap-2 text-xs tabular-nums text-kumo-subtle" aria-hidden="true">
        {marks.map((i) => (
          <span key={i} className="whitespace-nowrap">{shortDate(days[i].date)}</span>
        ))}
      </figcaption>
    </figure>
  )
}
