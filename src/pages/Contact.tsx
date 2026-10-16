import { useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { SectionLabel } from '../components/Bits'
import { InquiryForm } from '../components/InquiryForm'
import { StudioMap } from '../components/StudioMap'
import { usePageAnimations } from '../lib/anim'
import { company, mapsLink, waLink } from '../data/site'

export default function Contact() {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root)

  return (
    <Page title="Contact">
      <div ref={root} className="contact-page">
        <PageHero
          title="Contact"
          sub="Kami bangga dapat bekerja sama dengan klien dari berbagai kota di Indonesia dengan lokasi kami yang berada di Daerah Istimewa Yogyakarta. Silakan mampir jika Anda sedang berada di sekitar sini atau hubungi kami; kami sangat menantikan kabar dari Anda."
        />

        {/* same two-column grid as "Start a project" below: visual on the left, field-style details on the right */}
        <section className="find wrap" data-theme="light">
          <div className="find__media">
            <SectionLabel>How to find us</SectionLabel>
            <div className="find__map" data-fade>
              <StudioMap />
            </div>
          </div>
          <div className="find__info">
            <dl className="find__list" data-stagger="0.08">
              <div className="find__item find__item--wide">
                <dt className="field__label">Alamat studio</dt>
                <dd>
                  <strong>Kadanglabo Studio</strong>
                  <br />
                  {company.address.join(', ')}
                </dd>
              </div>
              <div className="find__item">
                <dt className="field__label">Telepon / WhatsApp</dt>
                <dd>
                  <a href={`tel:+${company.phoneIntl}`} className="link-line">
                    {company.phone}
                  </a>
                </dd>
              </div>
              <div className="find__item">
                <dt className="field__label">Email</dt>
                <dd>
                  <a href={`mailto:${company.email}`} className="link-line">
                    {company.email}
                  </a>
                </dd>
              </div>
            </dl>
            <div className="find__actions" data-fade>
              <a
                href={waLink('Halo Kadanglabo, saya ingin konsultasi proyek.')}
                target="_blank"
                rel="noreferrer"
                className="btn-pill btn-pill--orange"
              >
                Chat WhatsApp
              </a>
              <a href={mapsLink} target="_blank" rel="noreferrer" className="btn-pill btn-pill--ghost">
                Petunjuk arah ↗
              </a>
            </div>
          </div>
        </section>

        <section id="start" className="start wrap" data-theme="light">
          <div className="start__head">
            <SectionLabel>Start a project</SectionLabel>
            <h2 className="t-display start__title" data-split>
              Mari mulai dari ngobrol.
            </h2>
            <p className="t-body-lg max-w-[40ch] opacity-75 mt-6" data-fade>
              Konsultasi dan project inquiry: ceritakan rencana Anda, kami siapkan langkah pertamanya.
            </p>
          </div>
          <InquiryForm />
        </section>
      </div>
    </Page>
  )
}
