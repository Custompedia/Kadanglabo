import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { gsap, useGSAP } from '../lib/gsap'
import { lockScroll } from '../lib/smooth'
import { TLink } from '../lib/transition'
import { nav } from '../data/site'

type Props = { open: boolean; onClose: () => void }

/**
 * Full-screen menu after shed.design: brand-orange panel rising from the bottom, giant stacked links
 * separated by hairlines; the hovered / current link switches colour.
 */
export function Menu({ open, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const first = useRef(true)
  const snap = useRef(false) // close instantly (route changed behind the transition curtain)
  const [hover, setHover] = useState<string | null>(null)
  const { pathname } = useLocation()

  useGSAP(
    () => {
      tl.current = gsap
        .timeline({ paused: true })
        .set(root.current, { visibility: 'visible' })
        .fromTo('.menu__panel', { yPercent: 100 }, { yPercent: 0, duration: 0.9, ease: 'expo.inOut' })
        .fromTo('.menu__link-text', { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.06, ease: 'expo.out' }, 0.45)
        .fromTo('.menu__rule', { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.45)
    },
    { scope: root },
  )

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = tl.current
    if (!t) return
    if (open) {
      lockScroll(true)
      t.timeScale(1).play()
    } else {
      lockScroll(false)
      setHover(null)
      if (snap.current) {
        // navigating: the curtain already covers the screen, so drop the menu without animating it
        snap.current = false
        t.pause(0)
        gsap.set(root.current, { visibility: 'hidden' })
      } else {
        t.timeScale(1.7).reverse()
      }
    }
  }, [open])

  useEffect(() => {
    snap.current = open
    onClose()
  }, [pathname, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // anchor links (e.g. /about#team) never count as the current page
  const isCurrent = (to: string) => !to.includes('#') && (to === '/' ? pathname === '/' : pathname.startsWith(to))
  const samePage = (to: string) => to.split('#')[0] === pathname
  const lit = (to: string) => (hover ? hover === to : isCurrent(to))

  return (
    <div ref={root} id="site-menu" className="menu" aria-hidden={!open} inert={!open}>
      <div className="menu__panel" data-theme="accent" data-lenis-prevent>
        <nav className="wrap menu__nav" aria-label="Menu utama" onMouseLeave={() => setHover(null)}>
          {nav.map((item) => (
            <TLink
              key={item.to}
              to={item.to}
              className="menu__link"
              data-lit={lit(item.to) ? '' : undefined}
              aria-current={isCurrent(item.to) ? 'page' : undefined}
              onMouseEnter={() => setHover(item.to)}
              onFocus={() => setHover(item.to)}
              onClick={() => {
                if (samePage(item.to)) onClose()
              }}
            >
              <span className="menu__link-mask">
                <span className="menu__link-text">{item.label}</span>
              </span>
              <span className="menu__rule" aria-hidden="true" />
            </TLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
