import { useMemo, useState, type ReactNode } from 'react'
import { Banner, Button, Empty, InputGroup, Loader } from '@cloudflare/kumo'
import { ArrowDown, ArrowUp, MagnifyingGlass, Newspaper, PushPin } from '@phosphor-icons/react'
import { AsideSection, Page } from '../layout/Page'
import { PUBLIC_SITE } from '../layout/Shell'
import { api, ApiError } from '../lib/api'
import { ago, date, matches } from '../lib/format'
import { mutate } from '../lib/useFetch'
import type { BannerArticle, BannerMode, BannerOverview } from '../lib/types'
import { Section } from '../components/Fields'
import { Thumb } from '../components/Thumb'
import { useToasts } from '../components/Toaster'
import { BANNER, BannerModeSwitch, setBannerMode, useBanner } from '../components/BannerControl'
import { SiteLink } from './WorkSettings'

/*
 * Halaman website › Artikel (/pages/articles): the website's Articles page. Only its banner is set here; the list of
 * articles under it fills itself with every live article. The banner is filled automatically with the newest
 * articles; any article can be pinned to the front (in an order set here) or kept out. Works for every article,
 * written here or brought in by ArticleFlow, with or without a subscription. Each change is saved and live at once.
 */

const titleOf = (a: BannerArticle) => a.title.id || a.title.en || a.slug

