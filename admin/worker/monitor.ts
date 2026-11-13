import { Hono } from 'hono'
import type { AppEnv, Env } from './env'
import { requireAdmin } from './auth'
import { BUILD_INFO_FILE, type BuildInfo } from '../../shared/build-info'

/*
 * The Monitoring page: is the website up (checked from here, like a visitor would), is its content API answering
 * with the published content, when were the website and the CMS last deployed, where the content stands, who can
 * sign in, and when the weekly photo cleanup last ran. Storage (D1 and R2) comes from /api/storage.
 */

export const monitorApi = new Hono<AppEnv>()
monitorApi.use('*', requireAdmin) // admins only: accounts, sign-in failures and deploy details are not for editors

const TIMEOUT = 8000

type Check = { ok: boolean; status: number | null; ms: number | null; error?: string }

/** One request with a deadline; never throws. */
async function probe(url: string, init?: RequestInit): Promise<Check & { res?: Response }> {
  const started = Date.now()
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT), headers: { 'cache-control': 'no-cache', ...init?.headers } })
    return { ok: res.ok, status: res.status, ms: Date.now() - started, res }
  } catch (e) {
    const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')
    return { ok: false, status: null, ms: null, error: timeout ? `Tidak menjawab dalam ${TIMEOUT / 1000} detik` : 'Tidak bisa dihubungi' }
  }
}

const buildOf = async (res: Response | undefined): Promise<BuildInfo | null> => {
  if (!res?.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null
  return res.json<BuildInfo>().catch(() => null)
}

async function website(env: Env) {
  const site = env.PUBLIC_SITE_URL.replace(/\/$/, '')
  const [home, api, build] = await Promise.all([probe(`${site}/`), probe(`${site}/api/public/content`), probe(`${site}/${BUILD_INFO_FILE}`)])
  // what the site actually serves: the published projects and articles, and the version (moves with every publish)
  let served: { projects: number; articles: number; version: string | null } | null = null
  if (api.ok && api.res) {
    const body = await api.res.json<{ projects?: unknown[]; articles?: unknown[] }>().catch(() => null)
    if (body) served = { projects: body.projects?.length ?? 0, articles: body.articles?.length ?? 0, version: api.res.headers.get('etag') }
  }
  const strip = ({ res: _res, ...c }: Check & { res?: Response }) => c
  return { url: site, home: strip(home), api: { ...strip(api), served }, build: await buildOf(build.res) }
}

async function cms(env: Env, origin: string) {
  // (no ASSETS binding in local dev: Vite serves the dashboard there, and there is no build to report)
  if (!env.ASSETS) return { build: null }
  try {
    return { build: await buildOf(await env.ASSETS.fetch(new Request(`${origin}/${BUILD_INFO_FILE}`))) }
  } catch {
    return { build: null }
  }
}

async function content(env: Env) {
  const one = <T>(sql: string) => env.CONTENT_DB.prepare(sql).first<T>()
  const [version, projects, articles, cleanup] = await Promise.all([
    one<{ value: string }>(`SELECT value FROM meta WHERE key = 'version'`),
    one<{ published: string | null; edited: string | null; pending: number }>(
      `SELECT MAX(published_at) AS published, MAX(updated_at) AS edited, SUM(CASE WHEN state = 'published' AND dirty = 1 THEN 1 ELSE 0 END) AS pending FROM projects WHERE state != 'trashed'`,
    ),
    one<{ published: string | null; edited: string | null; pending: number }>(
      `SELECT MAX(published_at) AS published, MAX(updated_at) AS edited, SUM(CASE WHEN state = 'published' AND dirty = 1 THEN 1 ELSE 0 END) AS pending FROM articles WHERE state != 'trashed'`,
    ),
    one<{ value: string }>(`SELECT value FROM meta WHERE key = 'media_cleanup'`),
  ])
  const latest = (a?: string | null, b?: string | null) => [a, b].filter(Boolean).sort().pop() ?? null
  return {
    lastPublish: version?.value ?? null,
    lastEdit: latest(projects?.edited, articles?.edited),
    pending: { projects: projects?.pending ?? 0, articles: articles?.pending ?? 0 },
    cleanup: cleanup ? (JSON.parse(cleanup.value) as { at: string; removed: number }) : null,
  }
}

async function accounts(env: Env) {
  const nowIso = new Date().toISOString()
  const dayAgo = new Date(Date.now() - 864e5).toISOString()
  const [users, sessions, failures] = await env.AUTH_DB.batch<Record<string, number | string | null>>([
    env.AUTH_DB.prepare(
      `SELECT COUNT(*) AS total, SUM(role = 'admin') AS admins, SUM(disabled = 1) AS disabled, SUM(locked_at IS NOT NULL) AS locked, MAX(last_login_at) AS lastLogin FROM users`,
    ),
    env.AUTH_DB.prepare(`SELECT COUNT(*) AS active FROM sessions WHERE expires_at > ?`).bind(nowIso),
    env.AUTH_DB.prepare(`SELECT COUNT(*) AS failed FROM login_failures WHERE at > ?`).bind(dayAgo),
  ])
  const u = users.results[0] ?? {}
  return {
    users: Number(u.total ?? 0),
    admins: Number(u.admins ?? 0),
    disabled: Number(u.disabled ?? 0),
    locked: Number(u.locked ?? 0),
    lastLogin: (u.lastLogin as string | null) ?? null,
    activeSessions: Number(sessions.results[0]?.active ?? 0),
    failedLogins24h: Number(failures.results[0]?.failed ?? 0),
  }
}

/** Mondays 03:00 UTC (admin/wrangler.jsonc, "0 3 * * 1"): the next time the photo cleanup runs. */
function nextCleanup(from = new Date()) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 3))
  const add = (1 - d.getUTCDay() + 7) % 7
  d.setUTCDate(d.getUTCDate() + add)
  if (d <= from) d.setUTCDate(d.getUTCDate() + 7)
  return d.toISOString()
}

/** Each part on its own: one that fails (and logs why) leaves the others on the page instead of failing them all. */
async function part<T>(name: string, work: Promise<T>): Promise<T | null> {
  try {
    return await work
  } catch (e) {
    console.error(`monitor: ${name} failed`, e)
    return null
  }
}

monitorApi.get('/', async (c) => {
  const origin = new URL(c.req.url).origin
  const [site, admin, cont, acc] = await Promise.all([
    part('website', website(c.env)),
    part('cms', cms(c.env, origin)),
    part('content', content(c.env)),
    part('accounts', accounts(c.env)),
  ])
  return c.json({ checkedAt: new Date().toISOString(), website: site, cms: admin, content: cont, accounts: acc, nextCleanup: nextCleanup() })
})

/** Called by the weekly cron: remember when the cleanup ran and what it removed, for the Monitoring page. */
export const recordCleanup = (env: Env, removed: number) =>
  env.CONTENT_DB.prepare(`INSERT INTO meta (key, value) VALUES ('media_cleanup', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`)
    .bind(JSON.stringify({ at: new Date().toISOString(), removed }))
    .run()
