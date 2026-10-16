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

        <section className="contact-cols wrap" data-theme="light">
          <div className="contact-col" data-fade>
            <SectionLabel>How to find us</SectionLabel>
            <address className="contact-big not-italic">
              Kadanglabo Studio
              <br />
              {company.address.map((l) => (
                <span key={l} className="block">
                  {l}
                </span>
              ))}
            </address>
            <a href={mapsLink} target="_blank" rel="noreferrer" className="link-line t-label mt-5 inline-block">
              Petunjuk arah ↗
            </a>
          </div>
          <div className="contact-col" data-fade data-delay="0.1">
            <SectionLabel>How to talk to us</SectionLabel>
            <p className="contact-big">
              <span className="block opacity-60 text-[0.55em] font-medium uppercase tracking-wide">Telepon / WhatsApp</span>
              <a href={`tel:+${company.phoneIntl}`} className="link-line">
                {company.phone}
              </a>
            </p>
            <p className="contact-big">
              <span className="block opacity-60 text-[0.55em] font-medium uppercase tracking-wide">Email</span>
              <a href={`mailto:${company.email}`} className="link-line break-all">
                {company.email}
              </a>
            </p>
            <a
              href={waLink('Halo Kadanglabo, saya ingin konsultasi proyek.')}
              target="_blank"
              rel="noreferrer"
              className="btn-pill btn-pill--orange mt-6"
            >
              Chat WhatsApp
            </a>
          </div>
        </section>

        <section className="wrap contact-map" data-theme="light" data-fade>
          <StudioMap />
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
