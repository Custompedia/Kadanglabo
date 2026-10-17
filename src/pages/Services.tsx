import { Fragment, useEffect, useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img, type ImgKey } from '../components/Img'
import { SectionLabel } from '../components/Bits'
import { InquiryForm } from '../components/InquiryForm'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { gsap } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { disciplines, managementServices, process, sectors } from '../data/site'

const WIDE = '(min-width: 900px)' // Service detail travels sideways from here up (see .process in styles.css)
// every service in one numbered run, in three groups: design disciplines, management, care of existing buildings
let serviceNo = 0
const serviceRun = [
  { group: 'Desain', items: disciplines },
  { group: 'Manajemen', items: managementServices.perencanaan },
  { group: 'Perawatan', items: managementServices.perawatan },
].map((g) => ({ group: g.group, items: g.items.map((name) => ({ name, no: String(++serviceNo).padStart(2, '0') })) }))

const collage: ImgKey[] = ['labarka-path', 'klinik-corridor', 'labarka-balcony', 'balecatur-lobby', 'hmw-dining', 'balecatur-bed', 'firlatata-living']

export default function Services() {
  const root = useRef<HTMLDivElement>(null)

  usePageAnimations(root, (page) => {
    gsap.fromTo(
      '.collage__track',
      { xPercent: 0 },
      {
        xPercent: -22,
        ease: 'none',
        scrollTrigger: { trigger: '.collage', start: 'top bottom', end: 'bottom top', scrub: true },
      },
    )

    // Service detail, wide screens: the stage holds still while the intro and the four cards travel sideways.
    // Built once; the CSS media query switches the layout, so crossing the breakpoint only re-measures
    // (creating triggers during a breakpoint change would make ScrollTrigger lose the scroll position).
    const section = page.querySelector<HTMLElement>('.process')!
    const stage = section.querySelector<HTMLElement>('.process__stage')!
    const track = section.querySelector<HTMLElement>('.process__track')!
    const bar = section.querySelector<HTMLElement>('.process__progress span')!
    const slots = gsap.utils.toArray<HTMLElement>('.step', section)
    const cards = slots.map((slot) => slot.querySelector<HTMLElement>('.step__card')!)
    const setX = cards.map((card) => gsap.quickSetter(card, 'x', 'px'))
    const wide = window.matchMedia(WIDE)
    section.dataset.motion = ''
    let travel = 0
    let geo: [number, number][] = []
    const fit = () => {
      travel = wide.matches ? Math.max(0, track.offsetWidth - stage.clientWidth + 2 * parseFloat(getComputedStyle(stage).paddingLeft)) : 0
      section.style.height = wide.matches ? `${stage.offsetHeight + travel}px` : '' // one pixel of scroll per pixel of travel
      geo = slots.map((slot) => [slot.offsetLeft, slot.offsetWidth])
      if (!wide.matches) gsap.set(cards, { clearProps: 'x' })
    }
    fit()
    gsap.to(track, {
      x: () => -travel,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true, onRefreshInit: fit },
      onUpdate() {
        if (!wide.matches) return
        bar.style.transform = `scaleX(${this.progress()})`
        // each card enters a little behind its slot and closes up by the time it is fully on screen
        const x = gsap.getProperty(track, 'x') as number
        geo.forEach(([left, width], i) => setX[i](120 * (1 - gsap.utils.clamp(0, 1, (stage.clientWidth - left - x) / width))))
      },
    })

    // The cards rest lit (orange, white type). They wait as the sand cards they used to be and light up once
    // half of a card is on screen: the orange rises from the bottom and the type turns white as it passes.
    // Works the same in the moving track (wide screens) and in the swipe rail (phones).
    const theme = getComputedStyle(document.documentElement)
    const ink = theme.getPropertyValue('--color-ink').trim()
    const orange = theme.getPropertyValue('--color-orange-deep').trim()
    const lights = cards.map((card) => {
      const sand = card.querySelector('.step__sand')
      const num = card.querySelector('.step__num')
      const lead = card.querySelector('.step__lead')
      const rules = card.querySelectorAll('.step__points li')
      gsap.set(sand, { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)' })
      gsap.set(card, { color: ink })
      gsap.set(num, { color: orange })
      gsap.set(lead, { opacity: 0.75 })
      gsap.set(rules, { borderColor: 'rgba(21, 21, 21, 0.14)' })
      return gsap
        .timeline({ paused: true })
        .to(sand, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' })
        .to(rules, { borderColor: 'rgba(255, 255, 255, 0.35)', duration: 0.3, ease: 'power1.inOut' }, 0.28)
        .to(card, { color: '#fff', duration: 0.3, ease: 'power1.inOut' }, 0.32)
        .to(lead, { opacity: 1, duration: 0.3, ease: 'power1.inOut' }, 0.32)
        .to(num, { color: '#fff', duration: 0.3, ease: 'power1.inOut' }, 0.46)
        .set(sand, { autoAlpha: 0 })
    })
    const io = new IntersectionObserver(
      (entries) => {
        entries
          .filter((e) => e.isIntersecting)
          .map((e) => cards.indexOf(e.target as HTMLElement))
          .sort((a, b) => a - b)
          .forEach((i, k) => {
            io.unobserve(cards[i])
            lights[i].delay(k * 0.15).restart(true) // cards that arrive together light up one after another
          })
      },
      { threshold: 0.5 },
    )
    cards.forEach((card) => io.observe(card))
    return () => io.disconnect()
  })

  // Swipe rail (narrow screens, reduced motion): the bar under the cards follows the swipe
  useEffect(() => {
    const section = root.current?.querySelector<HTMLElement>('.process')
    const rail = section?.querySelector<HTMLElement>('.process__cards')
    const bar = section?.querySelector<HTMLElement>('.process__progress span')
    if (!section || !rail || !bar) return
    const wide = window.matchMedia(WIDE)
    const update = () => {
      if (wide.matches && section.hasAttribute('data-motion')) return
      const max = rail.scrollWidth - rail.clientWidth
      bar.style.transform = `scaleX(${max > 0 ? Math.max(0.25, rail.scrollLeft / max) : 1})`
    }
    update()
    rail.addEventListener('scroll', update, { passive: true })
    wide.addEventListener('change', update)
    return () => {
      rail.removeEventListener('scroll', update)
      wide.removeEventListener('change', update)
    }
  }, [])

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
          sub="Overview seluruh layanan studio, dari perencanaan hingga perawatan, untuk bangunan baru, renovasi, dan pengembangan."
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
          <p className="t-h1 statement__text" data-split>
            Desain kontekstual. Workflow yang efektif. Bangunan yang tuntas. Satu pintu dari perencanaan hingga
            pelaksanaan.
          </p>
        </section>

        {/* Overview: every service in one numbered run (after Telha Clarke's services line), lit as you read */}
        <section className="overview wrap" data-theme="light" aria-labelledby="overview-title">
          <div className="overview__head">
            <h2 id="overview-title" className="t-label">
              Layanan kami
            </h2>
            <span className="t-serif overview__count" data-fade>
              {serviceNo} layanan, {serviceRun.length} kelompok
            </span>
          </div>
          <p className="overview__run" data-scrub>
            {serviceRun.map((g) => (
              <span key={g.group} className="overview__line">
                <span className="overview__group">{g.group}</span>{' '}
                {g.items.map((s, i) => {
                  const words = s.name.split(' ')
                  const last = words.pop()
                  return (
                    <Fragment key={s.name}>
                      {words.length > 0 && `${words.join(' ')} `}
                      {/* the last word keeps its number and the slash with it, so neither starts a line */}
                      <span className="overview__tail">
                        {last}
                        <sup>({s.no})</sup>
                        {i < g.items.length - 1 && (
                          <span className="overview__sep" aria-hidden="true">
                            {' /'}
                          </span>
                        )}
                      </span>{' '}
                    </Fragment>
                  )
                })}
              </span>
            ))}
          </p>
        </section>

        {/* Service categories */}
        <section className="cats wrap" data-theme="light">
          <div className="cats__head">
            <SectionLabel n="02">Service categories</SectionLabel>
            <p className="t-body-lg max-w-[44ch] opacity-75" data-fade>
              Setiap kategori mencakup bangunan baru, renovasi, dan pengembangan, dikerjakan dengan alur yang sama
              dari analisa hingga deliverables.
            </p>
          </div>
          {sectors.map((s, i) => (
            <article key={s.key} className="cat">
              <span className="cat__num">0{i + 1}</span>
              <div className="cat__main">
                <h2 className="cat__title" data-split>
                  {s.label}
                </h2>
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

        {/* Service detail: four stages on cards that travel sideways while you scroll (swipe on touch screens) */}
        <section className="process" data-theme="light" aria-labelledby="process-title">
          <div className="process__stage">
            <div className="process__track">
              <div className="process__intro">
                <SectionLabel n="03">Service detail</SectionLabel>
                <h2 id="process-title" className="t-display process__title" data-split>
                  Dari kebutuhan <br />
                  ke bangunan.
                </h2>
                <p className="t-body-lg process__description" data-fade>
                  Empat tahap yang kami jalani bersama setiap klien: transparan, terukur, dan selalu berujung di
                  lapangan.
                </p>
              </div>
              <ol className="process__cards" tabIndex={0} aria-label="Empat tahap layanan">
                {process.map((step, i) => (
                  <li key={step.title} className="step">
                    <div className="step__card">
                      <span className="step__sand" aria-hidden="true" />
                      <span className="step__num" aria-hidden="true">
                        0{i + 1}
                      </span>
                      <div>
                        <h3 className="step__title">{step.title}</h3>
                        <p className="step__lead">{step.lead}</p>
                        <ul className="step__points">
                          {step.points.map((pt) => (
                            <li key={pt}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="process__progress wrap" aria-hidden="true">
              <span />
            </div>
          </div>
        </section>

        <section id="start" className="start wrap" data-theme="light">
          <div className="start__head">
            <SectionLabel n="04">Start a project</SectionLabel>
            <h2 className="t-display start__title" data-split>
              Konsultasi &amp; project inquiry.
            </h2>
            <p className="t-body-lg max-w-[40ch] opacity-75 mt-6" data-fade>
              Isi singkat kebutuhan Anda, tim kami akan menghubungi Anda kembali.
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
