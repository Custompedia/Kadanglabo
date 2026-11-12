import { useEffect, useState } from 'react'
import { useToasts } from './Toaster'
import { Button, Dialog } from '@cloudflare/kumo'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DotsSixVertical } from '@phosphor-icons/react'
import { api, ApiError } from '../lib/api'
import { mutate } from '../lib/useFetch'
import type { ListItem } from '../lib/types'
import { StateBadge } from './StateBadge'
import { Thumb } from './Thumb'

/* The order projects appear in on Our Work (and in each category): drag the rows, then save. */
export function ReorderDialog({ open, onOpenChange, items }: { open: boolean; onOpenChange: (o: boolean) => void; items: ListItem[] }) {
  const toasts = useToasts()
  const [list, setList] = useState<ListItem[]>([])
  const [saving, setSaving] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  useEffect(() => {
    if (open) setList([...items].filter((i) => !i.archive_only).sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id))
  }, [open, items])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    setList((l) => arrayMove(l, l.findIndex((i) => i.id === active.id), l.findIndex((i) => i.id === over.id)))
  }

  async function save() {
    setSaving(true)
    try {
      // projects that are only in the archive keep their place after the ones with pages
      const rest = items.filter((i) => i.archive_only).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      await api('/projects/reorder', { body: { ids: [...list, ...rest].map((i) => i.id) } })
      mutate('/projects')
      toasts.add({ title: 'Urutan disimpan', description: 'Our Work sekarang memakai urutan ini.', variant: 'success' })
      onOpenChange(false)
    } catch (e) {
      toasts.add({ title: 'Gagal menyimpan urutan', description: (e as ApiError).message, variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog size="lg" className="flex max-h-[85vh] flex-col p-0">
        <div className="border-b border-kumo-hairline px-6 py-5">
          <Dialog.Title className="text-lg font-semibold text-kumo-strong">Urutan arsip projek</Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-kumo-subtle">Seret untuk mengubah urutan di tabel arsip.</Dialog.Description>
        </div>
        <div className="min-h-0 flex-1 !shrink overflow-y-auto p-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={list.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ol className="grid gap-1.5">
                {list.map((item, n) => (
                  <Row key={item.id} item={item} n={n + 1} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex justify-end gap-2 border-t border-kumo-hairline px-6 py-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant="primary" loading={saving} onClick={() => void save()}>
            Simpan urutan
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  )
}

function Row({ item, n }: { item: ListItem; n: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-lg bg-kumo-base px-3 py-2 ring-1 ring-kumo-line ${isDragging ? 'relative z-10 shadow-lg ring-kumo-fill' : ''}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-kumo-subtle active:cursor-grabbing" aria-label={`Pindahkan ${item.title}`}>
        <DotsSixVertical size={18} weight="bold" />
      </button>
      <span className="w-6 text-right text-sm tabular-nums text-kumo-subtle">{n}</span>
      <Thumb id={item.cover} className="h-9 w-12 rounded" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-kumo-strong">{item.title}</span>
      <StateBadge state={item.state} dirty={!!item.dirty} />
    </li>
  )
}
