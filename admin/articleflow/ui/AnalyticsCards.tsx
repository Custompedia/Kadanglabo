import type { ReactNode } from 'react'
import { LayerCard } from '@cloudflare/kumo'
import { MagnifyingGlass } from '@phosphor-icons/react'
import type { TechAnalytics } from '../types'
import { change, dec, nf, pct } from './flow'
import { TrendChart } from './TrendChart'

/*
 * The numbers from Tech: six tiles (the Overview page's tile pattern), the trend, and the top search terms. Before
 * there is data every tile reads 0 with a grey line saying why, the chart keeps its axis, and the search terms show
 * the shape of the list they will fill: the page looks the same on its first day as on its hundredth.
 */

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

const NO_DATA = 'belum ada data'

/** "Kata kunci teratas" before Google has any: the rows the list will have, muted, and one line on when they come. */
function NoQueries({ connected }: { connected: boolean }) {
  const widths = ['w-3/5', 'w-2/5', 'w-1/2']
  return (
    <div className="flex h-full flex-col">
      <ul className="divide-y divide-kumo-hairline" aria-hidden="true">
        {widths.map((w, i) => (
          <li key={i} className="flex items-center justify-between gap-3 px-5 py-3.5">
            <span className={`block h-2.5 rounded-full bg-kumo-recessed ${w}`} />
            <span className="block h-2.5 w-5 rounded-full bg-kumo-recessed" />
          </li>
        ))}
      </ul>
      <div className="flex flex-1 items-start gap-3 border-t border-kumo-hairline px-5 py-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-kumo-recessed text-kumo-subtle"><MagnifyingGlass size={16} /></span>
        <p className="text-[13px] leading-relaxed text-kumo-subtle">
          <span className="block font-medium text-kumo-default">Belum ada kata kunci</span>
          {connected ? 'Kata kunci muncul setelah artikel mulai tampil di hasil pencarian Google.' : 'Muncul di sini setelah data Google terhubung dan artikel mulai tampil di pencarian.'}
        </p>
      </div>
    </div>
  )
}

export function AnalyticsCards({ data }: { data: TechAnalytics | null }) {
  const on = !!data?.connected
  const t = on ? data?.totals : undefined
  const p = on ? data?.previous : undefined
  const rise = t?.position != null && p?.position != null ? p.position - t.position : null
  const days = on ? (data?.daily ?? []) : []
  const note = !on ? 'Data Google belum terhubung' : days.length < 2 ? 'Belum ada data harian' : null
  return (
    <>
      {/* hairlines between the tiles: the grid's own background shows through a one-pixel gap */}
      <LayerCard className="mb-4 overflow-hidden p-0">
        <div className="grid grid-cols-2 gap-px bg-black/[0.08] sm:grid-cols-3 xl:grid-cols-6">
        <Tile label="Klik dari Google" value={nf.format(t?.clicks ?? 0)} note={t && p ? <Delta now={t.clicks} before={p.clicks} /> : NO_DATA} />
        <Tile label="Tayangan" value={nf.format(t?.impressions ?? 0)} note={t && p ? <Delta now={t.impressions} before={p.impressions} /> : NO_DATA} />
        <Tile label="Rasio klik" value={pct(t?.ctr ?? null)} note={t ? 'tayangan yang diklik' : NO_DATA} />
        <Tile
          label="Posisi rata-rata"
          value={dec(t?.position ?? null)}
          note={t?.position == null ? NO_DATA : rise === null || Math.abs(rise) < 0.05 ? 'di hasil pencarian Google' : <><span className={`font-semibold ${rise > 0 ? 'text-kumo-success' : 'text-kumo-danger'}`}>{rise > 0 ? 'naik' : 'turun'} {dec(Math.abs(rise))}</span> peringkat</>}
        />
        <Tile label="Artikel tayang" value={nf.format(data?.published.total ?? 0)} note={data ? `${nf.format(data.published.thisMonth)} terbit bulan ini` : NO_DATA} />
        <Tile label="Disebut asisten AI" value={nf.format(data?.ai?.mentioned ?? 0)} note={data?.ai ? `dari ${nf.format(data.ai.asked)} pertanyaan` : 'belum diperiksa'} />
        </div>
      </LayerCard>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <LayerCard className="flex flex-col p-0 lg:col-span-2">
          <LayerCard.Secondary className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="font-medium text-kumo-strong">Klik dan tayangan</span>
            <span className="flex gap-4 text-xs text-kumo-subtle">
              <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 rounded-full bg-[#d34614]" />Klik</span>
              <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 rounded-full bg-[#f4a27a]" />Tayangan</span>
            </span>
          </LayerCard.Secondary>
          <LayerCard.Primary className="flex flex-1 flex-col justify-center p-5">
            <TrendChart daily={days} end={data?.window?.end ?? null} note={note} />
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
              <NoQueries connected={on} />
            )}
          </LayerCard.Primary>
        </LayerCard>
      </div>
    </>
  )
}
