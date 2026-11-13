import { useLayoutEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { notifyPageMounted, whenGateOpen } from '../lib/gate'
import { warmUpImages } from '../lib/warmup'
import { getLang, tr } from '../lib/i18n'

type Props = {
  title?: string
  /** what the page is about, for search results and link previews (one or two sentences) */
  description?: string
  /** keep the page out of search results (the 404) */
  noindex?: boolean
  children: ReactNode
  className?: string
}

const SITE = 'https://kadanglabo.com'
const BRAND = 'Kadanglabo - A Collaborative Architectural Solution'

const defaultDescription = () =>
  tr(
    'Community-based architecture consultancy in Yogyakarta: collaborative architectural solutions for commercial, hospitality and residential projects.',
    'Konsultan arsitektur berbasis komunitas di Yogyakarta: solusi arsitektur kolaboratif untuk proyek komersial, hospitality, dan hunian.',
  )

/** A <meta> or <link> in <head>, created once and updated after. */
function headTag(tag: 'meta' | 'link', key: [string, string], attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLElement>(`${tag}[${key[0]}="${key[1]}"]`)
  if (!el) {
    el = document.createElement(tag)
    el.setAttribute(key[0], key[1])
    document.head.append(el)
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
}

const clip = (s: string, n = 160) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`)

/**
 * Wraps every route: sets the page's title, description, canonical address and language alternates (for search
 * engines, which read them after rendering), and tells the transition system the page is ready.
 */
export function Page({ title, description, noindex, children, className }: Props) {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    const fullTitle = title ? `${title} - Kadanglabo` : BRAND
    const desc = clip(description?.replace(/\s+/g, ' ').trim() || defaultDescription())
    // English is the plain address, Indonesian the same address with ?lang=id (see lib/i18n.ts)
    const en = `${SITE}${pathname}`
    const id = `${en}?lang=id`
    const self = getLang() === 'id' ? id : en
    document.title = fullTitle
    headTag('meta', ['name', 'description'], { content: desc })
    headTag('meta', ['name', 'robots'], { content: noindex ? 'noindex, follow' : 'index, follow' })
    headTag('link', ['rel', 'canonical'], { href: self })
    headTag('link', ['hreflang', 'en'], { rel: 'alternate', href: en })
    headTag('link', ['hreflang', 'id'], { rel: 'alternate', href: id })
    headTag('link', ['hreflang', 'x-default'], { rel: 'alternate', href: en })
    headTag('meta', ['property', 'og:title'], { content: fullTitle })
    headTag('meta', ['property', 'og:description'], { content: desc })
    headTag('meta', ['property', 'og:url'], { content: self })
    headTag('meta', ['property', 'og:locale'], { content: getLang() === 'id' ? 'id_ID' : 'en_US' })
  }, [title, description, noindex, pathname])

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
