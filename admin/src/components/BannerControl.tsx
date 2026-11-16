import { useState } from 'react'
import { Link } from 'react-router'
import { EyeSlash, PushPin, Sparkle } from '@phosphor-icons/react'
import { api, ApiError } from '../lib/api'
import { mutate, useFetch } from '../lib/useFetch'
import type { BannerMode, BannerOverview } from '../lib/types'
import { useToasts } from './Toaster'

/*
 * The banner at the top of the Articles page, as one article sees it: Otomatis (the newest fill the banner),
 * Sematkan (always shown, first) or Sembunyikan (never in the banner, still in the list). The same switch sits in the
 * article editor, in ArticleFlow's preview and on Halaman website › Artikel; each change is saved and live at once,
 * and every place reading /banner refreshes.
 */

export const BANNER = '/banner'
export const useBanner = () => useFetch<BannerOverview>(BANNER)

export const modeLabel: Record<BannerMode, string> = { auto: 'Otomatis', pinned: 'Sematkan', hidden: 'Sembunyikan' }
const modeIcon = { auto: Sparkle, pinned: PushPin, hidden: EyeSlash }

/** Save one article's mode; refreshes every reader of /banner. Throws ApiError (its message is ready for a toast). */
export async function setBannerMode(id: number, mode: BannerMode) {
  const r = await api<BannerOverview>(`/banner/articles/${id}`, { method: 'PUT', body: { mode } })
  mutate(BANNER)
  return r
}

/** Three buttons side by side, the current one raised. They fill the width they are given, never wrapping a label;
    `compact` (narrow side panels) drops the icons. */
export function BannerModeSwitch({ value, onChange, disabled, busy, label = 'Banner artikel', compact, className = '' }: { value: BannerMode; onChange: (m: BannerMode) => void; disabled?: boolean; busy?: BannerMode | null; label?: string; compact?: boolean; className?: string }) {
  return (
    <span role="radiogroup" aria-label={label} className={`grid grid-cols-3 gap-0.5 rounded-lg bg-kumo-recessed p-0.5 ring-1 ring-kumo-hairline ${className}`}>
      {(['auto', 'pinned', 'hidden'] as const).map((m) => {
        const Icon = modeIcon[m]
        const on = value === m
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled || !!busy}
            onClick={() => !on && onChange(m)}
            className={`flex min-h-8 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md py-1 transition disabled:cursor-not-allowed max-md:min-h-11 ${compact ? 'px-1 text-xs' : 'px-2.5 text-[13px] max-sm:px-1 max-sm:text-xs'} ${on ? 'bg-kumo-base font-medium text-kumo-strong shadow-sm ring-1 ring-kumo-line' : 'text-kumo-subtle hover:text-kumo-strong disabled:hover:text-kumo-subtle'} ${busy === m ? 'animate-pulse' : ''}`}
          >
            {!compact && <Icon size={14} weight={on ? 'fill' : 'regular'} aria-hidden="true" className="shrink-0 max-sm:hidden" />}
            {modeLabel[m]}
          </button>
        )
      })}
    </span>
  )
}

/** What the banner does with this article now, in one sentence. */
export function bannerStatus(o: BannerOverview, id: number): string {
  const a = o.articles.find((x) => x.id === id)
  const mode: BannerMode = o.settings.pinned.includes(id) ? 'pinned' : o.settings.hidden.includes(id) ? 'hidden' : 'auto'
  if (!a)
    return mode === 'hidden'
      ? 'Tidak akan masuk banner saat artikel ini tayang.'
      : mode === 'pinned'
        ? 'Langsung masuk banner (disematkan) saat artikel ini tayang.'
        : 'Masuk banner otomatis saat tayang, selama termasuk yang terbaru.'
  if (a.position) return `Tampil di banner, urutan ke-${a.position} dari ${o.shown.length}.`
  if (mode === 'hidden') return 'Tidak tampil di banner. Artikelnya tetap ada di daftar artikel website.'
  if (mode === 'pinned') return `Disematkan, tapi belum tampil: sudah ada ${o.max} sematan di depannya.`
  return `Belum tampil: banner sudah terisi ${o.max} artikel yang disematkan atau lebih baru.`
}

/**
 * The switch for one article (article editor, ArticleFlow preview). Whether it is on the site now is read from the
 * same answer (its live articles), so the sentence never disagrees with the switch. Before the article was ever
 * saved (`id` null) there is nothing to attach the choice to yet.
 */
export function ArticleBannerControl({ id, onNavigate }: { id: number | null; onNavigate?: () => void }) {
  const toasts = useToasts()
  const { data, error, reload } = useBanner()
  const live = !!id && !!data?.articles.some((a) => a.id === id)
  const [busy, setBusy] = useState<BannerMode | null>(null)
  const mode: BannerMode = id && data ? (data.settings.pinned.includes(id) ? 'pinned' : data.settings.hidden.includes(id) ? 'hidden' : 'auto') : 'auto'

  const change = async (m: BannerMode) => {
    if (!id) return
    setBusy(m)
    try {
      await setBannerMode(id, m)
      toasts.add({ variant: 'success', title: m === 'pinned' ? 'Disematkan di banner' : m === 'hidden' ? 'Disembunyikan dari banner' : 'Banner kembali otomatis', description: live ? 'Website sudah memakai pengaturan ini.' : 'Berlaku saat artikel ini tayang.' })
    } catch (e) {
      toasts.add({ variant: 'error', title: 'Banner belum berubah', description: (e as ApiError).message })
      void reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-kumo-strong">Banner halaman Artikel</span>
        <Link to="/pages/articles" onClick={onNavigate} className="text-xs font-medium text-kumo-link hover:underline">
          Atur banner
        </Link>
      </div>
      <BannerModeSwitch compact value={mode} onChange={(m) => void change(m)} disabled={!id || (!data && !error)} busy={busy} />
      <p className="text-xs leading-relaxed text-kumo-subtle">
        {!id
          ? 'Simpan artikel dulu untuk mengatur banner. Artikel baru otomatis masuk banner saat tayang.'
          : error && !data
            ? 'Pengaturan banner tidak bisa dibaca. Coba muat ulang halaman.'
            : data
              ? bannerStatus(data, id)
              : 'Memuat...'}
      </p>
    </div>
  )
}
