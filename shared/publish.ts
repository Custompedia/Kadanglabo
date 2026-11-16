import { docText, type ArticleContent, type ProjectContent, type RichTx, type Tx } from './content'

/*
 * What still stops a draft from going live. Shared by the Worker (it refuses a Publish that is not ready) and the
 * editor (it lists what is missing as the user types, without waiting for a save). Pure.
 */

type Kind = 'project' | 'article'

const filled = (t: Tx | undefined) => !!t && !!t.en.trim() && !!t.id.trim()
const richFilled = (r: RichTx | undefined) => !!r && !!docText(r.en) && !!docText(r.id)

const LABEL: Record<string, string> = {
  title: 'Judul',
  typology: 'Tipologi',
  tagline: 'Tagline',
  summary: 'Paragraf pembuka',
  delivery: 'Skema pengerjaan',
  tag: 'Topik',
  excerpt: 'Deskripsi singkat',
  coverCaption: 'Keterangan foto banner',
  body: 'Isi artikel',
  label: 'label',
  text: 'teks',
  caption: 'keterangan',
  cite: 'sumber',
}

/** Every text written in one language only: "Tagline: bahasa Inggris belum diisi". */
function oneLanguageOnly(content: unknown, kind: Kind): string[] {
  const out: string[] = []
  const has = (x: unknown) => (typeof x === 'string' ? !!x.trim() : !!docText(x as never))
  const walk = (v: unknown, path: string[]) => {
    if (!v || typeof v !== 'object') return
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, [...path, String(i)]))
    const o = v as Record<string, unknown>
    if ('en' in o && 'id' in o) {
      const en = has(o.en)
      const id = has(o.id)
      if (en !== id) {
        const key = path[path.length - 1]
        const name =
          path[0] === 'gallery'
            ? `Galeri blok ${Number(path[1]) + 1} (${LABEL[key] ?? key})`
            : (LABEL[key] ?? key)
        out.push(`${name}: bahasa ${en ? 'Indonesia' : 'Inggris'} belum diisi`)
      }
      return
    }
    for (const [k, x] of Object.entries(o)) {
      // Legacy article summaries are no longer editable or displayed; never block publication on them.
      if (kind === 'article' && path.length === 0 && k === 'summary') continue
      if (!(kind === 'project' && (k === 'scope' || k === 'story'))) walk(x, [...path, k])
    }
  }
  walk(content, [])
  return out
}

/** What still stops a draft from going live (empty list = ready). */
export function publishIssues(kind: Kind, d: ProjectContent | ArticleContent): string[] {
  const out: string[] = []
  if (kind === 'project') {
    const p = d as ProjectContent
    if (!p.title.trim()) out.push('Judul')
    if (!p.cover) out.push('Foto cover')
    if (p.archiveOnly) return out
    if (!filled(p.typology)) out.push('Tipologi (Indonesia & Inggris)')
    if (!filled(p.tagline)) out.push('Tagline (Indonesia & Inggris)')
    if (!richFilled(p.summary)) out.push('Paragraf pembuka (Indonesia & Inggris)')
    if (!p.hero) out.push('Foto besar')
    p.gallery.forEach((b, i) => {
      if ((b.t === 'full' || b.t === 'offset') && !b.img) out.push(`Galeri blok ${i + 1}: foto`)
      if (b.t === 'pair' && (!b.imgs[0] || !b.imgs[1])) out.push(`Galeri blok ${i + 1}: dua foto`)
      if (b.t === 'text' && (!filled(b.label) || !richFilled(b.body))) out.push(`Galeri blok ${i + 1}: teks (Indonesia & Inggris)`)
      if (b.t === 'quote' && !filled(b.text)) out.push(`Galeri blok ${i + 1}: kutipan (Indonesia & Inggris)`)
    })
  } else {
    const a = d as ArticleContent
    if (!filled(a.title)) out.push('Judul (Indonesia & Inggris)')
    if (!filled(a.tag)) out.push('Topik (Indonesia & Inggris)')
    if (!filled(a.excerpt)) out.push('Deskripsi singkat (Indonesia & Inggris)')
    if (!a.cover) out.push('Foto banner')
    if (!richFilled(a.body)) out.push('Isi artikel (Indonesia & Inggris)')
  }
  // optional texts must not stay half-done either
  for (const issue of oneLanguageOnly(d, kind)) if (!out.some((o) => issue.startsWith(o.split(' (')[0]))) out.push(issue)
  return out
}
