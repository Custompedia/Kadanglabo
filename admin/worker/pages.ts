import { Hono } from 'hono'
import { z } from 'zod'
import { CATEGORY_SELECTED_MAX, WORK_HIGHLIGHT_MAX, categories, type PageSettings } from '../../shared/content'
import { now, type AppEnv, type Env } from './env'
import { firstError, slug } from './validate'

/*
 * What Our Work and the category pages show (which projects, which hero photo), and the list of locations projects
 * pick from. Saving here is live at once: the public content's version changes, so the site's cache moves on.
 */

const bump = (env: Env) => env.CONTENT_DB.prepare(`UPDATE meta SET value = ? WHERE key = 'version'`).bind(now())

/* ---- page settings ------------------------------------------------------------------------------------------- */

export const pagesApi = new Hono<AppEnv>()

const categorySchema = z.object({
  highlight: z.array(slug).max(WORK_HIGHLIGHT_MAX, `Maksimal ${WORK_HIGHLIGHT_MAX} projek di Our Work`),
  hero: z.union([z.string().regex(/^[a-z0-9-]{1,80}$/), z.literal('')]),
  selected: z.array(slug).max(CATEGORY_SELECTED_MAX, `Maksimal ${CATEGORY_SELECTED_MAX} projek di halaman kategori`),
})
const pagesSchema = z.object({ categories: z.object({ commercial: categorySchema, hospitality: categorySchema, residential: categorySchema }) })

export const emptyPages = (): PageSettings => ({
  categories: Object.fromEntries(categories.map((c) => [c, { highlight: [], hero: '', selected: [] }])) as unknown as PageSettings['categories'],
})

export async function readPages(env: Env): Promise<PageSettings | null> {
  const row = await env.CONTENT_DB.prepare(`SELECT value FROM settings WHERE key = 'pages'`).first<{ value: string }>()
  return row ? (JSON.parse(row.value) as PageSettings) : null
}

pagesApi.get('/', async (c) => {
  const row = await c.env.CONTENT_DB.prepare(`SELECT value, updated_by, updated_at FROM settings WHERE key = 'pages'`).first<{ value: string; updated_by: string; updated_at: string }>()
  return c.json({ pages: row ? JSON.parse(row.value) : emptyPages(), updated_by: row?.updated_by ?? null, updated_at: row?.updated_at ?? null })
})

