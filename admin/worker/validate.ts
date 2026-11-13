import { cleanArticleCard } from '../../shared/article-blocks'
import { z } from 'zod'
import type { Block, Doc, Inline, ListItem, Mark } from '../../shared/content'

/*
 * What the API accepts. Rich text is not validated but rebuilt: only the nodes and marks the editor offers survive,
 * links only to http(s), mailto, tel or a path on the site. Whatever else a client sends is dropped.
 */

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i

function cleanMarks(marks: unknown): Mark[] | undefined {
  if (!Array.isArray(marks)) return undefined
  const out: Mark[] = []
  for (const m of marks) {
    if (m?.type === 'bold' || m?.type === 'italic') out.push({ type: m.type })
    else if (m?.type === 'link' && typeof m.attrs?.href === 'string' && SAFE_HREF.test(m.attrs.href.trim()))
      out.push({ type: 'link', attrs: { href: m.attrs.href.trim().slice(0, 500) } })
  }
  return out.length ? out : undefined
}
function cleanInline(nodes: unknown): Inline[] | undefined {
  if (!Array.isArray(nodes)) return undefined
  const out: Inline[] = []
  for (const n of nodes) {
    if (n?.type === 'hardBreak') out.push({ type: 'hardBreak' })
    else if (n?.type === 'text' && typeof n.text === 'string' && n.text) {
      const marks = cleanMarks(n.marks)
      out.push(marks ? { type: 'text', text: n.text.slice(0, 20000), marks } : { type: 'text', text: n.text.slice(0, 20000) })
    }
  }
  return out.length ? out : undefined
}
function cleanBlocks(nodes: unknown, depth = 0): Block[] {
  if (!Array.isArray(nodes) || depth > 24) return []
  const out: Block[] = []
  for (const n of nodes) {
    if (n?.type === 'paragraph') {
      const content = cleanInline(n.content)
      out.push(content ? { type: 'paragraph', content } : { type: 'paragraph' })
    } else if ((n?.type === 'bulletList' || n?.type === 'orderedList') && Array.isArray(n.content)) {
      const items: ListItem[] = n.content
        .filter((li: { type?: string }) => li?.type === 'listItem')
        .map((li: { content?: unknown }) => ({
          type: 'listItem' as const,
          content: cleanBlocks(li.content, depth + 1),
        }))
        .filter((li: ListItem) => li.content.length)
      if (items.length) {
        // Tiptap list items require a leading paragraph, including when a block was pasted.
        for (const item of items) if (item.content[0]?.type !== 'paragraph') item.content.unshift({ type: 'paragraph' })
        const start = n.type === 'orderedList' && Number.isSafeInteger(n.attrs?.start) && n.attrs.start >= 1 ? n.attrs.start : undefined
        out.push({ type: n.type, ...(start !== undefined ? { attrs: { start } } : {}), content: items })
      }
    } else if (n?.type === 'heading') {
      const content = cleanInline(n.content)
      if (content) out.push({ type: 'heading', attrs: { level: n.attrs?.level === 3 ? 3 : 2 }, content })
    } else if (n?.type === 'blockquote') {
      const content = cleanBlocks(n.content, depth + 1)
      if (content.length) out.push({ type: 'blockquote', content })
    } else if (n?.type === 'image' && typeof n.attrs?.id === 'string' && /^[a-z0-9-]{1,80}$/.test(n.attrs.id)) {
      out.push({ type: 'image', attrs: { id: n.attrs.id, caption: String(n.attrs.caption ?? '').slice(0, 300), alt: String(n.attrs.alt ?? '').slice(0, 500), layout: n.attrs.layout === 'wide' || n.attrs.layout === 'full' ? n.attrs.layout : 'normal' } })
    } else if (n?.type === 'horizontalRule') {
      out.push({ type: 'horizontalRule' })
    } else if (n?.type === 'codeBlock') {
      const content = cleanInline(n.content)?.map(x => x.type === 'text' ? { type: 'text' as const, text: x.text } : x)
      out.push({ type: 'codeBlock', ...(content ? { content } : {}) })
    } else if (n?.type === 'articleCard') {
      const data = cleanArticleCard(n.attrs?.data)
      if (data) out.push({ type: 'articleCard', attrs: { data } })
    }
  }
  return out
}
export function cleanDoc(doc: unknown): Doc {
  const content = cleanBlocks((doc as { content?: unknown })?.content)
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

const doc = z.unknown().transform(cleanDoc)
const tx = z.object({ en: z.string().max(2000), id: z.string().max(2000) })
const rich = z.object({ en: doc, id: doc })
const mediaId = z.string().regex(/^[a-z0-9-]{1,80}$/)
const imgRef = z.union([mediaId, z.literal('')])
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug: huruf kecil, angka dan tanda hubung').max(100)

const block = z.discriminatedUnion('t', [
  z.object({ t: z.literal('full'), img: imgRef, caption: tx.optional() }),
  z.object({ t: z.literal('pair'), imgs: z.tuple([imgRef, imgRef]), caption: tx.optional() }),
  z.object({ t: z.literal('offset'), img: imgRef, side: z.enum(['left', 'right']).optional(), caption: tx.optional() }),
  z.object({ t: z.literal('text'), label: tx, body: rich }),
  z.object({ t: z.literal('quote'), text: tx, cite: tx.optional() }),
])

export const projectSchema = z.object({
  slug,
  title: z.string().trim().min(1, 'Judul wajib diisi').max(200),
  category: z.enum(['commercial', 'hospitality', 'residential']),
  archiveOnly: z.boolean(),
  typology: tx,
  location: z.string().max(300).nullable(),
  region: z.string().max(120).nullable(),
  year: z.number().int().min(1900).max(2200).nullable(),
  status: z.enum(['built', 'construction', 'design']).nullable(),
  scope: z.array(tx).max(12),
  landArea: z.string().max(40).optional(),
  buildingArea: z.string().max(40).optional(),
  delivery: tx.optional(),
  client: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  tagline: tx,
  summary: rich,
  story: z.array(z.object({ key: z.enum(['context', 'challenge', 'concept', 'development', 'outcome']), text: rich, img: imgRef })).max(5),
  hero: imgRef,
  cover: imgRef,
  gallery: z.array(block).max(80),
})

export const articleSchema = z.object({
  slug,
  type: z.enum(['news', 'event']).default('news'), // kept for old records; the site no longer shows it
  tag: tx,
  title: tx,
  date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')]).default(''), // set by the server (the day it goes live)
  excerpt: tx,
  cover: imgRef,
  coverCaption: tx.optional(),
  body: rich,
  project: z.string().max(100).optional(),
})

export const username = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, 'Username 3-32 karakter: huruf, angka, titik, garis bawah atau tanda hubung')
export const password = z.string().min(5, 'Password minimal 5 karakter').max(200)
export const role = z.enum(['admin', 'editor'])

/** First error message of a failed parse, for a toast or a field. */
export const firstError = (e: z.ZodError) => {
  const i = e.issues[0]
  return i ? `${i.path.length ? i.path.join('.') + ': ' : ''}${i.message}` : 'Data tidak valid'
}
