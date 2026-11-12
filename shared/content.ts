/*
 * The content model shared by the CMS (admin/), its API (admin/worker) and the public site (src/).
 * Pure types and constants only, no dependencies, so every side can import it.
 *
 * It follows the shapes the site already renders (src/data/projects.ts, src/data/news.ts):
 * - Tx is a short text in both languages (titles, captions, taglines).
 * - RichTx is formatted text in both languages: one Tiptap document per language (bold, italic, lists, links).
 * - Images are referenced by a media id. Migrated images keep their old manifest key as id (e.g. 'labarka-bird').
 */

export type Lang = 'en' | 'id'
export type Tx = { en: string; id: string }

/* ---- rich text ------------------------------------------------------------------------------------------------- */
// The subset of Tiptap's JSON the editor produces and the site renders. Anything else is dropped on save.
export type Mark = { type: 'bold' } | { type: 'italic' } | { type: 'link'; attrs: { href: string } }
export type TextNode = { type: 'text'; text: string; marks?: Mark[] }
export type Inline = TextNode | { type: 'hardBreak' }
export type Paragraph = { type: 'paragraph'; content?: Inline[] }
export type ListItem = { type: 'listItem'; content: (Paragraph | List)[] }
export type List = { type: 'bulletList' | 'orderedList'; content: ListItem[] }
/** article only: a subheading, a quote, a photo inside the text */
export type Heading = { type: 'heading'; attrs: { level: 2 | 3 }; content?: Inline[] }
export type Quote = { type: 'blockquote'; content: Paragraph[] }
export type Photo = { type: 'image'; attrs: { id: string; caption: string } }
export type Block = Paragraph | List | Heading | Quote | Photo
export type Doc = { type: 'doc'; content: Block[] }
export type RichTx = { en: Doc; id: Doc }

/** Plain text (paragraphs split on blank lines) as a document. */
export function textToDoc(text: string): Doc {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  return { type: 'doc', content: paras.map((p) => ({ type: 'paragraph', content: [{ type: 'text', text: p }] })) }
}
export const txToRich = (t: Tx): RichTx => ({ en: textToDoc(t.en), id: textToDoc(t.id) })
export const emptyDoc = (): Doc => ({ type: 'doc', content: [{ type: 'paragraph' }] })

/** The document's words without formatting (search, excerpts, "is it empty?"). */
export function docText(doc: Doc | undefined): string {
  if (!doc) return ''
  const walk = (n: { type: string; text?: string; content?: unknown[] }): string =>
    n.type === 'text' ? n.text ?? '' : n.type === 'hardBreak' ? ' ' : (n.content ?? []).map((c) => walk(c as never)).join(n.type === 'doc' ? '\n' : ' ')
  return walk(doc as never).trim()
}

/* ---- projects -------------------------------------------------------------------------------------------------- */
export type Category = 'commercial' | 'hospitality' | 'residential'
export type ProjectStatus = 'built' | 'construction' | 'design'
export type StoryKey = 'context' | 'challenge' | 'concept' | 'development' | 'outcome'

export const categories: Category[] = ['commercial', 'hospitality', 'residential']
export const projectStatuses: ProjectStatus[] = ['built', 'construction', 'design']
export const storyKeys: StoryKey[] = ['context', 'challenge', 'concept', 'development', 'outcome']

export type GalleryBlock =
  | { t: 'full'; img: string; caption?: Tx }
  | { t: 'pair'; imgs: [string, string]; caption?: Tx }
  | { t: 'offset'; img: string; side?: 'left' | 'right'; caption?: Tx }
  | { t: 'text'; label: Tx; body: RichTx }
  | { t: 'quote'; text: Tx; cite?: Tx }

export interface ProjectContent {
  slug: string
  title: string
  category: Category
  /** only listed in the archive table on Our Work, no page of its own */
  archiveOnly: boolean
  typology: Tx
  location: string | null
  region: string | null
  year: number | null
  status: ProjectStatus | null
  scope: Tx[]
  landArea?: string
  buildingArea?: string
  delivery?: Tx
  client?: string
  color: string
  accent: string
  tagline: Tx
  summary: RichTx
  story: { key: StoryKey; text: RichTx; img: string }[]
  hero: string
  cover: string
  gallery: GalleryBlock[]
}

/* ---- articles -------------------------------------------------------------------------------------------------- */
export type ArticleType = 'news' | 'event'

export interface ArticleContent {
  slug: string
  type: ArticleType
  tag: Tx
  title: Tx
  /** ISO date, YYYY-MM-DD (an event's date is the day it happens) */
  date: string
  /** one or two sentences under the title, and on the article cards */
  excerpt: Tx
  /** the banner photo */
  cover: string
  coverCaption?: Tx
  /** the grey "In short" box at the top of the text (optional) */
  summary?: Tx
  /** the article itself: paragraphs, subheadings, lists, quotes and photos */
  body: RichTx
  project?: string
}

