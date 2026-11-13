import { useMemo, useState } from 'react'
import { useToasts } from '../components/Toaster'
import { Button, Dialog, Empty, InputGroup, Select } from '@cloudflare/kumo'
import { ArrowSquareOut, ImagesSquare, MagnifyingGlass, Trash } from '@phosphor-icons/react'
import { Page } from '../layout/Page'
import { api, ApiError } from '../lib/api'
import { mutate } from '../lib/useFetch'
import { bytes, dateTime, matches } from '../lib/format'
import type { MediaItem } from '../lib/types'
import { mediaUrl, useMediaMap } from '../components/Thumb'
import { useConfirm } from '../components/Confirm'
import { FieldShell } from '../components/Fields'

/*
 * Every photo in storage, to look through: grouped by category and then by project, with search and filters.
 * Photos arrive here by themselves when someone uploads them in a project or article; there is no upload here.
 * Photos nothing uses any more are listed apart and cleaned up automatically after a week.
 */

const GROUPS = ['Commercial', 'Hospitality', 'Residential', 'Artikel'] as const
const UNUSED = 'Tidak dipakai'

export default function Media() {
  const { items } = useMediaMap()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('all')
  const [owner, setOwner] = useState('all')
  const [open, setOpen] = useState<MediaItem | null>(null)

  // group → owner (project, article or page) → photos; one photo can sit under several owners
  const tree = useMemo(() => {
    const t = new Map<string, Map<string, MediaItem[]>>()
    const put = (g: string, o: string, m: MediaItem) => {
      if (!t.has(g)) t.set(g, new Map())
      const owners = t.get(g)!
      owners.set(o, [...(owners.get(o) ?? []), m])
    }
    for (const m of items ?? []) {
      if (!m.usedIn.length) put(UNUSED, UNUSED, m)
      for (const u of m.usedIn) put(u.group, u.title, m)
    }
    return t
  }, [items])

  const owners = group === 'all' || group === UNUSED ? [] : [...(tree.get(group)?.keys() ?? [])].sort((a, b) => a.localeCompare(b, 'id'))
  const filterPhoto = (m: MediaItem) => !q.trim() || matches(`${m.filename} ${m.usedIn.map((u) => u.title).join(' ')}`, q)

  const sections = [...GROUPS, UNUSED]
    .filter((g) => group === 'all' || g === group)
    .map((g) => ({
      group: g,
      owners: [...(tree.get(g)?.entries() ?? [])]
        .filter(([o]) => owner === 'all' || o === owner)
        .map(([o, photos]) => ({ owner: o, photos: photos.filter(filterPhoto) }))
        .filter((o) => o.photos.length)
        .sort((a, b) => a.owner.localeCompare(b.owner, 'id')),
    }))
    .filter((s) => s.owners.length)

  const count = (g: string) => new Set([...(tree.get(g)?.values() ?? [])].flat().map((m) => m.id)).size

  return (
    <Page
      wide
      title="Media"
      description="Semua foto yang tersimpan, dikelompokkan per kategori dan per projek. Foto masuk ke sini otomatis setiap kali diunggah di projek atau artikel."
    >
      <div className="mb-6 rounded-xl bg-kumo-recessed p-1.5 ring-1 ring-kumo-hairline">
        <div className="admin-filterbar flex flex-wrap overflow-hidden rounded-lg bg-kumo-base ring-1 ring-kumo-line sm:flex-nowrap">
          <InputGroup className="min-w-0 flex-1 rounded-none border-0 shadow-none ring-0">
            <InputGroup.Addon>
              <MagnifyingGlass size={16} />
            </InputGroup.Addon>
            <InputGroup.Input placeholder="Cari nama file atau projek" aria-label="Cari foto" value={q} onChange={(e) => setQ(e.target.value)} />
          </InputGroup>
          <span className="hidden w-px bg-kumo-line sm:block" />
          <Select
            aria-label="Kategori"
            className="w-auto min-w-44 rounded-none border-0 shadow-none ring-0"
            value={group}
            onValueChange={(v) => (setGroup(String(v)), setOwner('all'))}
            items={{ all: 'Semua kategori', ...Object.fromEntries([...GROUPS, UNUSED].map((g) => [g, `${g} (${count(g)})`])) }}
          />
          {owners.length > 0 && (
            <>
              <span className="hidden w-px bg-kumo-line sm:block" />
              <Select
                aria-label={group === 'Artikel' ? 'Artikel' : 'Projek'}
                className="w-auto min-w-52 rounded-none border-0 shadow-none ring-0"
                value={owner}
                onValueChange={(v) => setOwner(String(v))}
                items={{ all: group === 'Artikel' ? 'Semua artikel' : 'Semua projek', ...Object.fromEntries(owners.map((o) => [o, o])) }}
              />
            </>
          )}
        </div>
      </div>

      {items && !sections.length ? (
        <>
          <Empty className="border-kumo-line bg-kumo-base" icon={<ImagesSquare size={44} />} title={items.length ? 'Tidak ada yang cocok' : 'Belum ada foto'} description={items.length ? 'Coba kata kunci atau filter lain.' : 'Foto muncul di sini setelah diunggah di projek atau artikel.'} />
        </>
      ) : (
        <div className="grid gap-10">
          {!items && <div className="h-40 animate-pulse rounded-xl bg-kumo-recessed" />}
          {sections.map((s) => (
            <section key={s.group}>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-kumo-subtle">{s.group}</h2>
                <span className="h-px flex-1 bg-kumo-line" />
                <span className="shrink-0 text-xs text-kumo-subtle">{count(s.group)} foto</span>
              </div>
              <div className="grid gap-6">
                {s.owners.map((o) => (
                  <div key={o.owner}>
                    {s.group !== UNUSED && (
                      <p className="mb-2.5 text-sm font-medium text-kumo-strong">
                        {o.owner} <span className="font-normal text-kumo-subtle">· {o.photos.length} foto</span>
                      </p>
                    )}
                    <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                      {o.photos.map((m) => (
                        <li key={m.id}>
                          <button onClick={() => setOpen(m)} className="group block w-full text-left">
                            <span className="relative block aspect-[4/3] overflow-hidden rounded-lg ring-1 ring-kumo-hairline transition group-hover:ring-kumo-fill">
                              <img src={mediaUrl(m, m.id, 320)} alt="" loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" style={{ backgroundColor: m.color }} />
                            </span>
                            <span className="mt-1.5 block truncate text-xs text-kumo-subtle">{m.filename}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <Details item={open} onClose={() => setOpen(null)} />
    </Page>
  )
}

function Details({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
  const toasts = useToasts()
  const { confirm, dialog } = useConfirm()
  async function remove() {
    if (!item || !(await confirm({ title: 'Hapus foto ini?', body: 'Semua ukurannya dihapus dari storage dan tidak bisa dikembalikan.', action: 'Hapus foto', danger: true }))) return
    try {
      await api(`/media/${item.id}`, { method: 'DELETE' })
      mutate('/media')
      mutate('/storage')
      toasts.add({ title: 'Foto dihapus', variant: 'success' })
      onClose()
    } catch (e) {
      toasts.add({ title: 'Tidak bisa dihapus', description: (e as ApiError).message, variant: 'error' })
    }
  }

  return (
    <Dialog.Root open={!!item} onOpenChange={(o) => !o && onClose()}>
      <Dialog size="xl" className="w-[min(960px,96vw)] max-w-none overflow-y-auto p-0">
        {item && (
          <div className="grid md:grid-cols-[1.4fr_1fr]">
            <div className="grid min-h-72 place-items-center bg-kumo-recessed">
              <img src={mediaUrl(item, item.id, 1280)} alt="" className="max-h-[70vh] w-full object-contain" style={{ backgroundColor: item.color }} />
            </div>
            <div className="grid content-start gap-5 p-6">
              <div>
                <Dialog.Title className="break-all text-base font-semibold text-kumo-strong">{item.filename}</Dialog.Title>
                <Dialog.Description className="mt-1 text-xs text-kumo-subtle">
                  {item.w}×{item.h} px · {bytes(item.bytes)}
                  <br />
                  Diunggah {dateTime(item.created_at)}
                  {item.created_by && item.created_by !== 'seed' ? ` oleh ${item.created_by}` : ''}
                </Dialog.Description>
              </div>
              <FieldShell label="Dipakai di">
                {item.usedIn.length ? (
                  <ul className="grid gap-1.5">
                    {item.usedIn.map((u) => (
                      <li key={`${u.kind}${u.title}`} className="flex items-center justify-between gap-2 rounded-md bg-kumo-recessed px-2.5 py-1.5 text-sm">
                        <span className="truncate">{u.title}</span>
                        <span className="shrink-0 text-xs text-kumo-subtle">{u.group}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-kumo-subtle">Tidak dipakai di mana pun. Akan dihapus otomatis setelah 7 hari.</span>
                )}
              </FieldShell>
              <div className="flex flex-wrap justify-between gap-2 border-t border-kumo-hairline pt-4">
                <div className="flex gap-1">
                  <a href={mediaUrl(item, item.id, 1920)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-kumo-tint">
                    <ArrowSquareOut size={15} /> Buka ukuran penuh
                  </a>
                </div>
                {!item.usedIn.length && (
                  <Button size="sm" variant="secondary-destructive" icon={Trash} onClick={() => void remove()}>
                    Hapus sekarang
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
      {dialog}
    </Dialog.Root>
  )
}
