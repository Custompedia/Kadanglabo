import { Hono } from 'hono'
import type { ArticleContent } from '../../../shared/content'
import { articlesApi } from '../../worker/content'
import { now, type AppEnv, type SessionUser } from '../../worker/env'
import { getItem, parse, type ItemRow } from './store'
import { tech, type FlowBindings } from './tech-client'

/*
 * What must reach its end even when a request is cut short:
 *   finish      Tech accepted the publish; the article still has to go live here
 *   live        tell Tech the public address
 *   taken_down  tell Tech an article was taken off the website
 * Jobs are tried right away, again whenever the dashboard asks for the status, and by the Worker's cron.
 */

export type JobKind = 'finish' | 'live' | 'taken_down'
interface JobRow { id: number; group_id: string; kind: JobKind; payload: string; attempts: number }

const GIVE_UP = 12 // tries for the two reports to Tech; finishing a publish never gives up

/** The dashboard's own article routes, run as `user`: the exact code path of the Artikel menu. */
async function core(env: FlowBindings, user: SessionUser, method: 'POST' | 'PUT', path: string, body?: unknown) {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('user', user)
    await next()
  })
  app.route('/', articlesApi)
  const res = await app.fetch(new Request(`http://core${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }), env)
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { ok: res.ok, status: res.status, data }
}

const systemUser = (name: string | null): SessionUser => ({ id: 0, username: name || 'articleflow', name: name || 'ArticleFlow', role: 'editor' })

/** A free address: the wanted slug, or the wanted slug with -2, -3, ... when another article already has it. */
export async function freeSlug(env: FlowBindings, wanted: string, exceptId = 0): Promise<string> {
  const taken = async (slug: string) =>
    !!(await env.CONTENT_DB.prepare(`SELECT 1 FROM articles WHERE id != ? AND (slug = ? OR json_extract(published, '$.slug') = ?)`).bind(exceptId, slug, slug).first())
  let slug = wanted
  for (let n = 2; await taken(slug); n++) slug = `${wanted.slice(0, 94)}-${n}`
  return slug
}

export class FinishError extends Error {}

/**
 * Tech has published: bring the stored draft live through the normal article routes. Safe to repeat: every step
 * looks at what is already there (the article row, its state) before acting.
 */
export async function finishLocal(env: FlowBindings, groupId: string, by: string | null): Promise<{ articleId: number; slug: string }> {
  const row = await getItem(env, groupId)
  if (!row) throw new FinishError('Artikel ini tidak ditemukan di ArticleFlow.')
  if (row.state === 'published' && row.article_id) {
    const slug = (await env.CONTENT_DB.prepare(`SELECT slug FROM articles WHERE id = ?`).bind(row.article_id).first<{ slug: string }>())?.slug
    if (slug) return { articleId: row.article_id, slug }
  }
  const draft = parse<ArticleContent | null>(row.draft, null)
  if (!draft) throw new FinishError('Draft artikel belum tersimpan.')
  const user = systemUser(by ?? row.decided_by)

  let article = row.article_id ? await env.CONTENT_DB.prepare(`SELECT id, slug, state FROM articles WHERE id = ?`).bind(row.article_id).first<{ id: number; slug: string; state: string }>() : null
  if (!article) {
    const slug = await freeSlug(env, draft.slug)
    const made = await core(env, user, 'POST', '/', { content: { ...draft, slug } })
    if (!made.ok) throw new FinishError(String(made.data.message ?? 'Artikel tidak bisa dibuat.'))
    article = { id: Number(made.data.id), slug, state: 'draft' }
    await env.CONTENT_DB.prepare(`UPDATE articleflow_items SET article_id = ?, updated_at = ? WHERE group_id = ?`).bind(article.id, now(), groupId).run()
  } else {
    if (article.state === 'trashed') {
      const back = await core(env, user, 'POST', `/${article.id}/restore`)
      if (!back.ok) throw new FinishError(String(back.data.message ?? 'Artikel tidak bisa dipulihkan dari Trash.'))
    }
    // a newer version of an article that is already here: the address stays what visitors already know
    const saved = await core(env, user, 'PUT', `/${article.id}`, { content: { ...draft, slug: article.slug } })
    if (!saved.ok) throw new FinishError(String(saved.data.message ?? 'Draft tidak bisa disimpan.'))
  }
  const live = await core(env, user, 'POST', `/${article.id}/publish`)
  if (!live.ok) throw new FinishError(String(live.data.message ?? 'Artikel tidak bisa ditayangkan.'))

  await env.CONTENT_DB.batch([
    env.CONTENT_DB.prepare(`UPDATE articleflow_items SET state = 'published', idem_key = NULL, lock_until = NULL, published_versions = versions, updated_at = ? WHERE group_id = ?`).bind(now(), groupId),
    // one open report per article is enough: the newest address wins
    env.CONTENT_DB.prepare(`UPDATE articleflow_outbox SET done_at = ?, last_error = 'superseded' WHERE group_id = ? AND kind IN ('live', 'taken_down', 'finish') AND done_at IS NULL`).bind(now(), groupId),
    enqueueStatement(env, groupId, 'live'),
  ])
  return { articleId: article.id, slug: article.slug }
}

export const enqueueStatement = (env: FlowBindings, groupId: string, kind: JobKind, payload: Record<string, unknown> = {}) =>
  env.CONTENT_DB.prepare(`INSERT INTO articleflow_outbox (group_id, kind, payload, next_at, created_at) VALUES (?, ?, ?, ?, ?)`).bind(groupId, kind, JSON.stringify(payload), now(), now())

export const pendingJobs = async (env: FlowBindings) =>
  (await env.CONTENT_DB.prepare(`SELECT COUNT(*) AS n FROM articleflow_outbox WHERE done_at IS NULL`).first<{ n: number }>())?.n ?? 0

/** The public addresses of an article, per language Tech has. */
function liveUrls(env: FlowBindings, row: ItemRow, slug: string) {
  const site = env.PUBLIC_SITE_URL.replace(/\/+$/, '')
  const en = `${site}/articles/${slug}`
  const urls: { en?: string; id?: string } = {}
  if (row.single_lang !== 'id') urls.en = en
  if (row.single_lang !== 'en') urls.id = `${en}?lang=id`
  return urls
}

async function run(env: FlowBindings, job: JobRow): Promise<'done' | { retry: string } | { drop: string }> {
  const row = await getItem(env, job.group_id)
  if (!row) return { drop: 'item gone' }
  if (job.kind === 'finish') {
    try {
      await finishLocal(env, job.group_id, null)
      return 'done'
    } catch (e) {
      return { retry: e instanceof Error ? e.message : 'failed' }
    }
  }
  // a report that Tech can never accept any more is dropped: the article itself is fine either way
  const final = (code: string) => ['NOT_FOUND', 'INVALID_INPUT', 'SUBSCRIPTION_EXPIRED', 'NOT_CONFIGURED'].includes(code)
  const key = `${job.kind}:${job.group_id}:${job.id}`
  if (job.kind === 'live') {
    const slug = row.article_id ? (await env.CONTENT_DB.prepare(`SELECT slug FROM articles WHERE id = ? AND state = 'published'`).bind(row.article_id).first<{ slug: string }>())?.slug : null
    if (!slug) return { drop: 'not live' }
    const res = await tech(env, `/articles/${encodeURIComponent(job.group_id)}/live`, { body: { urls: liveUrls(env, row, slug), idempotencyKey: key } })
    return res.ok ? 'done' : final(res.code) ? { drop: res.code } : { retry: res.code }
  }
  const res = await tech(env, `/articles/${encodeURIComponent(job.group_id)}/taken-down`, { body: { idempotencyKey: key } })
  return res.ok ? 'done' : final(res.code) ? { drop: res.code } : { retry: res.code }
}

/** Run the jobs that are due. Never throws; returns how many are still open. */
export async function drain(env: FlowBindings, limit = 6): Promise<number> {
  try {
    // a finished publish queues its own report: a second pass sends it in the same run
    for (let pass = 0; pass < 3; pass++) {
      const { results } = await env.CONTENT_DB.prepare(`SELECT id, group_id, kind, payload, attempts FROM articleflow_outbox WHERE done_at IS NULL AND next_at <= ? ORDER BY id LIMIT ?`).bind(now(), limit).all<JobRow>()
      for (const job of results) {
        // claim it first, so two drains running side by side never do the same job twice
        const claim = await env.CONTENT_DB.prepare(`UPDATE articleflow_outbox SET attempts = attempts + 1, next_at = ? WHERE id = ? AND done_at IS NULL AND attempts = ?`)
          .bind(new Date(Date.now() + 60_000).toISOString(), job.id, job.attempts).run()
        if (!claim.meta.changes) continue
        let outcome: Awaited<ReturnType<typeof run>>
        try {
          outcome = await run(env, job)
        } catch (e) {
          outcome = { retry: e instanceof Error ? e.message : 'failed' }
        }
        const attempts = job.attempts + 1
        if (outcome === 'done') await env.CONTENT_DB.prepare(`UPDATE articleflow_outbox SET done_at = ?, last_error = NULL WHERE id = ?`).bind(now(), job.id).run()
        else if ('drop' in outcome || (job.kind !== 'finish' && attempts >= GIVE_UP))
          await env.CONTENT_DB.prepare(`UPDATE articleflow_outbox SET done_at = ?, last_error = ? WHERE id = ?`).bind(now(), ('drop' in outcome ? outcome.drop : outcome.retry).slice(0, 300), job.id).run()
        else {
          // 1, 2, 4 ... minutes, at most six hours apart
          const wait = Math.min(2 ** (attempts - 1), 360) * 60_000
          await env.CONTENT_DB.prepare(`UPDATE articleflow_outbox SET next_at = ?, last_error = ? WHERE id = ?`).bind(new Date(Date.now() + wait).toISOString(), outcome.retry.slice(0, 300), job.id).run()
        }
      }
      if (!results.length) break
    }
    return await pendingJobs(env)
  } catch (e) {
    console.error('articleflow outbox', e)
    return 0
  }
}

/** Make every open job due now (the "Coba lagi" button). */
export const retryNow = (env: FlowBindings) => env.CONTENT_DB.prepare(`UPDATE articleflow_outbox SET next_at = ? WHERE done_at IS NULL`).bind(now()).run()
