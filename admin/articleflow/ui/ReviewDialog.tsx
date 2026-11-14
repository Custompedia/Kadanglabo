import { useEffect, useId, useRef, useState } from 'react'
import { Banner, Button, Dialog, LinkButton, Loader } from '@cloudflare/kumo'
import { ArrowSquareOut, CheckCircle, DesktopTower, DeviceMobile, WarningCircle, X } from '@phosphor-icons/react'
import { dateTime } from '../../src/lib/format'
import type { FlowItem } from '../types'
import { canPublish, message, newKey, prepare, requestChanges, viewLabel, type Prepared } from './flow'

/*
 * One article from Tech: the website's own page with this draft in it (the same preview the Artikel menu has) and,
 * on the right, why it was written, with Publish and Minta revisi. Opening it brings the article here as a draft.
 */
export function ReviewDialog({ item, disabled, publishing, onClose, onPublish, onChanged }: {
  item: FlowItem | null
  /** Tech cannot be reached: looking only */
  disabled: boolean
  publishing: boolean
  onClose: () => void
  /** resolves once the publish has ended, well or not */
  onPublish: (item: FlowItem, prepared: Prepared) => void
  onChanged: () => void
}) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [step, setStep] = useState('')
  const [ready, setReady] = useState<Prepared | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const run = useRef(0)

  const load = (groupId: string) => {
    const n = ++run.current
    setReady(null)
    setFailed(null)
    setStep('Membaca artikel dari Tech')
    prepare(groupId, (s) => n === run.current && setStep(s))
      .then((p) => n === run.current && setReady(p))
      .catch((e) => n === run.current && setFailed(message(e, 'Artikel tidak bisa disiapkan.')))
  }
  useEffect(() => {
    if (!item) return void (run.current++, setReady(null), setFailed(null), setAsking(false))
    if (item.view !== 'finishing') load(item.groupId)
  }, [item?.groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  const tab = (d: typeof device, Icon: typeof DesktopTower, label: string) => (
    <button
      type="button"
      onClick={() => setDevice(d)}
      aria-pressed={device === d}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition ${device === d ? 'bg-kumo-base font-medium text-kumo-strong shadow-sm ring-1 ring-kumo-line' : 'text-kumo-subtle hover:text-kumo-strong'}`}
    >
      <Icon size={15} /> {label}
    </button>
  )

  const detail = ready?.detail
  const issues = ready?.result.issues ?? []
  const single = ready?.result.singleLang ?? null
  const actionable = !!item && canPublish(item.view)
  const url = ready?.result.previewUrl ?? null

  return (
    <Dialog.Root open={!!item} onOpenChange={(o) => !o && !publishing && onClose()}>
      <Dialog size="xl" className="flex h-[92dvh] max-h-[92dvh] w-[96vw] max-w-none flex-col overflow-hidden p-0 sm:max-h-[92dvh] sm:w-[min(1480px,96vw)]">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-kumo-line px-4 py-2.5">
          <Dialog.Title className="text-[15px] font-semibold text-kumo-strong">Preview</Dialog.Title>
          <span className="hidden text-xs text-kumo-subtle sm:inline">{item?.view === 'published' ? 'Dari ArticleFlow, sudah tayang' : 'Dari ArticleFlow, belum tayang'}</span>
          <Dialog.Description className="sr-only">Pratinjau artikel dari ArticleFlow, alasan penulisannya, dan tombol untuk menayangkan atau meminta revisi.</Dialog.Description>
          <span className="flex-1" />
          <span className="flex gap-1 rounded-lg bg-kumo-recessed p-0.5 ring-1 ring-kumo-hairline max-lg:hidden">
            {tab('desktop', DesktopTower, 'Desktop')}
            {tab('mobile', DeviceMobile, 'HP')}
          </span>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" title="Buka di tab baru" aria-label="Buka di tab baru" className="grid size-8 place-items-center rounded-lg text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-strong max-md:size-11">
              <ArrowSquareOut size={16} />
            </a>
          )}
          <button type="button" onClick={onClose} disabled={publishing} aria-label="Tutup" className="grid size-8 place-items-center rounded-lg text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-strong disabled:opacity-50">
            <X size={16} />
          </button>
        </div>

        {/* wide screens: the page beside the panel. Narrow screens: one column that scrolls, the page first. */}
        <div className="flex min-h-0 flex-1 !shrink flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <div className="min-h-[52dvh] shrink-0 bg-kumo-recessed lg:min-h-0 lg:flex-1 lg:shrink">
            {url ? (
              <iframe key={url} src={url} title="Pratinjau artikel" className={`mx-auto block h-[52dvh] bg-white transition-[width] lg:h-full ${device === 'mobile' ? 'w-full lg:w-[390px] lg:border-x lg:border-kumo-line' : 'w-full'}`} />
            ) : (
              <div className="grid h-[52dvh] place-items-center px-6 text-center lg:h-full">
                {failed ? (
                  <div className="max-w-sm">
                    <WarningCircle size={28} className="mx-auto text-kumo-warning" />
                    <p className="mt-3 text-sm text-kumo-default">{failed}</p>
                    {item && <Button className="mt-4" onClick={() => load(item.groupId)}>Coba lagi</Button>}
                  </div>
                ) : item?.view === 'finishing' ? (
                  <p className="max-w-sm text-sm text-kumo-subtle">Artikel ini sedang diselesaikan penayangannya. Pratinjau terbuka lagi setelah selesai.</p>
                ) : (
                  <div role="status">
                    <Loader size="lg" />
                    <p className="mt-3 text-sm text-kumo-subtle">{step}...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <aside aria-label="Kenapa artikel ini" className="flex shrink-0 flex-col border-t border-kumo-line bg-kumo-base lg:w-[372px] lg:border-l lg:border-t-0">
            <div className="min-h-0 flex-1 px-6 pb-2 pt-5 lg:overflow-y-auto">
              <p className="text-xs font-medium text-kumo-subtle">{item ? viewLabel(item) : ''}</p>
              <h2 className="mt-1 text-[15px] font-semibold leading-snug text-kumo-strong">{item?.title}</h2>
              {single && (
                <Banner variant="alert" size="sm" className="mt-4" description={`Tech hanya mengirim versi bahasa ${single === 'id' ? 'Indonesia' : 'Inggris'}. Teks yang sama dipakai untuk kedua bahasa di website.`} />
              )}
              {issues.length > 0 && <Banner variant="error" size="sm" className="mt-4" title="Belum bisa tayang" description={`Belum lengkap: ${issues.join(', ')}. Minta tim Tech melengkapinya lewat Minta revisi.`} />}
              {item?.local.newVersion && <Banner size="sm" className="mt-4" description="Ini versi baru dari artikel yang sudah tayang. Publish mengganti isi artikel di alamat yang sama." />}

              <h3 className="mt-5 text-sm font-semibold text-kumo-strong">Kenapa artikel ini</h3>
              <p className="mt-0.5 text-[13px] text-kumo-subtle">Ringkasan riset dari tim Custompedia Tech.</p>
              <dl className="mt-3 divide-y divide-kumo-hairline border-t border-kumo-hairline">
                {(detail?.why_detail?.length ? detail.why_detail : item?.why ? [{ label: 'Alasan', text: item.why }] : []).map((w) => (
                  <div key={w.label} className="py-3">
                    <dt className="text-xs text-kumo-subtle">{w.label}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-kumo-default">{w.text}</dd>
                  </div>
                ))}
                {detail?.quality && (
                  <div className="py-3">
                    <dt className="text-xs text-kumo-subtle">Pemeriksaan kualitas</dt>
                    <dd className={`mt-1 flex items-start gap-1.5 text-sm ${detail.quality.passed ? 'text-kumo-success' : 'text-kumo-warning'}`}>
                      {detail.quality.passed ? <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0" /> : <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0" />}
                      <span>{detail.quality.passed ? 'Lolos semua pemeriksaan' : detail.quality.notes.join('. ') || 'Ada catatan dari pemeriksaan'}</span>
                    </dd>
                  </div>
                )}
                {!detail && !item?.why && <div className="py-3 text-sm text-kumo-subtle">{failed ? 'Alasan tidak bisa dibaca.' : 'Memuat...'}</div>}
              </dl>

              {!!detail?.history?.length && (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-kumo-strong">Riwayat</h3>
                  <ul className="mt-2 space-y-2.5">
                    {detail.history.slice(0, 5).map((h, i) => (
                      <li key={i} className="text-[13px] leading-relaxed text-kumo-default">
                        <span className="font-medium text-kumo-strong">{h.decision === 'APPROVED' ? 'Disetujui' : 'Minta revisi'}</span> oleh {h.by}, {dateTime(h.at)}
                        {h.comment ? <span className="block text-kumo-subtle">{h.comment}</span> : null}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <div className="shrink-0 border-t border-kumo-line px-6 pb-5 pt-4 max-lg:sticky max-lg:bottom-0 max-lg:bg-kumo-base max-lg:px-4 max-lg:py-3">
              {actionable ? (
                <>
                  <div className="flex flex-col gap-2.5 max-lg:flex-row-reverse">
                  <Button variant="primary" className="w-full justify-center max-lg:flex-1" size="lg" disabled={disabled || !ready || issues.length > 0 || asking} loading={publishing} onClick={() => item && ready && onPublish(item, ready)}>
                    {item?.local.newVersion ? 'Publish versi baru' : 'Publish ke website'}
                  </Button>
                  <Button className="w-full justify-center max-lg:flex-1" size="lg" disabled={disabled || publishing} onClick={() => setAsking(true)}>Minta revisi</Button>
                  </div>
                  <p className={`mt-3 text-xs leading-relaxed text-kumo-subtle ${disabled ? '' : 'max-lg:hidden'}`}>{disabled ? 'Custompedia Tech sedang tidak bisa dihubungi. Publish dan Minta revisi dibuka lagi setelah tersambung.' : 'Minta revisi wajib menyertakan alasan. Alasan dikirim ke tim Tech dan tercatat di riwayat artikel.'}</p>
                </>
              ) : item?.view === 'published' && item.local.articleId ? (
                <LinkButton href={`/articles/${item.local.articleId}`} className="w-full justify-center max-md:min-h-11" size="lg" onClick={onClose}>Buka di menu Artikel</LinkButton>
              ) : (
                <p className="text-sm leading-relaxed text-kumo-subtle">
                  {item?.view === 'updating' && item.waitingFor
                    ? `Versi bahasa ${item.waitingFor === 'en' ? 'Inggris' : 'Indonesia'} sedang disiapkan tim Tech. Artikel muncul lagi di tab Menunggu setelah kedua bahasa siap.`
                    : item?.view === 'changes' || item?.view === 'updating'
                    ? 'Artikel ini sedang direvisi tim Tech. Versi barunya muncul lagi di tab Menunggu.'
                    : item?.view === 'finishing'
                      ? 'Penayangan sedang diselesaikan. Tidak ada yang perlu Anda lakukan.'
                      : item?.view === 'taken_down'
                        ? 'Artikel ini diturunkan dari website. Tayangkan lagi dari menu Artikel.'
                        : ''}
                </p>
              )}
            </div>
          </aside>
        </div>

        {item && <ReasonDialog open={asking} item={item} onClose={() => setAsking(false)} onSent={() => (setAsking(false), onChanged(), onClose())} />}
      </Dialog>
    </Dialog.Root>
  )
}

/** "Minta revisi": the reason is required; it goes to Tech and into the article's history. */
function ReasonDialog({ open, item, onClose, onSent }: { open: boolean; item: FlowItem; onClose: () => void; onSent: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = useRef(newKey())
  const id = useId()
  useEffect(() => {
    if (open) (setText(''), setError(null), (key.current = newKey()))
  }, [open])
  const reason = text.trim()
  const send = async () => {
    if (!reason || busy) return
    setBusy(true)
    setError(null)
    try {
      await requestChanges(item, reason, key.current)
      onSent()
    } catch (e) {
      setError(message(e, 'Alasan tidak terkirim. Coba lagi.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <Dialog size="base" className="w-[min(520px,92vw)] p-6">
        <Dialog.Title className="text-lg font-semibold text-kumo-strong">Minta revisi</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm leading-relaxed text-kumo-subtle">Tulis apa yang perlu diubah. Tim Tech merevisi artikel lalu mengirimkannya lagi.</Dialog.Description>
        <label htmlFor={id} className="mt-5 block text-sm font-medium text-kumo-strong">Alasan revisi</label>
        <textarea
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          rows={5}
          autoFocus
          placeholder="Contoh: pakai contoh projek Kadanglabo, bukan projek umum."
          className="mt-2 block w-full resize-y rounded-lg bg-kumo-base px-3 py-2.5 text-base leading-relaxed text-kumo-default outline-none ring-1 ring-kumo-line placeholder:text-kumo-placeholder focus:ring-2 focus:ring-kumo-brand"
        />
        <p className="mt-1.5 flex justify-between gap-3 text-xs text-kumo-subtle">
          <span>{error ? <span className="text-kumo-danger">{error}</span> : 'Wajib diisi.'}</span>
          <span className="shrink-0 tabular-nums">{text.length} / 2000</span>
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Batal</Button>
          <Button variant="primary" onClick={send} disabled={!reason} loading={busy}>Kirim alasan</Button>
        </div>
      </Dialog>
    </Dialog.Root>
  )
}
