import { api, ApiError } from '../../src/lib/api'
import { uploadImage } from '../../src/lib/image'
import { mutate } from '../../src/lib/useFetch'
import type { FlowDetail, FlowItem, ImportResult, PublishResult, ViewStatus } from '../types'

/* What the ArticleFlow page does, in one place: prepare a preview, publish, ask for changes, and the words it uses. */

export const OVERVIEW = '/articleflow/overview'
export const STATUS = '/articleflow/status'

/** Everything that shows ArticleFlow data reads again (the page, the sidebar item, the Artikel list). */
export function refreshAll() {
  mutate(OVERVIEW)
  mutate(STATUS)
  mutate('/articles')
}

export const nf = new Intl.NumberFormat('id-ID')
export const pct = (share: number | null, digits = 1) => (share === null ? '-' : `${(share * 100).toLocaleString('id-ID', { maximumFractionDigits: digits })}%`)
export const dec = (n: number | null) => (n === null ? '-' : n.toLocaleString('id-ID', { maximumFractionDigits: 1 }))
export const shortDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
export const longDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

/** "+18%" against the period before; null when there is nothing to compare with. */
export function change(now: number, before: number): { text: string; up: boolean } | null {
  if (!before || !Number.isFinite(before)) return null
  const share = (now - before) / before
  if (Math.abs(share) < 0.005) return null
  return { text: `${share > 0 ? '+' : ''}${Math.round(share * 100)}%`, up: share > 0 }
}

export const VIEW_LABEL: Record<ViewStatus, string> = {
  waiting: 'Menunggu',
  approved: 'Siap tayang',
  changes: 'Minta revisi',
  updating: 'Sedang direvisi',
  finishing: 'Sedang diselesaikan',
  published: 'Tayang',
  taken_down: 'Diturunkan',
}
/** The status in words; an article whose other language is still on its way at Tech says which one it waits for. */
export const viewLabel = (item: { view: ViewStatus; waitingFor?: 'id' | 'en' | null }): string =>
  item.view === 'updating' && item.waitingFor ? `Menunggu versi ${item.waitingFor === 'en' ? 'Inggris' : 'Indonesia'}` : VIEW_LABEL[item.view]
export const canPublish = (view: ViewStatus) => view === 'waiting' || view === 'approved'

export type Tab = 'waiting' | 'approved' | 'changes' | 'published'
export const TABS: [Tab, string][] = [
  ['waiting', 'Menunggu'],
  ['approved', 'Disetujui'],
  ['changes', 'Minta revisi'],
  ['published', 'Tayang'],
]
export const tabOf = (view: ViewStatus): Tab => (view === 'waiting' ? 'waiting' : view === 'approved' ? 'approved' : view === 'changes' || view === 'updating' ? 'changes' : 'published')

export const languages = (item: FlowItem) => {
  const has = item.locales.map((l) => l.locale)
  return has.includes('en') && has.includes('id') ? 'EN dan ID' : has.includes('en') ? 'hanya EN' : 'hanya ID'
}
export const versionsOf = (item: FlowItem) => Object.fromEntries(item.locales.map((l) => [l.articleId, l.versionId]))

export const message = (e: unknown, fallback = 'Terjadi kesalahan. Coba lagi.') => (e instanceof ApiError || e instanceof Error ? e.message || fallback : fallback)

export interface Prepared { detail: FlowDetail; result: ImportResult }

/**
 * Bring one article here as a draft: read it from Tech, store the pictures that are not in Media yet (resized in
 * the browser like every other upload), then save the draft. `onStep` reports "Menyimpan gambar 1 dari 3".
 */
export async function prepare(groupId: string, onStep: (text: string) => void = () => {}): Promise<Prepared> {
  onStep('Membaca artikel dari Tech')
  const detail = await api<FlowDetail>(`/articleflow/items/${encodeURIComponent(groupId)}`)
  const needed = new Set<string>()
  for (const v of detail.versions) {
    if (v.hero?.assetId) needed.add(v.hero.assetId)
    for (const b of v.blocks) if (b?.type === 'image' && b.assetId) needed.add(b.assetId)
  }
  const assets: Record<string, string> = { ...detail.local.assets }
  const missing = [...needed].filter((id) => !assets[id])
  for (const [i, assetId] of missing.entries()) {
    onStep(`Menyimpan gambar ${i + 1} dari ${missing.length}`)
    const res = await fetch(`/api/articleflow/items/${encodeURIComponent(groupId)}/media/${encodeURIComponent(assetId)}`, { credentials: 'same-origin', headers: { 'x-requested-with': 'kadanglabo-admin' } })
    if (!res.ok) throw new Error('Gambar artikel dari Tech tidak bisa dibaca. Coba lagi sebentar lagi.')
    const blob = await res.blob()
    const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/png' ? 'png' : 'webp'
    const name = `articleflow-${assetId.replace(/[^a-z0-9]+/gi, '-').slice(-24)}.${ext}`
    assets[assetId] = (await uploadImage(new File([blob], name, { type: blob.type }))).id
  }
  onStep('Menyiapkan pratinjau')
  const result = await api<ImportResult>(`/articleflow/items/${encodeURIComponent(groupId)}/import`, { body: { assets } })
  return { detail: { ...detail, local: result.local }, result }
}

export const publish = (groupId: string) => api<PublishResult>(`/articleflow/items/${encodeURIComponent(groupId)}/publish`, { method: 'POST' })

export const requestChanges = (item: FlowItem, comment: string, idempotencyKey: string) =>
  api<{ ok: true; item: FlowItem | null }>(`/articleflow/items/${encodeURIComponent(item.groupId)}/decision`, { body: { comment, versions: versionsOf(item), idempotencyKey } })

export const newKey = () => `dec_${crypto.randomUUID().replaceAll('-', '')}`
