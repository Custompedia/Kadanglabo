import { Hono, type Context, type MiddlewareHandler } from 'hono'
import { z } from 'zod'
import type { ArticleContent } from '../../../shared/content'
import { publishIssues } from '../../worker/content'
import { newToken } from '../../worker/crypto'
import { now, type AppEnv } from '../../worker/env'
import { articleSchema, firstError } from '../../worker/validate'
import type { FlowDetail, FlowItem, FlowOverview, FlowStatus, ImportResult, PublishResult, TechAnalytics, TechDetail, TechItem, TechStatus, Trouble } from '../types'
import { neededAssets, toArticle } from './convert'
import { drain, enqueueStatement, finishLocal, freeSlug, pendingJobs, retryNow } from './outbox'
import { GROUP_ID, allItems, busy, dropCache, getItem, localInfo, parse, readCache, ready, slugOf, viewOf, writeCache, type ItemRow } from './store'
import { configured, failureMessage, tech, techMedia, type FlowBindings, type TechFailure, type TechResult } from './tech-client'

/*
 * /api/articleflow: what the ArticleFlow page reads and does. Tech is the source of the articles and the numbers;
 * this side keeps only what it needs to put an article on the website (articleflow_items) and the last good
 * answers (articleflow_cache), so the page still opens while Tech cannot be reached.
 */

type FlowEnv = { Bindings: FlowBindings; Variables: AppEnv['Variables'] }
export const flowApi = new Hono<FlowEnv>()

const STATUS_FRESH_MS = 45_000 // the sidebar asks on every page: do not call Tech more often than this
const LOCK_MS = 90_000

/** Today in Yogyakarta (WIB), as YYYY-MM-DD: the same day the article routes stamp. */
const today = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)

const troubleOf = (f: TechFailure): Exclude<Trouble, null> =>
  f.code === 'NOT_CONFIGURED' ? 'not_configured' : f.code === 'UNAUTHORIZED' ? 'unauthorized' : f.code === 'SUBSCRIPTION_EXPIRED' ? 'expired' : 'unreachable'

const lockedState = (s: TechStatus | null) => !s || s.subscription.state === 'NONE' || s.subscription.state === 'EXPIRED'

const background = (c: Context<FlowEnv> | Context<AppEnv>, work: Promise<unknown>) => {
  try {
    c.executionCtx.waitUntil(work.catch(() => {}))
  } catch {
    void work.catch(() => {}) // no execution context (tests calling the app directly)
  }
}

/** The subscription and the counts: from Tech, or the last good read while Tech cannot be reached. */
async function readStatus(env: FlowBindings, fresh: boolean): Promise<FlowStatus> {
  return { ...(await statusOf(env, fresh)), contactUrl: /^(https:\/\/|mailto:)/.test(env.ARTICLEFLOW_CONTACT_URL?.trim() ?? '') ? env.ARTICLEFLOW_CONTACT_URL!.trim() : null }
}
async function statusOf(env: FlowBindings, fresh: boolean): Promise<Omit<FlowStatus, 'contactUrl'>> {
  const jobs = await pendingJobs(env)
  if (!configured(env)) return { configured: false, trouble: 'not_configured', stale: false, fetchedAt: null, status: null, locked: true, pendingJobs: jobs }
  const cached = await readCache<TechStatus>(env, 'status')
  if (!fresh && cached && Date.now() - Date.parse(cached.fetchedAt) < STATUS_FRESH_MS)
    return { configured: true, trouble: null, stale: false, fetchedAt: cached.fetchedAt, status: cached.value, locked: lockedState(cached.value), pendingJobs: jobs }
  const res = await tech<TechStatus>(env, '/status')
  if (res.ok && res.data?.subscription) {
    await writeCache(env, 'status', res.data)
    return { configured: true, trouble: null, stale: false, fetchedAt: now(), status: res.data, locked: lockedState(res.data), pendingJobs: jobs }
  }
  const trouble = res.ok ? 'unreachable' : troubleOf(res)
  // a key Tech refuses opens nothing, whatever was cached
  if (trouble === 'unauthorized') return { configured: true, trouble, stale: false, fetchedAt: null, status: null, locked: true, pendingJobs: jobs }
  return { configured: true, trouble, stale: !!cached, fetchedAt: cached?.fetchedAt ?? null, status: cached?.value ?? null, locked: lockedState(cached?.value ?? null), pendingJobs: jobs }
}

