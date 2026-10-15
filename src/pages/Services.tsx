import { useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img, type ImgKey } from '../components/Img'
import { SectionLabel } from '../components/Bits'
import { InquiryForm } from '../components/InquiryForm'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { gsap } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { about, disciplines, managementServices, process, sectors } from '../data/site'

const collage: ImgKey[] = ['labarka-path', 'klinik-corridor', 'draw-interior', 'balecatur-lobby', 'hmw-dining', 'cantrik-breeze', 'firlatata-living']

export default function Services() {
  const root = useRef<HTMLDivElement>(null)

  usePageAnimations(root, (el) => {
    gsap.fromTo(
      '.collage__track',
      { xPercent: 0 },
      {
        xPercent: -22,
        ease: 'none',
        scrollTrigger: { trigger: '.collage', start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )

    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px)', () => {
      const track = el.querySelector<HTMLElement>('.process__track')
      if (!track) return
      const distance = () => track.scrollWidth - window.innerWidth
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: '.process',
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
      gsap.fromTo(
        '.process__bar-fill',
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: { trigger: '.process', start: 'top top', end: () => `+=${distance()}`, scrub: true },
        },
      )
    })
  })

  return (
    <Page title="Services">
      <div ref={root}>
        <PageHero
          title={
            <>
              Designed
              <br />
              to be built.
            </>
          }
          sub="Overview seluruh layanan studio — dari perencanaan hingga perawatan, untuk bangunan baru, renovasi, dan pengembangan."
        />

        <section className="collage" data-theme="light" aria-hidden="true">
          <div className="collage__track">
            {collage.map((id, i) => (
              <div key={id} className={`collage__item collage__item--${i % 3}`}>
                <Img id={id} sizes="(min-width: 768px) 26vw, 60vw" />
              </div>
            ))}
          </div>
        </section>

        <section className="statement wrap" data-theme="light">
          <SectionLabel n="01">Our services</SectionLabel>
          <p className="t-lead statement__text" data-scrub>
            {about.ethos}
          </p>
        </section>

        {/* Overview: everything the studio does, in one grid */}
        <section className="overview wrap" data-theme="light">
          <p className="overview__intro t-h2" data-fade>
            Perencanaan, desain, dan manajemen pelaksanaan — dalam satu pintu.
          </p>
          <div className="overview__grid" data-stagger="0.08">
            <div className="overview__col">
              <p className="t-label overview__label">Disiplin desain</p>
              <ul className="overview__list">
                {disciplines.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
            <div className="overview__col">
              <p className="t-label overview__label">Perencanaan</p>
              <ul className="overview__list">
                {managementServices.perencanaan.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <div className="overview__col">
              <p className="t-label overview__label">Perawatan</p>
              <ul className="overview__list">
                {managementServices.perawatan.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <p className="overview__note">Untuk bangunan yang sudah ada — menjaga fungsi dan nilainya tetap hidup.</p>
            </div>
          </div>
        </section>

        {/* Service categories */}
        <section className="cats wrap" data-theme="light">
          <div className="cats__head">
            <SectionLabel n="02">Service categories</SectionLabel>
            <p className="t-body-lg max-w-[44ch] opacity-75" data-fade>
              Setiap kategori mencakup bangunan baru, renovasi, dan pengembangan — dikerjakan dengan alur yang sama
              dari analisa hingga deliverables.
            </p>
          </div>
          {sectors.map((s, i) => (
            <article key={s.key} className="cat">
              <span className="cat__num">0{i + 1}</span>
              <div className="cat__main">
                <h3 className="cat__title" data-split>
                  {s.label}
                </h3>
                <p className="cat__tags" data-fade>
                  <span className="pill">New Building &amp; Renovation / Development</span>
                </p>
                <p className="t-body-lg cat__desc" data-fade>
                  {s.desc}
                </p>
                <p className="cat__typos" data-fade>
                  {s.typologies.join(' · ')}
                </p>
                <TLink to={`/work#${s.key}`} className="link-line t-label mt-6 inline-block" data-fade>
                  Lihat proyek {s.title.toLowerCase()} →
                </TLink>
              </div>
              <div className="cat__media" data-reveal>
                <Img id={s.img} alt={s.imgAlt} sizes="(min-width: 768px) 40vw, 100vw" />
              </div>
            </article>
          ))}
        </section>

        {/* Service detail — pinned horizontal process */}
        <section className="process" data-theme="dark">
          <div className="process__head wrap">
            <SectionLabel n="03">Service detail</SectionLabel>
            <div className="process__bar" aria-hidden="true">
              <span className="process__bar-fill" />
            </div>
          </div>
          <div className="process__track">
            <div className="process__intro">
              <h2 className="t-display process__title">
                Dari pain
                <br />
                points ke
                <br />
                bangunan.
              </h2>
              <p className="t-body-lg max-w-[34ch] opacity-75">
                Empat tahap yang kami jalani bersama setiap klien — transparan, terukur, dan selalu berujung di
                lapangan.
              </p>
            </div>
            {process.map((step, i) => (
              <article key={step.title} className="step">
                <span className="step__num">0{i + 1}</span>
                <h3 className="step__title">{step.title}</h3>
                <p className="step__lead">{step.lead}</p>
                <ul className="step__points">
                  {step.points.map((pt) => (
                    <li key={pt}>{pt}</li>
                  ))}
                </ul>
                {i < process.length - 1 && <span className="step__arrow" aria-hidden="true">→</span>}
              </article>
            ))}
          </div>
        </section>

        <section className="mantra" data-theme="accent">
          <div className="wrap">
            <p className="t-h1 mantra__text" data-split>
              Desain kontekstual. Workflow yang efektif. Bangunan yang tuntas — satu pintu dari perencanaan hingga
              pelaksanaan.
            </p>
          </div>
        </section>

        <section id="start" className="start wrap" data-theme="light">
          <div className="start__head">
            <SectionLabel n="04">Start a project</SectionLabel>
            <h2 className="t-display start__title" data-split>
              Konsultasi &amp; project inquiry.
            </h2>
            <p className="t-body-lg max-w-[40ch] opacity-75 mt-6" data-fade>
              Isi singkat kebutuhan Anda. Pesan akan terkirim ke WhatsApp studio, dan tim kami akan menghubungi Anda
              kembali.
            </p>
            <TLink to="/contact" className="link-line t-label mt-6 inline-block">
              Kontak lainnya <ArrowRight className="ml-1 inline h-[0.7em] w-auto" />
            </TLink>
          </div>
          <InquiryForm />
        </section>
      </div>
    </Page>
  )
}
