import type { ComponentType, ReactNode } from 'react'
import type { Icon } from '@phosphor-icons/react'
import { articleflowUi } from '../articleflow/index.ui'

/*
 * Optional add-ons of the dashboard. Each lives in its own folder and is known to the core only through this file.
 * To remove one: delete its import and its entry below (see the add-on's README).
 */
export interface UiIntegration {
  /** pages, inside the signed-in shell */
  routes: { path: string; element: ReactNode }[]
  /** a group in the sidebar, under "Ringkasan" */
  Nav: ComponentType<{ at: (path: string) => boolean }>
  /** entries of the quick search (Ctrl K) */
  search: { key: string; label: string; kind: string; to: string; icon: Icon }[]
  /** fetch the page's code ahead of time, with the other pages */
  preload?: () => Promise<unknown>
}

export const integrations: UiIntegration[] = [articleflowUi]
