import type { Doc } from '../../../shared/content'
import { now } from '../../worker/env'
import { checkAlignment } from './align'
import type { LocalInfo, LocalState, TechItem, TechLocale, TopicTag, ViewStatus } from '../types'
import type { FlowBindings } from './tech-client'

/*
 * ArticleFlow's own tables (migrations/0001_articleflow.sql, 0002_articleflow_sync.sql): the item rows, Tech's
 * withdrawals and the last good answers from Tech.
 */

export interface ItemRow {
  group_id: string
  versions: string
  draft: string | null
  assets: string
  single_lang: TechLocale | null
  article_id: number | null
  state: Exclude<LocalState, 'none'>
  idem_key: string | null
  lock_until: string | null
  published_versions: string | null
  decided_by: string | null
  decided_at: string | null
  reason: string | null
  updated_at: string
  /** from articleflow_withdrawn: Tech took the article off the website at this moment */
  withdrawn_at: string | null
}

export const GROUP_ID = /^[A-Za-z0-9_.:-]{1,160}$/

/** False until both migrations have run: the page then says so instead of failing. */
export async function ready(env: FlowBindings): Promise<boolean> {
  try {
    const row = await env.CONTENT_DB.prepare(`SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('articleflow_items', 'articleflow_withdrawn')`).first<{ n: number }>()
    return row?.n === 2
  } catch {
    return false
  }
}

const ROW = `SELECT i.*, w.withdrawn_at FROM articleflow_items i LEFT JOIN articleflow_withdrawn w ON w.group_id = i.group_id`
export const getItem = (env: FlowBindings, groupId: string) => env.CONTENT_DB.prepare(`${ROW} WHERE i.group_id = ?`).bind(groupId).first<ItemRow>()

export async function allItems(env: FlowBindings): Promise<Map<string, ItemRow>> {
  const { results } = await env.CONTENT_DB.prepare(ROW).all<ItemRow>()
  return new Map(results.map((r) => [r.group_id, r]))
}

