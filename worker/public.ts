import { handlePublic, type PublicEnv } from '../shared/public-api'

/*
 * kadanglabo-website: the static site (dist/) plus the read-only content the CMS publishes (/api/public/*) and its
 * uploaded images (/media/*). See shared/public-api.ts. It only reads; all writing happens in kadanglabo-admin.
 */
export default {
  async fetch(req, env, ctx) {
    return (await handlePublic(req, env, ctx)) ?? env.ASSETS.fetch(req)
  },
} satisfies ExportedHandler<PublicEnv & { ASSETS: Fetcher }>
