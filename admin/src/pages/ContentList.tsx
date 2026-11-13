import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, DropdownMenu, Empty, InputGroup, LayerCard, Pagination, Select } from '@cloudflare/kumo'
import type { Sort } from '../components/DataTable'
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowSquareOut,
  ArrowsDownUp,
  Buildings,
  Copy,
  DotsThree,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  Newspaper,
  PencilSimple,
  Plus,
  RocketLaunch,
  Trash,
} from '@phosphor-icons/react'
import { Page } from '../layout/Page'
import { PUBLIC_SITE } from '../layout/Shell'
import { useFetch } from '../lib/useFetch'
import { ago, date, matches } from '../lib/format'
import { useContentActions } from '../lib/actions'
import type { Kind, ListItem } from '../lib/types'
import { StateBadge } from '../components/StateBadge'
import { Thumb } from '../components/Thumb'
import { ReorderDialog } from '../components/ReorderDialog'

const PER_PAGE = 15
const categoryName: Record<string, string> = { commercial: 'Commercial', hospitality: 'Hospitality', residential: 'Residential' }

/* Projects or articles: a search bar card on top, then the table (Cloudflare's "Workers & Pages" / table pattern). */
export function ContentList({ kind }: { kind: Kind }) {
  const isProject = kind === 'project'
  const base = isProject ? '/projects' : '/articles'
  const navigate = useNavigate()
  const { data, loading, reload } = useFetch<{ items: ListItem[] }>(base)
  const actions = useContentActions(kind)
  const [q, setQ] = useState('')
  const [state, setState] = useState('active')
  const [sort, setSort] = useState<Sort>(isProject ? { key: 'position', dir: 'asc' } : { key: 'date', dir: 'desc' })
  const [cat, setCat] = useState('all')
  const [page, setPage] = useState(1)
  const [reorder, setReorder] = useState(false)

  const rows = useMemo(() => {
    let r = (data?.items ?? []).filter((i) => inTab(i, state))
    if (isProject && cat !== 'all') r = r.filter((i) => (cat === 'archive' ? i.archive_only : i.category === cat && !i.archive_only))
    if (q.trim()) r = r.filter((i) => matches(`${i.title} ${i.slug} ${i.region ?? ''} ${i.tag ?? ''}`, q))
    // ascending comparisons; 'desc' flips them
    const by: Record<string, (a: ListItem, b: ListItem) => number> = {
      updated: (a, b) => a.updated_at.localeCompare(b.updated_at),
      title: (a, b) => a.title.localeCompare(b.title, 'id'),
      position: (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id,
      date: (a, b) => (a.date ?? '').localeCompare(b.date ?? ''),
      category: (a, b) => `${a.archive_only}${a.category}`.localeCompare(`${b.archive_only}${b.category}`) || (a.position ?? 0) - (b.position ?? 0),
      state: (a, b) => a.state.localeCompare(b.state),
    }
    const f = by[sort.key] ?? by.updated
    return [...r].sort((a, b) => (sort.dir === 'asc' ? f(a, b) : f(b, a)))
  }, [data, state, cat, q, sort, isProject])

  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const all = data?.items ?? []
  const count = (k: string) => all.filter((i) => inTab(i, k)).length
  const tabs = (
    [
      ['active', 'Semua'],
      ['published', 'Tayang'],
      ['changed', 'Ada perubahan'],
      ['draft', 'Draft'],
      ['taken_down', 'Diturunkan'],
      ['trashed', 'Trash'],
    ] as const
  ).filter(([k]) => k === 'active' || k === state || count(k) > 0)
  const reset = () => setPage(1)

  return (
    <Page
      title={isProject ? 'Projek' : 'Artikel'}
      pill={
        <a href={`${PUBLIC_SITE}${isProject ? '/work' : '/articles'}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-medium ring-1 ring-kumo-line transition hover:bg-kumo-tint">
          {isProject ? 'Our Work' : 'Artikel'} <ArrowSquareOut size={12} />
        </a>
      }
      description={
        isProject
          ? 'Projek yang tampil di halaman Our Work: halaman detail, kategori, dan tabel arsip.'
          : 'Artikel yang tampil di halaman Artikel website.'
      }
      actions={
        <>
          {isProject && (
            <Button icon={ArrowsDownUp} onClick={() => setReorder(true)}>
              Urutan arsip
            </Button>
          )}
          <Button variant="primary" icon={Plus} onClick={() => navigate(`${base}/new`)}>
            {isProject ? 'Projek baru' : 'Artikel baru'}
          </Button>
        </>
      }
    >
      {/* status tabs, underlined like Cloudflare's page tabs */}
      <nav className="mb-5 flex flex-wrap gap-x-6 border-b border-kumo-line" aria-label="Status">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            onClick={() => (setState(k), reset())}
            aria-current={state === k ? 'page' : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-2.5 text-sm transition ${state === k ? 'border-kumo-brand font-medium text-kumo-strong' : 'border-transparent text-kumo-subtle hover:text-kumo-strong'}`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-px text-xs tabular-nums ${state === k ? 'bg-kumo-tint text-kumo-strong' : 'bg-kumo-recessed text-kumo-subtle'}`}>{data ? count(k) : '-'}</span>
          </button>
        ))}
      </nav>

      {/* the toolbar: a card around the bar, like Cloudflare's search */}
      <div className="mb-5 rounded-xl bg-kumo-recessed p-1.5 ring-1 ring-kumo-hairline">
        <div className="flex flex-wrap items-stretch gap-0 overflow-hidden rounded-lg bg-kumo-base ring-1 ring-kumo-line sm:flex-nowrap">
          <InputGroup className="min-w-0 flex-1 rounded-none border-0 shadow-none ring-0 focus-within:ring-0">
            <InputGroup.Addon>
              <MagnifyingGlass size={16} />
            </InputGroup.Addon>
            <InputGroup.Input
              placeholder={isProject ? 'Cari judul atau lokasi' : 'Cari judul atau topik'}
              aria-label="Cari"
              value={q}
              onChange={(e) => (setQ(e.target.value), reset())}
            />
          </InputGroup>
          {isProject && (
            <>
              <Divider />
              <Select
                aria-label="Kategori"
                className="w-auto min-w-36 rounded-none border-0 shadow-none ring-0"
                value={cat}
                onValueChange={(v) => (setCat(String(v)), reset())}
                items={{ all: 'Semua kategori', commercial: 'Commercial', hospitality: 'Hospitality', residential: 'Residential', archive: 'Hanya arsip' }}
              />
            </>
          )}
          <Divider />
          <Select
            aria-label="Urutkan"
            className="w-auto min-w-40 rounded-none border-0 shadow-none ring-0"
            value={`${sort.key}:${sort.dir}`}
            onValueChange={(v) => {
              const [key, dir] = String(v).split(':')
              setSort({ key, dir: dir as Sort['dir'] })
            }}
            items={
              isProject
                ? { 'position:asc': 'Urutan website', 'updated:desc': 'Terakhir diubah', 'title:asc': 'Judul A-Z', ...(['position:asc', 'updated:desc', 'title:asc'].includes(`${sort.key}:${sort.dir}`) ? {} : { [`${sort.key}:${sort.dir}`]: 'Urutan kolom' }) }
                : { 'date:desc': 'Tanggal terbaru', 'updated:desc': 'Terakhir diubah', 'title:asc': 'Judul A-Z', ...(['date:desc', 'updated:desc', 'title:asc'].includes(`${sort.key}:${sort.dir}`) ? {} : { [`${sort.key}:${sort.dir}`]: 'Urutan kolom' }) }
            }
          />
          <Divider />
          <button onClick={() => void reload()} className="grid w-11 shrink-0 place-items-center text-kumo-subtle transition hover:bg-kumo-tint" aria-label="Muat ulang">
            <ArrowClockwise size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {data && rows.length === 0 ? (
        <>
          <Empty className="border-kumo-line bg-kumo-base"
            icon={isProject ? <Buildings size={44} /> : <Newspaper size={44} />}
            title={q || state !== 'active' || cat !== 'all' ? 'Tidak ada yang cocok' : isProject ? 'Belum ada projek' : 'Belum ada artikel'}
            description={q || state !== 'active' || cat !== 'all' ? 'Coba kata kunci atau filter lain.' : 'Mulai dengan membuat yang pertama.'}
            contents={
              !q && state === 'active' && cat === 'all' ? (
                <Button variant="primary" icon={Plus} onClick={() => navigate(`${base}/new`)}>
                  {isProject ? 'Projek baru' : 'Artikel baru'}
                </Button>
              ) : undefined
            }
          />
        </>
      ) : (
        <LayerCard className="p-0">
          <LayerCard.Secondary className="flex items-center justify-between">
            <span>{tabs.find(([k]) => k === state)?.[1] === 'Semua' ? (isProject ? 'Semua projek' : 'Semua artikel') : tabs.find(([k]) => k === state)?.[1]}</span>
            <span className="text-xs font-normal text-kumo-subtle">{data ? `${rows.length} ${isProject ? 'projek' : 'artikel'}` : ''}</span>
          </LayerCard.Secondary>
          <LayerCard.Primary className="p-0">
            <ul className="divide-y divide-kumo-hairline">
              {!data &&
                Array.from({ length: 6 }, (_, i) => (
                  <li key={i} className="px-5 py-3">
                    <div className="h-10 animate-pulse rounded-md bg-kumo-recessed" />
                  </li>
                ))}
              {pageRows.map((r) => (
                <li key={r.id} className="flex cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-kumo-tint" onClick={() => navigate(`${base}/${r.id}`)}>
                  <Thumb id={r.cover} className="h-11 w-16 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-kumo-strong">{r.title || 'Tanpa judul'}</span>
                    <span className="block truncate text-xs text-kumo-subtle">
                      {isProject
                        ? [categoryName[r.category ?? ''] ?? r.category, r.archive_only ? 'hanya arsip' : null, r.region].filter(Boolean).join(' · ')
                        : `${r.date ? date(r.date) : 'belum pernah tayang'}${r.tag ? ` · ${r.tag}` : ''}`}
                      {!r.cover && r.state !== 'trashed' && <span className="text-kumo-warning"> · belum ada foto cover</span>}
                    </span>
                  </span>
                  <span className="hidden w-36 shrink-0 text-right text-xs text-kumo-subtle md:block">
                    Diubah {ago(r.updated_at)}
                    {r.updated_by && r.updated_by !== 'seed' && <span className="block text-kumo-inactive">oleh {r.updated_by}</span>}
                  </span>
                  <span className="flex w-40 shrink-0 justify-end">
                    <StateBadge state={r.state} dirty={!!r.dirty} />
                  </span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <RowMenu kind={kind} row={r} actions={actions} onEdit={() => navigate(`${base}/${r.id}`)} onCopied={(id) => navigate(`${base}/${id}`)} />
                  </span>
                </li>
              ))}
            </ul>
          </LayerCard.Primary>
        </LayerCard>
      )}

      {rows.length > PER_PAGE && (
        <div className="mt-5 flex justify-end">
          <Pagination page={page} setPage={setPage} perPage={PER_PAGE} totalCount={rows.length} />
        </div>
      )}
      {actions.dialog}
      {isProject && <ReorderDialog open={reorder} onOpenChange={setReorder} items={(data?.items ?? []).filter((i) => i.state !== 'trashed')} />}
    </Page>
  )
}

/** Which status tab a row belongs to; "Ada perubahan" = live, with edits not yet on the website. */
const inTab = (i: ListItem, tab: string) =>
  tab === 'active' ? i.state !== 'trashed' : tab === 'changed' ? i.state === 'published' && !!i.dirty : i.state === tab

const Divider = () => <span className="hidden w-px shrink-0 bg-kumo-line sm:block" />

function RowMenu({
  kind,
  row,
  actions,
  onEdit,
  onCopied,
}: {
  kind: Kind
  row: ListItem
  actions: ReturnType<typeof useContentActions>
  onEdit: () => void
  onCopied: (id: number) => void
}) {
  const live = row.state === 'published'
  const path = `${PUBLIC_SITE}/${kind === 'project' ? 'work' : 'articles'}/${row.published_slug || row.slug}`
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" shape="square" aria-label="Pilihan lain" icon={<DotsThree weight="bold" size={18} />} />} />
      <DropdownMenu.Content align="end" className="min-w-52">
        {row.state === 'trashed' ? (
          <>
            <DropdownMenu.Item icon={ArrowCounterClockwise} onClick={() => void actions.restore(row.id, row.title)}>
              Pulihkan
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item icon={Trash} variant="danger" onClick={() => void actions.remove(row.id, row.title)}>
              Hapus permanen
            </DropdownMenu.Item>
          </>
        ) : (
          <>
            <DropdownMenu.Item icon={PencilSimple} onClick={onEdit}>
              Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item icon={Eye} onClick={() => void actions.preview(row.id)}>
              Preview
            </DropdownMenu.Item>
            {live && (kind === 'article' || !row.archive_only) && (
              <DropdownMenu.LinkItem href={path} target="_blank" icon={ArrowSquareOut}>
                Lihat di website
              </DropdownMenu.LinkItem>
            )}
            <DropdownMenu.Separator />
            {(!live || row.dirty) && (
              <DropdownMenu.Item icon={RocketLaunch} onClick={() => void actions.publish(row.id, row.title)}>
                {live ? 'Tayangkan perubahan' : 'Tayangkan'}
              </DropdownMenu.Item>
            )}
            {live && (
              <DropdownMenu.Item icon={EyeSlash} onClick={() => void actions.takedown(row.id, row.title)}>
                Turunkan dari website
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item icon={Copy} onClick={async () => { const id = await actions.duplicate(row.id); if (id) onCopied(id) }}>
              Duplikat
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item icon={Trash} variant="danger" onClick={() => void actions.trash(row.id, row.title, live)}>
              Pindahkan ke Trash
            </DropdownMenu.Item>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu>
  )
}
