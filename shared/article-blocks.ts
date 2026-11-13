/** Extra writing blocks, shared by the editor, validator and public renderer. */
export type ArticleCard =
  | { kind: 'table'; header: string[]; rows: string[][]; caption: string }
  | { kind: 'callout'; tone: 'note' | 'tip' | 'warning'; text: string }
  | { kind: 'cta'; label: string; href: string }
  | { kind: 'embed'; url: string; caption: string }
export type ArticleCardNode = { type: 'articleCard'; attrs: { data: ArticleCard } }

export function safeArticleUrl(value: string): string {
  let url = value.trim().slice(0, 1000)
  // Pasted domains without a scheme should survive saving just like inline links.
  if (/^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#]|$)/i.test(url)) url = `https://${url}`
  if (/^(?:mailto:|tel:|\/(?![\/\\]))/i.test(url)) return url
  try {
    const parsed = new URL(url)
    return /^https?:$/.test(parsed.protocol) && !!parsed.hostname ? url : ''
  } catch { return '' }
}

/** Only known video providers become frames; other URLs are ordinary links. */
export function videoEmbed(value: string): string | null {
  try {
    const u = new URL(safeArticleUrl(value))
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(u.hostname)) {
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') ?? u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1]
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(u.hostname)) {
      const id = u.pathname.match(/\/(\d+)$/)?.[1]
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
  } catch { /* A partial URL stays editable. */ }
  return null
}

export function cleanArticleCard(value: unknown): ArticleCard | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const text = (x: unknown, max = 2000) => typeof x === 'string' ? x.slice(0, max) : ''
  switch (v.kind) {
    case 'callout': return { kind: 'callout', tone: v.tone === 'tip' || v.tone === 'warning' ? v.tone : 'note', text: text(v.text, 10000) }
    case 'cta': return { kind: 'cta', label: text(v.label, 200), href: safeArticleUrl(text(v.href)) }
    case 'embed': return { kind: 'embed', url: safeArticleUrl(text(v.url)), caption: text(v.caption, 300) }
    case 'table': {
      const header = Array.isArray(v.header) ? v.header.slice(0, 12).map(x => text(x, 500)) : ['']
      if (!header.length) header.push('')
      const rows = Array.isArray(v.rows) ? v.rows.slice(0, 100).filter(Array.isArray).map(row => header.map((_, i) => text(row[i], 2000))) : []
      return { kind: 'table', header, rows, caption: text(v.caption, 300) }
    }
    default: return null
  }
}

export function newArticleCard(kind: ArticleCard['kind']): ArticleCard {
  switch (kind) {
    case 'table': return { kind, header: ['', ''], rows: [['', ''], ['', '']], caption: '' }
    case 'callout': return { kind, tone: 'note', text: '' }
    case 'cta': return { kind, label: '', href: '' }
    case 'embed': return { kind, url: '', caption: '' }
  }
}

/** Visible card copy participates in article search and text extraction. */
export function articleCardText(card: ArticleCard): string {
  switch (card.kind) {
    case 'callout': return card.text
    case 'cta': return card.label
    case 'embed': return card.caption
    case 'table': return [...card.header, ...card.rows.flat(), card.caption].join(' ')
  }
}
