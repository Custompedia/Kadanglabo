import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { TLink } from '../lib/transition'
import { BrandMark } from './BrandMark'

const ticker =
  'A Collaborative Architectural Solution\u2002•\u2002Konsultan arsitektur berbasis komunitas di Yogyakarta sejak 2020\u2002•\u2002'

function centerFor(pathname: string): { label: string; to?: string } | null {
  if (pathname === '/') return null
  if (pathname.startsWith('/work/')) return { label: '← Back to work', to: '/work' }
  if (pathname.startsWith('/news/')) return { label: '← Back to news', to: '/news' }
  const map: Record<string, string> = {
    '/studio': 'About us',
    '/services': 'Our services',
    '/work': 'Featured projects',
    '/news': 'News & events',
    '/contact': 'Work with us',
  }
  return map[pathname] ? { label: map[pathname] } : { label: 'Kadanglabo' }
}

type Props = { menuOpen: boolean; onToggleMenu: () => void }

export function Header({ menuOpen, onToggleMenu }: Props) {
  const { pathname } = useLocation()
  const [tone, setTone] = useState<'light' | 'dark' | 'accent'>('dark')
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)

  // Pick the header colour from the section underneath it, and tuck it away while scrolling down.
  useEffect(() => {
    let raf = 0
    let lastY = window.scrollY
    const update = () => {
      raf = 0
      const y = window.scrollY
      let next: 'light' | 'dark' | 'accent' = 'light'
      for (const node of document.elementsFromPoint(window.innerWidth / 2, 30)) {
        if (!(node instanceof Element) || node.closest('.site-header')) continue
        const themed = node.closest<HTMLElement>('[data-theme]')
        if (themed) {
          const t = themed.dataset.theme
          next = t === 'dark' || t === 'accent' ? t : 'light'
          break
        }
      }
      setTone(next)
      setSolid(y > 80)
      if (y < 60) setHidden(false)
      else if (Math.abs(y - lastY) > 10) setHidden(y > lastY)
      lastY = y
    }
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', queue, { passive: true })
    window.addEventListener('resize', queue)
    window.addEventListener('page:mounted', queue)
    queue()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', queue)
      window.removeEventListener('resize', queue)
      window.removeEventListener('page:mounted', queue)
    }
  }, [])

  // Let sticky UI (e.g. the Work filters) know whether the header is currently covering the top.
  useEffect(() => {
    document.documentElement.dataset.header = hidden && !menuOpen ? 'hidden' : 'shown'
  }, [hidden, menuOpen])

  const center = centerFor(pathname)

  return (
    <header
      className="site-header"
      data-tone={menuOpen ? 'dark' : tone}
      data-hidden={hidden && !menuOpen ? '' : undefined}
      data-solid={solid && !menuOpen ? '' : undefined}
      data-line={pathname === '/' && !solid && !menuOpen ? '' : undefined}
    >
      <div className="wrap site-header__bar">
        <TLink to="/" className="site-logo" aria-label="Kadanglabo — Home">
          <BrandMark className="site-logo__mark" />
          <span className="site-logo__word">
            <img src="/brand/kadanglabo-wordmark.svg" alt="" className="site-logo__img site-logo__img--light" width={1046} height={110} />
            <img src="/brand/kadanglabo-wordmark-light.svg" alt="" className="site-logo__img site-logo__img--dark" width={1046} height={110} />
            <img src="/brand/kadanglabo-wordmark-white.svg" alt="" className="site-logo__img site-logo__img--accent" width={1046} height={110} />
          </span>
        </TLink>

        <div className="site-header__center">
          {center === null ? (
            <div className="header-ticker" aria-hidden="true">
              <div className="header-ticker__track">
                <span>{ticker}</span>
                <span>{ticker}</span>
              </div>
            </div>
          ) : center.to ? (
            <TLink to={center.to} className="pill pill--link">
              {center.label}
            </TLink>
          ) : (
            <span className="pill">{center.label}</span>
          )}
        </div>

        <div className="site-header__right">
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={onToggleMenu}
          >
            <span className="menu-toggle__icon" aria-hidden="true" />
            <span>{menuOpen ? 'Close' : 'Menu'}</span>
          </button>
        </div>
        <span className="site-header__line" aria-hidden="true" />
      </div>
    </header>
  )
}
