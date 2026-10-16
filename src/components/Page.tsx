import { useLayoutEffect, type ReactNode } from 'react'
import { notifyPageMounted } from '../lib/gate'

type Props = { title?: string; children: ReactNode; className?: string }

/** Wraps every route: sets the document title and tells the transition system the page is ready. */
export function Page({ title, children, className }: Props) {
  useLayoutEffect(() => {
    document.title = title ? `${title} - Kadanglabo` : 'Kadanglabo - A Collaborative Architectural Solution'
  }, [title])

  useLayoutEffect(() => {
    notifyPageMounted()
  }, [])

  return (
    <main id="main" className={className}>
      {children}
    </main>
  )
}
