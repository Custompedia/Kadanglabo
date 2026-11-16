import { docText, type Lang } from '../../../shared/content'

/*
 * Publish pressed while something is missing: bring the user to it. The issue texts come from shared/publish.ts
 * ("Tipologi (Indonesia & Inggris)", "Foto cover", "Galeri blok 3: dua foto", "Tagline: bahasa Inggris belum diisi");
 * the field is found by its label on screen, the gallery block by its number, and the language tab is switched to
 * the language still empty.
 */

/** issue label -> the draft field holding the text, to tell which language is still empty */
const FIELD: Record<string, string> = {
  Tipologi: 'typology',
  Tagline: 'tagline',
  'Paragraf pembuka': 'summary',
  Judul: 'title',
  'Deskripsi singkat': 'excerpt',
  'Isi artikel': 'body',
  Topik: 'tag',
  'Skema pengerjaan': 'delivery',
  'Keterangan foto banner': 'coverCaption',
}

const labelOf = (issue: string) => issue.replace(/ \(Indonesia & Inggris\)$/, '').split(':')[0].trim()

const has = (v: unknown) => (typeof v === 'string' ? !!v.trim() : !!v && !!docText(v as never))

/** The languages still empty for this issue ([] when it does not depend on the language). */
export function emptyLangs(issue: string, draft: unknown): Lang[] {
  if (/bahasa Inggris belum/.test(issue)) return ['en']
  if (/bahasa Indonesia belum/.test(issue)) return ['id']
  if (!issue.endsWith('(Indonesia & Inggris)')) return []
  const g = /^Galeri blok (\d+)/.exec(issue)
  const block = g ? (draft as { gallery?: Record<string, unknown>[] } | null)?.gallery?.[Number(g[1]) - 1] : undefined
  const v = g ? (block?.label ?? block?.text) : (draft as Record<string, unknown> | null)?.[FIELD[labelOf(issue)] ?? '']
  const tx = v as { en?: unknown; id?: unknown } | undefined
  if (!tx) return ['id', 'en']
  return (['id', 'en'] as const).filter((l) => !has(tx[l]))
}

/** The issue as a row: "Tipologi: EN belum diisi", "Tagline: ID & EN belum diisi", "Foto cover". */
export function issueText(issue: string, draft: unknown): string {
  // the topic is picked from a list (both languages at once), not typed per language
  if (labelOf(issue) === 'Topik') return 'Topik belum dipilih'
  const langs = emptyLangs(issue, draft)
  if (!langs.length) return issue
  return `${labelOf(issue)}: ${langs.length === 2 ? 'ID & EN' : langs[0].toUpperCase()} belum diisi`
}

/** The element on screen for this issue: the gallery block, or the field whose label matches. */
function targetOf(issue: string): HTMLElement | null {
  const g = /^Galeri blok (\d+)/.exec(issue)
  if (g) return document.querySelector<HTMLElement>(`[data-gallery-block="${g[1]}"]`)
  const label = labelOf(issue).toLowerCase()
  const spans = [...document.querySelectorAll<HTMLElement>('main span, main label')].filter((el) => el.children.length <= 1)
  const text = (el: HTMLElement) => (el.textContent ?? '').replace(/\*$/, '').trim().toLowerCase()
  const hit = spans.find((el) => text(el) === label) ?? spans.find((el) => text(el).startsWith(label))
  // the field around the label: its FieldShell / ImageSlot wrapper
  return (hit?.closest<HTMLElement>('.grid') ?? hit?.parentElement ?? null) as HTMLElement | null
}

/**
 * Scroll to the field, focus it and mark it for a moment. Stays on the language tab in view when that language is
 * the empty one; otherwise switches and returns the language switched to (so the panel can say so).
 */
export function reveal(issue: string, draft: unknown, lang: Lang, setLang: (l: Lang) => void): Lang | null {
  const langs = emptyLangs(issue, draft)
  const to = langs.length && !langs.includes(lang) ? langs[0] : null
  if (to) setLang(to)
  // after the language switch has rendered
  window.setTimeout(() => {
    const el = targetOf(issue)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.querySelector<HTMLElement>('input:not([type=hidden]), textarea, [contenteditable=true], button')?.focus({ preventScroll: true })
    // one field marked at a time: the one just asked for
    document.querySelectorAll('.reveal-missing').forEach((other) => other.classList.remove('reveal-missing'))
    void el.offsetWidth // restart the mark when the same field is asked for twice
    el.classList.add('reveal-missing')
    window.setTimeout(() => el.classList.remove('reveal-missing'), 1800)
  }, 60)
  return to
}
