import type { ReactNode } from 'react'
import { LayerCard } from '@cloudflare/kumo'
import type { TechAnalytics } from '../types'
import { change, dec, nf, pct } from './flow'
import { TrendChart } from './TrendChart'

/* The numbers from Tech: six tiles (the Overview page's tile pattern), the trend, and the top search terms. */

function Tile({ label, value, note }: { label: string; value: string; note: ReactNode }) {
  return (
    <div className="bg-kumo-base p-5">
      <span className="block text-sm text-kumo-subtle">{label}</span>
      <span className="mt-2 block text-[28px] font-semibold leading-9 tabular-nums text-kumo-strong">{value}</span>
      <span className="block text-xs text-kumo-subtle">{note}</span>
    </div>
  )
}

const Delta = ({ now, before }: { now: number; before: number }) => {
  const c = change(now, before)
  if (!c) return <>sama seperti periode lalu</>
  return (
    <>
      <span className={`font-semibold ${c.up ? 'text-kumo-success' : 'text-kumo-danger'}`}>{c.text}</span> dari periode lalu
    </>
  )
}

export function AnalyticsCards({ data }: { data: TechAnalytics | null }) {
  const on = !!data?.connected
  const t = data?.totals
  const p = data?.previous
  const rise = t?.position != null && p?.position != null ? p.position - t.position : null
  return (
    <>
      {/* hairlines between the tiles: the grid's own background shows through a one-pixel gap */}
      <LayerCard className="mb-4 overflow-hidden p-0">
        <div className="grid grid-cols-2 gap-px bg-black/[0.08] sm:grid-cols-3 xl:grid-cols-6">
        <Tile label="Klik dari Google" value={on && t ? nf.format(t.clicks) : '-'} note={on && t && p ? <Delta now={t.clicks} before={p.clicks} /> : 'belum ada data'} />
        <Tile label="Tayangan" value={on && t ? nf.format(t.impressions) : '-'} note={on && t && p ? <Delta now={t.impressions} before={p.impressions} /> : 'belum ada data'} />
        <Tile label="Rasio klik" value={on && t ? pct(t.ctr) : '-'} note="tayangan yang diklik" />
        <Tile
          label="Posisi rata-rata"
          value={on && t ? dec(t.position) : '-'}
          note={rise === null || Math.abs(rise) < 0.05 ? 'di hasil pencarian Google' : <><span className={`font-semibold ${rise > 0 ? 'text-kumo-success' : 'text-kumo-danger'}`}>{rise > 0 ? 'naik' : 'turun'} {dec(Math.abs(rise))}</span> peringkat</>}
        />
        <Tile label="Artikel tayang" value={data ? nf.format(data.published.total) : '-'} note={data ? `${nf.format(data.published.thisMonth)} terbit bulan ini` : 'belum ada data'} />
        <Tile label="Disebut asisten AI" value={data?.ai ? nf.format(data.ai.mentioned) : '-'} note={data?.ai ? `dari ${nf.format(data.ai.asked)} pertanyaan` : 'belum diperiksa'} />
        </div>
      </LayerCard>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <LayerCard className="p-0 lg:col-span-2">
          <LayerCard.Secondary className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="font-medium text-kumo-strong">Klik dan tayangan</span>
            <span className="flex gap-4 text-xs text-kumo-subtle">
              <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 rounded-full bg-[#d34614]" />Klik</span>
              <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 rounded-full bg-[#f4a27a]" />Tayangan</span>
            </span>
          </LayerCard.Secondary>
          <LayerCard.Primary className="p-5">
            {on && data ? <TrendChart daily={data.daily} /> : <p className="px-1 py-12 text-center text-sm text-kumo-subtle">Data Google belum terhubung. Tim Custompedia sedang menyiapkannya.</p>}
          </LayerCard.Primary>
        </LayerCard>
        <LayerCard className="flex flex-col p-0">
          <LayerCard.Secondary className="flex min-h-12 items-center justify-between gap-3">
            <span className="font-medium text-kumo-strong">Kata kunci teratas</span>
            <span className="text-xs text-kumo-subtle">posisi</span>
          </LayerCard.Secondary>
          <LayerCard.Primary className="flex-1 p-0">
            {on && data?.queries.length ? (
              <ul className="divide-y divide-kumo-hairline">
                {data.queries.slice(0, 6).map((q) => (
                  <li key={q.query} className="flex items-baseline justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 text-kumo-default">{q.query}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-kumo-strong">{q.position === null ? '-' : Math.round(q.position)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-12 text-center text-sm text-kumo-subtle">Belum ada kata kunci yang tercatat.</p>
            )}
          </LayerCard.Primary>
        </LayerCard>
      </div>
    </>
  )
}