export default function ArticlesPage() {
  const toasts = useToasts()
  const { data, error, reload, setData } = useBanner()
  const [busy, setBusy] = useState<{ id: number; mode: BannerMode | 'order' } | null>(null)
  const [q, setQ] = useState('')

  const shown = useMemo(() => (data ? data.shown.map((id) => data.articles.find((a) => a.id === id)!).filter(Boolean) : []), [data])
  const pinned = useMemo(() => (data ? data.articles.filter((a) => a.mode === 'pinned') : []), [data])
  const list = useMemo(() => (data ? data.articles.filter((a) => !q.trim() || matches(`${a.title.id} ${a.title.en} ${a.tag.id} ${a.tag.en}`, q)) : []), [data, q])

  const done = (r: BannerOverview) => setData(r)
  const fail = (e: unknown) => (toasts.add({ variant: 'error', title: 'Banner belum berubah', description: (e as ApiError).message }), void reload())

  const change = async (a: BannerArticle, mode: BannerMode) => {
    if (busy) return
    setBusy({ id: a.id, mode })
    try {
      done(await setBannerMode(a.id, mode))
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const move = async (a: BannerArticle, by: -1 | 1) => {
    if (busy) return
    const order = pinned.map((x) => x.id)
    const i = order.indexOf(a.id)
    const j = i + by
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    setBusy({ id: a.id, mode: 'order' })
    try {
      done(await api<BannerOverview>('/banner/order', { method: 'PUT', body: { pinned: order } }))
      mutate(BANNER)
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  if (!data)
    return error ? (
      <Page title="Artikel" aside={false}>
        <Empty title="Pengaturan banner tidak bisa dibuka" description={error.message} contents={<Button onClick={() => void reload()}>Coba lagi</Button>} />
      </Page>
    ) : (
      <div className="grid place-items-center py-32">
        <Loader size="lg" />
      </div>
    )

  const hiddenCount = data.articles.filter((a) => a.mode === 'hidden').length

  return (
    <Page
      wide
      title="Artikel"
      pill={<SiteLink path="/articles" />}
      description="Halaman Artikel di website. Atur artikel yang tampil di banner paling atas; daftar artikel di bawahnya terisi otomatis dari semua artikel yang tayang."
      aside={<PageMap />}
    >
      <div className="grid max-w-[960px] gap-6 min-[1600px]:max-w-none">
        <Section
          n={1}
          title="Banner artikel"
          description={`Maksimal ${data.max} artikel, bergeser sendiri tiap beberapa detik. Artikel terbaru otomatis masuk. Sematkan untuk menahan artikel di depan, sembunyikan untuk mengeluarkannya dari banner.`}
          where="Artikel › banner paling atas"
          href={`${PUBLIC_SITE}/articles`}
        >
          {data.articles.length === 0 ? (
            <p className="rounded-lg border border-dashed border-kumo-fill px-4 py-6 text-center text-sm text-kumo-subtle">
              Belum ada artikel yang tayang. Banner muncul sendiri begitu ada artikel yang tayang.
            </p>
          ) : (
            <>
              {shown.length === 0 && (
                <Banner variant="alert" size="sm" title="Banner tidak tampil" description="Semua artikel yang tayang disembunyikan dari banner, jadi halaman Artikel dibuka tanpa banner. Pilih Otomatis atau Sematkan pada salah satu artikel di bawah." />
              )}

              {/* what the visitor sees now, in order */}
              {shown.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-kumo-strong">
                    Tampil sekarang <span className="font-normal tabular-nums text-kumo-subtle">({shown.length} / {data.max})</span>
                  </h3>
                  <ol className="grid gap-2">
                    {shown.map((a, i) => {
                      const k = pinned.findIndex((p) => p.id === a.id)
                      return (
                        <li key={a.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-kumo-base px-2 py-2 ring-1 ring-kumo-line sm:gap-3 sm:px-3">
                          <span className="w-5 text-right text-sm tabular-nums text-kumo-subtle">{i + 1}</span>
                          <Thumb id={a.cover} className="h-10 w-14 rounded-md" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-kumo-strong">{titleOf(a)}</span>
                            <span className="flex items-center gap-1 truncate text-xs text-kumo-subtle">
                              {a.mode === 'pinned' ? (
                                <>
                                  <PushPin size={12} weight="fill" className="text-kumo-brand" /> Disematkan
                                </>
                              ) : (
                                'Otomatis'
                              )}
                              {' · '}
                              {date(a.date)}
                            </span>
                          </span>
                          {k >= 0 && pinned.length > 1 && (
                            <span className="flex gap-0.5">
                              <IconButton label={`Naikkan ${titleOf(a)}`} disabled={!!busy || k === 0} onClick={() => void move(a, -1)}>
                                <ArrowUp size={15} />
                              </IconButton>
                              <IconButton label={`Turunkan ${titleOf(a)}`} disabled={!!busy || k === pinned.length - 1} onClick={() => void move(a, 1)}>
                                <ArrowDown size={15} />
                              </IconButton>
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ol>
                  <p className="mt-2 text-xs text-kumo-subtle">Artikel yang disematkan tampil lebih dulu, urutannya bisa diubah dengan panah. Sisanya diisi artikel terbaru.</p>
                </div>
              )}

              {/* every live article and its choice */}
              <div className="border-t border-kumo-hairline pt-5">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <h3 className="text-sm font-semibold text-kumo-strong">
                    Semua artikel tayang <span className="font-normal tabular-nums text-kumo-subtle">({data.articles.length}{hiddenCount ? `, ${hiddenCount} disembunyikan` : ''})</span>
                  </h3>
                  <InputGroup className="w-full sm:w-64">
                    <InputGroup.Addon>
                      <MagnifyingGlass size={16} />
                    </InputGroup.Addon>
                    <InputGroup.Input placeholder="Cari artikel" aria-label="Cari artikel" value={q} onChange={(e) => setQ(e.target.value)} />
                  </InputGroup>
                </div>
                <ul className="grid gap-2">
                  {list.length === 0 && <li className="px-3 py-8 text-center text-sm text-kumo-subtle">Tidak ada artikel yang cocok.</li>}
                  {list.map((a) => (
                    <li key={a.id} className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2 ring-1 ring-kumo-line sm:px-3 ${a.mode === 'hidden' ? 'bg-kumo-recessed/60' : 'bg-kumo-base'}`}>
                      <Thumb id={a.cover} className={`h-10 w-14 rounded-md ${a.mode === 'hidden' ? 'opacity-50' : ''}`} />
                      <span className="min-w-0 flex-1 basis-48">
                        <a href={`/articles/${a.id}`} className="block truncate text-sm font-medium text-kumo-strong hover:underline">{titleOf(a)}</a>
                        <span className="block truncate text-xs text-kumo-subtle">
                          {a.position ? `Di banner, urutan ${a.position}` : a.mode === 'hidden' ? 'Tidak di banner' : 'Belum masuk banner'} · {date(a.date)}
                          {a.tag.id || a.tag.en ? ` · ${a.tag.id || a.tag.en}` : ''}
                        </span>
                      </span>
                      <BannerModeSwitch className="w-full sm:w-auto" label={`Banner: ${titleOf(a)}`} value={a.mode} onChange={(m) => void change(a, m)} disabled={!!busy && busy.id !== a.id} busy={busy?.id === a.id && busy.mode !== 'order' ? busy.mode : null} />
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
          <p className="text-xs text-kumo-subtle">
            Setiap perubahan langsung tersimpan dan tayang.
            {data.updated_at ? ` Terakhir diubah ${ago(data.updated_at)}${data.updated_by ? ` oleh ${data.updated_by}` : ''}.` : ''} Pilihan yang sama juga ada di editor artikel dan di pratinjau ArticleFlow.
          </p>
        </Section>
      </div>
    </Page>
  )
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="grid size-8 place-items-center rounded-md text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-default disabled:opacity-35 disabled:hover:bg-transparent max-md:size-11">
      {children}
    </button>
  )
}

/** The right-hand panel: the page as a list of its sections, the numbered one set here. */
function PageMap() {
  const items: [string, number | null][] = [['Judul & pengantar', null], ['Banner artikel', 1], ['Cari & topik', null], ['Semua artikel', null], ['Ajakan kontak', null]]
  return (
    <AsideSection title="Susunan halaman">
      <p className="-mt-2 mb-4 text-xs text-kumo-subtle">Bagian bernomor diatur di sini; sisanya otomatis.</p>
      <ol className="grid gap-1">
        {items.map(([label, n]) => (
          <li key={label} className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm ${n ? 'bg-kumo-brand/10 font-medium text-kumo-strong ring-1 ring-kumo-brand/30' : 'text-kumo-subtle'}`}>
            <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${n ? 'bg-kumo-brand text-white' : ''}`}>{n ?? ''}</span>
            {label}
          </li>
        ))}
      </ol>
      <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-kumo-subtle">
        <Newspaper size={14} className="mt-0.5 shrink-0" /> Artikel ditulis di menu Artikel. Artikel dari ArticleFlow masuk ke menu yang sama setelah tayang.
      </p>
    </AsideSection>
  )
}
