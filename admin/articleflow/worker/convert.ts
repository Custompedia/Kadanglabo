import type { ArticleContent, Block, Doc, Inline, Lang, ListItem, Mark } from '../../../shared/content'
import type { TechBlock, TechDetail, TechLocale, TechRun, TechVersion } from '../types'
import { ctaLabel } from './language'

/*
 * A Tech article (blocks per language) as a Kadanglabo article (one Tiptap document per language). The result
 * still goes through the dashboard's own validation (articleSchema), so nothing the editor could not have
 * written ever reaches the site. Block types this version does not know are skipped.
 *
 * The topic is left empty on purpose: Tech's `topic` is its own SEO cluster name, and the website's topics are the
 * client's (picked in the preview before Publish, see api.ts). Everything else Tech sends that the article can hold
 * is kept: titles, excerpt (or the meta description), direct answer, banner and its caption, every known block.
 */

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function inline(runs: unknown): Inline[] {
  if (!Array.isArray(runs)) return []
  const out: Inline[] = []
  for (const r of runs as TechRun[]) {
    if (!r || typeof r.text !== 'string' || !r.text) continue
    const marks: Mark[] = []
    if (r.bold) marks.push({ type: 'bold' })
    if (r.italic) marks.push({ type: 'italic' })
    if (typeof r.href === 'string' && r.href.trim()) marks.push({ type: 'link', attrs: { href: r.href.trim() } })
    out.push(marks.length ? { type: 'text', text: r.text, marks } : { type: 'text', text: r.text })
  }
  return out
}
/** A call to action ends in a conversation: Tech's buttons pointing at the home page go to the contact page instead. */
export const CONTACT_URL = 'https://kadanglabo.com/contact'
export const ctaHref = (href: string) => (/^(https?:\/\/(www\.)?kadanglabo\.com)?\/?$/i.test(href) && href ? CONTACT_URL : href)
const para = (content: Inline[]): Block => (content.length ? { type: 'paragraph', content } : { type: 'paragraph' })
const plain = (s: string): Inline[] => (s ? [{ type: 'text', text: s }] : [])

function block(b: TechBlock, assets: Record<string, string>, lang: Lang): Block[] {
  switch (b?.type) {
    case 'heading': {
      const t = text(b.text, 300)
      return t ? [{ type: 'heading', attrs: { level: b.level === 3 ? 3 : 2 }, content: plain(t) }] : []
    }
    case 'paragraph': {
      const content = inline(b.runs)
      return content.length ? [para(content)] : []
    }
    case 'list': {
      const items: ListItem[] = (Array.isArray(b.items) ? b.items : [])
        .map((runs) => inline(runs))
        .filter((c) => c.length)
        .map((c) => ({ type: 'listItem', content: [para(c)] }))
      return items.length ? [{ type: b.ordered ? 'orderedList' : 'bulletList', content: items }] : []
    }
    case 'table': {
      const header = Array.isArray(b.header) ? b.header.map((h) => text(h, 500)) : []
      if (!header.length) return []
      const rows = (Array.isArray(b.rows) ? b.rows : []).filter(Array.isArray).map((row) => header.map((_, i) => text(row[i], 2000)))
      return [{ type: 'articleCard', attrs: { data: { kind: 'table', header, rows, caption: text(b.caption, 300) } } }]
    }
    case 'quote': {
      const t = text(b.text, 5000)
      if (!t) return []
      const by = text(b.by, 200)
      return [{ type: 'blockquote', content: [para(plain(t)), ...(by ? [para([{ type: 'text', text: by, marks: [{ type: 'italic' }] }])] : [])] }]
    }
    case 'callout': {
      const t = text(b.text, 10000)
      return t ? [{ type: 'articleCard', attrs: { data: { kind: 'callout', tone: b.tone === 'WARNING' ? 'warning' : b.tone === 'TIP' ? 'tip' : 'note', text: t } } }] : []
    }
    case 'image': {
      const id = typeof b.assetId === 'string' ? assets[b.assetId] : undefined
      return id ? [{ type: 'image', attrs: { id, caption: text(b.caption, 300), alt: text(b.alt, 500), layout: b.layout === 'WIDE' ? 'wide' : b.layout === 'FULL' ? 'full' : 'normal' } }] : []
    }
    case 'cta': {
      const label = ctaLabel(text(b.label, 200), lang)
      const href = ctaHref(text(b.href, 1000))
      return label && href ? [{ type: 'articleCard', attrs: { data: { kind: 'cta', label, href } } }] : []
    }
    case 'divider':
      return [{ type: 'horizontalRule' }]
    case 'code': {
      const t = typeof b.text === 'string' ? b.text.slice(0, 20000) : ''
      return t ? [{ type: 'codeBlock', content: plain(t) }] : []
    }
    case 'embed': {
      const url = text(b.url, 1000)
      return url ? [{ type: 'articleCard', attrs: { data: { kind: 'embed', url, caption: text(b.caption, 300) } } }] : []
    }
    default:
      return [] // a block type from a newer Tech: left out, never a crash
  }
}

