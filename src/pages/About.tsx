import { useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img } from '../components/Img'
import { SectionLabel } from '../components/Bits'
import { ArrowRight } from '../components/Icons'
import { BrandMark } from '../components/BrandMark'
import { usePageAnimations } from '../lib/anim'
import { gsap } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { t, tr } from '../lib/i18n'
import { parametersDetail, team, vision } from '../data/site'
import { MissionGoals, animateMissionGoals } from '../components/MissionGoals'

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

    animateMissionGoals(page)
  })

  return (
    <Page title={tr('About', 'Tentang')}>
      <div ref={root}>
        <PageHero
          title={
            <>
              {tr('Architecture', 'Arsitektur')}
              <br />
              {tr('for everyone.', 'untuk semua.')}
            </>
          }
          sub={tr(
            'A community-based architecture consultancy in Yogyakarta, founded by Raditya Alvin in late September 2020.',
            'Konsultan arsitektur berbasis komunitas di Yogyakarta, didirikan oleh Raditya Alvin pada akhir September 2020.',
          )}
        />

        {/* "satu pintu": the first photo opens from a doorway (an arch, after ERA Residence) to the full frame */}
        <section className="wide-media" data-theme="dark">
          <div className="wide-media__frame">
            <div className="wide-media__inner" data-parallax="9">
              <Img id="labarka-garden" alt={tr('La Barka Resort - gardens and buildings', 'La Barka Resort - taman dan massa bangunan')} sizes="100vw" />
            </div>
          </div>
        </section>

        {/* One table: the three parties meet in one door (converging rings, scrubbed above) */}
        <section className="collab wrap" data-theme="light">
          <SectionLabel>A collaborative architectural solution</SectionLabel>
          <h2 className="t-h1 collab__title mt-6" data-split>
            {tr('One table for client, planner and builder.', 'Satu meja untuk klien, perencana, dan pelaksana.')}
          </h2>
          <div className="table" aria-hidden="true">
            {(
              [
                [tr('Client', 'Klien'), tr('Needs, budget and dreams', 'Kebutuhan, anggaran, dan impian'), 'hmw-dining'],
                [tr('Planner', 'Perencana'), tr('A design that reads the site', 'Desain yang membaca tapak'), 'draw-model'],
                [tr('Builder', 'Pelaksana'), tr('Turning designs into buildings', 'Mewujudkan desain jadi bangunan'), 'klinik-front'],
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
            {tr(
              'Planning and construction under one roof, so what we draw is what gets built.',
              'Perencanaan dan pelaksanaan terintegrasi dalam satu pintu, supaya yang digambar benar-benar terbangun.',
            )}
          </p>
        </section>

        {/* Ethos, and the two parameters that follow from it */}
        <section className="params wrap" data-theme="light">
          <SectionLabel>{tr('Our ethos', 'Etos kami')}</SectionLabel>
          <p className="t-lead params__ethos" data-scrub>
            {tr('Every design must be built. We see it through.', 'Setiap desain harus dibangun. Kami kawal hingga tuntas.')}
          </p>
          <p className="t-label params__intro" data-fade>
            {tr('We measure success in two ways', 'Dua tolok ukur keberhasilan proyek kami')}
          </p>
          <div className="params__grid">
            {parametersDetail.map((p, i) => (
              <article key={p.title.en} className="param">
                <div className="param__media" data-reveal data-delay={i * 0.12}>
                  <div className="param__parallax" data-parallax="5">
                    <Img id={p.img} alt={t(p.imgAlt)} sizes="(min-width: 900px) 50vw, 100vw" />
                  </div>
                </div>
                <span className="param__num" data-fade>
                  0{i + 1}
                </span>
                <h3 className="param__title" data-split>
                  {t(p.title)}
                </h3>
                <p className="t-body-lg param__body" data-fade>
                  {t(p.body)}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Vision: full-bleed photo */}
        <section className="vision" data-theme="dark">
          <div className="vision__frame">
            <Img id="wira-front" alt={tr('Wira House - facade at dusk', 'Wira House - fasad saat senja')} sizes="100vw" className="vision__img" />
            <div className="vision__body wrap">
              <SectionLabel>{tr('Vision', 'Visi')}</SectionLabel>
              <p className="vision__text" data-split>
                {t(vision)}
              </p>
            </div>
          </div>
        </section>

        <MissionGoals />

        {/* Team */}
        <section id="team" className="team wrap" data-theme="light">
          <div className="team__head">
            <SectionLabel>{tr('In-house team', 'Tim in-house')}</SectionLabel>
            <h2 className="t-h1 mt-6" data-split>
              {tr('Meet the people who plan and build with you.', 'Kenali tim yang merancang dan membangun bersama Anda.')}
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
                  <span className="member__role">{t(m.role)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="cta-block cta-block--mark wrap" data-theme="light">
          {/* the logo's K, drawn the way the intro draws it: ring first, then the three orange pieces */}
          <BrandMark className="cta-block__mark" ringColor="#3C4C74" />
          <h2 className="t-display" data-split>
            {tr("Let's", 'Mari')}
            <br />
            {tr('collaborate.', 'berkolaborasi.')}
          </h2>
          <div className="cta-block__side" data-fade>
            <p className="t-body-lg max-w-[34ch]">
              {tr(
                'Tell us about your home, business or estate. We’ll help you move from the first idea to a finished building.',
                'Ceritakan rencana rumah, usaha, atau kawasan Anda. Kami dampingi dari ide awal hingga bangunan selesai.',
              )}
            </p>
            <TLink to="/contact#start" className="btn-pill btn-pill--orange btn-pill--lg mt-6">
              {tr('Start a project', 'Mulai proyek')} <ArrowRight className="h-[0.8em] w-auto" />
            </TLink>
          </div>
        </section>
      </div>
    </Page>
  )
}
