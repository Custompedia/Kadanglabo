import { docText, type Block, type Doc, type Lang } from '../../../shared/content'

/*
 * Which language is a piece of text in? Tech sometimes leaves Indonesian in the English version (a button label, a
 * paragraph) or the other way round. Counted on common function words, which every sentence has and the other
 * language does not share. Pure. Unsure (too few words, or both languages) answers null: only clear cases count.
 */

const WORDS: Record<Lang, Set<string>> = {
  en: new Set('the and of to in for with your you is are this that on or be can before as by it its from at an we our will when which into'.split(' ')),
  id: new Set('yang dan di ke dari untuk dengan anda ini itu pada adalah tidak akan atau juga dalam bisa kami sebelum agar karena oleh sebagai lebih seperti saat jika kita'.split(' ')),
}

export function guessLang(text: string): Lang | null {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? []
  let en = 0
  let id = 0
  for (const w of words) {
    if (WORDS.en.has(w)) en++
    if (WORDS.id.has(w)) id++
  }
  // a short label ("Konsultasikan proyek Anda dengan Kadanglabo") has two of one language and none of the other
  if (en >= 2 && en >= id * 3) return 'en'
  if (id >= 2 && id >= en * 3) return 'id'
  return null
}

const LABEL: Record<string, string> = { paragraph: 'paragraf', heading: 'judul bagian', bulletList: 'daftar', orderedList: 'daftar', blockquote: 'kutipan' }

/** The text a block shows (cards: their own words; the table and code are left out, they may quote either language). */
function textOf(b: Block): { text: string; label: string } | null {
  if (b.type === 'articleCard') {
    const d = (b.attrs as { data?: Record<string, unknown> } | undefined)?.data ?? {}
    if (d.kind === 'cta') return { text: String(d.label ?? ''), label: 'tombol ajakan' }
    if (d.kind === 'callout') return { text: String(d.text ?? ''), label: 'catatan' }
    return null
  }
  if (b.type === 'codeBlock' || b.type === 'image' || b.type === 'horizontalRule') return null
  return { text: docText({ type: 'doc', content: [b] } as Doc), label: LABEL[b.type] ?? b.type }
}

/** The blocks of `doc` that are clearly in the other language, e.g. ["tombol ajakan “Konsultasikan proyek Anda…”"]. */
export function wrongLanguage(doc: Doc | null | undefined, expected: Lang): string[] {
  const out: string[] = []
  for (const b of doc?.content ?? []) {
    const t = textOf(b)
    if (!t || !t.text.trim()) continue
    const lang = guessLang(t.text)
    if (lang && lang !== expected) out.push(`${t.label} “${t.text.length > 60 ? t.text.slice(0, 60).trimEnd() + '…' : t.text}”`)
  }
  return out
}

/* The call to action is a fixed phrase, so a label left in the wrong language is put right here instead of only
   flagged: one wording per language, the same on every article. */
export const CTA_LABEL: Record<Lang, string> = { en: 'Discuss your project with Kadanglabo', id: 'Konsultasikan proyek Anda dengan Kadanglabo' }
export const ctaLabel = (label: string, lang: Lang) => {
  const l = guessLang(label)
  return l && l !== lang ? CTA_LABEL[lang] : label
}
