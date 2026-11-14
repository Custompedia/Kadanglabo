import { useEffect, useRef, useState } from 'react'
import { Badge, Banner, Button, Empty, LayerCard, Loader } from '@cloudflare/kumo'
import { ArrowClockwise, LockSimple, PlugsConnected } from '@phosphor-icons/react'
import { useConfirm } from '../../src/components/Confirm'
import { useToasts } from '../../src/components/Toaster'
import { Page } from '../../src/layout/Page'
import { api, ApiError } from '../../src/lib/api'
import { dateTime } from '../../src/lib/format'
import { mutate, useFetch } from '../../src/lib/useFetch'
import type { FlowItem, FlowOverview, PublishResult } from '../types'
import { AnalyticsCards } from './AnalyticsCards'
import { ArticleQueue } from './ArticleQueue'
import { ExpiredDialog } from './ExpiredDialog'
import { OVERVIEW, STATUS, longDate, message, prepare, publish, refreshAll, shortDate, type Prepared } from './flow'
import { ReviewDialog } from './ReviewDialog'
import './articleflow.css'

/*
 * ArticleFlow: the numbers Tech measures for this website, and under them the articles Tech has written, to look
 * at and put live. Everything is read from Tech through the Worker (/api/articleflow); nothing is edited here.
 */
export default function ArticleFlowPage() {
  const { data, error, loading, reload } = useFetch<FlowOverview>(OVERVIEW)
  const toasts = useToasts()
  const { confirm, dialog } = useConfirm()
  const [open, setOpen] = useState<FlowItem | null>(null)
  const [working, setWorking] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [popup, setPopup] = useState(false)
  const shown = useRef(false)

  // the popup: once per visit of the page, as soon as it is known that there is no running subscription
  const locked = !!data && data.configured && data.trouble !== 'unauthorized' && data.locked && !data.stale
  useEffect(() => {
    if (locked && !shown.current) (shown.current = true), setPopup(true)
  }, [locked])

  // the sidebar entry follows what the page has just learned (locked, counts) instead of waiting for its own turn
  const pulse = data ? `${data.locked}:${data.trouble}:${data.status?.counts?.pending ?? ''}` : ''
  useEffect(() => {
    if (pulse) mutate(STATUS)
  }, [pulse])

  const act = async (item: FlowItem, prepared?: Prepared) => {
    if (working) return
    setWorking(item.groupId)
    try {
      const ready = prepared ?? (await prepare(item.groupId))
      if (ready.result.issues.length) {
        toasts.add({ variant: 'error', title: 'Artikel belum bisa tayang', description: `Belum lengkap: ${ready.result.issues.slice(0, 3).join(', ')}.` })
        return
      }
      const done = await publish(item.groupId)
      report(done, item)
      setOpen(null)
    } catch (e) {
      const reload402 = e instanceof ApiError && e.status === 402
      toasts.add({ variant: 'error', title: reload402 ? 'Masa langganan sudah habis' : 'Artikel belum tayang', description: message(e) })
    } finally {
      setWorking(null)
      refreshAll()
    }
  }
  const report = (done: PublishResult, item: FlowItem) =>
    done.state === 'published'
      ? toasts.add({ variant: 'success', title: 'Artikel sudah tayang', description: item.title })
      : toasts.add({ variant: 'info', title: 'Penayangan sedang diselesaikan', description: 'Tech sudah menerima. Artikel muncul di website sebentar lagi.' })

  const publishFromRow = async (item: FlowItem) => {
    if (await confirm({ title: item.local.newVersion ? 'Publish versi baru?' : 'Publish artikel ini?', body: `"${item.title}" langsung tayang di halaman Artikel website${item.local.newVersion ? ', menggantikan versi yang sekarang' : ''}.`, action: 'Publish' })) await act(item)
  }

  const retry = async () => {
    setRetrying(true)
    try {
      const r = await api<{ pendingJobs: number }>('/articleflow/retry', { method: 'POST' })
      toasts.add(r.pendingJobs ? { variant: 'warning', title: 'Masih ada yang belum selesai', description: 'Dicoba lagi otomatis beberapa saat lagi.' } : { variant: 'success', title: 'Semua sudah selesai' })
    } catch (e) {
      toasts.add({ variant: 'error', title: 'Belum berhasil', description: message(e) })
    } finally {
      setRetrying(false)
      refreshAll()
    }
  }

  const sub = data?.status?.subscription
  const offline = !!data && (data.stale || (data.trouble !== null && data.trouble !== 'expired'))
  const pill = !data || !data.configured ? null : locked || data.trouble === 'unauthorized' ? (
    <Badge variant="outline" appearance="dot">{sub?.state === 'EXPIRED' ? 'Langganan habis' : data.trouble === 'unauthorized' ? 'Tidak terhubung' : 'Belum aktif'}</Badge>
  ) : sub ? (
    <Badge variant={sub.state === 'EXPIRING' ? 'warning' : 'success'} appearance="dot">
      {sub.state === 'EXPIRING' ? 'Segera habis' : 'Aktif'}
      {sub.daysLeft !== null ? ` · sisa ${sub.daysLeft} hari` : ''}
    </Badge>
  ) : null

  const window_ = data?.analytics?.window
  return (
    <Page
      wide
      title="ArticleFlow"
      pill={pill}
      description={locked ? 'Analitik dan artikel baru terkunci. Artikel yang sudah tayang tetap ada di menu Artikel.' : 'Artikel ditulis otomatis oleh tim Custompedia Tech. Lihat hasilnya, baca pratinjau, lalu terbitkan.'}
      actions={
        data?.configured && !locked ? (
          <>
            {window_ && <span className="text-sm text-kumo-subtle max-sm:w-full">Data {shortDate(window_.start)} sampai {shortDate(window_.end)}</span>}
            <Button icon={ArrowClockwise} loading={loading && !!data} onClick={() => void reload()}>Muat ulang</Button>
          </>
        ) : undefined
      }
    >
      {dialog}
      {!data ? (
        error ? (
          <Empty title="ArticleFlow tidak bisa dibuka" description={error.message} contents={<Button onClick={() => void reload()}>Coba lagi</Button>} />
        ) : (
          <div className="grid place-items-center py-32" role="status" aria-label="Memuat ArticleFlow"><Loader size="lg" /></div>
        )
      ) : !data.configured ? (
        <Empty icon={<PlugsConnected size={40} />} title="ArticleFlow belum terhubung" description="Website ini belum disambungkan ke Custompedia Tech. Hubungi tim Custompedia untuk mengaktifkannya." />
      ) : data.trouble === 'unauthorized' ? (
        <Banner variant="error" title="Kunci ArticleFlow ditolak" description="Custompedia Tech tidak menerima kunci website ini. Hubungi tim Custompedia agar kuncinya diperbarui." />
      ) : locked ? (
        <Locked onShow={() => setPopup(true)} ended={sub?.state === 'EXPIRED' && sub.endsOn ? longDate(sub.endsOn) : null} />
      ) : (
        <>
          {offline && (
            <Banner
              variant="alert"
              className="mb-5"
              title="Custompedia Tech sedang tidak bisa dihubungi"
              description={data.fetchedAt ? `Yang tampil adalah data terakhir, ${dateTime(data.fetchedAt)}. Publish dibuka lagi setelah tersambung.` : 'Data belum bisa dimuat. Coba Muat ulang sebentar lagi.'}
            />
          )}
          {sub?.state === 'EXPIRING' && sub.daysLeft !== null && (
            <Banner
              variant="alert"
              className="mb-5"
              title={sub.daysLeft <= 0 ? 'Masa langganan habis hari ini' : `Masa langganan habis ${sub.daysLeft} hari lagi`}
              description={`${sub.endsOn ? `Berakhir ${longDate(sub.endsOn)}. ` : ''}Hubungi tim Custompedia untuk memperpanjang, supaya analitik dan artikel baru tidak terkunci.`}
            />
          )}
          {data.pendingJobs > 0 && (
            <Banner
              className="mb-5"
              title={`${data.pendingJobs} proses sedang diselesaikan`}
              description="Penayangan atau laporan ke Tech yang belum tuntas dicoba lagi otomatis."
              action={<Button size="sm" loading={retrying} onClick={retry}>Coba lagi</Button>}
            />
          )}
          <AnalyticsCards data={data.analytics} />
          <ArticleQueue items={data.items} disabled={offline} working={working} onOpen={setOpen} onPublish={publishFromRow} />
        </>
      )}

      <ReviewDialog item={open} disabled={offline} publishing={!!open && working === open.groupId} onClose={() => setOpen(null)} onPublish={(item, prepared) => void act(item, prepared)} onChanged={() => (toasts.add({ variant: 'success', title: 'Alasan revisi terkirim', description: 'Tim Tech merevisi artikel ini.' }), refreshAll())} />
      {data && <ExpiredDialog open={popup} onClose={() => setPopup(false)} status={data} />}
    </Page>
  )
}

