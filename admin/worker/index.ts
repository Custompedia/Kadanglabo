import { Hono } from 'hono'
import type { AppEnv } from './env'
import { auth, requireUser, sameOrigin } from './auth'
import { users } from './users'
import { articlesApi, projectsApi } from './content'
import { mediaApi } from './media'
import { handlePublic } from '../../shared/public-api'
import { storageApi } from './storage'
import { locationsApi, pagesApi, topicsApi } from './pages'
import { cleanupMedia } from './media'
import { monitorApi, recordCleanup } from './monitor'

/*
 * kadanglabo-admin: the CMS API under /api, images under /media; everything else is the dashboard (static assets,
 * single-page app). Every /api route but sign-in needs a session.
 */

const api = new Hono<AppEnv>().basePath('/api')
api.use('*', sameOrigin)
api.use('*', async (c, next) => {
  await next()
  c.header('cache-control', 'no-store')
})
api.route('/auth', auth)
api.use('/projects/*', requireUser)
api.use('/articles/*', requireUser)
api.use('/media/*', requireUser)
api.use('/storage/*', requireUser)
api.use('/monitor/*', requireUser)
api.use('/users/*', requireUser)
api.use('/pages/*', requireUser)
api.use('/locations/*', requireUser)
api.use('/topics/*', requireUser)
api.route('/projects', projectsApi)
api.route('/articles', articlesApi)
api.route('/media', mediaApi)
api.route('/storage', storageApi)
api.route('/monitor', monitorApi)
api.route('/users', users)
api.route('/pages', pagesApi)
api.route('/locations', locationsApi)
api.route('/topics', topicsApi)
api.notFound((c) => c.json({ error: 'not_found', message: 'Tidak ditemukan.' }, 404))
api.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'server', message: 'Terjadi kesalahan di server. Coba lagi.' }, 500)
})

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    // images and the public read API (the site's own Worker serves the same in production; here for local dev)
    const pub = await handlePublic(req, env, ctx)
    if (pub) return pub
    if (url.pathname.startsWith('/api/')) return api.fetch(req, env, ctx)
    return env.ASSETS.fetch(req)
  },
  // weekly: images nothing has used for a week leave R2 (see cleanupMedia)
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      cleanupMedia(env).then(async (n) => {
        console.log(`media cleanup: ${n} removed`)
        await recordCleanup(env, n) // shown on the Monitoring page
      }),
    )
  },
} satisfies ExportedHandler<AppEnv['Bindings']>
