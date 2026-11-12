import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Button, Dialog, InputGroup } from '@cloudflare/kumo'
import { Check, MagnifyingGlass, Sparkle } from '@phosphor-icons/react'
import { useMediaMap, mediaUrl } from './Thumb'
import { matches } from '../lib/format'
import type { MediaItem } from '../lib/types'

/*
 * Choose photos already in storage (new photos are uploaded by dropping them on the photo slot itself).
 * `suggest` puts the photos that fit first: the project being edited, then its category (or the articles); every
 * other photo follows, grouped the same way as the Media page. `multiple` picks several, in click order.
 */

export type Suggest = { group?: string; owner?: string }
/** Set by an editor (or a settings tab) so every photo picker inside it knows which photos to suggest. */
export const SuggestContext = createContext<Suggest | undefined>(undefined)
const GROUPS = ['Commercial', 'Hospitality', 'Residential', 'Artikel']

export function MediaPicker({
  open,
  onOpenChange,
  onPick,
  multiple,
  initial = [],
  suggest,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onPick: (ids: string[]) => void
  multiple?: boolean
  initial?: string[]
  suggest?: Suggest
}) {
  const fromContext = useContext(SuggestContext)
  suggest = suggest ?? fromContext
  const { items } = useMediaMap()
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('all')
  const [picked, setPicked] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      setPicked(multiple ? initial : [])
      setQ('')
      setGroup('all')
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // sections: the suggested owners first, then the rest by group; a photo appears once, in its first section
  const sections = useMemo(() => {
    const list = (items ?? []).filter(
      (m) =>
        (!q.trim() || matches(`${m.filename} ${m.usedIn.map((u) => u.title).join(' ')}`, q)) &&
        (group === 'all' || (group === 'none' ? !m.usedIn.length : m.usedIn.some((u) => u.group === group))),
    )
    const seen = new Set<string>()
    const out: { key: string; label: string; suggested?: boolean; photos: MediaItem[] }[] = []
    const byOwner = (pred: (m: MediaItem) => string | undefined, suggested: boolean) => {
      const owners = new Map<string, MediaItem[]>()
      for (const m of list) {
        if (seen.has(m.id)) continue
        const owner = pred(m)
        if (owner) owners.set(owner, [...(owners.get(owner) ?? []), m])
      }
      for (const [owner, photos] of [...owners].sort((a, b) => a[0].localeCompare(b[0], 'id'))) {
        photos.forEach((m) => seen.add(m.id))
        out.push({ key: `${suggested ? 's' : 'o'}-${owner}`, label: owner, suggested, photos })
      }
    }
    if (suggest?.owner) byOwner((m) => (m.usedIn.some((u) => u.title === suggest.owner) ? suggest.owner : undefined), true)
    if (suggest?.group) byOwner((m) => m.usedIn.find((u) => u.group === suggest.group)?.title, true)
    for (const g of GROUPS) if (g !== suggest?.group) byOwner((m) => m.usedIn.find((u) => u.group === g)?.title, false)
    const rest = list.filter((m) => !seen.has(m.id))
    if (rest.length) out.push({ key: 'none', label: 'Belum dipakai', photos: rest })
    return out
  }, [items, q, group, suggest])

  const toggle = (id: string) => setPicked((p) => (multiple ? (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]) : [id]))
  const firstOther = sections.findIndex((s) => !s.suggested)
  const hasSuggested = sections.some((s) => s.suggested)

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="xl" className="flex max-h-[88vh] w-[min(1040px,96vw)] max-w-none flex-col overflow-hidden p-0">
        <div className="shrink-0 border-b border-kumo-hairline px-6 pb-4 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold text-kumo-strong">Pilih foto</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm text-kumo-subtle">
                {multiple ? 'Klik beberapa foto; urutannya mengikuti urutan klik.' : 'Klik satu foto, lalu Pakai foto ini.'}
              </Dialog.Description>
            </div>
            <InputGroup className="w-full sm:w-72">
              <InputGroup.Addon>
                <MagnifyingGlass size={16} />
              </InputGroup.Addon>
              <InputGroup.Input placeholder="Cari nama file atau projek" aria-label="Cari foto" value={q} onChange={(e) => setQ(e.target.value)} />
            </InputGroup>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Kategori">
            {[['all', 'Semua'], ...GROUPS.map((g) => [g, g]), ['none', 'Belum dipakai']].map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={group === k}
                onClick={() => setGroup(k)}
                className={`rounded-full px-3 py-1 text-sm ring-1 transition ${group === k ? 'bg-kumo-contrast text-kumo-inverse ring-transparent' : 'text-kumo-default ring-kumo-line hover:bg-kumo-tint'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 !shrink overflow-y-auto px-6 py-5">
          <div className="grid gap-7">
            {sections.map((s, i) => (
              <section key={s.key}>
                {s.suggested && i === 0 && (
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-kumo-brand">
                    <Sparkle size={14} weight="fill" /> Disarankan{suggest?.group ? ` · ${suggest.group}` : ''}
                  </p>
                )}
                {hasSuggested && i === firstOther && (
                  <div className="mb-5 flex items-center gap-3">
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.08em] text-kumo-subtle">Foto lainnya</span>
                    <span className="h-px flex-1 bg-kumo-line" />
                  </div>
                )}
                <p className="mb-2.5 text-sm font-medium text-kumo-strong">
                  {s.label} <span className="font-normal text-kumo-subtle">· {s.photos.length} foto</span>
                </p>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {s.photos.map((m) => {
                    const n = picked.indexOf(m.id)
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => toggle(m.id)}
                          onDoubleClick={() => !multiple && (onPick([m.id]), onOpenChange(false))}
                          className={`relative block aspect-[4/3] w-full overflow-hidden rounded-lg ring-2 transition ${n >= 0 ? 'ring-kumo-brand' : 'ring-transparent hover:ring-kumo-fill'}`}
                          title={m.filename}
                        >
                          <img src={mediaUrl(m, m.id, 320)} alt="" loading="lazy" className="h-full w-full object-cover" style={{ backgroundColor: m.color }} />
                          {n >= 0 && (
                            <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-kumo-brand text-xs font-semibold text-white shadow">
                              {multiple ? n + 1 : <Check size={14} weight="bold" />}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
            {items && !sections.length && <p className="py-12 text-center text-sm text-kumo-subtle">Tidak ada foto yang cocok.</p>}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-kumo-hairline px-6 py-4">
          <span className="text-sm text-kumo-subtle">{picked.length ? `${picked.length} foto dipilih` : 'Belum ada yang dipilih'}</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button variant="primary" disabled={!picked.length} onClick={() => (onPick(picked), onOpenChange(false))}>
              {multiple ? 'Pakai foto' : 'Pakai foto ini'}
            </Button>
          </div>
        </div>
      </Dialog>
    </Dialog.Root>
  )
}
