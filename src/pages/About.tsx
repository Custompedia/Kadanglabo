import { useRef, type CSSProperties } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img, type ImgKey } from '../components/Img'
import { SectionLabel } from '../components/Bits'
import { ArrowRight } from '../components/Icons'
import { BrandMark } from '../components/BrandMark'
import { usePageAnimations } from '../lib/anim'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { company, parametersDetail, team, vision } from '../data/site'
import { MissionGoals, animateMissionGoals } from '../components/MissionGoals'
import { archive, areaStats, categoryLabel, categoryOrder } from '../data/projects'

const NUMBERS_WIDE = '(min-width: 1024px)' // the ring scene holds the screen from here up (see .numbers in styles.css)

// project photos on the ring of "Kadanglabo dalam angka" (warm renders, no blue drawings)
const ringPhotos: ImgKey[] = [
  'labarka-river',
  'hamzah-front',
  'klinik-front',
  'ivanna-front',
  'balecatur-lobby',
  'giripeni-aerial',
  'labarka-teppanyaki',
  'muji-front',
  'draw-model',
  'hmw-facade',
  'labarka-koi',
  'firlatata-street',
  'balecatur-pool',
  'berbah-front',
  'labarka-gables',
  'wira-front',
]

// every figure comes from the site data, so it stays true when projects or people are added
const figures = [
  { value: String(company.founded), label: 'Tahun berdiri', note: `Didirikan ${company.founder}, akhir September ${company.founded}` },
  { value: `${Math.floor(archive.length / 10) * 10}+`, label: 'Proyek', note: 'Rumah, perumahan, resort, restoran, kantor, hingga klinik' },
  { value: String(areaStats.length), label: 'Wilayah', note: areaStats.map((a) => a.label).join(' · ') },
  { value: String(categoryOrder.length), label: 'Sektor', note: categoryOrder.map((c) => categoryLabel[c]).join(' · ') },
  { value: String(team.length), label: 'Tim in-house', note: 'Arsitek, drafter, pengawas lapangan, hingga tim digital' },
]

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export default function About() {
  const root = useRef<HTMLDivElement>(null)

  usePageAnimations(root, (page) => {
    // Closing invitation: the K mark draws its ring and pops its pieces in as the section arrives
    gsap
      .timeline({ scrollTrigger: { trigger: '.cta-block', start: 'top 75%', once: true } })
      .fromTo('.cta-block__mark .bm-ring', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
      .from('.cta-block__mark .bm-piece', { scale: 0, transformOrigin: '50% 50%', duration: 0.8, stagger: 0.14, ease: 'back.out(1.8)' }, 0.7)

    // The doorway: a narrow arch in the middle widens to the full frame while the photo scrolls in
    const door = page.querySelector<HTMLElement>('.wide-media__frame')!
    const arch = () => Math.round(door.offsetWidth * 0.19)
    gsap.fromTo(
      door,
      { clipPath: () => `inset(0% 31% 0% 31% round ${arch()}px ${arch()}px 0px 0px)` },
      {
        clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)',
        ease: 'power1.inOut',
        scrollTrigger: { trigger: '.wide-media', start: 'top 80%', end: 'top 8%', scrub: true, invalidateOnRefresh: true },
      },
    )
    gsap.fromTo('.wide-media__frame img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.wide-media', start: 'top 80%', end: 'top 8%', scrub: true } })

    // Kadanglabo in numbers, wide screens: the stage holds; the project photos fly in from beyond the screen edges
    // into a turning ring, the intro steps aside and the figures roll past the centre like a drum, then the photos
    // fly back out. Built once; the CSS media query switches the layout, so crossing the breakpoint only
    // re-renders (no triggers are created during a breakpoint change).
    const numbers = page.querySelector<HTMLElement>('.numbers')!
    const stage = numbers.querySelector<HTMLElement>('.numbers__stage')!
    const ring = numbers.querySelector<HTMLElement>('.numbers__ring')!
    const intro = numbers.querySelector<HTMLElement>('.numbers__intro')!
    const items = gsap.utils.toArray<HTMLElement>('.numbers__item', numbers)
    const photos = gsap.utils.toArray<HTMLElement>('.numbers__photo', numbers)
    // each photo gets its own moment to arrive and to leave, in a shuffled order around the ring
    const order = photos.map((_, i) => ((i * 7) % photos.length) / photos.length)
    const ease = gsap.parseEase('power3.out')
    const easeIn = gsap.parseEase('power3.in')
    const wide = window.matchMedia(NUMBERS_WIDE)
    numbers.dataset.motion = ''
    let still = false
    const render = (p: number) => {
      if (!wide.matches) {
        if (!still) {
          gsap.set([ring, intro, ...items], { clearProps: 'transform,opacity' })
          photos.forEach((ph) => ph.style.removeProperty('--k'))
        }
        still = true
        return
      }
      still = false
      // photos: from far outside (k = 2.6 x the ring radius) into the ring, and out again at the end
      photos.forEach((ph, i) => {
        const inAt = order[i] * 0.12
        const outAt = 0.8 + order[i] * 0.1
        const arrive = ease(clamp01((p - inAt) / 0.12))
        const leave = easeIn(clamp01((p - outAt) / 0.1))
        ph.style.setProperty('--k', (1 + 1.6 * (1 - arrive) + 1.6 * leave).toFixed(4))
      })
      const out = clamp01((p - 0.16) / 0.06) // the intro holds while the photos gather, then steps away
      const show = clamp01((p - 0.2) / 0.05) // and the first figure rises in right behind it
      const pos = clamp01((p - 0.25) / 0.53) * (items.length - 1) // which figure sits in the centre
      const step = stage.clientHeight * 0.42
      gsap.set(ring, { rotation: -150 * p })
      gsap.set(intro, { opacity: 1 - out, y: -70 * out })
      items.forEach((item, i) => {
        const d = i - pos + (1 - show) * 0.35 // the first figure rises into place as it appears
        gsap.set(item, { y: d * step, opacity: clamp01(1 - Math.abs(d) * 0.85) * show, scale: 1 - Math.min(1, Math.abs(d)) * 0.1 })
      })
    }
    ScrollTrigger.create({
      trigger: numbers,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    })

    // Vision: the photo opens out to full bleed while it scrolls in; it is fully open before the text line rises
    const st = { trigger: '.vision', start: 'top bottom', end: 'top 25%', scrub: true }
    gsap.fromTo('.vision__frame', { clipPath: 'inset(0% 6% 0% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: st })
    gsap.fromTo('.vision__img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: st })

    // One table: the three strips (client, planner, builder) wipe in from alternating sides one after another;
    // the photo settles from a zoom, the role rises from under the strip's edge and the rest fades in
    const strips = gsap.utils.toArray<HTMLElement>('.collab .table__strip', page)
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.table', start: 'top 78%', once: true } })
    strips.forEach((strip, i) => {
      const fromLeft = i % 2 === 0
      const at = i * 0.28
      tl.fromTo(
        strip,
        { clipPath: fromLeft ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' },
        at,
      )
        .fromTo(strip.querySelector('img'), { scale: 1.3, xPercent: fromLeft ? -6 : 6 }, { scale: 1, xPercent: 0, duration: 1.8, ease: 'power3.out' }, at + 0.1)
        .from(strip.querySelector('.table__who'), { yPercent: 120, duration: 0.9, ease: 'power4.out' }, at + 0.55)
        .from([strip.querySelector('.table__no'), strip.querySelector('.table__brings')], { autoAlpha: 0, y: 10, duration: 0.6, ease: 'power2.out' }, at + 0.8)
    })

    // The numbers scene changes document height. Measure later sections only after that layout is established.
    animateMissionGoals(page)
  })

  return (
    <Page title="About">
      <div ref={root}>
        <PageHero
          title={
            <>
              Arsitektur
              <br />
              untuk semua.
            </>
          }
          sub="Konsultan arsitektur berbasis komunitas di Yogyakarta, didirikan oleh Raditya Alvin pada akhir September 2020."
        />

        {/* "satu pintu": the first photo opens from a doorway (an arch, after ERA Residence) to the full frame */}
        <section className="wide-media" data-theme="dark">
          <div className="wide-media__frame">
            <div className="wide-media__inner" data-parallax="9">
              <Img id="labarka-garden" alt="La Barka Resort - taman dan massa bangunan" sizes="100vw" />
            </div>
          </div>
        </section>

        {/* Kadanglabo in numbers: a ring of project photos turns while the figures roll past (wide screens);
            a calm list of figures on tablets and phones */}
        <section className="numbers" data-theme="light" aria-labelledby="numbers-title">
          <div className="numbers__stage">
            <div className="numbers__ring" style={{ '--n': ringPhotos.length } as CSSProperties} aria-hidden="true">
              {ringPhotos.map((id, i) => (
                <div key={id} className="numbers__photo" style={{ '--i': i } as CSSProperties}>
                  <Img id={id} sizes="190px" />
                </div>
              ))}
            </div>
            <div className="numbers__intro wrap">
              <SectionLabel>Kadanglabo dalam angka</SectionLabel>
              <h2 id="numbers-title" className="t-h1 numbers__title" data-split>
                Arsitektur kolaboratif, dari Yogyakarta ke berbagai kota.
              </h2>
            </div>
            <ol className="numbers__list wrap">
              {figures.map((f) => (
                <li key={f.label} className="numbers__item">
                  <span className="numbers__value" data-fade>
                    {f.value}
                  </span>
                  <span className="numbers__text" data-fade data-delay="0.1">
                    <span className="numbers__label">{f.label}</span>
                    <span className="t-serif numbers__note">{f.note}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* One table: the three parties meet in one door (converging rings, scrubbed above) */}
        <section className="collab wrap" data-theme="light">
          <SectionLabel>A collaborative architectural solution</SectionLabel>
          <h2 className="t-h1 collab__title mt-6" data-split>
            Satu meja untuk klien, perencana, dan pelaksana.
          </h2>
          <div className="table" aria-hidden="true">
            {(
              [
                ['Klien', 'Kebutuhan, anggaran, dan impian', 'hmw-dining'],
                ['Perencana', 'Desain yang membaca tapak', 'draw-model'],
                ['Pelaksana', 'Bangunan yang benar-benar berdiri', 'klinik-front'],
              ] as const
            ).map(([who, brings, img], i) => (
              <div key={who} className="table__strip">
                <Img id={img} sizes="(min-width: 768px) 70vw, 100vw" />
                <span className="table__strip-shade" />
                <span className="table__no">0{i + 1}</span>
                <span className="table__who">{who}</span>
                <span className="t-serif table__brings">{brings}</span>
              </div>
            ))}
          </div>
          <p className="t-body-lg collab__body opacity-75" data-fade>
            Perencanaan dan pelaksanaan terintegrasi dalam satu pintu, supaya yang digambar benar-benar terbangun.
          </p>
        </section>

        {/* Ethos, and the two parameters that follow from it */}
        <section className="params wrap" data-theme="light">
          <SectionLabel>Etos kami</SectionLabel>
          <p className="t-lead params__ethos" data-scrub>
            Setiap proyek yang kami desain harus terbangun, tuntas sampai berdiri.
          </p>
          <p className="t-label params__intro" data-fade>
            Dari etos itu lahir dua parameter keberhasilan proyek
          </p>
          <div className="params__grid">
            {parametersDetail.map((p, i) => (
              <article key={p.title} className="param">
                <div className="param__media" data-reveal data-delay={i * 0.12}>
                  <div className="param__parallax" data-parallax="5">
                    <Img id={p.img} alt={p.imgAlt} sizes="(min-width: 900px) 50vw, 100vw" />
                  </div>
                </div>
                <span className="param__num" data-fade>
                  0{i + 1}
                </span>
                <h3 className="param__title" data-split>
                  {p.title}
                </h3>
                <p className="t-body-lg param__body" data-fade>
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Vision: full-bleed photo */}
        <section className="vision" data-theme="dark">
          <div className="vision__frame">
            <Img id="wira-front" alt="Wira House - fasad saat senja" sizes="100vw" className="vision__img" />
            <div className="vision__body wrap">
              <SectionLabel>Vision</SectionLabel>
              <p className="vision__text" data-split>
                {vision}
              </p>
            </div>
          </div>
        </section>

        <MissionGoals />

        {/* Team */}
        <section id="team" className="team wrap" data-theme="light">
          <div className="team__head">
            <SectionLabel>Tim in-house</SectionLabel>
            <h2 className="t-h1 mt-6" data-split>
              Orang-orang di balik setiap gambar dan setiap bangunan.
            </h2>
          </div>
          <div className="team__grid" data-stagger="0.06">
            {team.map((m, i) => (
              <figure key={m.name} className={i === 0 ? 'member member--lead' : 'member'}>
                <div className="member__photo">
                  <Img
                    id={m.img}
                    alt={m.name}
                    sizes={i === 0 ? '(min-width: 640px) 34vw, 100vw' : '(min-width: 1100px) 16vw, (min-width: 640px) 24vw, 48vw'}
                  />
                </div>
                <figcaption>
                  <span className="member__name">{m.name}</span>
                  <span className="member__role">{m.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="cta-block cta-block--mark wrap" data-theme="light">
          {/* the logo's K, drawn the way the intro draws it: ring first, then the three orange pieces */}
          <BrandMark className="cta-block__mark" ringColor="#3C4C74" />
          <h2 className="t-display" data-split>
            Mari
            <br />
            berkolaborasi.
          </h2>
          <div className="cta-block__side" data-fade>
            <p className="t-body-lg max-w-[34ch]">
              Ceritakan rencana Anda: rumah, usaha, atau kawasan. Kami bantu dari pertanyaan pertama sampai bangunan
              berdiri.
            </p>
            <TLink to="/contact#start" className="btn-pill btn-pill--orange btn-pill--lg mt-6">
              Start a project <ArrowRight className="h-[0.8em] w-auto" />
            </TLink>
          </div>
        </section>
      </div>
    </Page>
  )
}
