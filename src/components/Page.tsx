import { useLayoutEffect, type ReactNode } from 'react'
import { notifyPageMounted, whenGateOpen } from '../lib/gate'
import { warmUpImages } from '../lib/warmup'

type Props = { title?: string; children: ReactNode; className?: string }

/** Wraps every route: sets the document title and tells the transition system the page is ready. */
export function Page({ title, children, className }: Props) {
  useLayoutEffect(() => {
    document.title = title ? `${title} - Kadanglabo` : 'Kadanglabo - A Collaborative Architectural Solution'
  }, [title])

  useLayoutEffect(() => {
    notifyPageMounted()
  }, [])

  // once the page is uncovered and its intro has had a moment, fetch the photos further down in the background
  useLayoutEffect(() => {
    let stop: (() => void) | undefined
    let timer = 0
    const cancelGate = whenGateOpen(() => {
      timer = window.setTimeout(() => (stop = warmUpImages()), 1500)
    })
    return () => {
      cancelGate()
      window.clearTimeout(timer)
      stop?.()
    }
  }, [])

  return (
    <main id="main" className={className}>
      {children}
    </main>
  )
}
