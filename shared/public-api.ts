import { normalizeArticle, type AreaDef, type MediaMeta, type PageSettings, type ProjectContent, type PublicContent } from './content'

/*
 * What the public site reads from the CMS, read-only:
 *   GET /api/public/content         every published project, archive entry and article, plus the image sizes
 *   GET /api/public/preview/:token  one draft, through the dashboard's Preview link (expires after an hour)
 *   GET /media/{id}-{width}.webp    an uploaded image, from R2
 * Served by the site's Worker (worker/public.ts) and, for local development, by the dashboard's Worker too.
 * The content answer is cached at the edge under the content version, which every publish changes, so a publish
 * shows at once while ordinary visits never touch the database beyond one tiny read.
 */

export interface PublicEnv {
  CONTENT_DB: D1Database
  MEDIA_DB: D1Database
  MEDIA: R2Bucket
}

/** Bump when the shape of the content answer changes, so cached copies from older code are not served. */
const SCHEMA = 2

const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8', ...headers } })

/** Every image id a piece of content mentions. */
function mediaIds(content: unknown[]): string[] {
  const ids = new Set<string>()
  for (const m of JSON.stringify(content).matchAll(/"([a-z0-9-]{1,80})"/g)) ids.add(m[1])
  return [...ids]
}

async function mediaFor(env: PublicEnv, content: unknown[]): Promise<Record<string, MediaMeta>> {
  const ids = mediaIds(content)
  const out: Record<string, MediaMeta> = {}
  // D1 caps bound parameters per query; ask in slices
  for (let i = 0; i < ids.length; i += 90) {
    const slice = ids.slice(i, i + 90)
    const { results } = await env.MEDIA_DB.prepare(`SELECT id, w, h, color, sizes FROM media WHERE id IN (${slice.map(() => '?').join(',')})`)
      .bind(...slice)
      .all<{ id: string; w: number; h: number; color: string; sizes: string }>()
    for (const r of results) out[r.id] = { w: r.w, h: r.h, c: r.color, s: JSON.parse(r.sizes) }
  }
  return out
}

async function content(env: PublicEnv, req: Request, ctx: ExecutionContext) {
  const version = (await env.CONTENT_DB.prepare(`SELECT value FROM meta WHERE key = 'version'`).first<{ value: string }>())?.value ?? '0'
  const etag = `"${version}-${SCHEMA}"`
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers: { etag } })

  const cache = (caches as unknown as { default: Cache }).default
  const key = new Request(`https://cms-cache.kadanglabo/content?v=${encodeURIComponent(version)}&s=${SCHEMA}`)
  const hit = await cache.match(key)
  if (hit) return withEtag(hit, etag)

  // one round trip for everything the site needs
  const [p, a, areas, cities, settings] = await env.CONTENT_DB.batch([
    env.CONTENT_DB.prepare(`SELECT published FROM projects WHERE state = 'published' AND published IS NOT NULL ORDER BY position, id`),
    env.CONTENT_DB.prepare(`SELECT published FROM articles WHERE state = 'published' AND published IS NOT NULL ORDER BY date DESC, id DESC`),
    env.CONTENT_DB.prepare(`SELECT id, key, label FROM areas ORDER BY position, id`),
    env.CONTENT_DB.prepare(`SELECT name, area_id FROM cities ORDER BY name COLLATE NOCASE`),
    env.CONTENT_DB.prepare(`SELECT value FROM settings WHERE key = 'pages'`),
  ])
  const projects = (p.results as { published: string }[]).map((r) => JSON.parse(r.published) as ProjectContent)
  const articles = (a.results as { published: string }[]).map((r) => normalizeArticle(JSON.parse(r.published)))
  const cityRows = cities.results as { name: string; area_id: number }[]
  const areaDefs: AreaDef[] = (areas.results as { id: number; key: string; label: string }[]).map((x) => ({
    key: x.key,
    label: x.label,
    regions: cityRows.filter((c) => c.area_id === x.id).map((c) => c.name),
  }))
  const pagesRow = (settings.results as { value: string }[])[0]
  const pages = pagesRow ? (JSON.parse(pagesRow.value) as PageSettings) : null
  const body: PublicContent = { projects, articles, areas: areaDefs, pages, media: await mediaFor(env, [...projects, ...articles, pages]), version }
  const res = json(body, { 'cache-control': 'public, max-age=0, must-revalidate', etag })
  ctx.waitUntil(cache.put(key, new Response(res.clone().body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400' } })))
  return res
}

function withEtag(res: Response, etag: string) {
  return new Response(res.body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate', etag } })
}

async function preview(env: PublicEnv, token: string) {
  const row = await env.CONTENT_DB.prepare(`SELECT kind, content FROM previews WHERE token = ? AND expires_at > ?`).bind(token, new Date().toISOString()).first<{ kind: string; content: string }>()
  if (!row) return json({ error: 'expired' }, { 'cache-control': 'no-store' })
  const c = row.kind === 'article' ? normalizeArticle(JSON.parse(row.content)) : JSON.parse(row.content)
  return json({ kind: row.kind, content: c, media: await mediaFor(env, [c]) }, { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' })
}

async function media(env: PublicEnv, path: string, req: Request, ctx: ExecutionContext) {
  const key = path.replace(/^\//, '')
  if (!/^media\/[a-z0-9-]+-\d+\.webp$/.test(key)) return new Response('Not found', { status: 404 })
  // a file never changes under its name (a new upload gets a new id), so the edge copy is good forever
  const cache = (caches as unknown as { default: Cache }).default
  const cacheKey = new Request(new URL(path, req.url).toString())
  const hit = await cache.match(cacheKey)
  if (hit) return hit.headers.get('etag') && req.headers.get('if-none-match') === hit.headers.get('etag') ? new Response(null, { status: 304, headers: hit.headers }) : hit
  const obj = await env.MEDIA.get(key)
  if (!obj) return new Response('Not found', { status: 404 })
  const headers = new Headers({ 'content-type': 'image/webp', 'cache-control': 'public, max-age=31536000, immutable', etag: obj.httpEtag })
  const res = new Response(obj.body, { headers })
  ctx.waitUntil(cache.put(cacheKey, res.clone()))
  return res
}

/** The public routes; null for anything else. */
export async function handlePublic(req: Request, env: PublicEnv, ctx: ExecutionContext): Promise<Response | null> {
  const { pathname } = new URL(req.url)
  if (req.method !== 'GET' && req.method !== 'HEAD') return null
  if (pathname.startsWith('/media/')) return media(env, pathname, req, ctx)
  if (pathname === '/api/public/content') return content(env, req, ctx)
  const m = pathname.match(/^\/api\/public\/preview\/([\w-]{20,})$/)
  if (m) return preview(env, m[1])
  if (pathname.startsWith('/api/public/')) return json({ error: 'not_found' })
  return null
}