/**
 * Articles written before the Medium-style editor had a context, a body, a gallery and info rows. They read as one
 * text now: the context becomes the "In short" box, the photos and info rows follow the text.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeArticle(a: any): ArticleContent {
  if (!a || (a.context === undefined && a.gallery === undefined && a.info === undefined)) return a as ArticleContent
  const blocks = (v: unknown, lang: Lang): Block[] => {
    if (!v) return []
    if (Array.isArray(v)) return v.flatMap((x) => blocks(x, lang))
    const x = (v as Record<Lang, unknown>)[lang]
    if (typeof x === 'string') return textToDoc(x).content
    return ((x as Doc)?.content ?? []).filter((b) => b.type !== 'paragraph' || (b as Paragraph).content?.length)
  }
  const plain = (v: unknown, lang: Lang) => {
    const x = (v as Record<Lang, unknown>)?.[lang]
    return typeof x === 'string' ? x : docText(x as Doc)
  }
  const info = (a.info ?? []) as { label: Tx; value: Tx }[]
  const doc = (lang: Lang): Doc => ({
    type: 'doc',
    content: [
      ...blocks(a.body, lang),
      ...((a.gallery ?? []) as string[]).map((id): Photo => ({ type: 'image', attrs: { id, caption: '' } })),
      ...(info.length
        ? [
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: lang === 'en' ? 'Good to know' : 'Info penting' }] } as Heading,
            {
              type: 'bulletList',
              content: info.map((r) => ({
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: `${r.label[lang]}: `, marks: [{ type: 'bold' }] }, { type: 'text', text: r.value[lang] }] }],
              })),
            } as List,
          ]
        : []),
    ],
  })
  const summary = { en: plain(a.context, 'en'), id: plain(a.context, 'id') }
  return {
    slug: a.slug,
    type: a.type,
    tag: a.tag,
    title: a.title,
    date: a.date,
    excerpt: a.excerpt,
    cover: a.cover,
    ...(summary.en || summary.id ? { summary } : {}),
    body: { en: doc('en'), id: doc('id') },
    ...(a.project ? { project: a.project } : {}),
  }
}

/* ---- media ----------------------------------------------------------------------------------------------------- */
/** Same contract as src/data/images.json: master size, dominant colour, generated widths. */
export interface MediaMeta {
  w: number
  h: number
  c: string
  s: number[]
}

/* ---- what the public site loads -------------------------------------------------------------------------------- */
export interface PublicContent {
  projects: ProjectContent[]
  articles: ArticleContent[]
  /** the Location filter's areas and their cities (CMS "Lokasi") */
  areas: AreaDef[]
  /** what Our Work and the category pages show (CMS "Our Work"); null until first saved */
  pages: PageSettings | null
  /** every media id the content uses */
  media: Record<string, MediaMeta>
  /** ISO time of the newest publish, for cache busting */
  version: string
}

/* ---- the CMS record around a piece of content ------------------------------------------------------------------ */
export type RecordState = 'draft' | 'published' | 'taken_down' | 'trashed'

/* ---- choices the forms offer (the same the site uses) ---------------------------------------------------------- */

/** Hero colours of a project page: only the logo palette. */
export const projectThemes = [
  { key: 'navy', label: 'Navy', color: '#1B2238', accent: '#EC6434' },
  { key: 'blue', label: 'Biru', color: '#3C4C74', accent: '#F3F0EA' },
  { key: 'orange', label: 'Oranye', color: '#D34614', accent: '#FFFFFF' },
] as const

export const scopeOptions: Tx[] = [
  { en: 'Architecture', id: 'Arsitektur' },
  { en: 'Landscape', id: 'Lanskap' },
  { en: 'Interior Design', id: 'Desain Interior' },
  { en: 'Site Planning', id: 'Tata Tapak' },
]

/** Areas of the Location filter on Our Work, and the regions (kabupaten/kota) in each. */
export const areas = [
  { key: 'diy', label: 'D.I. Yogyakarta', regions: ['Yogyakarta', 'Sleman', 'Bantul', 'Kulon Progo'] },
  { key: 'klaten', label: 'Klaten', regions: ['Klaten'] },
  { key: 'jepara', label: 'Jepara', regions: ['Jepara'] },
  { key: 'surabaya', label: 'Surabaya', regions: ['Surabaya'] },
  { key: 'bali', label: 'Bali', regions: ['Bali'] },
  { key: 'palembang', label: 'Palembang', regions: ['Palembang'] },
]

export const categoryLabel: Record<Category, string> = { commercial: 'Commercial', hospitality: 'Hospitality', residential: 'Residential' }
export const statusLabel: Record<ProjectStatus, Tx> = {
  built: { en: 'Built', id: 'Terbangun' },
  construction: { en: 'Under construction', id: 'Konstruksi' },
  design: { en: 'In design', id: 'Desain' },
}
export const storyLabel: Record<StoryKey, Tx> = {
  context: { en: 'Context', id: 'Konteks' },
  challenge: { en: 'Challenge', id: 'Tantangan' },
  concept: { en: 'Concept', id: 'Konsep' },
  development: { en: 'Development', id: 'Pengembangan' },
  outcome: { en: 'Outcome', id: 'Hasil' },
}

/* ---- page settings and locations (CMS "Our Work" and "Lokasi") -------------------------------------------------- */

/** How many projects each place shows; the rest are in the archive. */
export const WORK_HIGHLIGHT_MAX = 5 // a category's band on Our Work
export const CATEGORY_SELECTED_MAX = 6 // the chapters on a category page
export const ARCHIVE_PREVIEW_ROWS = 15 // archive rows on Our Work before "see the whole archive"

export interface CategorySettings {
  /** project slugs shown in the category's band on Our Work, in order */
  highlight: string[]
  /** the category page's hero photo (media id) */
  hero: string
  /** project slugs told as chapters on the category page, in order */
  selected: string[]
}

export interface PageSettings {
  categories: Record<Category, CategorySettings>
}

/** An area of the Location filter, and the cities / regencies in it. */
export interface AreaDef {
  key: string
  label: string
  regions: string[]
}