export const parse = <T>(json: string | null | undefined, fallback: T): T => {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

export const sameVersions = (a: Record<string, string>, b: Record<string, string>) => {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}
export const techVersions = (item: TechItem): Record<string, string> => Object.fromEntries((item.locales ?? []).map((l) => [l.articleId, l.versionId]))

/** A topic worth keeping: both names, or at least one (the website fills the other). */
export const tagOf = (v: unknown): TopicTag | null => {
  const t = v as Partial<TopicTag> | null | undefined
  const en = typeof t?.en === 'string' ? t.en.trim() : ''
  const id = typeof t?.id === 'string' ? t.id.trim() : ''
  return en || id ? { en: en || id, id: id || en } : null
}

/** A publish in flight still holds the row (its lock has not run out). */
export const busy = (row: ItemRow | null | undefined, at = now()) => !!row && (row.state === 'finishing' || (row.state === 'publishing' && !!row.lock_until && row.lock_until > at))

export async function slugOf(env: FlowBindings, articleId: number | null): Promise<string | null> {
  if (!articleId) return null
  return (await env.CONTENT_DB.prepare(`SELECT slug FROM articles WHERE id = ?`).bind(articleId).first<{ slug: string }>())?.slug ?? null
}

/** Tech's languages are no longer the ones that are live here (a language was deleted in Tech, or one was added). */
const otherLanguages = (live: Record<string, string> | null, item: TechItem) => {
  if (!live) return false
  const keys = Object.keys(techVersions(item))
  return keys.length !== Object.keys(live).length || keys.some((k) => !(k in live))
}

/**
 * "Versi baru tersedia": Tech sent a version this side has not put live, either of an article that is live here
 * (until the new one is published) or of one sent back after Minta revisi (Tech's last decision was the revision, or
 * it was sent after the reason went out).
 */
function newVersionOf(row: ItemRow | null | undefined, item: TechItem | null): boolean {
  if (!item) return false
  const live = parse<Record<string, string> | null>(row?.published_versions, null)
  const liveDiffers = !!row && !!live && !!row.article_id && (row.state === 'published' || row.state === 'imported' || row.state === 'taken_down') && !sameVersions(live, techVersions(item))
  if (liveDiffers && item.status !== 'WITHDRAWN' && (item.status !== 'PUBLISHED' || otherLanguages(live, item))) return true
  if (item.status !== 'PENDING' && item.status !== 'APPROVED') return false
  if (live && sameVersions(live, techVersions(item))) return false
  return item.decision?.decision === 'CHANGES_REQUESTED' || (!!row?.reason && !!row.decided_at && Date.parse(item.sentAt) > Date.parse(row.decided_at))
}

export function localInfo(row: ItemRow | null | undefined, item: TechItem | null, slug: string | null): LocalInfo {
  const newVersion = newVersionOf(row, item)
  if (!row) return { state: 'none', articleId: null, slug: null, newVersion, singleLang: null, assets: {}, cover: null, tag: null, withdrawnAt: null, alignment: null }
  const draft = parse<{ cover?: string; tag?: unknown; body?: { en?: Doc; id?: Doc } } | null>(row.draft, null)
  return {
    state: row.state, articleId: row.article_id, slug, newVersion, singleLang: row.single_lang, assets: parse(row.assets, {}),
    cover: draft?.cover || null, tag: tagOf(draft?.tag), withdrawnAt: row.withdrawn_at ?? null,
    // one language from Tech fills both: nothing to compare
    alignment: draft?.body && !row.single_lang ? checkAlignment(draft.body.en, draft.body.id) : null,
  }
}

/** Tech's status and the local state as the one status the page shows. */
export function viewOf(item: Pick<TechItem, 'status' | 'locales'>, row: ItemRow | null | undefined): ViewStatus {
  if (busy(row)) return 'finishing'
  switch (item.status) {
    case 'UPDATING':
      return 'updating'
    case 'CHANGES_REQUESTED':
      return 'changes'
    case 'WITHDRAWN':
      return 'withdrawn'
    case 'PUBLISHED':
      // a language deleted in Tech: what is live here has one language too many, one click brings Tech's state here
      if (row?.state === 'published') return otherLanguages(parse(row.published_versions, null), item as TechItem) ? 'approved' : 'published'
      if (row?.state === 'taken_down') return 'taken_down'
      return 'approved' // live on Tech's side, not here yet: one click brings it to the website
    case 'APPROVED':
      return 'approved'
    case 'PENDING':
      return 'waiting'
    default:
      // a status from a newer Tech: shown as it stands here, never offered for publish
      return row?.state === 'published' ? 'published' : row?.state === 'taken_down' ? 'taken_down' : 'other'
  }
}

/* ---- cache: the last good answer per key ------------------------------------------------------------------------ */

export async function readCache<T>(env: FlowBindings, key: string): Promise<{ value: T; fetchedAt: string } | null> {
  const row = await env.CONTENT_DB.prepare(`SELECT value, fetched_at FROM articleflow_cache WHERE key = ?`).bind(key).first<{ value: string; fetched_at: string }>()
  if (!row) return null
  const value = parse<T | null>(row.value, null)
  return value === null ? null : { value, fetchedAt: row.fetched_at }
}

export const writeCache = (env: FlowBindings, key: string, value: unknown) =>
  env.CONTENT_DB.prepare(
    `INSERT INTO articleflow_cache (key, value, fetched_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, fetched_at = excluded.fetched_at`,
  ).bind(key, JSON.stringify(value), now()).run()

export const dropCache = (env: FlowBindings, ...keys: string[]) =>
  env.CONTENT_DB.prepare(`DELETE FROM articleflow_cache WHERE key IN (${keys.map(() => '?').join(', ')})`).bind(...keys).run()
