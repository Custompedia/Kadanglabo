import type { TechBlock, TechRun, TechVersion, TopicTag } from '../types'

/*
 * A topic suggestion for the preview: which of the website's own topics the article reads like. Never chosen for the
 * client, only shown next to the topic picker with the words that led to it. Deterministic and plain: the article's
 * words (title, excerpt, text; both languages) are counted against each topic's own names plus a short list of
 * related words below. A topic the list does not know is matched by its own names only. When nothing stands out,
 * the suggestion is Publication (guides and explainers), if the website has that topic.
 */

interface Known {
  /** the topic's names that select this entry (either language, lower case) */
  names: string[]
  words: string[]
  /** words that appear in nearly every article (the studio's name): they count half */
  weak?: string[]
}
const KNOWN: Known[] = [
  {
    names: ['project', 'projects', 'proyek', 'projek'],
    words: ['proyek', 'projek', 'project', 'klinik', 'clinic', 'rumah', 'house', 'villa', 'resort', 'studi kasus', 'case study', 'desain untuk', 'design for', 'portofolio', 'portfolio'],
  },
  { names: ['talk', 'talks'], words: ['talk', 'diskusi', 'discussion', 'seminar', 'webinar', 'bincang', 'bincang-bincang', 'podcast'] },
  { names: ['open studio'], words: ['open studio', 'konsultasi gratis', 'free consultation'] },
  { names: ['studio'], words: ['studio', 'behind the scenes', 'di balik layar'], weak: ['tim', 'team', 'kadanglabo'] },
  {
    names: ['publication', 'publications', 'publikasi'],
    words: ['panduan', 'guide', 'tips', 'langkah', 'steps', 'cara', 'how to', 'apa itu', 'what is', 'memahami', 'understanding', 'tren', 'trend', 'trends'],
  },
]
const FALLBACK = KNOWN[KNOWN.length - 1]

/** Where a word was found counts: the title most, the excerpt next, the text least (and at most 3 times a word). */
const WEIGHT = { title: 3, excerpt: 2, body: 1 } as const
const BODY_CAP = 3
type Zone = keyof typeof WEIGHT

export interface ArticleWords { title: string[]; excerpt: string[]; body: string[] }
export interface Recommendation {
  topic: TopicTag
  /** one line, in Indonesian: which words led here, or why it is the default */
  reason: string
  /** nothing matched: the default topic for guides */
  fallback: boolean
}

const norm = (s: string) => ` ${s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `
const sameName = (a: string, b: string) => norm(a) === norm(b)
const entryOf = (t: TopicTag): Known | null => KNOWN.find((k) => k.names.some((n) => sameName(n, t.en) || sameName(n, t.id))) ?? null

/** How often each phrase occurs as whole words, longest phrases first: "open studio" is not also counted as "studio". */
function counts(text: string, phrases: string[]): Map<string, number> {
  const found = new Map<string, number>()
  let rest = norm(text) // letters and digits, one space between words, a space at both ends
  for (const p of [...new Set(phrases.map((x) => norm(x).trim()).filter((x) => x.length >= 2))].sort((a, b) => b.length - a.length || a.localeCompare(b))) {
    const word = new RegExp(`(?<= )${p}(?= )`, 'g') // p holds only letters, digits and single spaces
    const n = rest.match(word)?.length ?? 0
    if (n) found.set(p, n), (rest = rest.replace(word, '|'))
  }
  return found
}

export function recommendTopic(article: ArticleWords, topics: TopicTag[]): Recommendation | null {
  const list = topics.filter((t) => t && (t.en?.trim() || t.id?.trim()))
  if (!list.length) return null
  const plans = list.map((topic) => {
    const known = entryOf(topic)
    const own = [topic.en, topic.id].filter((x) => x && x.trim().length >= 3)
    return { topic, known, strong: [...own, ...(known?.words ?? [])].map((w) => norm(w).trim()), weak: (known?.weak ?? []).map((w) => norm(w).trim()) }
  })
  const every = plans.flatMap((p) => [...p.strong, ...p.weak])
  const zones: Record<Zone, Map<string, number>> = {
    title: counts(article.title.join(' \n '), every),
    excerpt: counts(article.excerpt.join(' \n '), every),
    body: counts(article.body.join(' \n '), every),
  }

  const scored = plans.map((p, order) => {
    const hits: { word: string; points: number; where: Zone }[] = []
    for (const [word, factor] of [...p.strong.map((w) => [w, 1] as const), ...p.weak.map((w) => [w, 0.5] as const)]) {
      let points = 0
      let where: Zone | null = null
      for (const zone of ['title', 'excerpt', 'body'] as Zone[]) {
        const n = zones[zone].get(word) ?? 0
        if (!n) continue
        points += (zone === 'body' ? Math.min(n, BODY_CAP) : 1) * WEIGHT[zone] * factor
        where ??= zone
      }
      if (points && !hits.some((h) => h.word === word)) hits.push({ word, points, where: where! })
    }
    return { ...p, order, hits: hits.sort((a, b) => b.points - a.points || a.word.localeCompare(b.word)), score: hits.reduce((s, h) => s + h.points, 0) }
  })
  // a tie goes to the guide topic (a "Panduan ... Villa" is a guide first), then to the order of the list
  const guideFirst = (x: (typeof scored)[number]) => (x.known === FALLBACK ? 0 : 1)
  scored.sort((a, b) => b.score - a.score || guideFirst(a) - guideFirst(b) || a.order - b.order)
  const best = scored[0]

  if (best.score >= 1) {
    const shown = best.hits.slice(0, 3).map((h) => `“${h.word}”${h.where === 'title' ? ' (judul)' : ''}`)
    return { topic: { en: best.topic.en, id: best.topic.id }, reason: `Kata yang cocok: ${shown.join(', ')}.`, fallback: false }
  }
  const guide = list.find((t) => entryOf(t) === FALLBACK)
  return guide ? { topic: { en: guide.en, id: guide.id }, reason: 'Tidak ada kata kunci topik yang menonjol. Artikel panduan biasanya masuk topik ini.', fallback: true } : null
}

/* ---- the words of a Tech article ------------------------------------------------------------------------------- */

const runs = (r: TechRun[] | undefined) => (Array.isArray(r) ? r.map((x) => x?.text ?? '').join('') : '')
/** The reading text of a block. The call-to-action button is left out: nearly every article ends with "Konsultasi". */
function blockText(b: TechBlock): string {
  switch (b?.type) {
    case 'heading': case 'quote': case 'callout': return b.text ?? ''
    case 'paragraph': return runs(b.runs)
    case 'list': return (Array.isArray(b.items) ? b.items : []).map(runs).join('\n')
    case 'table': return [b.caption, ...(b.header ?? []), ...(b.rows ?? []).flat()].join(' ')
    case 'image': return b.caption ?? ''
    default: return ''
  }
}

/** Every language Tech sent, as title / excerpt / text. */
export function articleWords(versions: Pick<TechVersion, 'title' | 'excerpt' | 'metaDescription' | 'directAnswer' | 'blocks'>[]): ArticleWords {
  const vs = Array.isArray(versions) ? versions.filter(Boolean) : []
  return {
    title: vs.map((v) => v.title ?? ''),
    excerpt: vs.map((v) => v.excerpt || v.metaDescription || ''),
    body: vs.map((v) => [v.directAnswer ?? '', ...(Array.isArray(v.blocks) ? v.blocks : []).map(blockText)].join('\n')),
  }
}
