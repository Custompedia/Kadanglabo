import { Hono } from 'hono'
import { z } from 'zod'
import { normalizeArticle, type ArticleContent, type ProjectContent } from '../../shared/content'
import { publishIssues } from '../../shared/publish'
import { now, type AppEnv, type Env } from './env'
import { articleSchema, firstError, projectSchema } from './validate'
import { newToken } from './crypto'
import { projectReferenceUpdates } from './pages'
import { forgetInBanner } from './banner'

/** Today in Yogyakarta (WIB), as YYYY-MM-DD. */
const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)

/*
 * Projects and articles share one life cycle:
 *   draft ──Publish──► published ──Take down──► taken_down ──Publish──► published
 *     └──────────── Trash (from any state) ──► trashed ──Restore / Delete permanently
 * The editor always saves to `draft`; Publish copies it to `published`, which is all the public site reads.
 */

type Kind = 'project' | 'article'
const TABLE: Record<Kind, 'projects' | 'articles'> = { project: 'projects', article: 'articles' }

const bumpVersion = (env: Env) => env.CONTENT_DB.prepare(`UPDATE meta SET value = ? WHERE key = 'version'`).bind(now())

// what still stops a draft from going live lives in shared/publish.ts: the editor runs it live as the user types
export { publishIssues }

