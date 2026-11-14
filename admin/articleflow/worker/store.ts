import { now } from '../../worker/env'
import type { LocalInfo, LocalState, TechItem, TechItemStatus, TechLocale, ViewStatus } from '../types'
import type { FlowBindings } from './tech-client'

/* ArticleFlow's own tables (migrations/0001_articleflow.sql): the item rows and the last good answers from Tech. */

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
}

export const GROUP_ID = /^[A-Za-z0-9_.:-]{1,160}$/

/** False until the migration has run: the page then says so instead of failing. */
export async function ready(env: FlowBindings): Promise<boolean> {
  try {
    return !!(await env.CONTENT_DB.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'articleflow_items'`).first())
  } catch {
    return false
  }
}

export const getItem = (env: FlowBindings, groupId: string) => env.CONTENT_DB.prepare(`SELECT * FROM articleflow_items WHERE group_id = ?`).bind(groupId).first<ItemRow>()

export async function allItems(env: FlowBindings): Promise<Map<string, ItemRow>> {
  const { results } = await env.CONTENT_DB.prepare(`SELECT * FROM articleflow_items`).all<ItemRow>()
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

const sameVersions = (a: Record<string, string>, b: Record<string, string>) => {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}
export const techVersions = (item: TechItem): Record<string, string> => Object.fromEntries(item.locales.map((l) => [l.articleId, l.versionId]))

/** A publish in flight still holds the row (its lock has not run out). */
export const busy = (row: ItemRow | null | undefined, at = now()) => !!row && (row.state === 'finishing' || (row.state === 'publishing' && !!row.lock_until && row.lock_until > at))

export async function slugOf(env: FlowBindings, articleId: number | null): Promise<string | null> {
  if (!articleId) return null
  return (await env.CONTENT_DB.prepare(`SELECT slug FROM articles WHERE id = ?`).bind(articleId).first<{ slug: string }>())?.slug ?? null
}

export function localInfo(row: ItemRow | null | undefined, item: TechItem | null, slug: string | null): LocalInfo {
  if (!row) return { state: 'none', articleId: null, slug: null, newVersion: false, singleLang: null, assets: {}, cover: null }
  const live = parse<Record<string, string> | null>(row.published_versions, null)
  const newVersion = !!item && !!live && !!row.article_id && (row.state === 'published' || row.state === 'imported' || row.state === 'taken_down') && !sameVersions(live, techVersions(item)) && item.status !== 'PUBLISHED'
  return { state: row.state, articleId: row.article_id, slug, newVersion, singleLang: row.single_lang, assets: parse(row.assets, {}), cover: parse<{ cover?: string } | null>(row.draft, null)?.cover || null }
}

/** Tech's status and the local state as the one status the page shows. */
export function viewOf(status: TechItemStatus, row: ItemRow | null | undefined): ViewStatus {
  if (busy(row)) return 'finishing'
  if (status === 'UPDATING') return 'updating'
  if (status === 'CHANGES_REQUESTED') return 'changes'
  if (status === 'PUBLISHED') {
    if (row?.state === 'published') return 'published'
    if (row?.state === 'taken_down') return 'taken_down'
    return 'approved' // live on Tech's side, not here yet: one click brings it to the website
  }
  return status === 'APPROVED' ? 'approved' : 'waiting'
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
