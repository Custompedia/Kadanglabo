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

/** The language to show for this issue, or null when it does not depend on the language. */
export function langFor(issue: string, draft: unknown): Lang | null {
  if (/bahasa Inggris belum/.test(issue)) return 'en'
  if (/bahasa Indonesia belum/.test(issue)) return 'id'
  if (!issue.endsWith('(Indonesia & Inggris)')) return null
  const g = /^Galeri blok (\d+)/.exec(issue)
  const block = g ? (draft as { gallery?: Record<string, unknown>[] } | null)?.gallery?.[Number(g[1]) - 1] : undefined
  const v = g ? (block?.label ?? block?.text) : (draft as Record<string, unknown> | null)?.[FIELD[labelOf(issue)] ?? '']
  const tx = v as { en?: unknown; id?: unknown } | undefined
  if (!tx) return null
  return !has(tx.id) ? 'id' : !has(tx.en) ? 'en' : null
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

/** Scroll to the field, focus it and mark it for a moment. */
export function reveal(issue: string, draft: unknown, setLang: (l: Lang) => void) {
  const lang = langFor(issue, draft)
  if (lang) setLang(lang)
  // after the language switch has rendered
  window.setTimeout(() => {
    const el = targetOf(issue)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.querySelector<HTMLElement>('input:not([type=hidden]), textarea, [contenteditable=true], button')?.focus({ preventScroll: true })
    el.classList.add('reveal-missing')
    window.setTimeout(() => el.classList.remove('reveal-missing'), 2200)
  }, 60)
}
