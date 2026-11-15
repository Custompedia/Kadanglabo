import { Sidebar } from '@cloudflare/kumo'
import { Article, LockSimple } from '@phosphor-icons/react'
import { useFetch } from '../../src/lib/useFetch'
import type { FlowStatus } from '../types'
import { STATUS } from './flow'
import './articleflow.css'

/*
 * The ArticleFlow entry of the sidebar, in a group of its own. While the subscription runs it is highlighted and
 * counts the articles waiting; without one (or once it has ended) it turns grey and carries a lock.
 */
export function SidebarItem({ at }: { at: (path: string) => boolean }) {
  const { data } = useFetch<FlowStatus>(STATUS)
  const open = !!data && !data.locked
  const waiting = open ? (data.status?.counts?.pending ?? 0) : 0
  const label = open ? (waiting ? `ArticleFlow, ${waiting} artikel menunggu` : 'ArticleFlow') : 'ArticleFlow, terkunci'
  return (
    <Sidebar.Group>
      <Sidebar.GroupLabel>Artikel otomatis</Sidebar.GroupLabel>
      <Sidebar.Menu>
        <Sidebar.MenuButton icon={Article} href="/articleflow" active={at('/articleflow')} tooltip={label} aria-label={label} className={data ? (open ? 'af-nav--on' : 'af-nav--off') : ''}>
          ArticleFlow
          {open && waiting > 0 && (
            <span className="af-badge" aria-label={`${waiting} artikel menunggu`}>{waiting > 99 ? '99+' : waiting}</span>
          )}
          {data && !open && <LockSimple className="af-lock" size={14} aria-hidden="true" />}
        </Sidebar.MenuButton>
      </Sidebar.Menu>
    </Sidebar.Group>
  )
}