function contentRoutes(kind: Kind) {
  const r = new Hono<AppEnv>()
  const table = TABLE[kind]
  const schema = kind === 'project' ? projectSchema : articleSchema
  const label = kind === 'project' ? 'Projek' : 'Artikel'

  const listCols =
    kind === 'project'
      ? `id, slug, state, title, category, archive_only, position, dirty, updated_by, updated_at, published_at, json_extract(draft, '$.cover') AS cover, json_extract(draft, '$.region') AS region, json_extract(published, '$.slug') AS published_slug`
      : `id, slug, state, title, type, date, dirty, updated_by, updated_at, published_at, json_extract(draft, '$.cover') AS cover, json_extract(draft, '$.tag.en') AS tag, json_extract(published, '$.slug') AS published_slug`

  const get = (env: Env, id: number) =>
    env.CONTENT_DB.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first<{ id: number; slug: string; state: string; draft: string; published: string | null; title: string }>()

  /** Columns kept in step with the content, for lists and search. */
  const denorm = (d: ProjectContent | ArticleContent) =>
    kind === 'project'
      ? { title: (d as ProjectContent).title, category: (d as ProjectContent).category, archive_only: (d as ProjectContent).archiveOnly ? 1 : 0 }
      : { title: (d as ArticleContent).title.en || (d as ArticleContent).title.id || 'Tanpa judul', type: (d as ArticleContent).type, date: (d as ArticleContent).date }

  // addresses the site already uses for its own pages under /work and /articles
  const reserved = kind === 'project' ? ['archive', 'commercial', 'hospitality', 'residential'] : []
  const slugTaken = async (env: Env, slug: string, except = 0) =>
    reserved.includes(slug) ||
    !!(await env.CONTENT_DB.prepare(`SELECT 1 FROM ${table} WHERE id != ? AND (slug = ? OR json_extract(published, '$.slug') = ?)`).bind(except, slug, slug).first())

  r.get('/', async (c) => {
    const order = kind === 'project' ? 'position, id' : 'date DESC, id DESC'
    const { results } = await c.env.CONTENT_DB.prepare(`SELECT ${listCols} FROM ${table} ORDER BY ${order}`).all()
    return c.json({ items: results })
  })

  r.get('/:id', async (c) => {
    const row = await get(c.env, Number(c.req.param('id')))
    if (!row) return c.json({ error: 'not_found', message: `${label} tidak ditemukan.` }, 404)
    const norm = (j: string) => (kind === 'article' ? normalizeArticle(JSON.parse(j)) : JSON.parse(j))
    const draft = norm(row.draft)
    return c.json({ ...row, draft, published: row.published ? norm(row.published) : null, issues: publishIssues(kind, draft) })
  })

  r.post('/', async (c) => {
    const parsed = schema.safeParse((await c.req.json().catch(() => ({}))).content)
    if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
    const d = parsed.data as ProjectContent | ArticleContent
    if (kind === 'article') (d as ArticleContent).date = today()
    if (await slugTaken(c.env, d.slug)) return c.json({ error: 'slug_taken', message: `Slug "${d.slug}" sudah dipakai.` }, 409)
    const me = c.get('user').username
    const cols = denorm(d)
    const extra = Object.keys(cols)
    const position = kind === 'project' ? ', position' : ''
    const posVal = kind === 'project' ? `, (SELECT COALESCE(MIN(position), 0) - 1 FROM projects)` : ''
    const res = await c.env.CONTENT_DB.prepare(
      `INSERT INTO ${table} (slug, draft, created_by, updated_by, ${extra.join(', ')}${position}) VALUES (?, ?, ?, ?, ${extra.map(() => '?').join(', ')}${posVal}) RETURNING id`,
    ).bind(d.slug, JSON.stringify(d), me, me, ...Object.values(cols)).first<{ id: number }>()
    return c.json({ id: res!.id }, 201)
  })

  // save the draft
  r.put('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const row = await get(c.env, id)
    if (!row) return c.json({ error: 'not_found', message: `${label} tidak ditemukan.` }, 404)
    const parsed = schema.safeParse((await c.req.json().catch(() => ({}))).content)
    if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
    const d = parsed.data as ProjectContent | ArticleContent
    // an article's date is not edited by hand: it is the day it was last put live (see publish)
    if (kind === 'article') (d as ArticleContent).date = (JSON.parse(row.draft) as ArticleContent).date || today()
    if (await slugTaken(c.env, d.slug, id)) return c.json({ error: 'slug_taken', message: `Slug "${d.slug}" sudah dipakai.` }, 409)
    const json = JSON.stringify(d)
    const cols = denorm(d)
    const at = now()
    await c.env.CONTENT_DB.prepare(
      `UPDATE ${table} SET slug = ?, draft = ?, dirty = ?, updated_by = ?, updated_at = ?, ${Object.keys(cols).map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    ).bind(d.slug, json, row.published === json ? 0 : 1, c.get('user').username, at, ...Object.values(cols), id).run()
    return c.json({ ok: true, updated_at: at, dirty: row.published !== json, issues: publishIssues(kind, d) })
  })

  r.post('/:id/publish', async (c) => {
    const id = Number(c.req.param('id'))
    const row = await get(c.env, id)
    if (!row) return c.json({ error: 'not_found', message: `${label} tidak ditemukan.` }, 404)
    if (row.state === 'trashed') return c.json({ error: 'trashed', message: 'Pulihkan dari Trash dulu sebelum publish.' }, 400)
    const raw = JSON.parse(row.draft)
    const issues = publishIssues(kind, kind === 'article' ? normalizeArticle(raw) : raw)
    if (issues.length) return c.json({ error: 'incomplete', message: `Lengkapi dulu: ${issues.slice(0, 4).join(', ')}${issues.length > 4 ? ` dan ${issues.length - 4} lainnya` : ''}.`, issues }, 400)
    const at = now()
    // articles carry the day they go live (again), so the newest sits on top of the Articles page
    const stamp =
      kind === 'article'
        ? [c.env.CONTENT_DB.prepare(`UPDATE articles SET draft = json_set(draft, '$.date', ?), date = ? WHERE id = ?`).bind(today(), today(), id)]
        : []
    // Publish the new identity and its references atomically. Draft slug edits leave the live site alone.
    const previousSlug = row.published ? (JSON.parse(row.published) as { slug: string }).slug : null
    const references = kind === 'project' && previousSlug && previousSlug !== raw.slug
      ? await projectReferenceUpdates(c.env, previousSlug, raw.slug)
      : []
    await c.env.CONTENT_DB.batch([
      ...stamp,
      ...references,
      c.env.CONTENT_DB.prepare(`UPDATE ${table} SET state = 'published', published = draft, dirty = 0, published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`)
        .bind(at, c.get('user').username, at, id),
      bumpVersion(c.env),
    ])
    return c.json({ ok: true, state: 'published', published_at: at })
  })

  r.post('/:id/takedown', async (c) => {
    const id = Number(c.req.param('id'))
    const row = await get(c.env, id)
    if (!row) return c.json({ error: 'not_found', message: `${label} tidak ditemukan.` }, 404)
    if (row.state !== 'published') return c.json({ error: 'not_live', message: `${label} ini tidak sedang tayang.` }, 400)
    await c.env.CONTENT_DB.batch([
      c.env.CONTENT_DB.prepare(`UPDATE ${table} SET state = 'taken_down', updated_by = ?, updated_at = ? WHERE id = ?`).bind(c.get('user').username, now(), id),
      bumpVersion(c.env),
    ])
    return c.json({ ok: true, state: 'taken_down' })
  })

  r.post('/:id/trash', async (c) => {
    const id = Number(c.req.param('id'))
    const row = await get(c.env, id)
    if (!row) return c.json({ error: 'not_found', message: `${label} tidak ditemukan.` }, 404)
    await c.env.CONTENT_DB.batch([
      c.env.CONTENT_DB.prepare(`UPDATE ${table} SET state = 'trashed', trashed_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`).bind(now(), c.get('user').username, now(), id),
      bumpVersion(c.env),
    ])
    return c.json({ ok: true, state: 'trashed' })
  })

  r.post('/:id/restore', async (c) => {
    const id = Number(c.req.param('id'))
    const row = await get(c.env, id)
    if (!row) return c.json({ error: 'not_found', message: `${label} tidak ditemukan.` }, 404)
    // back as a draft (or as taken down, if it was ever live): restoring never puts anything on the site by itself
    const state = row.published ? 'taken_down' : 'draft'
    await c.env.CONTENT_DB.prepare(`UPDATE ${table} SET state = ?, trashed_at = NULL, updated_by = ?, updated_at = ? WHERE id = ?`)
      .bind(state, c.get('user').username, now(), id).run()
    return c.json({ ok: true, state })
  })

  r.delete('/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const row = await get(c.env, id)
    if (!row) return c.json({ error: 'not_found', message: `${label} tidak ditemukan.` }, 404)
    if (row.state !== 'trashed') return c.json({ error: 'not_trashed', message: 'Pindahkan ke Trash dulu sebelum menghapus permanen.' }, 400)
    await c.env.CONTENT_DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run()
    // gone for good: its pin (or its place among those kept out) of the Articles banner goes too
    if (kind === 'article') await forgetInBanner(c.env, c.get('user').username, id).catch((e) => console.error('banner forget', e))
    return c.json({ ok: true })
  })

  r.post('/:id/duplicate', async (c) => {
    const row = await get(c.env, Number(c.req.param('id')))
    if (!row) return c.json({ error: 'not_found', message: `${label} tidak ditemukan.` }, 404)
    const d = JSON.parse(row.draft) as ProjectContent | ArticleContent
    let slug = `${d.slug}-copy`
    for (let n = 2; await slugTaken(c.env, slug); n++) slug = `${d.slug}-copy-${n}`
    const copy =
      kind === 'project'
        ? { ...(d as ProjectContent), slug, title: `${(d as ProjectContent).title} (copy)` }
        : { ...(d as ArticleContent), slug, title: { en: `${(d as ArticleContent).title.en} (copy)`, id: `${(d as ArticleContent).title.id} (salinan)` } }
    const cols = denorm(copy)
    const me = c.get('user').username
    const res = await c.env.CONTENT_DB.prepare(
      `INSERT INTO ${table} (slug, draft, created_by, updated_by, ${Object.keys(cols).join(', ')}) VALUES (?, ?, ?, ?, ${Object.keys(cols).map(() => '?').join(', ')}) RETURNING id`,
    ).bind(slug, JSON.stringify(copy), me, me, ...Object.values(cols)).first<{ id: number }>()
    return c.json({ id: res!.id }, 201)
  })

  // a link that shows the current draft on the public site for an hour
  r.post('/:id/preview', async (c) => {
    const row = await get(c.env, Number(c.req.param('id')))
    if (!row) return c.json({ error: 'not_found', message: `${label} tidak ditemukan.` }, 404)
    const token = newToken()
    await c.env.CONTENT_DB.batch([
      c.env.CONTENT_DB.prepare(`DELETE FROM previews WHERE expires_at < ?`).bind(now()),
      c.env.CONTENT_DB.prepare(`INSERT INTO previews (token, kind, content, expires_at) VALUES (?, ?, ?, ?)`)
        .bind(token, kind, kind === 'article' && !JSON.parse(row.draft).date ? JSON.stringify({ ...JSON.parse(row.draft), date: today() }) : row.draft, new Date(Date.now() + 3600e3).toISOString()),
    ])
    const path = kind === 'project' ? `/work/${row.slug}` : `/articles/${row.slug}`
    return c.json({ url: `${c.env.PUBLIC_SITE_URL}${path}?preview=${token}` })
  })

  if (kind === 'project')
    r.post('/reorder', async (c) => {
      const parsed = z.object({ ids: z.array(z.number().int()).max(500) }).safeParse(await c.req.json().catch(() => ({})))
      if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
      await c.env.CONTENT_DB.batch([
        ...parsed.data.ids.map((id, i) => c.env.CONTENT_DB.prepare('UPDATE projects SET position = ? WHERE id = ?').bind(i, id)),
        bumpVersion(c.env),
      ])
      return c.json({ ok: true })
    })

  return r
}

export const projectsApi = contentRoutes('project')
export const articlesApi = contentRoutes('article')