pagesApi.put('/', async (c) => {
  const parsed = pagesSchema.safeParse((await c.req.json().catch(() => ({}))).pages)
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const at = now()
  await c.env.CONTENT_DB.batch([
    c.env.CONTENT_DB.prepare(
      `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('pages', ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    ).bind(JSON.stringify(parsed.data), c.get('user').username, at),
    bump(c.env),
  ])
  return c.json({ ok: true, updated_at: at })
})

/** Statements joined to the project's publish transaction, so references switch with the live slug. */
export async function projectReferenceUpdates(env: Env, from: string, to: string): Promise<D1PreparedStatement[]> {
  const pages = await readPages(env)
  const statements: D1PreparedStatement[] = []
  let changed = false
  for (const cat of categories) {
    const s = pages?.categories[cat]
    if (!s) continue
    for (const key of ['highlight', 'selected'] as const)
      if (s[key].includes(from)) (s[key] = s[key].map((x) => (x === from ? to : x))), (changed = true)
  }
  if (changed) statements.push(env.CONTENT_DB.prepare(`UPDATE settings SET value = ? WHERE key = 'pages'`).bind(JSON.stringify(pages)))
  for (const column of ['draft', 'published'] as const) {
    statements.push(env.CONTENT_DB.prepare(
      `UPDATE articles SET ${column} = json_set(${column}, '$.project', ?) WHERE json_extract(${column}, '$.project') = ?`,
    ).bind(to, from))
  }
  return statements
}

/* ---- locations ------------------------------------------------------------------------------------------------ */

export const locationsApi = new Hono<AppEnv>()

/** Projects (any state but deleted) per city name, by title. */
async function usage(env: Env) {
  const { results } = await env.CONTENT_DB.prepare(
    `SELECT title, json_extract(draft, '$.region') AS d, json_extract(published, '$.region') AS p FROM projects WHERE state != 'trashed'`,
  ).all<{ title: string; d: string | null; p: string | null }>()
  const by = new Map<string, Set<string>>()
  for (const r of results)
    for (const name of [r.d, r.p]) {
      if (!name) continue
      const k = name.toLowerCase()
      if (!by.has(k)) by.set(k, new Set())
      by.get(k)!.add(r.title)
    }
  return (name: string) => [...(by.get(name.toLowerCase()) ?? [])]
}

const areaKey = (label: string) =>
  label.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'area'

locationsApi.get('/', async (c) => {
  const [areas, cities, usedBy] = await Promise.all([
    c.env.CONTENT_DB.prepare('SELECT id, key, label, position FROM areas ORDER BY position, id').all<{ id: number; key: string; label: string; position: number }>(),
    c.env.CONTENT_DB.prepare('SELECT id, name, area_id FROM cities ORDER BY name COLLATE NOCASE').all<{ id: number; name: string; area_id: number }>(),
    usage(c.env),
  ])
  return c.json({
    areas: areas.results.map((a) => ({
      ...a,
      cities: cities.results.filter((x) => x.area_id === a.id).map((x) => ({ id: x.id, name: x.name, usedBy: usedBy(x.name) })),
    })),
  })
})

const label = z.string().trim().min(2, 'Nama minimal 2 huruf').max(60)

locationsApi.post('/areas', async (c) => {
  const parsed = z.object({ label }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  let key = areaKey(parsed.data.label)
  for (let n = 2; await c.env.CONTENT_DB.prepare('SELECT 1 FROM areas WHERE key = ?').bind(key).first(); n++) key = `${areaKey(parsed.data.label)}-${n}`
  const r = await c.env.CONTENT_DB.prepare(`INSERT INTO areas (key, label, position) VALUES (?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM areas)) RETURNING id`)
    .bind(key, parsed.data.label).first<{ id: number }>()
  await bump(c.env).run()
  return c.json({ id: r!.id }, 201)
})

locationsApi.patch('/areas/:id', async (c) => {
  const parsed = z.object({ label }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  await c.env.CONTENT_DB.batch([c.env.CONTENT_DB.prepare('UPDATE areas SET label = ? WHERE id = ?').bind(parsed.data.label, Number(c.req.param('id'))), bump(c.env)])
  return c.json({ ok: true })
})

locationsApi.delete('/areas/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const n = await c.env.CONTENT_DB.prepare('SELECT COUNT(*) AS n FROM cities WHERE area_id = ?').bind(id).first<{ n: number }>()
  if (n && n.n > 0) return c.json({ error: 'not_empty', message: 'Area ini masih berisi kota. Hapus atau pindahkan kotanya dulu.' }, 409)
  await c.env.CONTENT_DB.batch([c.env.CONTENT_DB.prepare('DELETE FROM areas WHERE id = ?').bind(id), bump(c.env)])
  return c.json({ ok: true })
})

locationsApi.post('/cities', async (c) => {
  const parsed = z.object({ name: label, area_id: z.number().int() }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  if (await c.env.CONTENT_DB.prepare('SELECT 1 FROM cities WHERE name = ?').bind(parsed.data.name).first())
    return c.json({ error: 'taken', message: `“${parsed.data.name}” sudah ada di daftar.` }, 409)
  const r = await c.env.CONTENT_DB.prepare('INSERT INTO cities (name, area_id) VALUES (?, ?) RETURNING id').bind(parsed.data.name, parsed.data.area_id).first<{ id: number }>()
  await bump(c.env).run()
  return c.json({ id: r!.id, name: parsed.data.name }, 201)
})

/** Rename (every project using the old name follows) or move to another area. */
locationsApi.patch('/cities/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const parsed = z.object({ name: label.optional(), area_id: z.number().int().optional() }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const city = await c.env.CONTENT_DB.prepare('SELECT name FROM cities WHERE id = ?').bind(id).first<{ name: string }>()
  if (!city) return c.json({ error: 'not_found', message: 'Lokasi tidak ditemukan.' }, 404)
  const { name, area_id } = parsed.data
  const stmts = []
  if (name && name !== city.name) {
    if (await c.env.CONTENT_DB.prepare('SELECT 1 FROM cities WHERE name = ? AND id != ?').bind(name, id).first())
      return c.json({ error: 'taken', message: `“${name}” sudah ada di daftar.` }, 409)
    stmts.push(
      c.env.CONTENT_DB.prepare('UPDATE cities SET name = ? WHERE id = ?').bind(name, id),
      c.env.CONTENT_DB.prepare(`UPDATE projects SET draft = json_set(draft, '$.region', ?) WHERE json_extract(draft, '$.region') = ? COLLATE NOCASE`).bind(name, city.name),
      c.env.CONTENT_DB.prepare(`UPDATE projects SET published = json_set(published, '$.region', ?) WHERE published IS NOT NULL AND json_extract(published, '$.region') = ? COLLATE NOCASE`).bind(name, city.name),
    )
  }
  if (area_id) stmts.push(c.env.CONTENT_DB.prepare('UPDATE cities SET area_id = ? WHERE id = ?').bind(area_id, id))
  if (stmts.length) await c.env.CONTENT_DB.batch([...stmts, bump(c.env)])
  return c.json({ ok: true })
})

locationsApi.delete('/cities/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const city = await c.env.CONTENT_DB.prepare('SELECT name FROM cities WHERE id = ?').bind(id).first<{ name: string }>()
  if (!city) return c.json({ error: 'not_found', message: 'Lokasi tidak ditemukan.' }, 404)
  const usedBy = (await usage(c.env))(city.name)
  if (usedBy.length)
    return c.json({ error: 'in_use', message: `“${city.name}” masih dipakai ${usedBy.length} projek. Ganti lokasi projek-projek itu dulu.`, usedBy }, 409)
  await c.env.CONTENT_DB.batch([c.env.CONTENT_DB.prepare('DELETE FROM cities WHERE id = ?').bind(id), bump(c.env)])
  return c.json({ ok: true })
})

/* ---- article topics ------------------------------------------------------------------------------------------- */

/*
 * The topics articles are filed under ("Open Studio", "Proyek"…), each in both languages. An article stores its topic
 * as { en, id }; the English name is the key the site filters on. The list is what is kept in settings plus anything
 * an article already uses, so nothing goes missing. Renaming rewrites every article that uses the topic.
 */
export const topicsApi = new Hono<AppEnv>()

type Topic = { en: string; id: string }
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

async function readTopics(env: Env): Promise<Topic[]> {
  const row = await env.CONTENT_DB.prepare(`SELECT value FROM settings WHERE key = 'topics'`).first<{ value: string }>()
  return row ? (JSON.parse(row.value) as Topic[]) : []
}
const writeTopics = (env: Env, list: Topic[], by: string) =>
  env.CONTENT_DB.prepare(
    `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('topics', ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
  ).bind(JSON.stringify(list), by, now())

/** Every topic with the articles (not in Trash) that use it. */
async function allTopics(env: Env) {
  const [kept, { results }] = await Promise.all([
    readTopics(env),
    env.CONTENT_DB.prepare(`SELECT title, json_extract(draft, '$.tag') AS d, json_extract(published, '$.tag') AS p FROM articles WHERE state != 'trashed'`).all<{ title: string; d: string | null; p: string | null }>(),
  ])
  const list = kept.map((t) => ({ ...t, usedBy: [] as string[] }))
  for (const r of results)
    for (const raw of [r.d, r.p]) {
      const t = raw ? (JSON.parse(raw) as Topic) : null
      if (!t?.en && !t?.id) continue
      let hit = list.find((x) => same(x.en, t.en || t.id))
      if (!hit) list.push((hit = { en: t.en || t.id, id: t.id || t.en, usedBy: [] }))
      if (!hit.usedBy.includes(r.title)) hit.usedBy.push(r.title)
    }
  return list.sort((a, b) => a.id.localeCompare(b.id, 'id'))
}

const topicSchema = z.object({ en: z.string().trim().min(2, 'Nama topik minimal 2 huruf').max(40), id: z.string().trim().min(2, 'Nama topik minimal 2 huruf').max(40) })

topicsApi.get('/', async (c) => c.json({ topics: await allTopics(c.env) }))

topicsApi.post('/', async (c) => {
  const parsed = topicSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const t = parsed.data
  const all = await allTopics(c.env)
  if (all.some((x) => same(x.en, t.en) || same(x.id, t.id))) return c.json({ error: 'taken', message: `Topik “${t.id}” sudah ada.` }, 409)
  const kept = await readTopics(c.env)
  await writeTopics(c.env, [...kept.filter((x) => all.some((a) => same(a.en, x.en))), ...all.filter((a) => !kept.some((k) => same(k.en, a.en))).map(({ en, id }) => ({ en, id })), t], c.get('user').username).run()
  return c.json({ topic: t }, 201)
})

/** Rename: { from: old English name, en, id }. Every article using it follows (draft and live), so the site updates. */
topicsApi.patch('/', async (c) => {
  const parsed = topicSchema.extend({ from: z.string().min(1) }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const { from, en, id } = parsed.data
  const all = await allTopics(c.env)
  if (!all.some((x) => same(x.en, from))) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404)
  if (all.some((x) => !same(x.en, from) && (same(x.en, en) || same(x.id, id)))) return c.json({ error: 'taken', message: `Topik “${id}” sudah ada.` }, 409)
  const list = all.map((x) => (same(x.en, from) ? { en, id } : { en: x.en, id: x.id }))
  const tag = JSON.stringify({ en, id })
  await c.env.CONTENT_DB.batch([
    writeTopics(c.env, list, c.get('user').username),
    c.env.CONTENT_DB.prepare(`UPDATE articles SET draft = json_set(draft, '$.tag', json(?)) WHERE lower(json_extract(draft, '$.tag.en')) = lower(?)`).bind(tag, from),
    c.env.CONTENT_DB.prepare(`UPDATE articles SET published = json_set(published, '$.tag', json(?)) WHERE published IS NOT NULL AND lower(json_extract(published, '$.tag.en')) = lower(?)`).bind(tag, from),
    bump(c.env),
  ])
  return c.json({ topic: { en, id }, updated: all.find((x) => same(x.en, from))!.usedBy.length })
})

/** Remove a topic no article uses. */
topicsApi.delete('/', async (c) => {
  const en = c.req.query('en') ?? ''
  const hit = (await allTopics(c.env)).find((x) => same(x.en, en))
  if (!hit) return c.json({ error: 'not_found', message: 'Topik tidak ditemukan.' }, 404)
  if (hit.usedBy.length) return c.json({ error: 'in_use', message: `“${hit.id}” masih dipakai ${hit.usedBy.length} artikel. Ganti topik artikel itu dulu.`, usedBy: hit.usedBy }, 409)
  await writeTopics(c.env, (await readTopics(c.env)).filter((x) => !same(x.en, en)), c.get('user').username).run()
  return c.json({ ok: true })
})
