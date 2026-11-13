import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv, Env } from './env'
import { firstError } from './validate'

/*
 * Images. The dashboard resizes every upload in the browser (WebP at 640 / 960 / 1280 / 1920, never wider than the
 * original) and sends the sizes together with the original. They are stored as media/{id}-{width}.webp, the same
 * naming the site already uses in public/img, so <Img> serves both the same way.
 */

export const MEDIA_WIDTHS = [640, 960, 1280, 1920]
const MAX_ORIGINAL = 40 * 1024 * 1024
const MAX_VARIANT = 8 * 1024 * 1024

export const mediaApi = new Hono<AppEnv>()

function slugify(name: string) {
  const base = name.replace(/\.[a-z0-9]+$/i, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image'
}
const shortId = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 6)

export type Use = { title: string; group: string; kind: 'project' | 'article' | 'page' }
const groupName: Record<string, string> = { commercial: 'Commercial', hospitality: 'Hospitality', residential: 'Residential' }

/** Includes Trash: a restorable record must keep its photos until permanent deletion.
 * Where every media id is used: { id: [{ title: 'La Barka Resort', group: 'Hospitality', kind: 'project' }, ...] }. */
export async function mediaUsage(env: Env) {
  const [p, a, pages] = await env.CONTENT_DB.batch([
    env.CONTENT_DB.prepare(`SELECT title, category, draft, published FROM projects`),
    env.CONTENT_DB.prepare(`SELECT title, draft, published FROM articles`),
    env.CONTENT_DB.prepare(`SELECT value FROM settings WHERE key = 'pages'`),
  ])
  const used = new Map<string, Use[]>()
  const add = (id: string, use: Use) => {
    const list = used.get(id) ?? []
    if (!list.some((u) => u.title === use.title && u.kind === use.kind)) list.push(use)
    used.set(id, list)
  }
  const scan = (json: string | null, use: Use) => {
    if (json) for (const m of json.matchAll(/"([a-z0-9-]{1,80})"/g)) add(m[1], use)
  }
  for (const r of p.results as { title: string; category: string; draft: string; published: string | null }[]) {
    const use: Use = { title: r.title, group: groupName[r.category] ?? r.category, kind: 'project' }
    scan(r.draft, use)
    scan(r.published, use)
  }
  for (const r of a.results as { title: string; draft: string; published: string | null }[]) {
    const use: Use = { title: r.title, group: 'Artikel', kind: 'article' }
    scan(r.draft, use)
    scan(r.published, use)
  }
  const settings = (pages.results as { value: string }[])[0]
  if (settings) {
    const cats = (JSON.parse(settings.value) as { categories: Record<string, { hero: string }> }).categories
    for (const [cat, v] of Object.entries(cats)) if (v.hero) add(v.hero, { title: `Halaman ${groupName[cat]} (hero)`, group: groupName[cat] ?? cat, kind: 'page' })
  }
  return used
}

mediaApi.get('/', async (c) => {
  const [{ results }, used] = await Promise.all([
    c.env.MEDIA_DB.prepare('SELECT * FROM media ORDER BY created_at DESC, id').all<Record<string, unknown> & { id: string; sizes: string }>(),
    mediaUsage(c.env),
  ])
  return c.json({ items: results.map((m) => ({ ...m, sizes: JSON.parse(m.sizes), usedIn: used.get(m.id) ?? [] })) })
})

mediaApi.post('/', async (c) => {
  const form = await c.req.formData().catch(() => null)
  if (!form) return c.json({ error: 'invalid', message: 'Upload tidak terbaca.' }, 400)
  const meta = z
    .object({ filename: z.string().min(1).max(200), w: z.number().int().positive(), h: z.number().int().positive(), color: z.string().regex(/^#[0-9a-f]{6}$/i), sizes: z.array(z.number().int().positive()).min(1).max(6) })
    .safeParse(JSON.parse(String(form.get('meta') ?? '{}')))
  if (!meta.success) return c.json({ error: 'invalid', message: firstError(meta.error) }, 400)
  const m = meta.data

  const variants: [number, File][] = []
  for (const w of m.sizes) {
    const f = form.get(`w${w}`)
    if (!(f instanceof File) || f.type !== 'image/webp' || f.size > MAX_VARIANT) return c.json({ error: 'invalid', message: `Ukuran ${w}px tidak valid.` }, 400)
    variants.push([w, f])
  }
  const original = form.get('original')
  if (original instanceof File && original.size > MAX_ORIGINAL) return c.json({ error: 'too_large', message: 'File asli lebih dari 40 MB.' }, 413)

  let id = `${slugify(m.filename)}-${shortId()}`
  while (await c.env.MEDIA_DB.prepare('SELECT 1 FROM media WHERE id = ?').bind(id).first()) id = `${slugify(m.filename)}-${shortId()}`

  const cache = 'public, max-age=31536000, immutable' // a file never changes under its name
  await Promise.all(variants.map(([w, f]) => c.env.MEDIA.put(`media/${id}-${w}.webp`, f.stream(), { httpMetadata: { contentType: 'image/webp', cacheControl: cache } })))
  let originalKey: string | null = null
  if (original instanceof File) {
    originalKey = `${id}/${m.filename.replace(/[^\w.-]+/g, '_')}`
    await c.env.ORIGINALS.put(originalKey, original.stream(), { httpMetadata: { contentType: original.type || 'application/octet-stream' } })
  }
  const bytes = variants.reduce((s, [, f]) => s + f.size, 0)
  await c.env.MEDIA_DB.prepare(
    'INSERT INTO media (id, filename, w, h, color, sizes, bytes, original_bytes, original_key, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(id, m.filename, m.w, m.h, m.color.toLowerCase(), JSON.stringify(m.sizes), bytes, original instanceof File ? original.size : 0, originalKey, c.get('user').username).run()
  return c.json({ id, w: m.w, h: m.h, c: m.color.toLowerCase(), s: m.sizes }, 201)
})

mediaApi.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const row = await c.env.MEDIA_DB.prepare('SELECT sizes, original_key FROM media WHERE id = ?').bind(id).first<{ sizes: string; original_key: string | null }>()
  if (!row) return c.json({ error: 'not_found', message: 'Foto tidak ditemukan.' }, 404)
  const usedIn = (await mediaUsage(c.env)).get(id) ?? []
  if (usedIn.length) return c.json({ error: 'in_use', message: `Foto masih dipakai di: ${usedIn.map((u) => u.title).join(', ')}.`, usedIn }, 409)
  await c.env.MEDIA.delete((JSON.parse(row.sizes) as number[]).map((w) => `media/${id}-${w}.webp`))
  if (row.original_key) await c.env.ORIGINALS.delete(row.original_key)
  await c.env.MEDIA_DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

const UNUSED_DAYS = 7

/** Delete every image nothing has used for a week (uploaded and then replaced, or its project deleted). */
export async function cleanupMedia(env: Env) {
  const used = await mediaUsage(env)
  const before = new Date(Date.now() - UNUSED_DAYS * 864e5).toISOString()
  const { results } = await env.MEDIA_DB.prepare('SELECT id, sizes, original_key FROM media WHERE created_at < ?').bind(before).all<{ id: string; sizes: string; original_key: string | null }>()
  let n = 0
  for (const m of results) {
    if (used.has(m.id)) continue
    await env.MEDIA.delete((JSON.parse(m.sizes) as number[]).map((w) => `media/${m.id}-${w}.webp`))
    if (m.original_key) await env.ORIGINALS.delete(m.original_key)
    await env.MEDIA_DB.prepare('DELETE FROM media WHERE id = ?').bind(m.id).run()
    n++
  }
  return n
}
