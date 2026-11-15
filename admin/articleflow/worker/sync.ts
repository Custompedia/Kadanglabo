import { now } from '../../worker/env'
import type { TechItem, TechList } from '../types'
import { core, drain, systemUser } from './outbox'
import { GROUP_ID, busy, getItem, ready, writeCache } from './store'
import { configured, tech, type FlowBindings } from './tech-client'

/*
 * What happened to Tech's articles on Tech's side, brought here. Tech is the source of truth for them:
 *   removed    every language was deleted in Tech: the article leaves this website for good (an outbox job, so it
 *              finishes even when cut short)
 *   WITHDRAWN  Tech took a published article off the website: it is taken down here too and stays in the Artikel menu
 * Only what Tech names is acted on: an article that is merely missing from the list is never taken as deleted.
 * Nothing here is reported back to Tech: it is Tech's own news, and the article routes are called without the hook.
 * Runs on every good read of the list (the page's /overview) and on the Worker's cron.
 */

/** Apply one answer of GET /articles. Never throws. */
export async function applyTechList(env: FlowBindings, list: TechList): Promise<void> {
  try {
    const removed = (Array.isArray(list.removed) ? list.removed : []).map((r) => r?.groupId).filter((g): g is string => typeof g === 'string' && GROUP_ID.test(g))
    for (const groupId of new Set(removed)) await queueRemoval(env, groupId)
    if (removed.length) await drain(env, 20, ['remove']) // local work only: done before the page answers
    for (const item of Array.isArray(list.items) ? list.items : []) {
      if (item?.status !== 'WITHDRAWN' || typeof item.groupId !== 'string') continue
      await withdraw(env, item).catch((e) => console.error('articleflow withdraw', item.groupId, e))
    }
  } catch (e) {
    console.error('articleflow sync', e)
  }
}

/** The cron: read the list from Tech itself and apply it. */
export async function syncFromTech(env: FlowBindings): Promise<void> {
  if (!configured(env) || !(await ready(env))) return
  const res = await tech<TechList>(env, '/articles')
  if (!res.ok || !Array.isArray(res.data?.items)) return
  await writeCache(env, 'items', res.data.items)
  await applyTechList(env, res.data)
}

/** One `remove` job per group that is still here; a group that is already gone, or already queued, is left alone. */
const queueRemoval = (env: FlowBindings, groupId: string) =>
  env.CONTENT_DB.prepare(
    `INSERT INTO articleflow_outbox (group_id, kind, payload, next_at, created_at)
     SELECT ?, 'remove', '{}', ?, ? WHERE EXISTS (SELECT 1 FROM articleflow_items WHERE group_id = ?)
       AND NOT EXISTS (SELECT 1 FROM articleflow_outbox WHERE group_id = ? AND kind = 'remove' AND done_at IS NULL)`,
  ).bind(groupId, now(), now(), groupId, groupId).run()

/**
 * Tech withdrew the article: if it is live here, it is taken down through the normal route (it stays in the Artikel
 * menu), marked as Tech's doing, and reports to Tech that are still open are closed (Tech would refuse them). Safe
 * to repeat: an article that is not live is left as it is. Publishing it again from the Artikel menu does not hold:
 * the next read of the list takes it down again, as long as Tech says WITHDRAWN.
 */
async function withdraw(env: FlowBindings, item: TechItem) {
  const row = await getItem(env, item.groupId)
  if (!row || busy(row)) return
  const article = row.article_id ? await env.CONTENT_DB.prepare(`SELECT id, state FROM articles WHERE id = ?`).bind(row.article_id).first<{ id: number; state: string }>() : null
  if (article?.state !== 'published' && row.state !== 'published') return
  if (article?.state === 'published') {
    const down = await core(env, systemUser(null), 'POST', `/${article.id}/takedown`)
    if (!down.ok) throw new Error(String(down.data.message ?? 'takedown failed'))
  }
  const at = now()
  await env.CONTENT_DB.batch([
    env.CONTENT_DB.prepare(`UPDATE articleflow_items SET state = CASE WHEN state = 'published' THEN 'taken_down' ELSE state END, updated_at = ? WHERE group_id = ?`).bind(at, item.groupId),
    env.CONTENT_DB.prepare(`INSERT OR IGNORE INTO articleflow_withdrawn (group_id, withdrawn_at) VALUES (?, ?)`).bind(item.groupId, at),
    env.CONTENT_DB.prepare(`UPDATE articleflow_outbox SET done_at = ?, last_error = 'withdrawn in Tech' WHERE group_id = ? AND kind IN ('live', 'taken_down') AND done_at IS NULL`).bind(at, item.groupId),
  ])
}
