import { useEffect, useRef, useState } from 'react'
import { TLink } from '../lib/transition'
import { useFitText } from '../lib/useFitText'
import { company, mapsLink, nav, waHello, waLink } from '../data/site'
import { t, tr } from '../lib/i18n'
import { ArrowRight } from './Icons'
import { Img, type ImgKey } from './Img'

export type FooterCtaProps = { words: string; to: string; imgs: ImgKey[]; kicker?: string }

function FooterCta({ words, to, imgs, kicker }: FooterCtaProps) {
  const row = useRef<HTMLSpanElement>(null)
  const [awake, setAwake] = useState(false)
  const [i, setI] = useState(0)
  useFitText(row)

  useEffect(() => {
    if (!awake || imgs.length < 2) return
    const id = window.setInterval(() => setI((v) => (v + 1) % imgs.length), 650)
    return () => window.clearInterval(id)
  }, [awake, imgs.length])

  return (
    <TLink
      to={to}
      className="footer-cta wrap"
      onMouseEnter={() => setAwake(true)}
      onMouseLeave={() => setAwake(false)}
      data-cursor={tr('Go', 'Ayo')}
    >
      {kicker && <span className="footer-cta__kicker">{kicker}</span>}
      <span ref={row} className="footer-cta__row">
        <span className="footer-cta__text">{words}</span>
        <span className="footer-cta__thumb">
          {(awake ? imgs : imgs.slice(0, 1)).map((id, k) => (
            <Img key={id} id={id} sizes="260px" data-on={k === (awake ? i % imgs.length : 0) ? '' : undefined} />
          ))}
        </span>
        <ArrowRight className="footer-cta__arrow" />
      </span>
    </TLink>
  )
}

export function Footer({ cta }: { cta: FooterCtaProps }) {
  const year = new Date().getFullYear()
  return (
    <footer className="site-footer" data-theme="light">
      <div className="wrap footer__grid">
        <div className="footer__brand">
          <img src="/brand/kadanglabo-logo.svg" alt="Kadanglabo" width={1400} height={324} className="footer__logo" />
          <p className="t-serif footer__motto">A Collaborative Architectural Solution.</p>
        </div>
        <div className="footer__studio">
          <p className="t-label footer__label">Studio</p>
          <address className="not-italic footer__text">
            {company.address.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
          <a href={mapsLink} target="_blank" rel="noreferrer" className="link-line footer__text mt-2 inline-block">
            Google Maps ↗
          </a>
        </div>
        <div>
          <p className="t-label footer__label">{tr('Contact', 'Kontak')}</p>
          <a href={`tel:+${company.phoneIntl}`} className="block footer__text link-line">
            T: {company.phone}
          </a>
          <a href={`mailto:${company.email}`} className="block footer__text link-line">
            E: {company.email}
          </a>
          <a href={waLink(waHello())} target="_blank" rel="noreferrer" className="block footer__text link-line mt-2">
            WhatsApp ↗
          </a>
        </div>
        <div>
          <p className="t-label footer__label">Menu</p>
          <ul className="footer__text">
            {nav.map((n) => (
              <li key={n.to}>
                <TLink to={n.to} className="link-line">
                  {t(n.label)}
                </TLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="wrap footer__legal">
        <span>
          © {year} {company.name}. {t(company.vision)}.
        </span>
        <span>Sleman, D.I. Yogyakarta, Indonesia</span>
      </div>
      <FooterCta {...cta} />
    </footer>
  )
}
