import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { gsap, useGSAP } from '../lib/gsap'
import { lockScroll } from '../lib/smooth'
import { TLink } from '../lib/transition'
import { company, mapsLink, nav, waLink } from '../data/site'
import { Img } from './Img'

type Props = { open: boolean; onClose: () => void }

export function Menu({ open, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const first = useRef(true)
  const [active, setActive] = useState(0)
  const [everOpened, setEverOpened] = useState(false)
  const { pathname } = useLocation()

  useGSAP(
    () => {
      tl.current = gsap
        .timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .set(root.current, { visibility: 'visible' })
        .fromTo('.menu__panel', { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.95, ease: 'expo.inOut' })
        .fromTo('.menu__link-text', { yPercent: 115 }, { yPercent: 0, duration: 1.1, stagger: 0.055 }, 0.42)
        .fromTo('.menu__num', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.05 }, 0.6)
        .fromTo('.menu__preview', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'expo.inOut' }, 0.35)
        .fromTo('.menu__fade', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06 }, 0.6)
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
      setEverOpened(true)
      lockScroll(true)
      t.timeScale(1).play()
    } else {
      lockScroll(false)
      t.timeScale(1.8).reverse()
    }
  }, [open])

  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const isCurrent = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to))

  return (
    <div ref={root} id="site-menu" className="menu" aria-hidden={!open} inert={!open}>
      <div className="menu__panel" data-theme="dark" data-lenis-prevent>
        <div className="wrap menu__grid">
          <nav className="menu__nav" aria-label="Menu utama">
            {nav.map((item, i) => (
              <TLink
                key={item.to}
                to={item.to}
                className="menu__link"
                data-current={isCurrent(item.to) ? '' : undefined}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => {
                  if (isCurrent(item.to) && pathname === item.to) onClose()
                }}
              >
                <span className="menu__num">({String(i + 1).padStart(2, '0')})</span>
                <span className="menu__link-mask">
                  <span className="menu__link-text">{item.label}</span>
                </span>
              </TLink>
            ))}
          </nav>
          <div className="menu__preview max-md:hidden" aria-hidden="true">
            {everOpened &&
              nav.map((item, i) => (
                <Img key={item.to} id={item.img} sizes="34vw" className="menu__img" data-on={i === active ? '' : undefined} />
              ))}
          </div>
        </div>
        <div className="wrap menu__foot">
          <div className="menu__fade">
            <p className="t-label opacity-60">Studio</p>
            <a href={mapsLink} target="_blank" rel="noreferrer" className="menu__small">
              {company.address.join(', ')}
            </a>
          </div>
          <div className="menu__fade">
            <p className="t-label opacity-60">Kontak</p>
            <a href={`tel:+${company.phoneIntl}`} className="menu__small block">
              T: {company.phone}
            </a>
            <a href={`mailto:${company.email}`} className="menu__small block">
              E: {company.email}
            </a>
          </div>
          <div className="menu__fade md:text-right">
            <a href={waLink('Halo Kadanglabo, saya ingin konsultasi proyek.')} target="_blank" rel="noreferrer" className="btn-pill btn-pill--orange">
              Konsultasi via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
