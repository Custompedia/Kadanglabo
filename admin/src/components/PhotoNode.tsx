import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { DotsSixVertical, Trash } from '@phosphor-icons/react'
import { mediaUrl, useMediaMap } from './Thumb'

/*
 * A photo inside an article: { type: 'image', attrs: { id, caption } }, the id of a photo in Media. In the editor it
 * shows the photo with its caption typed right under it; it can be dragged by its handle or removed.
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    photo: { insertPhoto: (attrs: { id: string; caption?: string }) => ReturnType }
  }
}

export const Photo = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { id: { default: '' }, caption: { default: '' } }
  },
  parseHTML() {
    return [{ tag: 'figure[data-photo]', getAttrs: (el) => ({ id: (el as HTMLElement).dataset.id ?? '', caption: (el as HTMLElement).textContent ?? '' }) }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes({ 'data-photo': '', 'data-id': HTMLAttributes.id }), HTMLAttributes.caption ?? '']
  },
  addCommands() {
    return {
      insertPhoto:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent([{ type: this.name, attrs: { caption: '', ...attrs } }, { type: 'paragraph' }]),
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(PhotoView)
  },
})

function PhotoView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { map } = useMediaMap()
  const id = node.attrs.id as string
  const m = map.get(id)
  return (
    <NodeViewWrapper as="figure" className={`group relative my-5 ${selected ? 'rounded-xl ring-2 ring-kumo-brand ring-offset-2' : ''}`} contentEditable={false}>
      <img src={mediaUrl(m, id, 1280)} alt="" draggable={false} className="block h-auto w-full rounded-xl" style={{ backgroundColor: m?.color ?? '#eee', aspectRatio: m ? `${m.w} / ${m.h}` : '16 / 10' }} />
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <span data-drag-handle className="grid size-8 cursor-grab place-items-center rounded-md bg-white/90 text-kumo-default shadow" title="Seret untuk memindah">
          <DotsSixVertical size={16} weight="bold" />
        </span>
        <button type="button" onClick={deleteNode} className="grid size-8 place-items-center rounded-md bg-white/90 text-kumo-default shadow hover:text-kumo-danger" title="Hapus foto">
          <Trash size={15} />
        </button>
      </div>
      <input
        value={node.attrs.caption as string}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        placeholder="Tulis keterangan foto (opsional)"
        className="mt-2 w-full bg-transparent text-center text-[13px] text-kumo-subtle outline-none placeholder:text-kumo-placeholder"
      />
    </NodeViewWrapper>
  )
}