/** Tech said 402 in the middle of a session: the cached status must say so too, at once. */
async function markExpired(env: FlowBindings) {
  const cached = await readCache<TechStatus>(env, 'status')
  if (cached && cached.value.subscription.state !== 'EXPIRED')
    await writeCache(env, 'status', { ...cached.value, subscription: { ...cached.value.subscription, state: 'EXPIRED', daysLeft: 0 }, counts: null })
  else if (!cached) await dropCache(env, 'status')
}

const fold = async (env: FlowBindings, items: TechItem[], rows: Map<string, ItemRow>): Promise<FlowItem[]> =>
  Promise.all(items.map(async (item) => {
    const row = rows.get(item.groupId)
    return { ...item, local: localInfo(row, item, await slugOf(env, row?.article_id ?? null)), view: viewOf(item.status, row) }
  }))

const fail = (c: Context<FlowEnv>, f: TechFailure) =>
  c.json({ error: f.code.toLowerCase(), message: failureMessage(f), ...(f.reasons ? { reasons: f.reasons } : {}) }, f.status === 402 ? 402 : f.status === 404 ? 404 : f.status === 409 ? 409 : f.status === 400 ? 400 : 503)

const needsMigration = (c: Context<FlowEnv>) => c.json({ error: 'not_installed', message: 'Tabel ArticleFlow belum dibuat. Jalankan migrasi ArticleFlow dulu.' }, 503)

flowApi.use('*', async (c, next) => {
  if (!(await ready(c.env))) return needsMigration(c)
  await next()
})

/* ---- reading --------------------------------------------------------------------------------------------------- */

// the sidebar item and the page header; also the moment unfinished follow-ups get another try
flowApi.get('/status', async (c) => {
  background(c, drain(c.env))
  return c.json(await readStatus(c.env, c.req.query('fresh') === '1'))
})

// the whole page in one call: status, numbers, list
flowApi.get('/overview', async (c) => {
  background(c, drain(c.env))
  const status = await readStatus(c.env, true)
  const empty: FlowOverview = { ...status, analytics: null, items: [] }
  if (!status.configured || status.trouble === 'unauthorized') return c.json(empty)
  const rows = await allItems(c.env)
  if (status.locked && !status.stale && status.trouble === null) return c.json(empty) // no subscription: nothing else is readable

  const fromCache = async (trouble: Trouble) => {
    const [a, l] = await Promise.all([readCache<TechAnalytics>(c.env, 'analytics'), readCache<TechItem[]>(c.env, 'items')])
    return c.json({ ...status, trouble: status.trouble ?? trouble, stale: true, fetchedAt: l?.fetchedAt ?? a?.fetchedAt ?? status.fetchedAt, analytics: a?.value ?? null, items: await fold(c.env, l?.value ?? [], rows) } satisfies FlowOverview)
  }
  if (status.trouble) return fromCache(status.trouble)

  const [analytics, list] = await Promise.all([tech<TechAnalytics>(c.env, '/analytics'), tech<{ items: TechItem[] }>(c.env, '/articles')])
  for (const r of [analytics, list] as TechResult<unknown>[])
    if (!r.ok && r.status === 402) {
      await markExpired(c.env)
      return c.json({ ...(await readStatus(c.env, false)), trouble: 'expired', locked: true, analytics: null, items: [] } satisfies FlowOverview)
    }
  if (!list.ok || !Array.isArray(list.data?.items)) return fromCache(list.ok ? 'unreachable' : troubleOf(list))
  await writeCache(c.env, 'items', list.data.items)
  let numbers: TechAnalytics | null = null
  if (analytics.ok && analytics.data && typeof analytics.data === 'object') {
    numbers = analytics.data
    await writeCache(c.env, 'analytics', numbers)
  } else numbers = (await readCache<TechAnalytics>(c.env, 'analytics'))?.value ?? null
  return c.json({ ...status, analytics: numbers, items: await fold(c.env, list.data.items, rows) } satisfies FlowOverview)
})

