import type { Env } from './env'

/*
 * Old addresses of projects and articles, so a link shared before an address was changed still opens the page.
 * Kept in `settings` under 'redirects' as { project: { oldSlug: id }, article: { oldSlug: id } }: by id, so a chain
 * of renames (a → b → c) always leads to the current address, and the public answer turns each into the live slug
 * (shared/public-api.ts). An address that is live again (the same or another record took it) stops redirecting.
 */

type Kind = 'project' | 'article'
export type RedirectMap = Record<Kind, Record<string, number>>

const empty = (): RedirectMap => ({ project: {}, article: {} })

export async function readRedirects(env: Env): Promise<{ raw: string | null; map: RedirectMap }> {
  const row = await env.CONTENT_DB.prepare(`SELECT value FROM settings WHERE key = 'redirects'`).first<{ value: string }>()
  if (!row) return { raw: null, map: empty() }
  try {
    const v = JSON.parse(row.value) as Partial<RedirectMap>
    return { raw: row.value, map: { project: { ...(v.project ?? {}) }, article: { ...(v.article ?? {}) } } }
  } catch {
    return { raw: row.value, map: empty() }
  }
}

const write = (env: Env, map: RedirectMap) =>
  env.CONTENT_DB.prepare(
    `INSERT INTO settings (key, value, updated_by, updated_at) VALUES ('redirects', ?, 'system', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).bind(JSON.stringify(map), new Date().toISOString())

/**
 * Statements for the publish transaction of record `id`: the address it leaves (if any) now leads to it, and the
 * address it goes live under no longer redirects anywhere. Empty when nothing changes.
 */
export async function redirectUpdates(env: Env, kind: Kind, id: number, from: string | null, to: string): Promise<D1PreparedStatement[]> {
  const { map } = await readRedirects(env)
  const before = JSON.stringify(map)
  delete map[kind][to]
  if (from && from !== to) map[kind][from] = id
  return JSON.stringify(map) === before ? [] : [write(env, map)]
}

/** A record deleted for good: its old addresses lead nowhere any more. */
export async function forgetRedirects(env: Env, kind: Kind, id: number) {
  const { raw, map } = await readRedirects(env)
  if (raw === null) return
  const before = JSON.stringify(map)
  for (const [slug, target] of Object.entries(map[kind])) if (target === id) delete map[kind][slug]
  if (JSON.stringify(map) !== before) await write(env, map).run()
}
