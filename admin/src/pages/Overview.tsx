import { useNavigate } from 'react-router'
import { Button, LayerCard } from '@cloudflare/kumo'
import { Buildings, Plus, ImagesSquare, Newspaper } from '@phosphor-icons/react'
import { Page } from '../layout/Page'
import { useSession } from '../lib/session'
import { useFetch } from '../lib/useFetch'
import { ago } from '../lib/format'
import type { ListItem, Storage } from '../lib/types'
import { StateBadge } from '../components/StateBadge'
import { Thumb } from '../components/Thumb'

export function Overview() {
  const { user } = useSession()
  const navigate = useNavigate()
  const storage = useFetch<Storage>('/storage')
  const projects = useFetch<{ items: ListItem[] }>('/projects')
  const articles = useFetch<{ items: ListItem[] }>('/articles')

  const recent = [...(projects.data?.items ?? []).map((i) => ({ ...i, kind: 'project' as const })), ...(articles.data?.items ?? []).map((i) => ({ ...i, kind: 'article' as const }))]
    .filter((i) => i.state !== 'trashed')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8)

  const s = storage.data
  const items = projects.data?.items ?? []
  const livePages = items.filter((p) => p.state === 'published' && !p.archive_only).length
  const liveArchive = items.filter((p) => p.state === 'published' && p.archive_only).length
  const tiles = [
    { label: 'Projek tayang', value: projects.data ? livePages : undefined, sub: projects.data ? [liveArchive ? `+ ${liveArchive} di arsip` : null, `${s?.projects.draft ?? 0} draft`].filter(Boolean).join(' · ') : '', icon: Buildings, to: '/projects' },
    { label: 'Artikel tayang', value: s?.articles.published, sub: s ? `${s.articles.draft} draft` : '', icon: Newspaper, to: '/articles' },
    { label: 'Foto di Media', value: s?.buckets[0]?.objects, sub: 'dipakai di projek dan artikel', icon: ImagesSquare, to: '/media' },
  ]

  return (
    <Page
      title={`Halo, ${user?.name.split(' ')[0]}`}
      description="Ringkasan konten website Kadanglabo."
      actions={
        <>
          <Button icon={Plus} onClick={() => navigate('/articles/new')}>
            Artikel baru
          </Button>
          <Button variant="primary" icon={Plus} onClick={() => navigate('/projects/new')}>
            Projek baru
          </Button>
        </>
      }
    >
      <LayerCard className="mb-6 grid overflow-hidden p-0 sm:grid-cols-3">
        {tiles.map((t) => (
          <button key={t.label} onClick={() => navigate(t.to)} className="group border-kumo-hairline p-5 text-left transition hover:bg-kumo-tint max-sm:border-b sm:border-r sm:last:border-r-0">
            <span className="flex items-center gap-2 text-sm text-kumo-subtle">
              <t.icon size={16} /> {t.label}
            </span>
            <span className="mt-2 block text-[28px] font-semibold tabular-nums text-kumo-strong">{t.value ?? '-'}</span>
            <span className="text-xs text-kumo-subtle">{t.sub}</span>
          </button>
        ))}
      </LayerCard>

      <LayerCard className="p-0">
        <LayerCard.Secondary>Terakhir diubah</LayerCard.Secondary>
        <LayerCard.Primary className="p-0">
          <ul className="divide-y divide-kumo-hairline">
            {recent.length === 0 && <li className="px-5 py-10 text-center text-sm text-kumo-subtle">Belum ada konten.</li>}
            {recent.map((r) => (
              <li key={`${r.kind}${r.id}`}>
                <button onClick={() => navigate(`/${r.kind === 'project' ? 'projects' : 'articles'}/${r.id}`)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-kumo-tint">
                  <Thumb id={r.cover} className="h-10 w-14 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-kumo-strong">{r.title}</span>
                    <span className="block truncate text-xs text-kumo-subtle">
                      {r.kind === 'project' ? 'Projek' : 'Artikel'} · {ago(r.updated_at)}
                      {r.updated_by ? ` · ${r.updated_by}` : ''}
                    </span>
                  </span>
                  <StateBadge state={r.state} dirty={!!r.dirty} />
                </button>
              </li>
            ))}
          </ul>
        </LayerCard.Primary>
      </LayerCard>
    </Page>
  )
}
