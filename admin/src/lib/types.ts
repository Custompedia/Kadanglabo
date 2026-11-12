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
}