const groupOf = (c: Context<FlowEnv>) => {
  const id = c.req.param('group') ?? ''
  return GROUP_ID.test(id) ? id : null
}

/** One article from Tech, or the failure to answer with. */
async function detailOf(env: FlowBindings, groupId: string): Promise<TechResult<TechDetail>> {
  const res = await tech<TechDetail>(env, `/articles/${encodeURIComponent(groupId)}`)
  if (!res.ok && res.status === 402) await markExpired(env)
  if (res.ok && (!Array.isArray(res.data.versions) || !Array.isArray(res.data.locales))) return { ok: false, status: 502, code: 'BAD_RESPONSE' }
  return res
}

/** Which of these media ids still exist (an unused upload is cleaned up after a week). */
async function liveMedia(env: FlowBindings, ids: string[]): Promise<Set<string>> {
  const wanted = [...new Set(ids.filter((id) => /^[a-z0-9-]{1,80}$/.test(id)))]
  if (!wanted.length) return new Set()
  const { results } = await env.MEDIA_DB.prepare(`SELECT id FROM media WHERE id IN (${wanted.map(() => '?').join(', ')})`).bind(...wanted).all<{ id: string }>()
  return new Set(results.map((r) => r.id))
}

flowApi.get('/items/:group', async (c) => {
  const groupId = groupOf(c)
  if (!groupId) return c.json({ error: 'not_found', message: 'Artikel tidak ditemukan.' }, 404)
  const res = await detailOf(c.env, groupId)
  if (!res.ok) return fail(c, res)
  const row = await getItem(c.env, groupId)
  const local = localInfo(row, res.data, await slugOf(c.env, row?.article_id ?? null))
  // only the uploads that are still in Media count: the page uploads the rest again
  const alive = await liveMedia(c.env, Object.values(local.assets))
  local.assets = Object.fromEntries(Object.entries(local.assets).filter(([, id]) => alive.has(id)))
  return c.json({ ...res.data, local, view: viewOf(res.data.status, row) } satisfies FlowDetail)
})

// a draft image, for the page to resize and store in Media like any other upload
flowApi.get('/items/:group/media/:asset', async (c) => {
  const groupId = groupOf(c)
  const asset = c.req.param('asset')
  if (!groupId || !/^[A-Za-z0-9_.:-]{1,160}$/.test(asset)) return c.json({ error: 'not_found', message: 'Gambar tidak ditemukan.' }, 404)
  const res = await techMedia(c.env, groupId, asset)
  if (!res) return c.json({ error: 'unavailable', message: 'Gambar dari Tech tidak bisa dibaca.' }, 502)
  return new Response(res.body, { headers: { 'content-type': res.headers.get('content-type') ?? 'image/webp', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } })
})

/* ---- preview: bring the article here as a draft ------------------------------------------------------------------ */

