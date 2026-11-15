import { docText, type Block, type Doc } from '../../../shared/content'
import type { Alignment } from '../types'
import { wrongLanguage } from './language'

/*
 * Are the two languages of one article the same article? Tech sometimes sends an English and an Indonesian version
 * that were written separately (other sections, other length). A translation keeps the outline: the same headings,
 * the same blocks in the same order, and roughly the same amount of text. Pure: the converted article in, a verdict
 * out. Not asked when Tech sent one language only (its text fills both, so they cannot differ).
 */

/** shorter text / longer text below this: one of the two is clearly missing a part */
export const MIN_LENGTH_RATIO = 0.6

/** What a block is, for comparing the outline (cards by their kind: table, callout, cta, embed). */
function kindOf(b: Block): string {
  if (b.type === 'heading') return `h${b.attrs?.level === 3 ? 3 : 2}`
  if (b.type === 'bulletList' || b.type === 'orderedList') return 'list'
  if (b.type === 'articleCard') return `card:${b.attrs?.data?.kind ?? '?'}`
  return b.type
}

const KIND_LABEL: Record<string, string> = {
  paragraph: 'paragraf', h2: 'judul bagian', h3: 'subjudul', list: 'daftar', image: 'foto', blockquote: 'kutipan',
  horizontalRule: 'garis pemisah', codeBlock: 'kode', 'card:table': 'tabel', 'card:callout': 'catatan', 'card:cta': 'tombol ajakan', 'card:embed': 'sematan',
}
const kindLabel = (k: string) => KIND_LABEL[k] ?? k

const blocksOf = (doc: Doc | null | undefined): Block[] =>
  (Array.isArray(doc?.content) ? doc.content : []).filter((b) => !(b.type === 'paragraph' && !(b.content ?? []).length)) // an empty paragraph is no content

export function checkAlignment(en: Doc | null | undefined, id: Doc | null | undefined): Alignment {
  const a = blocksOf(en).map(kindOf)
  const b = blocksOf(id).map(kindOf)
  const count = (kinds: string[], k: string) => kinds.filter((x) => x === k).length
  const reasons: string[] = []

  const [h2en, h2id, h3en, h3id] = [count(a, 'h2'), count(b, 'h2'), count(a, 'h3'), count(b, 'h3')]
  if (h2en !== h2id) reasons.push(`EN ${h2en} bagian, ID ${h2id} bagian`)
  else if (h3en !== h3id) reasons.push(`EN ${h3en} subjudul, ID ${h3id} subjudul`)

  if (a.length !== b.length) reasons.push(`EN ${a.length} blok isi, ID ${b.length} blok isi`)
  else {
    const at = a.findIndex((k, i) => k !== b[i])
    if (at >= 0) reasons.push(`urutan isi berbeda mulai blok ke-${at + 1} (EN ${kindLabel(a[at])}, ID ${kindLabel(b[at])})`)
  }

  const [len, lid] = [docText(en ?? undefined).replace(/\s+/g, ' ').length, docText(id ?? undefined).replace(/\s+/g, ' ').length]
  const long = Math.max(len, lid)
  if (long > 0 && Math.min(len, lid) / long < MIN_LENGTH_RATIO) {
    const [short, other] = len < lid ? ['EN', 'ID'] : ['ID', 'EN']
    reasons.push(`teks ${short} hanya ${Math.round((Math.min(len, lid) / long) * 100)}% dari panjang teks ${other}`)
  }

  // each language must also be written in that language (Tech once left Indonesian in the English version)
  const [inId, inEn] = [wrongLanguage(en, 'en'), wrongLanguage(id, 'id')]
  if (inId.length) reasons.push(`versi EN berisi teks berbahasa Indonesia: ${inId.slice(0, 2).join(', ')}${inId.length > 2 ? ` dan ${inId.length - 2} lagi` : ''}`)
  if (inEn.length) reasons.push(`versi ID berisi teks berbahasa Inggris: ${inEn.slice(0, 2).join(', ')}${inEn.length > 2 ? ` dan ${inEn.length - 2} lagi` : ''}`)

  return reasons.length ? { aligned: false, reason: reasons.join('; ') } : { aligned: true, reason: 'Struktur dan panjang kedua bahasa sejajar.' }
}
