import type { ReactNode } from 'react'
import type { Block, Doc, Inline, List, Paragraph, RichTx } from '../../shared/content'
import { Img } from './Img'
import { getLang, t, type Tx } from '../lib/i18n'
import { TLink } from '../lib/transition'

/*
 * Copy that may be formatted. The bundled data has plain strings ({ en, id }); the CMS sends documents with bold,
 * italic, links and lists. Either way it renders as the same paragraphs, with the same classes and animation
 * attributes on each one, so a plain text looks exactly as it always did.
 */

export const isRich = (v: Tx | RichTx): v is RichTx => typeof (v as RichTx).en === 'object'

/** The words alone (search, meta tags). */
export function plainText(v: Tx | RichTx): string {
  if (!isRich(v)) return t(v)
  const walk = (n: { type: string; text?: string; content?: unknown[] }): string =>
    n.type === 'text' ? (n.text ?? '') : (n.content ?? []).map((c) => walk(c as never)).join(' ')
  return walk(v[getLang()] as never).trim()
}

function inline(nodes: Inline[] | undefined): ReactNode[] {
  return (nodes ?? []).map((n, i) => {
    if (n.type === 'hardBreak') return <br key={i} />
    let out: ReactNode = n.text
    for (const m of n.marks ?? []) {
      if (m.type === 'bold') out = <strong>{out}</strong>
      else if (m.type === 'italic') out = <em>{out}</em>
      else if (m.type === 'link')
        out = m.attrs.href.startsWith('/') ? (
          <TLink to={m.attrs.href}>{out}</TLink>
        ) : (
          <a href={m.attrs.href} target="_blank" rel="noopener noreferrer">
            {out}
          </a>
        )
    }
    return <span key={i}>{out}</span>
  })
}

type Attrs = { [k: `data-${string}`]: string | boolean | undefined }

function blocks(doc: Doc, className: string | undefined, attrs: Attrs): ReactNode[] {
  const content = [...doc.content]
  // the editor leaves an empty paragraph at the end; it is not part of the copy
  while (content.length && content[content.length - 1].type === 'paragraph' && !(content[content.length - 1] as Paragraph).content?.length) content.pop()
  // a list is not split into words or lines like a paragraph; it fades in as a whole
  const listAttrs: Attrs = Object.keys(attrs).length ? { 'data-fade': '' } : {}
  const list = (l: List, key: number): ReactNode => {
    const Tag = l.type === 'orderedList' ? 'ol' : 'ul'
    return (
      <Tag key={key} className={`rich-list rich-list--${Tag}${className ? ` ${className}` : ''}`} {...listAttrs}>
        {l.content.map((li, i) => (
          <li key={i}>{li.content.map((c, j) => (c.type === 'paragraph' ? <span key={j} className="rich-list__p">{inline(c.content)}</span> : list(c, j)))}</li>
        ))}
      </Tag>
    )
  }
  const block = (b: Block, i: number): ReactNode => {
    switch (b.type) {
      case 'paragraph':
        return (
          <p key={i} className={className} {...attrs}>
            {inline(b.content)}
          </p>
        )
      case 'heading': {
        const H = b.attrs.level === 3 ? 'h3' : 'h2'
        return (
          <H key={i} className={`rich-h rich-h--${b.attrs.level}`}>
            {inline(b.content)}
          </H>
        )
      }
      case 'blockquote':
        return (
          <blockquote key={i} className="rich-quote">
            {b.content.map((p, j) => (
              <p key={j}>{inline(p.content)}</p>
            ))}
          </blockquote>
        )
      case 'image':
        return (
          <figure key={i} className="rich-figure">
            <Img id={b.attrs.id} alt={b.attrs.caption} sizes="(min-width: 1024px) 760px, 100vw" />
            {b.attrs.caption && <figcaption>{b.attrs.caption}</figcaption>}
          </figure>
        )
      default:
        return list(b, i)
    }
  }
  return content.map(block)
}

/**
 * <RichText value={p.summary} className="t-lead" data-split />  — one <p> per paragraph (lists as <ul>/<ol>).
 * `wrap` puts them in one <div> with that class, where the layout expects a single element (grids).
 */
export function RichText({ value, className, wrap, ...attrs }: { value: Tx | RichTx; className?: string; wrap?: string } & Attrs) {
  const inner = isRich(value) ? (
    blocks(value[getLang()], className, attrs)
  ) : (
    <p className={className} {...attrs}>
      {t(value)}
    </p>
  )
  return wrap ? <div className={wrap}>{inner}</div> : <>{inner}</>
}
