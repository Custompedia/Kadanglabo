import { nf, shortDate } from './flow'

/*
 * Clicks and impressions per day, drawn by hand (no chart library). The two lines have their own scale, so the
 * shape of each is readable; the exact numbers are in the tiles above and in the label read by screen readers.
 */
type Day = { date: string; clicks: number; impressions: number }

const W = 680
const H = 190
const PAD = 6

function path(values: number[], max: number) {
  const step = values.length > 1 ? W / (values.length - 1) : 0
  return values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${(H - PAD - (max ? v / max : 0) * (H - PAD * 2)).toFixed(1)}`).join(' ')
}

export function TrendChart({ daily }: { daily: Day[] }) {
  if (daily.length < 2) return <p className="px-1 py-12 text-center text-sm text-kumo-subtle">Grafik muncul setelah ada data beberapa hari.</p>
  const clicks = daily.map((d) => d.clicks)
  const views = daily.map((d) => d.impressions)
  const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
  const viewLine = path(views, Math.max(...views))
  const marks = [0, Math.floor((daily.length - 1) / 2), daily.length - 1]
  return (
    <figure className="m-0">
      <svg
        className="af-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Grafik ${daily.length} hari, ${shortDate(daily[0].date)} sampai ${shortDate(daily[daily.length - 1].date)}: ${nf.format(total(clicks))} klik dan ${nf.format(total(views))} tayangan.`}
      >
        <g stroke="#ededed" strokeWidth="1">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <path key={f} d={`M0 ${(H - PAD - f * (H - PAD * 2)).toFixed(1)}H${W}`} />
          ))}
        </g>
        <path d={`${viewLine} L${W} ${H} L0 ${H} Z`} fill="#fdeee7" />
        <path d={viewLine} fill="none" stroke="#f4a27a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={path(clicks, Math.max(...clicks))} fill="none" stroke="#d34614" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {/* the dates as text of the page, so they stay readable at any width */}
      <figcaption className="mt-2 flex justify-between text-xs tabular-nums text-kumo-subtle" aria-hidden="true">
        {marks.map((i) => (
          <span key={i}>{shortDate(daily[i].date)}</span>
        ))}
      </figcaption>
    </figure>
  )
}
