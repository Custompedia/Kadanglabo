import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router'
import { gsap, ScrollTrigger, reducedMotion } from './gsap'
import { closeGate, onPageMounted, openGate } from './gate'
import { getLenis, lockScroll, scrollToElement, scrollToTop } from './smooth'
import { BrandMark } from '../components/BrandMark'
import { nav } from '../data/site'
import { t, tr } from './i18n'
import { getProject } from '../data/projects'

type TransitionApi = { go: (to: string) => void }

const TransitionContext = createContext<TransitionApi>({ go: () => {} })

export const useTransitionNav = () => useContext(TransitionContext)

/** Name of the destination, shown on the curtain while the page changes. */
function labelFor(pathname: string) {
  const [section, slug] = pathname.split('/').filter(Boolean)
  if (section === 'work' && slug) return getProject(slug)?.title ?? tr('Our Work', 'Proyek')
  if (section === 'news' && slug) return tr('Articles', 'Artikel')
  const item = nav.find((n) => n.to === pathname)
  return item ? t(item.label) : 'Kadanglabo'
}

/**
 * Page transitions: a navy curtain rises with the destination's name, the route changes
 * underneath, and the curtain lifts once the new page has mounted. Intro animations wait for
 * that moment (see gate.ts) so they play in sync with the reveal.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const curtain = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const busy = useRef(false)
  const currentPath = useRef(location.pathname)

  useEffect(() => {
    currentPath.current = location.pathname
  }, [location.pathname])

  const parts = () => {
    const el = curtain.current!
    return { el, inner: [el.querySelector('.curtain-mark'), label.current] }
  }

  /** Lift the curtain as soon as the next page reports that it has mounted (with a safety timeout). */
  const revealOnMount = useCallback(() => {
    const { el, inner } = parts()
    let done = false
    const reveal = () => {
      if (done) return
      done = true
      off()
      window.clearTimeout(fallback)
      scrollToTop()
      ScrollTrigger.refresh()
      requestAnimationFrame(() => {
        lockScroll(false)
        gsap
          .timeline({
            onComplete: () => {
              gsap.set(el, { visibility: 'hidden' })
              busy.current = false
            },
          })
          .to(inner, { yPercent: -80, autoAlpha: 0, duration: 0.45, stagger: 0.04, ease: 'power3.in' }, 0)
          .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'power4.inOut' }, 0.1)
          // start the page intro while the curtain uncovers it, so the reveal is actually seen
          .add(openGate, 0.42)
      })
    }
    const off = onPageMounted(reveal)
    const fallback = window.setTimeout(reveal, 4000)
  }, [])

  const go = useCallback(
    (to: string) => {
      const url = new URL(to, window.location.origin)
      const target = url.pathname + url.search + url.hash

      if (url.pathname === location.pathname) {
        if (url.search !== location.search) {
          navigate(target, { preventScrollReset: true })
        }
        // wait a tick: a closing menu unlocks Lenis, and unlocking resets any scroll already in flight
        if (url.hash) window.setTimeout(() => scrollToElement(url.hash), 40)
        else if (url.search === location.search) {
          const lenis = getLenis()
          if (lenis) lenis.scrollTo(0, { duration: 1.2 })
          else window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        return
      }

      if (busy.current) return
      if (reducedMotion() || !curtain.current) {
        navigate(target)
        return
      }

      busy.current = true
      closeGate()
      lockScroll(true)
      if (label.current) label.current.textContent = labelFor(url.pathname)
      const { el, inner } = parts()
      revealOnMount()

      gsap
        .timeline()
        .set(el, { visibility: 'visible', clipPath: 'inset(100% 0% 0% 0%)' })
        .set(inner, { yPercent: 70, autoAlpha: 0 })
        .to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'power4.inOut' })
        .to(inner, { yPercent: 0, autoAlpha: 1, duration: 0.6, stagger: 0.06, ease: 'power4.out' }, '-=0.3')
        .add(() => navigate(target), '-=0.15')
    },
    [location.pathname, location.search, navigate, revealOnMount],
  )

  // Browser back/forward: cover instantly, then reveal the page like any other transition.
  useEffect(() => {
    const onPop = () => {
      if (busy.current || reducedMotion() || !curtain.current) return
      if (window.location.pathname === currentPath.current) return
      busy.current = true
      closeGate()
      if (label.current) label.current.textContent = labelFor(window.location.pathname)
      const { el, inner } = parts()
      gsap.set(el, { visibility: 'visible', clipPath: 'inset(0% 0% 0% 0%)' })
      gsap.set(inner, { yPercent: 0, autoAlpha: 1 })
      revealOnMount()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [revealOnMount])

  return (
    <TransitionContext.Provider value={{ go }}>
      {children}
      <div ref={curtain} className="curtain" aria-hidden="true">
        <div className="curtain__inner">
          <BrandMark className="curtain-mark" ringColor="#ffffff" />
          <span className="curtain__mask">
            <span ref={label} className="curtain__label" />
          </span>
        </div>
      </div>
    </TransitionContext.Provider>
  )
}

type TLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string }

/** Internal link that navigates through the page-transition curtain. */
export function TLink({ to, onClick, children, ...rest }: TLinkProps) {
  const { go } = useTransitionNav()
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    go(to)
  }
  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