/** The words of a block, to compare paragraphs. */
const words = (b: Block | undefined) => (b?.type === 'paragraph' ? (b.content ?? []).map((n) => (n.type === 'text' ? n.text : ' ')).join('').trim() : '')

/**
 * The direct answer opens the text, as the first paragraph, exactly where Tech's own page puts it (answer engines
 * read the opening of the article). The website has no other place that shows it: an article's `summary` ("In
 * short") is neither stored by the article routes nor rendered by the site any more. Tech blocks that already open
 * with the same sentence are not doubled.
 */
function body(v: TechVersion, assets: Record<string, string>, lang: Lang): Doc {
  const content: Block[] = []
  for (const b of Array.isArray(v.blocks) ? v.blocks : []) content.push(...block(b, assets, lang))
  const lead = text(v.directAnswer, 4000)
  if (lead && words(content[0]) !== lead) content.unshift(para(plain(lead)))
  return { type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] }
}

/** "Biaya Desain Interior Kafe" -> "biaya-desain-interior-kafe" (the same rule as the dashboard's slug field). */
export const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90).replace(/-+$/, '')

/** Every Tech asset the article needs here: the banner and the photos inside the text, of every language. */
export function neededAssets(detail: TechDetail): string[] {
  const ids = new Set<string>()
  for (const v of detail.versions ?? []) {
    if (v.hero?.assetId) ids.add(v.hero.assetId)
    for (const b of v.blocks ?? []) if (b?.type === 'image' && typeof b.assetId === 'string') ids.add(b.assetId)
  }
  return [...ids]
}

export interface Converted {
  content: ArticleContent
  /** set when Tech sent one language only: its text fills both */
  singleLang: TechLocale | null
  /** { techArticleId: techVersionId } this draft was built from */
  versions: Record<string, string>
}

export function toArticle(detail: TechDetail, assets: Record<string, string>): Converted | null {
  const versions = (detail.versions ?? []).filter((v) => v && (v.locale === 'en' || v.locale === 'id'))
  const en = versions.find((v) => v.locale === 'en')
  const id = versions.find((v) => v.locale === 'id')
  if (!en && !id) return null
  const of: Record<Lang, TechVersion> = { en: (en ?? id)!, id: (id ?? en)! }
  const each = <T>(f: (v: TechVersion, lang: Lang) => T) => ({ en: f(of.en, 'en'), id: f(of.id, 'id') })
  const hero = of.en.hero ?? of.id.hero
  const caption = each((v) => text((v.hero ?? hero)?.caption, 300))
  const content: ArticleContent = {
    slug: slugify(of.en.slug || of.en.title || of.id.slug || of.id.title) || 'artikel',
    type: 'news',
    tag: { en: '', id: '' }, // the client picks it here (Tech's cluster name is not a website topic)
    title: each((v) => text(v.title, 300)),
    date: '',
    excerpt: each((v) => text(v.excerpt || v.metaDescription, 600)),
    cover: (hero?.assetId && assets[hero.assetId]) || '',
    ...(caption.en && caption.id ? { coverCaption: caption } : {}),
    // a version's CTA label follows the language the version is written in (one language sent: it fills both slots)
    body: each((v, lang) => body(v, assets, v.locale === 'en' || v.locale === 'id' ? v.locale : lang)),
  }
  return {
    content,
    singleLang: en && id ? null : en ? 'en' : 'id',
    versions: Object.fromEntries(versions.map((v) => [v.articleId, v.versionId])),
  }
}