flowApi.post('/items/:group/import', async (c) => {
  const groupId = groupOf(c)
  if (!groupId) return c.json({ error: 'not_found', message: 'Artikel tidak ditemukan.' }, 404)
  const input = z.object({ assets: z.record(z.string().max(160), z.string().regex(/^[a-z0-9-]{1,80}$/)).default({}) }).safeParse(await c.req.json().catch(() => ({})))
  if (!input.success) return c.json({ error: 'invalid', message: firstError(input.error) }, 400)

  const res = await detailOf(c.env, groupId)
  if (!res.ok) return fail(c, res)
  const detail = res.data
  let row = await getItem(c.env, groupId)
  if (busy(row)) return c.json({ error: 'busy', message: 'Artikel ini sedang ditayangkan. Tunggu sebentar.' }, 409)

  const assets = { ...parse<Record<string, string>>(row?.assets, {}), ...input.data.assets }
  const alive = await liveMedia(c.env, Object.values(assets))
  const missing = neededAssets(detail).filter((id) => !assets[id] || !alive.has(assets[id]))
  if (missing.length) return c.json({ error: 'assets_missing', message: 'Sebagian gambar belum tersimpan di Media.', missing }, 400)

  const converted = toArticle(detail, assets)
  if (!converted) return c.json({ error: 'empty', message: 'Artikel dari Tech belum punya isi.' }, 422)
  const article = row?.article_id ? await c.env.CONTENT_DB.prepare(`SELECT id, slug FROM articles WHERE id = ?`).bind(row.article_id).first<{ id: number; slug: string }>() : null
  converted.content.slug = article?.slug ?? (await freeSlug(c.env, converted.content.slug))
  const parsed = articleSchema.safeParse(converted.content)
  if (!parsed.success) return c.json({ error: 'invalid', message: `Artikel dari Tech tidak bisa dipakai: ${firstError(parsed.error)}` }, 422)
  const draft = parsed.data as ArticleContent

  // what is live stays "published" while the same version is only looked at again; anything newer waits as a draft
  const live = parse<Record<string, string> | null>(row?.published_versions, null)
  const sameAsLive = !!live && JSON.stringify(Object.entries(live).sort()) === JSON.stringify(Object.entries(converted.versions).sort())
  const state = row && (row.state === 'published' || row.state === 'taken_down') && sameAsLive ? row.state : 'imported'
  const at = now()
  const token = newToken()
  await c.env.CONTENT_DB.batch([
    c.env.CONTENT_DB.prepare(
      `INSERT INTO articleflow_items (group_id, versions, draft, assets, single_lang, article_id, state, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(group_id) DO UPDATE SET versions = excluded.versions, draft = excluded.draft, assets = excluded.assets, single_lang = excluded.single_lang,
         article_id = excluded.article_id, state = excluded.state, lock_until = NULL, updated_at = excluded.updated_at`,
    ).bind(groupId, JSON.stringify(converted.versions), JSON.stringify(draft), JSON.stringify(assets), converted.singleLang, article?.id ?? null, state, at),
    c.env.CONTENT_DB.prepare(`DELETE FROM previews WHERE expires_at < ?`).bind(at),
    c.env.CONTENT_DB.prepare(`INSERT INTO previews (token, kind, content, expires_at) VALUES (?, 'article', ?, ?)`).bind(token, JSON.stringify({ ...draft, date: today() }), new Date(Date.now() + 3600e3).toISOString()),
  ])
  row = (await getItem(c.env, groupId))!
  return c.json({
    previewUrl: `${c.env.PUBLIC_SITE_URL.replace(/\/+$/, '')}/articles/${draft.slug}?preview=${token}`,
    issues: publishIssues('article', draft),
    singleLang: converted.singleLang,
    local: localInfo(row, detail, article?.slug ?? null),
  } satisfies ImportResult)
})

/* ---- publish --------------------------------------------------------------------------------------------------- */

