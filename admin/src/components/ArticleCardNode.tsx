import { Fragment } from '@tiptap/pm/model'
import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { ArrowUp, ArrowDown, Trash, DotsSixVertical } from '@phosphor-icons/react'
import { cleanArticleCard, newArticleCard, videoEmbed, type ArticleCard } from '../../../shared/article-blocks'

/** Move atom blocks without serializing or replacing the rest of the article. */
export function BlockControls({ editor, getPos, node, deleteNode }: NodeViewProps) {
  const destinations = () => {
    const pos = getPos()
    if (typeof pos !== 'number') return null
    const $pos = editor.state.doc.resolve(pos)
    const parent = $pos.parent, index = $pos.index()
    const before = index > 0 ? parent.child(index - 1) : null
    const after = index + 1 < parent.childCount ? parent.child(index + 1) : null
    return {
      pos,
      up: before && parent.canReplace(index - 1, index + 1, Fragment.fromArray([node, before])) ? pos - before.nodeSize : null,
      down: after && parent.canReplace(index, index + 2, Fragment.fromArray([after, node])) ? pos + after.nodeSize : null,
    }
  }
  const targets = destinations()
  const move = (direction: -1 | 1) => {
    const current = destinations()
    const target = direction < 0 ? current?.up : current?.down
    if (!current || target == null) return
    const tr = editor.state.tr.delete(current.pos, current.pos + node.nodeSize).insert(target, node)
    editor.view.dispatch(tr)
    editor.commands.setNodeSelection(target)
  }
  return <div className="article-block-controls" role="group" aria-label="Kontrol blok">
    <span data-drag-handle title="Seret untuk memindah"><DotsSixVertical size={16} /></span>
    <button type="button" title="Pindah ke atas" aria-label="Pindah ke atas" disabled={targets?.up == null} onClick={() => move(-1)}><ArrowUp size={16} /></button>
    <button type="button" title="Pindah ke bawah" aria-label="Pindah ke bawah" disabled={targets?.down == null} onClick={() => move(1)}><ArrowDown size={16} /></button>
    <button type="button" title="Hapus blok" aria-label="Hapus blok" onClick={deleteNode}><Trash size={16} /></button>
  </div>
}

export const ArticleCardExtension = Node.create({
  name: 'articleCard', group: 'block', atom: true, draggable: true,
  addAttributes() { return { data: { default: newArticleCard('callout') } } },
  parseHTML() { return [{ tag: 'div[data-article-card]', getAttrs: el => { try { const data = cleanArticleCard(JSON.parse((el as HTMLElement).dataset.articleCard ?? '')); return data ? { data } : false } catch { return false } } }] },
  renderHTML({ node, HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-article-card': JSON.stringify(node.attrs.data) })] },
  addNodeView() { return ReactNodeViewRenderer(CardView) },
})

function CardView(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props
  const data = node.attrs.data as ArticleCard
  const change = (next: ArticleCard) => updateAttributes({ data: next })
  const input = (label: string, value: string, set: (value: string) => void) => <input aria-label={label} placeholder={label} value={value} onChange={e => set(e.target.value)} />
  return <NodeViewWrapper className={`article-card article-card--${data.kind}${selected ? ' is-selected' : ''}`} contentEditable={false}>
    <BlockControls {...props} />
    {data.kind === 'callout' && <aside className={`article-callout article-callout--${data.tone}`}>
      <select aria-label="Jenis sorotan" value={data.tone} onChange={e => change({ ...data, tone: e.target.value as typeof data.tone })}><option value="note">Catatan</option><option value="tip">Tips</option><option value="warning">Peringatan</option></select>
      <textarea aria-label="Isi sorotan" placeholder="Tulis sorotan…" value={data.text} onChange={e => change({ ...data, text: e.target.value })} />
    </aside>}
    {data.kind === 'cta' && <div className="article-cta-fields">
      {input('Teks tombol', data.label, label => change({ ...data, label }))}
      {input('Tautan tombol', data.href, href => change({ ...data, href }))}
    </div>}
    {data.kind === 'embed' && <figure>
      {input('Tautan video atau halaman', data.url, url => change({ ...data, url }))}
      {videoEmbed(data.url) && <iframe title="Pratinjau video" src={videoEmbed(data.url)!} loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen />}
      {input('Keterangan embed', data.caption, caption => change({ ...data, caption }))}
    </figure>}
    {data.kind === 'table' && <>
      <div className="article-table-scroll"><table><thead><tr>{data.header.map((h, c) => <th key={c}>{input(`Judul kolom ${c + 1}`, h, value => change({ ...data, header: data.header.map((x, i) => i === c ? value : x) }))}</th>)}</tr></thead>
        <tbody>{data.rows.map((row, r) => <tr key={r}>{data.header.map((_, c) => <td key={c}>{input(`Baris ${r + 1} kolom ${c + 1}`, row[c] ?? '', value => change({ ...data, rows: data.rows.map((x, i) => i === r ? data.header.map((_, j) => j === c ? value : x[j] ?? '') : x) }))}</td>)}</tr>)}</tbody></table></div>
      <div className="article-table-tools">
        <button type="button" disabled={data.rows.length >= 100} onClick={() => change({ ...data, rows: [...data.rows, data.header.map(() => '')] })}>+ Baris</button>
        <button type="button" disabled={data.header.length >= 12} onClick={() => change({ ...data, header: [...data.header, ''], rows: data.rows.map(row => [...row, '']) })}>+ Kolom</button>
        <button type="button" disabled={data.rows.length <= 1} onClick={() => change({ ...data, rows: data.rows.slice(0, -1) })}>− Baris</button>
        <button type="button" disabled={data.header.length <= 1} onClick={() => change({ ...data, header: data.header.slice(0, -1), rows: data.rows.map(row => row.slice(0, -1)) })}>− Kolom</button>
      </div>
      {input('Keterangan tabel', data.caption, caption => change({ ...data, caption }))}
    </>}
  </NodeViewWrapper>
}
