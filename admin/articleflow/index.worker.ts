import type { Integration } from '../worker/integrations'
import { articleHook, flowApi } from './worker/api'
import { drain } from './worker/outbox'
import { syncFromTech } from './worker/sync'
import type { FlowBindings } from './worker/tech-client'

/*
 * ArticleFlow, Worker side. Everything the core Worker knows about it comes through this one object
 * (admin/worker/integrations.ts): its routes under /api/articleflow, a hook after the article routes, and the
 * cron (Tech's deletes and withdrawals, then the follow-up jobs). See README.md for how to remove it.
 */
export const articleflow: Integration = {
  mount(api, requireUser) {
    api.use('/articleflow/*', requireUser)
    api.use('/articles/*', articleHook)
    api.route('/articleflow', flowApi)
  },
  async scheduled(env) {
    // the list is read here too, so an article deleted or withdrawn in Tech leaves the website even if nobody opens the page
    await syncFromTech(env as FlowBindings)
    await drain(env as FlowBindings, 20)
  },
}
