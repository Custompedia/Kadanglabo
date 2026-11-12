import { useState } from 'react'
import { Button, DropdownMenu } from '@cloudflare/kumo'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, CloudArrowUp, Columns, DotsSixVertical, Image, ImagesSquare, Plus, Quotes, SquareHalf, TextAa, Trash } from '@phosphor-icons/react'
import { emptyDoc, type GalleryBlock as Block, type Tx } from '../../../shared/content'
import { ImageSlot } from './ImageSlot'
import { useMediaMap } from './Thumb'
import { MediaPicker } from './MediaPicker'
import { RichField, TxField } from './Fields'
import { DropArea, JobList, useUploads } from './Upload'

/*
 * The photo story at the bottom of a project page, block by block, as the site lays it out
 * (src/pages/ProjectDetail.tsx): a full-width photo, a pair side by side, an offset photo with a caption, a text
 * block, a quote. Drag the handle to reorder; drop several files on the area to add them as photo blocks.
 */

const kinds = {
  full: { label: 'Foto penuh', icon: Image, hint: 'Satu foto selebar layar' },
  pair: { label: 'Dua foto', icon: Columns, hint: 'Dua foto berdampingan' },
  offset: { label: 'Foto + keterangan', icon: SquareHalf, hint: 'Satu foto dengan keterangan pendek' },
  text: { label: 'Teks', icon: TextAa, hint: 'Label kecil dan satu paragraf' },
  quote: { label: 'Kutipan besar', icon: Quotes, hint: 'Satu kalimat besar di tengah' },
} as const

const emptyTx = (): Tx => ({ en: '', id: '' })
export function newBlock(t: Block['t']): Block {
  if (t === 'full') return { t, img: '' }
  if (t === 'pair') return { t, imgs: ['', ''] }
  if (t === 'offset') return { t, img: '', side: 'right' }
  if (t === 'text') return { t, label: emptyTx(), body: { en: emptyDoc(), id: emptyDoc() } }
  return { t, text: emptyTx() }
}

/** Photos added in bulk become blocks: pairs, and a full-width one for an odd last photo. */
function photosToBlocks(ids: string[]): Block[] {
  const out: Block[] = []
  for (let i = 0; i < ids.length; i += 2) out.push(ids[i + 1] ? { t: 'pair', imgs: [ids[i], ids[i + 1]] } : { t: 'full', img: ids[i] })
  return out
}

type Keyed = Block & { _k: string }
let seq = 0
const key = () => `b${++seq}`

