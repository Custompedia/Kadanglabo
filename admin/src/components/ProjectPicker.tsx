import { useMemo, useState } from 'react'
import { Button, Dialog, InputGroup } from '@cloudflare/kumo'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, DotsSixVertical, MagnifyingGlass, Plus, X } from '@phosphor-icons/react'
import { matches } from '../lib/format'
import type { ListItem } from '../lib/types'
import { Thumb } from './Thumb'

/*
 * An ordered pick of projects, at most `max`: drag to reorder, X to remove, "Tambah projek" to choose from the
 * projects that can appear here (live, with a page, in the right category). Each shows its cover, which is the
 * photo the site uses for it.
 */
export function ProjectPicker({ value, onChange, options, max }: { value: string[]; onChange: (v: string[]) => void; options: ListItem[]; max: number }) {
  const [open, setOpen] = useState(false)
  const bySlug = new Map(options.map((o) => [o.slug, o]))
  // a project taken off the site since it was picked is not shown there any more: flag it here
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) onChange(arrayMove(value, value.indexOf(String(active.id)), value.indexOf(String(over.id))))
  }
  const full = value.length >= max

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={value} strategy={verticalListSortingStrategy}>
          <ol className="grid gap-2">
            {value.map((slug, i) => (
              <Row key={slug} slug={slug} n={i + 1} item={bySlug.get(slug)} onRemove={() => onChange(value.filter((s) => s !== slug))} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {value.length === 0 && <p className="rounded-lg border border-dashed border-kumo-fill px-4 py-6 text-center text-sm text-kumo-subtle">Belum ada projek dipilih. Website memakai urutan projek di daftar Projek.</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm tabular-nums text-kumo-subtle">
          {value.length} / {max} dipilih
        </span>
        <Button size="sm" icon={Plus} disabled={full} onClick={() => setOpen(true)} title={full ? `Maksimal ${max}` : undefined}>
          Tambah projek
        </Button>
      </div>
      <Choose open={open} onOpenChange={setOpen} options={options.filter((o) => !value.includes(o.slug))} room={max - value.length} onPick={(slugs) => onChange([...value, ...slugs])} />
    </div>
  )
}

function Row({ slug, n, item, onRemove }: { slug: string; n: number; item?: ListItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slug })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg bg-kumo-base px-3 py-2 ring-1 ring-kumo-line ${isDragging ? 'relative z-10 shadow-lg' : ''}`}
    >
      <button {...attributes} {...listeners} type="button" className="cursor-grab touch-none text-kumo-subtle active:cursor-grabbing" aria-label="Seret untuk mengubah urutan">
        <DotsSixVertical size={18} weight="bold" />
      </button>
      <span className="w-5 text-right text-sm tabular-nums text-kumo-subtle">{n}</span>
      <Thumb id={item?.cover} className="h-10 w-14 rounded-md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-kumo-strong">{item?.title ?? slug}</span>
        <span className="block truncate text-xs text-kumo-subtle">{item ? item.region ?? 'Lokasi belum diisi' : 'Tidak tayang lagi, jadi tidak ditampilkan'}</span>
      </span>
      <button type="button" onClick={onRemove} className="grid size-8 place-items-center rounded-md text-kumo-subtle hover:bg-kumo-tint hover:text-kumo-default" aria-label={`Keluarkan ${item?.title ?? slug}`}>
        <X size={15} weight="bold" />
      </button>
    </li>
  )
}

function Choose({ open, onOpenChange, options, room, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; options: ListItem[]; room: number; onPick: (s: string[]) => void }) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const shown = useMemo(() => options.filter((o) => !q.trim() || matches(`${o.title} ${o.region ?? ''}`, q)), [options, q])
  const toggle = (slug: string) => setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : p.length < room ? [...p, slug] : p))
  return (
    <Dialog.Root open={open} onOpenChange={(o) => (onOpenChange(o), o || (setPicked([]), setQ('')))}>
      <Dialog size="lg" className="flex max-h-[80vh] w-[min(560px,94vw)] max-w-none flex-col p-0">
        <div className="border-b border-kumo-hairline px-5 py-4">
          <Dialog.Title className="text-lg font-semibold text-kumo-strong">Tambah projek</Dialog.Title>
          <Dialog.Description className="mt-0.5 text-sm text-kumo-subtle">Hanya projek yang sudah tayang dan punya halaman. Bisa pilih {room} lagi.</Dialog.Description>
          <InputGroup className="mt-3">
            <InputGroup.Addon>
              <MagnifyingGlass size={16} />
            </InputGroup.Addon>
            <InputGroup.Input placeholder="Cari projek" aria-label="Cari projek" value={q} onChange={(e) => setQ(e.target.value)} />
          </InputGroup>
        </div>
        <ul className="min-h-0 flex-1 !shrink overflow-y-auto p-2">
          {shown.length === 0 && <li className="px-3 py-10 text-center text-sm text-kumo-subtle">Tidak ada projek lain yang bisa dipilih.</li>}
          {shown.map((o) => {
            const on = picked.includes(o.slug)
            return (
              <li key={o.slug}>
                <button type="button" onClick={() => toggle(o.slug)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${on ? 'bg-kumo-tint' : 'hover:bg-kumo-tint/60'}`}>
                  <Thumb id={o.cover} className="h-10 w-14 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-kumo-strong">{o.title}</span>
                    <span className="block truncate text-xs text-kumo-subtle">{o.region ?? '-'}</span>
                  </span>
                  <span className={`grid size-5 place-items-center rounded-full ring-1 ${on ? 'bg-kumo-brand text-white ring-kumo-brand' : 'ring-kumo-line'}`}>{on && <Check size={12} weight="bold" />}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="flex justify-end gap-2 border-t border-kumo-hairline px-5 py-3">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant="primary" disabled={!picked.length} onClick={() => (onPick(picked), onOpenChange(false), setPicked([]), setQ(''))}>
            Tambahkan {picked.length || ''}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  )
}
