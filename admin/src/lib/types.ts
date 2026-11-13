import type { ArticleContent, ProjectContent, RecordState } from '../../../shared/content'

export type Kind = 'project' | 'article'

export interface ListItem {
  id: number
  slug: string
  state: RecordState
  title: string
  dirty: number
  updated_by: string | null
  updated_at: string
  published_at: string | null
  cover: string | null
  published_slug?: string | null
  // projects
  category?: string
  archive_only?: number
  position?: number
  region?: string | null
  // articles
  type?: string
  date?: string
  tag?: string | null
}

export interface Record<T> {
  id: number
  slug: string
  state: RecordState
  draft: T
  published: T | null
  dirty: number
  updated_by: string | null
  updated_at: string
  published_at: string | null
  issues: string[]
}
export type ProjectRecord = Record<ProjectContent>
export type ArticleRecord = Record<ArticleContent>

export interface MediaItem {
  id: string
  filename: string
  w: number
  h: number
  color: string
  sizes: number[]
  bytes: number
  original_bytes: number
  created_by: string | null
  created_at: string
  usedIn: { title: string; group: string; kind: 'project' | 'article' | 'page' }[]
}

export interface Storage {
  databases: { name: string; bytes: number; limit: number }[]
  buckets: { name: string; bytes: number; objects: number }[]
  projects: { [k in RecordState]: number }
  articles: { [k in RecordState]: number }
  /** bytes the panel measures the total against (R2's free 10 GB) */
  quota?: number
}

/** A request the CMS made to check something, like a visitor would (worker/monitor.ts) */
export interface Probe {
  ok: boolean
  status: number | null
  ms: number | null
  error?: string
}

export interface BuildInfo {
  builtAt: string
  files: number
  bytes: number
  largest: { path: string; bytes: number }
}

/** GET /api/monitor */
export interface Monitor {
  checkedAt: string
  // a part is null when the server could not work it out (logged there); the rest still shows
  website: {
    url: string
    home: Probe
    api: Probe & { served: { projects: number; articles: number; version: string | null } | null }
    build: BuildInfo | null
  } | null
  cms: { build: BuildInfo | null } | null
  content: {
    lastPublish: string | null
    lastEdit: string | null
    pending: { projects: number; articles: number }
    cleanup: { at: string; removed: number } | null
  } | null
  accounts: {
    users: number
    admins: number
    disabled: number
    locked: number
    lastLogin: string | null
    activeSessions: number
    failedLogins24h: number
  } | null
  nextCleanup: string
}
