import { useEffect, useRef, useState } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { SectionLabel } from '../components/Bits'
import { InquiryForm } from '../components/InquiryForm'
import { ArrowRight, Instagram, Mail, MapPin, WhatsApp } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { ScrollTrigger } from '../lib/gsap'
import { company, mapsEmbed, mapsLink, waLink } from '../data/site'
import { faq } from '../data/faq'

// FAQPage structured data, so search engines can show the answers directly
const faqSchema = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
})

export default function Contact() {
  const root = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(0)
  usePageAnimations(root)

  // an answer opening or closing changes the page height: keep the reveals below in sync
  const toggled = useRef(false)
  useEffect(() => {
    if (!toggled.current) {
      toggled.current = true
      return
    }
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 750)
    return () => window.clearTimeout(id)
  }, [open])

  return (
    <Page title="Contact">
      <div ref={root}>
        <PageHero
          title="Contact"
          sub="Studio kami di Yogyakarta, klien kami dari berbagai kota di Indonesia. Mampir atau hubungi kami, kami menantikan kabar Anda."
        />

        {/* Start a project: the form comes first */}
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
          <div data-fade>
            <InquiryForm />
          </div>
        </section>

        {/* How to find us: details left, map right */}
        <section className="locate wrap" data-theme="light">
          <div className="locate__info">
            <SectionLabel>How to find us</SectionLabel>
            <h2 className="t-h1 locate__title" data-split>
              Temukan kami di Yogyakarta.
            </h2>
            <dl className="locate__list" data-stagger="0.08">
              <div>
                <dt className="field__label">Email</dt>
                <dd>
                  <a href={`mailto:${company.email}`} className="link-line">
                    {company.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="field__label">Telepon / WhatsApp</dt>
                <dd>
                  <a href={`tel:+${company.phoneIntl}`} className="link-line">
                    {company.phone}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="field__label">Alamat studio</dt>
                <dd>
                  {company.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            <div className="locate__social" data-fade>
              <a href={company.instagram} target="_blank" rel="noreferrer" aria-label="Instagram @kadanglabo">
                <Instagram />
              </a>
              <a href={waLink('Halo Kadanglabo, saya ingin konsultasi proyek.')} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <WhatsApp />
              </a>
              <a href={`mailto:${company.email}`} aria-label="Email">
                <Mail />
              </a>
              <a href={mapsLink} target="_blank" rel="noreferrer" aria-label="Buka di Google Maps">
                <MapPin />
              </a>
            </div>
          </div>
          <div className="locate__map" data-reveal>
            <iframe
              src={mapsEmbed}
              title="Peta lokasi studio Kadanglabo"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </section>

        {/* FAQ */}
        <section className="faq wrap" data-theme="light" aria-labelledby="faq-title">
          <div className="faq__intro">
            <SectionLabel>FAQ</SectionLabel>
            <h2 id="faq-title" className="t-h1 faq__title" data-split>
              Pertanyaan yang sering diajukan.
            </h2>
            <p className="t-body-lg faq__text" data-fade>
              Jawaban singkat untuk hal yang paling sering ditanyakan sebelum memulai proyek. Masih ada yang ingin
              dibahas? Ngobrol langsung dengan tim kami.
            </p>
            <a
              href={waLink('Halo Kadanglabo, saya punya pertanyaan tentang proyek.')}
              target="_blank"
              rel="noreferrer"
              className="btn-pill btn-pill--orange btn-pill--lg"
              data-fade
            >
              Tanya langsung <ArrowRight className="h-[0.8em] w-auto" />
            </a>
          </div>
          <div className="acc-group faq__list" data-stagger="0.05">
            {faq.map((item, i) => (
              <div key={item.q} className="acc" data-open={open === i ? '' : undefined}>
                <button
                  type="button"
                  id={`faq-q${i}`}
                  className="acc__head"
                  aria-expanded={open === i}
                  aria-controls={`faq-a${i}`}
                  onClick={() => setOpen(open === i ? -1 : i)}
                >
                  <span className="acc__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="acc__title">{item.q}</span>
                  <span className="acc__icon" aria-hidden="true" />
                </button>
                <div id={`faq-a${i}`} className="acc__body" role="region" aria-labelledby={`faq-q${i}`}>
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqSchema }} />
        </section>
      </div>
    </Page>
  )
}
