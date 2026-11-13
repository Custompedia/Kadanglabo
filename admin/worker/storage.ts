import { Hono } from 'hono'
import type { AppEnv, Env } from './env'

/* The right-hand "Storage" panel and the overview: how full each database and bucket is, and what is in them. */

export const storageApi = new Hono<AppEnv>()

const D1_LIMIT = 10 * 1024 ** 3 // per database on Workers Paid
/** The storage the dashboard measures against: R2's free allowance (10 GB a month), where the photos live -
    the databases are tiny next to them. Beyond it Cloudflare bills per GB; nothing stops working. */
const QUOTA = 10 * 1024 ** 3

/** A database's size in bytes (D1 reports it with every query). */
async function dbSize(db: D1Database) {
  const r = await db.prepare('SELECT 1').run()
  return (r.meta as { size_after?: number }).size_after ?? 0
}

async function counts(env: Env, table: 'projects' | 'articles') {
  const { results } = await env.CONTENT_DB.prepare(`SELECT state, COUNT(*) AS n FROM ${table} GROUP BY state`).all<{ state: string; n: number }>()
  const out = { draft: 0, published: 0, taken_down: 0, trashed: 0 }
  for (const r of results) out[r.state as keyof typeof out] = r.n
  return out
}

storageApi.get('/', async (c) => {
  const [auth, content, media, files, projects, articles] = await Promise.all([
    dbSize(c.env.AUTH_DB),
    dbSize(c.env.CONTENT_DB),
    dbSize(c.env.MEDIA_DB),
    c.env.MEDIA_DB.prepare('SELECT COUNT(*) AS n, COUNT(original_key) AS o, COALESCE(SUM(bytes), 0) AS bytes, COALESCE(SUM(original_bytes), 0) AS originals FROM media').first<{ n: number; o: number; bytes: number; originals: number }>(),
    counts(c.env, 'projects'),
    counts(c.env, 'articles'),
  ])
  return c.json({
    databases: [
      { name: 'kadanglabo-content', bytes: content, limit: D1_LIMIT },
      { name: 'kadanglabo-media', bytes: media, limit: D1_LIMIT },
      { name: 'kadanglabo-auth', bytes: auth, limit: D1_LIMIT },
    ],
    buckets: [
      { name: 'kadanglabo-media', bytes: files?.bytes ?? 0, objects: files?.n ?? 0 },
      { name: 'kadanglabo-originals', bytes: files?.originals ?? 0, objects: files?.o ?? 0 },
    ],
    projects,
    articles,
    quota: QUOTA,
  })
})
