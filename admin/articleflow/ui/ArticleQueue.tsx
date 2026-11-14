import { useEffect, useState } from 'react'
import { Badge, Button, LayerCard, LinkButton } from '@cloudflare/kumo'
import { Thumb } from '../../src/components/Thumb'
import { ago } from '../../src/lib/format'
import type { FlowItem, ViewStatus } from '../types'
import { TABS, canPublish, languages, tabOf, viewLabel, type Tab } from './flow'

/* The articles Tech has sent, by where they stand. One row = one article (Indonesian and English together). */

const BADGE: Record<ViewStatus, 'neutral' | 'success' | 'warning' | 'outline'> = {
  waiting: 'warning',
  approved: 'neutral',
  changes: 'outline',
  updating: 'outline',
  finishing: 'neutral',
  published: 'success',
  taken_down: 'warning',
}
const HEADING: Record<Tab, string> = {
  waiting: 'Menunggu persetujuan Anda',
  approved: 'Disetujui, belum tayang',
  changes: 'Sedang direvisi tim Tech',
  published: 'Sudah tayang di website',
}
const EMPTY: Record<Tab, string> = {
  waiting: 'Tidak ada artikel yang menunggu. Artikel baru dari tim Tech muncul di sini.',
  approved: 'Belum ada artikel yang disetujui tetapi belum tayang.',
  changes: 'Tidak ada artikel yang sedang direvisi.',
  published: 'Belum ada artikel dari ArticleFlow yang tayang.',
}

export function ArticleQueue({ items, disabled, working, onOpen, onPublish }: {
  items: FlowItem[]
  /** Tech cannot be reached: looking is fine, acting is not */
  disabled: boolean
  /** the article a publish is running for */
  working: string | null
  onOpen: (item: FlowItem) => void
  onPublish: (item: FlowItem) => void
}) {
  const count = (t: Tab) => items.filter((i) => tabOf(i.view) === t).length
  const [tab, setTab] = useState<Tab>(() => TABS.find(([t]) => count(t) > 0)?.[0] ?? 'waiting')
  // a tab that just emptied (its last article was published) hands over to the first tab that still has something
  useEffect(() => {
    if (!count(tab) && items.length) setTab(TABS.find(([t]) => count(t) > 0)?.[0] ?? 'waiting')
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps
  const rows = items.filter((i) => tabOf(i.view) === tab)

  return (
    <section aria-label="Artikel dari Tech">
      <nav className="no-scrollbar mb-5 flex gap-x-6 overflow-x-auto border-b border-kumo-line" aria-label="Status artikel">
        {TABS.map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 pb-2.5 text-sm transition ${tab === t ? 'border-kumo-brand font-medium text-kumo-strong' : 'border-transparent text-kumo-subtle hover:text-kumo-strong'}`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-px text-xs tabular-nums ${tab === t ? 'bg-kumo-tint text-kumo-strong' : 'bg-kumo-recessed text-kumo-subtle'}`}>{count(t)}</span>
          </button>
        ))}
      </nav>

      <LayerCard className="p-0">
        <LayerCard.Secondary className="flex min-h-12 items-center justify-between gap-3">
          <span className="font-medium text-kumo-strong">{HEADING[tab]}</span>
          <span className="shrink-0 text-xs text-kumo-subtle">{rows.length} artikel</span>
        </LayerCard.Secondary>
        <LayerCard.Primary className="p-0">
          {rows.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-kumo-subtle">{EMPTY[tab]}</p>
          ) : (
            <ul className="divide-y divide-kumo-hairline">
              {rows.map((item) => (
                <li key={item.groupId} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                  <Thumb id={item.local.cover} className="h-11 w-16 rounded-md max-sm:hidden" />
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="text-sm font-semibold text-kumo-strong">{item.title}</p>
                    <p className="mt-0.5 text-[13px] text-kumo-subtle">
                      Dikirim {ago(item.sentAt)} · {languages(item)}
                      {item.primaryQuery ? ` · kata kunci: ${item.primaryQuery}` : ''}
                    </p>
                    {item.view === 'updating' && item.waitingFor ? (
                      <p className="mt-1 text-[13px] text-kumo-default">Versi bahasa {item.waitingFor === 'en' ? 'Inggris' : 'Indonesia'} sedang disiapkan tim Tech. Artikel bisa ditayangkan setelah kedua bahasa siap.</p>
                    ) : item.view === 'changes' && item.decision?.comment ? (
                      <p className="mt-1 text-[13px] text-kumo-default">Alasan revisi: {item.decision.comment}</p>
                    ) : item.why ? (
                      <p className="mt-1 text-[13px] text-kumo-default">Kenapa ditulis: {item.why}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.local.newVersion && <Badge variant="neutral">Versi baru tersedia</Badge>}
                    <Badge variant={BADGE[item.view]} appearance="dot">{viewLabel(item)}</Badge>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
                    {item.view === 'published' && item.local.articleId ? (
                      <LinkButton href={`/articles/${item.local.articleId}`} variant="secondary" size="sm" className="justify-center max-md:min-h-11 max-sm:flex-1">Buka di Artikel</LinkButton>
                    ) : null}
                    {item.view !== 'finishing' && (
                      <Button size="sm" onClick={() => onOpen(item)} className="justify-center max-sm:flex-1">{canPublish(item.view) ? 'Pratinjau' : 'Lihat'}</Button>
                    )}
                    {canPublish(item.view) && (
                      <Button size="sm" variant="primary" disabled={disabled || working !== null} loading={working === item.groupId} onClick={() => onPublish(item)} className="justify-center max-sm:flex-1">Publish</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </LayerCard.Primary>
      </LayerCard>
    </section>
  )
}
