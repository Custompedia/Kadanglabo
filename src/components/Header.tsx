import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { TLink } from '../lib/transition'
import { getLang, reloadInLang, tr, type Lang } from '../lib/i18n'
import { BrandMark } from './BrandMark'

// Hero tagline exactly as in the brief (slide 03); it now sits still under the hero wordmark
export const TAGLINE = 'A Collaborative Architectural Solutions.'

function centerFor(pathname: string): { label: string; to?: string } | null {
  if (pathname === '/') return null // home: the hero carries the one message (tagline under the name)
  if (pathname.startsWith('/work/')) return { label: tr('← Back to work', '← Kembali ke proyek'), to: '/work' }
  if (pathname.startsWith('/articles/')) return { label: tr('← All articles', '← Semua artikel'), to: '/articles' }
  const map: Record<string, string> = {
    '/about': tr('About us', 'Tentang kami'),
    '/services': tr('Our services', 'Layanan kami'),
    '/work': tr('Selected projects', 'Proyek pilihan'),
    '/articles': tr('Articles', 'Artikel'),
    '/contact': tr('Work with us', 'Bekerja sama'),
  }
  return map[pathname] ? { label: map[pathname] } : { label: 'Kadanglabo' }
}

/** EN / ID: the current language is lit; the other one reloads the page in that language (logo intro included). */
function LangSwitch() {
  const lang = getLang()
  const opts: [Lang, string, string][] = [
    ['en', 'EN', 'English'],
    ['id', 'ID', 'Bahasa Indonesia'],
  ]
  return (
    <div className="lang-switch" role="group" aria-label={tr('Language', 'Bahasa')}>
      {opts.map(([code, short, name]) => (
        <button
          key={code}
          type="button"
          lang={code}
          className="lang-switch__btn"
          aria-pressed={lang === code}
          aria-label={name}
          onClick={() => reloadInLang(code)}
        >
          {short}
        </button>
      ))}
    </div>
  )
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
      const x = window.innerWidth / 2
      // usually the top element there is already the page (the header lets the pointer through), and a single hit
      // test is ~30x cheaper than listing every layer; only when that misses, walk the whole stack as before
      const top = document.elementFromPoint(x, 30)
      const quick = top && !top.closest('.site-header') ? top.closest<HTMLElement>('[data-theme]') : null
      const theme = (t: string | undefined) => (t === 'dark' || t === 'accent' ? t : 'light')
      if (quick) next = theme(quick.dataset.theme)
      else
        for (const node of document.elementsFromPoint(x, 30)) {
          if (!(node instanceof Element) || node.closest('.site-header')) continue
          const themed = node.closest<HTMLElement>('[data-theme]')
          if (themed) {
            next = theme(themed.dataset.theme)
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
    // Scrolling: look right away. Scroll events arrive at the start of a frame, while the page is still laid out from
    // the last one; capturing on the window runs this before ScrollTrigger's listener (on the document) moves
    // anything, so the hit test reads the finished layout instead of forcing a fresh one every frame.
    // While scrolling it looks every third frame or so (the colours fade over 0.35s, so a frame or two later is
    // invisible), plus once more after the last scroll event, so it always settles on the right tone.
    let lastLook = -Infinity
    let trailing = 0
    const look = () => {
      lastLook = performance.now()
      window.clearTimeout(trailing)
      trailing = 0
      if (raf) cancelAnimationFrame(raf)
      update()
    }
    const onScroll = () => {
      if (performance.now() - lastLook >= 45) look()
      else if (!trailing) trailing = window.setTimeout(look, 60)
    }
    window.addEventListener('scroll', onScroll, { capture: true, passive: true })
    window.addEventListener('resize', queue)
    window.addEventListener('page:mounted', queue)
    queue()
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(trailing)
      window.removeEventListener('scroll', onScroll, { capture: true })
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
      data-tone={menuOpen ? 'accent' : tone}
      data-hidden={hidden && !menuOpen ? '' : undefined}
      data-solid={solid && !menuOpen ? '' : undefined}
      data-line={pathname === '/' && !solid && !menuOpen ? '' : undefined}
    >
      <div className="wrap site-header__bar">
        <TLink to="/" className="site-logo" aria-label="Kadanglabo - Home">
          <BrandMark className="site-logo__mark" />
          <span className="site-logo__word">
            <img src="/brand/kadanglabo-wordmark.svg" alt="" className="site-logo__img site-logo__img--light" width={1046} height={110} />
            <img src="/brand/kadanglabo-wordmark-light.svg" alt="" className="site-logo__img site-logo__img--dark" width={1046} height={110} />
            <img src="/brand/kadanglabo-wordmark-white.svg" alt="" className="site-logo__img site-logo__img--accent" width={1046} height={110} />
          </span>
        </TLink>

        <div className="site-header__center">
          {menuOpen ? (
            <span className="pill">{tr('Where to?', 'Mau ke mana?')}</span>
          ) : center === null ? null : center.to ? (
            <TLink to={center.to} className="pill pill--link">
              {center.label}
            </TLink>
          ) : (
            <span className="pill">{center.label}</span>
          )}
        </div>

        <div className="site-header__right">
          <LangSwitch />
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={onToggleMenu}
          >
            <span className="menu-toggle__icon" aria-hidden="true" />
            <span>{menuOpen ? tr('Close', 'Tutup') : 'Menu'}</span>
          </button>
        </div>
        <span className="site-header__line" aria-hidden="true" />
      </div>
    </header>
  )
}