/** The page without a running subscription: the shape of what is locked, and one way back to the explanation. */
function Locked({ onShow, ended }: { onShow: () => void; ended: string | null }) {
  const bar = (w: string, h = 'h-3') => <span className={`block rounded-md bg-kumo-recessed ${h} ${w}`} />
  return (
    <div aria-label="ArticleFlow terkunci">
      <LayerCard className="mb-4 overflow-hidden p-0" aria-hidden="true">
        <div className="grid grid-cols-2 gap-px bg-black/[0.08] sm:grid-cols-3 xl:grid-cols-6">
          {['w-3/4', 'w-3/5', 'w-1/2', 'w-3/4', 'w-2/3', 'w-4/5'].map((w, i) => (
            <div key={i} className="space-y-3 bg-kumo-base p-5">
              {bar(w)}
              {bar('w-2/5', 'h-7')}
              {bar('w-4/5', 'h-2.5')}
            </div>
          ))}
        </div>
      </LayerCard>
      <LayerCard className="grid place-items-center px-6 py-16 text-center">
        <span className="grid size-11 place-items-center rounded-xl bg-kumo-recessed text-kumo-subtle"><LockSimple size={22} /></span>
        <p className="mt-4 text-[15px] font-semibold text-kumo-strong">{ended ? `Langganan berakhir ${ended}` : 'ArticleFlow belum aktif'}</p>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-kumo-subtle">Analitik dan artikel baru dibuka lagi setelah langganan diperpanjang lewat tim Custompedia. Artikel yang sudah tayang tetap aman di website.</p>
        <Button className="mt-5" onClick={onShow}>Lihat keterangan</Button>
      </LayerCard>
    </div>
  )
}
