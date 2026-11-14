import { Sparkle } from '@phosphor-icons/react'
import { lazyPage } from '../src/lib/lazy'
import type { UiIntegration } from '../src/integrations'
import { SidebarItem } from './ui/SidebarItem'

/*
 * ArticleFlow, dashboard side. Everything the core dashboard knows about it comes through this one object
 * (admin/src/integrations.tsx): its page, its sidebar entry and its quick-search entry.
 */
const load = () => import('./ui/ArticleFlowPage')
const ArticleFlowPage = lazyPage(load)

export const articleflowUi: UiIntegration = {
  routes: [{ path: '/articleflow', element: <ArticleFlowPage /> }],
  Nav: SidebarItem,
  search: [{ key: 'p:/articleflow', label: 'ArticleFlow (artikel otomatis & analitik)', kind: 'Konten', to: '/articleflow', icon: Sparkle }],
  preload: load,
}
