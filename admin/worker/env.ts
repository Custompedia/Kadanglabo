export interface Env {
  AUTH_DB: D1Database
  CONTENT_DB: D1Database
  MEDIA_DB: D1Database
  MEDIA: R2Bucket
  ORIGINALS: R2Bucket
  ASSETS: Fetcher
  PUBLIC_SITE_URL: string
}

export interface SessionUser {
  id: number
  username: string
  name: string
  role: 'admin' | 'editor'
}

export type AppEnv = { Bindings: Env; Variables: { user: SessionUser } }

export const now = () => new Date().toISOString()
