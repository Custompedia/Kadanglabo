import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { BlockControls } from './ArticleCardNode'
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
    return { id: { default: '' }, caption: { default: '' }, alt: { default: '' }, layout: { default: 'normal' } }
  },
  parseHTML() {
    return [{ tag: 'figure[data-photo]', getAttrs: (el) => ({ id: (el as HTMLElement).dataset.id ?? '', caption: (el as HTMLElement).dataset.caption ?? (el as HTMLElement).textContent ?? '', alt: (el as HTMLElement).dataset.alt ?? '', layout: (el as HTMLElement).dataset.layout ?? 'normal' }) }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes({ 'data-photo': '', 'data-id': HTMLAttributes.id, 'data-caption': HTMLAttributes.caption, 'data-alt': HTMLAttributes.alt, 'data-layout': HTMLAttributes.layout }), HTMLAttributes.caption ?? '']
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

function PhotoView(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props
  const { map } = useMediaMap()
  const id = node.attrs.id as string
  const m = map.get(id)
  return (
    <NodeViewWrapper as="figure" className={`article-photo article-photo--${node.attrs.layout} group relative my-5 ${selected ? 'rounded-xl ring-2 ring-kumo-brand ring-offset-2' : ''}`} contentEditable={false}>
      <img src={mediaUrl(m, id, 1280)} alt={node.attrs.alt as string} draggable={false} className="block h-auto w-full rounded-xl" style={{ backgroundColor: m?.color ?? '#eee', aspectRatio: m ? `${m.w} / ${m.h}` : '16 / 10' }} />
      <BlockControls {...props} />
      <div className="article-photo-widths" role="group" aria-label="Lebar gambar">
        {(['normal', 'wide', 'full'] as const).map((layout, i) => <button type="button" key={layout} aria-pressed={node.attrs.layout === layout} onClick={() => updateAttributes({ layout })}>{['Normal', 'Lebar', 'Penuh'][i]}</button>)}
      </div>
      <input aria-label="Teks alternatif gambar" value={node.attrs.alt as string} placeholder="Teks alternatif: jelaskan isi gambar" onChange={e => updateAttributes({ alt: e.target.value })} className="article-photo-alt" />
      <input
        aria-label="Keterangan gambar"
        value={node.attrs.caption as string}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        placeholder="Tulis keterangan foto (opsional)"
        className="mt-2 w-full bg-transparent text-center text-[13px] text-kumo-subtle outline-none placeholder:text-kumo-placeholder"
      />
    </NodeViewWrapper>
  )
}
