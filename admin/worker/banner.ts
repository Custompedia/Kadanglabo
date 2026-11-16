import { Hono } from 'hono'
import { z } from 'zod'
import { BANNER_MAX, bannerPick, type BannerMode, type BannerSettings, type Tx } from '../../shared/content'
import { now, type AppEnv, type Env } from './env'
import { firstError } from './validate'

/*
 * The banner at the top of the Articles page (sidebar › Halaman website › Artikel, and the switch in the article
 * editor and in ArticleFlow's preview). Kept in `settings` under 'banner' by article id:
 *   pinned   always shown, first, in this order (at most BANNER_MAX of them live)
 *   hidden   never shown (the article itself stays live in the list)
 *   others   automatic: the newest live articles fill what is left
 * It is part of the core, not of ArticleFlow: it works the same for articles written here and for those that came
 * from ArticleFlow, with or without a subscription. Every change is one small write, saved and live at once, so the
 * three places that change it can never overwrite each other.
 */

export const bannerApi = new Hono<AppEnv>()

const bump = (env: Env) => env.CONTENT_DB.prepare(`UPDATE meta SET value = ? WHERE key = 'version'`).bind(now())

const clean = (raw: unknown): BannerSettings => {
  const s = (raw ?? {}) as Partial<BannerSettings>
  const ids = (v: unknown) => [...new Set((Array.isArray(v) ? v : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))]
  const hidden = ids(s.hidden)
  return { pinned: ids(s.pinned).filter((id) => !hidden.includes(id)), hidden }
}

async function readRow(env: Env) {
  const row = await env.CONTENT_DB.prepare(`SELECT value, updated_by, updated_at FROM settings WHERE key = 'banner'`).first<{ value: string; updated_by: string | null; updated_at: string | null }>()
  let value: unknown = null
  try {
    value = row ? JSON.parse(row.value) : null
  } catch {
    /* a broken value reads as nothing chosen */
  }
  return { raw: row?.value ?? null, settings: clean(value), updated_by: row?.updated_by ?? null, updated_at: row?.updated_at ?? null }
}

/**
 * Change the settings with `change`, safely against another change landing at the same moment (compare and swap,
 * tried again with the newer value). `change` may refuse by throwing a BannerRefusal.
 */
export async function writeBanner(env: Env, by: string, change: (s: BannerSettings) => BannerSettings) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { raw, settings } = await readRow(env)
    const next = clean(change(structuredClone(settings)))
    const value = JSON.stringify(next)
    // nothing changes (nothing saved yet and still nothing chosen means the same: the newest articles)
    if (value === JSON.stringify(settings) && (raw !== null || (!next.pinned.length && !next.hidden.length))) return next
    const at = now()
    const write = raw === null
      ? env.CONTENT_DB.prepare(`INSERT OR IGNORE INTO settings (key, value, updated_by, updated_at) VALUES ('banner', ?, ?, ?)`).bind(value, by, at)
      : env.CONTENT_DB.prepare(`UPDATE settings SET value = ?, updated_by = ?, updated_at = ? WHERE key = 'banner' AND value = ?`).bind(value, by, at, raw)
    const [res] = await env.CONTENT_DB.batch([write, bump(env)])
    if (res.meta.changes) return next
  }
  throw new Error('banner: too many concurrent changes')
}

export class BannerRefusal extends Error {}

/** An article deleted for good leaves the banner settings too (called by the article routes). */
export const forgetInBanner = (env: Env, by: string, id: number) =>
  writeBanner(env, by, (s) => ({ pinned: s.pinned.filter((x) => x !== id), hidden: s.hidden.filter((x) => x !== id) }))

type LiveArticle = { id: number; slug: string; title: Tx; cover: string; date: string; tag: Tx }