flowApi.post('/items/:group/publish', async (c) => {
  const groupId = groupOf(c)
  if (!groupId) return c.json({ error: 'not_found', message: 'Artikel tidak ditemukan.' }, 404)
  const me = c.get('user')
  const row = await getItem(c.env, groupId)
  const draft = parse<ArticleContent | null>(row?.draft, null)
  if (!row || !draft) return c.json({ error: 'not_imported', message: 'Buka pratinjau artikel ini dulu sebelum publish.' }, 409)
  if (row.state === 'finishing') {
    // Tech already said yes: only the local half is left, and it is being finished
    background(c, drain(c.env))
    return c.json({ state: 'finishing', articleId: row.article_id, slug: null, url: null } satisfies PublishResult, 202)
  }
  if (row.state === 'published') {
    const slug = await slugOf(c.env, row.article_id)
    return c.json({ state: 'published', articleId: row.article_id, slug, url: slug ? `${c.env.PUBLIC_SITE_URL.replace(/\/+$/, '')}/articles/${slug}` : null } satisfies PublishResult)
  }

  // everything that could still stop the article here is checked before Tech is asked
  const issues = publishIssues('article', draft)
  if (issues.length) return c.json({ error: 'incomplete', message: `Artikel belum bisa tayang. Belum lengkap: ${issues.slice(0, 4).join(', ')}.`, issues }, 400)
  const used = [draft.cover, ...Object.values(parse<Record<string, string>>(row.assets, {}))].filter(Boolean)
  const alive = await liveMedia(c.env, used)
  if (used.some((id) => !alive.has(id))) return c.json({ error: 'reimport', message: 'Gambar artikel perlu disiapkan ulang. Buka pratinjau sekali lagi.' }, 409)

  // one publish at a time per article: the row is held until this request (or its deadline) ends
  const at = now()
  const key = row.idem_key ?? `pub_${crypto.randomUUID().replaceAll('-', '')}`
  const hold = await c.env.CONTENT_DB.prepare(
    `UPDATE articleflow_items SET state = 'publishing', lock_until = ?, idem_key = ?, decided_by = ?, decided_at = ?, updated_at = ?
     WHERE group_id = ? AND versions = ? AND (state IN ('imported', 'taken_down') OR (state = 'publishing' AND (lock_until IS NULL OR lock_until <= ?)))`,
  ).bind(new Date(Date.now() + LOCK_MS).toISOString(), key, me.username, at, at, groupId, row.versions, at).run()
  if (!hold.meta.changes) return c.json({ error: 'busy', message: 'Artikel ini sedang ditayangkan. Tunggu sebentar.' }, 409)
  const release = (keepKey: boolean) =>
    c.env.CONTENT_DB.prepare(`UPDATE articleflow_items SET state = ?, lock_until = NULL, idem_key = ?, updated_at = ? WHERE group_id = ? AND state = 'publishing'`)
      .bind(row.state === 'taken_down' ? 'taken_down' : 'imported', keepKey ? key : null, now(), groupId).run()

  const versions = parse<Record<string, string>>(row.versions, {})
  let res: TechResult<{ published?: unknown }>
  try {
    res = await tech(c.env, `/articles/${encodeURIComponent(groupId)}/publish`, { body: { versions, actor: { name: me.name || me.username }, idempotencyKey: key } })
  } catch {
    res = { ok: false, status: null, code: 'UNREACHABLE' }
  }
  if (!res.ok) {
    // no answer at all: Tech may have published. The same key is sent again next time, so it can never publish twice.
    await release(res.status === null || res.status >= 500)
    if (res.status === 402) await markExpired(c.env)
    return fail(c, res)
  }

  // Tech has published. From here the article must reach the website: now, or by the follow-up job.
  await c.env.CONTENT_DB.batch([
    c.env.CONTENT_DB.prepare(`UPDATE articleflow_items SET state = 'finishing', lock_until = NULL, updated_at = ? WHERE group_id = ?`).bind(now(), groupId),
    enqueueStatement(c.env, groupId, 'finish'),
  ])
  await dropCache(c.env, 'items', 'status')
  try {
    const done = await finishLocal(c.env, groupId, me.username)
    background(c, drain(c.env)) // the report of the live address
    return c.json({ state: 'published', articleId: done.articleId, slug: done.slug, url: `${c.env.PUBLIC_SITE_URL.replace(/\/+$/, '')}/articles/${done.slug}` } satisfies PublishResult)
  } catch (e) {
    console.error('articleflow finish', e)
    return c.json({ state: 'finishing', articleId: null, slug: null, url: null } satisfies PublishResult, 202)
  }
})

/* ---- ask for changes ------------------------------------------------------------------------------------------- */