export function GalleryBuilder({ value, onChange }: { value: Block[]; onChange: (b: Block[]) => void }) {
  // stable keys for drag-and-drop, kept beside the blocks (not saved)
  const [keys, setKeys] = useState<string[]>(() => value.map(key))
  if (keys.length !== value.length) setKeys((k) => (value.length > k.length ? [...k, ...value.slice(k.length).map(key)] : k.slice(0, value.length)))
  const items: Keyed[] = value.map((b, i) => ({ ...b, _k: keys[i] ?? `x${i}` }))

  const [picker, setPicker] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const set = (next: Keyed[]) => {
    setKeys(next.map((b) => b._k))
    onChange(next.map(({ _k, ...b }) => b as Block))
  }
  const add = (blocks: Block[]) => set([...items, ...blocks.map((b) => ({ ...b, _k: key() }))])
  const uploaded: string[] = []
  const { jobs, add: upload } = useUploads((u) => uploaded.push(u.id))

  async function dropFiles(files: File[]) {
    uploaded.length = 0
    await upload(files)
    if (uploaded.length) add(photosToBlocks([...uploaded]))
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    set(arrayMove(items, items.findIndex((b) => b._k === active.id), items.findIndex((b) => b._k === over.id)))
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((b) => b._k)} strategy={verticalListSortingStrategy}>
          <ol className="grid gap-3">
            {items.map((b, i) => (
              <BlockCard
                key={b._k}
                block={b}
                n={i}
                count={items.length}
                onChange={(nb) => set(items.map((x, j) => (j === i ? { ...nb, _k: x._k } : x)))}
                onRemove={() => set(items.filter((_, j) => j !== i))}
                onMove={(d) => set(arrayMove(items, i, i + d))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <DropArea onFiles={(f) => void dropFiles(f)} className="mt-3">
        {(active, pick) => (
          <div className={`rounded-xl border border-dashed p-4 transition ${active ? 'border-kumo-brand bg-kumo-info-tint' : 'border-kumo-fill'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm text-kumo-subtle">
                <CloudArrowUp size={18} />
                {active ? 'Lepaskan: foto jadi blok otomatis (berpasangan)' : 'Seret beberapa foto ke sini untuk menambah blok foto sekaligus'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={ImagesSquare} onClick={() => setPicker(true)}>
                  Pilih foto
                </Button>
                <Button size="sm" icon={CloudArrowUp} onClick={pick}>
                  Unggah
                </Button>
                <DropdownMenu>
                  <DropdownMenu.Trigger render={<Button size="sm" variant="primary" icon={Plus}>Tambah blok</Button>} />
                  <DropdownMenu.Content align="end" className="min-w-60">
                    {(Object.keys(kinds) as Block['t'][]).map((t) => {
                      const K = kinds[t]
                      return (
                        <DropdownMenu.Item key={t} icon={K.icon} onClick={() => add([newBlock(t)])}>
                          <span className="block">{K.label}</span>
                          <span className="block text-xs text-kumo-subtle">{K.hint}</span>
                        </DropdownMenu.Item>
                      )
                    })}
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </div>
            <JobList jobs={jobs} />
          </div>
        )}
      </DropArea>
      <MediaPicker multiple open={picker} onOpenChange={setPicker} onPick={(ids) => add(photosToBlocks(ids))} />
    </div>
  )
}

function BlockCard({ block, n, count, onChange, onRemove, onMove }: { block: Keyed; n: number; count: number; onChange: (b: Block) => void; onRemove: () => void; onMove: (d: -1 | 1) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block._k })
  const K = kinds[block.t]
  const { map } = useMediaMap()
  // like the website: two landscape photos sit at 4:3, anything else at 4:5
  const pairAspect =
    block.t === 'pair' && block.imgs.every((id) => { const m = map.get(id); return m && m.w > m.h }) ? 'aspect-[4/3]' : 'aspect-[4/5]'
  const caption =
    block.t === 'offset' ? (
      <TxField label="Keterangan" value={block.caption ?? emptyTx()} onChange={(caption) => onChange({ ...block, caption })} placeholder={{ en: 'Short caption', id: 'Keterangan singkat' }} />
    ) : null

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl bg-kumo-base ring-1 ring-kumo-line ${isDragging ? 'relative z-10 shadow-xl ring-kumo-fill' : ''}`}
    >
      <div className="flex items-center gap-2 border-b border-kumo-hairline px-3 py-2">
        <button {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 text-kumo-subtle hover:bg-kumo-tint active:cursor-grabbing" aria-label="Seret untuk memindahkan">
          <DotsSixVertical size={18} weight="bold" />
        </button>
        <K.icon size={16} className="text-kumo-subtle" />
        <span className="text-sm font-medium text-kumo-default">
          {n + 1}. {K.label}
        </span>
        <span className="hidden text-xs text-kumo-subtle sm:inline">· {K.hint}</span>
        <span className="flex-1" />
        <Button title="Naik" size="xs" variant="ghost" shape="square" aria-label="Naik" disabled={n === 0} icon={<ArrowUp size={14} />} onClick={() => onMove(-1)} />
        <Button title="Turun" size="xs" variant="ghost" shape="square" aria-label="Turun" disabled={n === count - 1} icon={<ArrowDown size={14} />} onClick={() => onMove(1)} />
        <Button title="Hapus blok" size="xs" variant="ghost" shape="square" aria-label="Hapus blok" icon={<Trash size={14} />} onClick={onRemove} />
      </div>
      <div className="grid gap-4 p-4">
        {/* each block is drawn with the same proportions and placement as on the website */}
        {block.t === 'full' && <ImageSlot value={block.img} onChange={(img) => onChange({ ...block, img })} aspect="aspect-video" />}
        {block.t === 'pair' && (
          <div className="grid grid-cols-2 gap-3">
            <ImageSlot value={block.imgs[0]} onChange={(img) => onChange({ ...block, imgs: [img, block.imgs[1]] })} aspect={pairAspect} />
            <ImageSlot value={block.imgs[1]} onChange={(img) => onChange({ ...block, imgs: [block.imgs[0], img] })} aspect={pairAspect} />
          </div>
        )}
        {block.t === 'offset' && (
          <div className="grid gap-3">
            {/* in the middle, two thirds wide, as on the website */}
            <ImageSlot value={block.img} onChange={(img) => onChange({ ...block, img })} className="mx-auto w-2/3" natural />
          </div>
        )}
        {block.t === 'text' && (
          <div className="grid items-start gap-4 sm:grid-cols-[minmax(160px,1fr)_2.2fr]">
            <TxField label="Label" value={block.label} onChange={(label) => onChange({ ...block, label })} placeholder={{ en: 'e.g. Landscape', id: 'mis. Lanskap' }} />
            <RichField label="Paragraf" value={block.body} onChange={(body) => onChange({ ...block, body })} />
          </div>
        )}
        {block.t === 'quote' && (
          <>
            <TxField label="Kutipan" multiline value={block.text} onChange={(text) => onChange({ ...block, text })} />
          </>
        )}
        {caption}
      </div>
    </li>
  )
}