/** The articles on the site now, newest first: the same order the site uses. */
async function liveArticles(env: Env): Promise<LiveArticle[]> {
  const { results } = await env.CONTENT_DB.prepare(
    `SELECT id, json_extract(published, '$.slug') AS slug, json_extract(published, '$.title') AS title, json_extract(published, '$.cover') AS cover,
            json_extract(published, '$.date') AS date, json_extract(published, '$.tag') AS tag
     FROM articles WHERE state = 'published' AND published IS NOT NULL ORDER BY date DESC, id DESC`,
  ).all<{ id: number; slug: string; title: string | null; cover: string | null; date: string | null; tag: string | null }>()
  const tx = (j: string | null): Tx => {
    try {
      const v = j ? JSON.parse(j) : null
      return { en: String(v?.en ?? ''), id: String(v?.id ?? '') }
    } catch {
      return { en: '', id: '' }
    }
  }
  return results.map((r) => ({ id: r.id, slug: r.slug, title: tx(r.title), cover: r.cover ?? '', date: r.date ?? '', tag: tx(r.tag) }))
}

const modeOf = (s: BannerSettings, id: number): BannerMode => (s.pinned.includes(id) ? 'pinned' : s.hidden.includes(id) ? 'hidden' : 'auto')

/** Everything the dashboard shows: the settings, the live articles with their mode, and what the banner shows now. */
async function overview(env: Env) {
  const [row, live] = await Promise.all([readRow(env), liveArticles(env)])
  const s = row.settings
  const shown = bannerPick(live, (a) => a.id, s).map((a) => a.id)
  // pinned first in their order, then the rest newest first
  const pinnedLive = s.pinned.map((id) => live.find((a) => a.id === id)).filter((a): a is LiveArticle => !!a)
  const rest = live.filter((a) => !s.pinned.includes(a.id))
  return {
    max: BANNER_MAX,
    settings: s,
    shown,
    articles: [...pinnedLive, ...rest].map((a) => ({ ...a, mode: modeOf(s, a.id), position: shown.indexOf(a.id) + 1 || null })),
    updated_by: row.updated_by,
    updated_at: row.updated_at,
  }
}
export type BannerOverview = Awaited<ReturnType<typeof overview>>

bannerApi.get('/', async (c) => c.json(await overview(c.env)))

/** One article: automatic, pinned (added after the others pinned) or kept out. */
bannerApi.put('/articles/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const parsed = z.object({ mode: z.enum(['auto', 'pinned', 'hidden']) }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const article = Number.isInteger(id) ? await c.env.CONTENT_DB.prepare(`SELECT id FROM articles WHERE id = ?`).bind(id).first() : null
  if (!article) return c.json({ error: 'not_found', message: 'Artikel tidak ditemukan.' }, 404)
  const { mode } = parsed.data
  const live = mode === 'pinned' ? new Set((await liveArticles(c.env)).map((a) => a.id)) : null
  try {
    await writeBanner(c.env, c.get('user').username, (s) => {
      const pinned = s.pinned.filter((x) => x !== id)
      const hidden = s.hidden.filter((x) => x !== id)
      if (mode === 'pinned') {
        if (s.pinned.includes(id)) return s // already pinned: keeps its place
        if (pinned.filter((x) => live!.has(x)).length >= BANNER_MAX) throw new BannerRefusal(`Sudah ${BANNER_MAX} artikel disematkan. Lepas salah satu dulu.`)
        pinned.push(id)
      }
      if (mode === 'hidden') hidden.push(id)
      return { pinned, hidden }
    })
  } catch (e) {
    if (e instanceof BannerRefusal) return c.json({ error: 'full', message: e.message }, 409)
    throw e
  }
  return c.json(await overview(c.env))
})

/** The order of the pinned articles that are live (those not live keep their place behind them). */
bannerApi.put('/order', async (c) => {
  const parsed = z.object({ pinned: z.array(z.number().int().positive()).max(200) }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const order = parsed.data.pinned
  const live = new Set((await liveArticles(c.env)).map((a) => a.id))
  try {
    await writeBanner(c.env, c.get('user').username, (s) => {
      const current = s.pinned.filter((x) => live.has(x))
      if (order.length !== current.length || current.some((x) => !order.includes(x)))
        throw new BannerRefusal('Daftar sematan baru saja berubah di tempat lain. Muat ulang lalu coba lagi.')
      return { ...s, pinned: [...order, ...s.pinned.filter((x) => !live.has(x))] }
    })
  } catch (e) {
    if (e instanceof BannerRefusal) return c.json({ error: 'changed', message: e.message }, 409)
    throw e
  }
  return c.json(await overview(c.env))
})