flowApi.post('/items/:group/decision', async (c) => {
  const groupId = groupOf(c)
  if (!groupId) return c.json({ error: 'not_found', message: 'Artikel tidak ditemukan.' }, 404)
  const input = z.object({
    comment: z.string().trim().min(1, 'Tulis alasan revisinya dulu').max(2000, 'Alasan paling panjang 2000 huruf'),
    versions: z.record(z.string().max(160), z.string().max(160)),
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
  }).safeParse(await c.req.json().catch(() => ({})))
  if (!input.success) return c.json({ error: 'invalid', message: firstError(input.error) }, 400)
  const row = await getItem(c.env, groupId)
  if (busy(row)) return c.json({ error: 'busy', message: 'Artikel ini sedang ditayangkan. Tunggu sebentar.' }, 409)
  const me = c.get('user')
  const res = await tech<TechItem>(c.env, `/articles/${encodeURIComponent(groupId)}/decision`, {
    body: { decision: 'CHANGES_REQUESTED', comment: input.data.comment, versions: input.data.versions, actor: { name: me.name || me.username }, idempotencyKey: input.data.idempotencyKey },
  })
  if (!res.ok) {
    if (res.status === 402) await markExpired(c.env)
    return fail(c, res)
  }
  if (row) await c.env.CONTENT_DB.prepare(`UPDATE articleflow_items SET reason = ?, decided_by = ?, decided_at = ?, updated_at = ? WHERE group_id = ?`).bind(input.data.comment, me.username, now(), now(), groupId).run()
  await dropCache(c.env, 'items', 'status')
  const after = await getItem(c.env, groupId)
  const item = res.data && Array.isArray(res.data.locales) ? res.data : null
  return c.json({ ok: true, item: item ? { ...item, local: localInfo(after, item, await slugOf(c.env, after?.article_id ?? null)), view: viewOf(item.status, after) } : null })
})

// "Coba lagi": every unfinished follow-up, now
flowApi.post('/retry', async (c) => {
  await retryNow(c.env)
  return c.json({ pendingJobs: await drain(c.env, 12) })
})

/* ---- the Artikel menu: tell Tech when one of its articles leaves the website ------------------------------------ */

/**
 * Runs after the normal article routes. Take down / Trash of an ArticleFlow article is reported to Tech; putting it
 * live again from the Artikel menu is reported too; deleting it for good only forgets the link.
 */
export const articleHook: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next()
  const m = /\/articles\/(\d+)(?:\/(takedown|trash|publish))?$/.exec(c.req.path)
  if (!m || !c.res.ok || (c.req.method !== 'POST' && c.req.method !== 'DELETE')) return
  const [, id, action] = m
  if (c.req.method === 'POST' && !action) return
  const env = c.env as FlowBindings
  try {
    if (!(await ready(env))) return
    const row = await env.CONTENT_DB.prepare(`SELECT group_id, state FROM articleflow_items WHERE article_id = ?`).bind(Number(id)).first<{ group_id: string; state: string }>()
    if (!row) return
    const at = now()
    const closeOpen = env.CONTENT_DB.prepare(`UPDATE articleflow_outbox SET done_at = ?, last_error = 'superseded' WHERE group_id = ? AND kind IN ('live', 'taken_down') AND done_at IS NULL`).bind(at, row.group_id)
    if (c.req.method === 'DELETE') {
      await env.CONTENT_DB.prepare(`UPDATE articleflow_items SET article_id = NULL, updated_at = ? WHERE group_id = ?`).bind(at, row.group_id).run()
    } else if ((action === 'takedown' || action === 'trash') && row.state === 'published') {
      await env.CONTENT_DB.batch([
        env.CONTENT_DB.prepare(`UPDATE articleflow_items SET state = 'taken_down', updated_at = ? WHERE group_id = ?`).bind(at, row.group_id),
        closeOpen,
        enqueueStatement(env, row.group_id, 'taken_down'),
      ])
    } else if (action === 'publish' && row.state === 'taken_down') {
      await env.CONTENT_DB.batch([
        env.CONTENT_DB.prepare(`UPDATE articleflow_items SET state = 'published', updated_at = ? WHERE group_id = ?`).bind(at, row.group_id),
        closeOpen,
        enqueueStatement(env, row.group_id, 'live'),
      ])
    } else return
    background(c, drain(env))
  } catch (e) {
    console.error('articleflow hook', e) // the article action itself already succeeded: never fail it from here
  }
}
