import { useRef, type CSSProperties } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img } from '../components/Img'
import { Marquee, SectionLabel } from '../components/Bits'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { gsap } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { about, company, disciplines, goals, mission, parametersDetail, team, vision } from '../data/site'

export default function About() {
  const root = useRef<HTMLDivElement>(null)

  usePageAnimations(root, () => {
    // Vision: the photo opens out to full bleed while it scrolls in; it is fully open before the text line rises
    const st = { trigger: '.vision', start: 'top bottom', end: 'top 25%', scrub: true }
    gsap.fromTo('.vision__frame', { clipPath: 'inset(0% 6% 0% 6%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: st })
    gsap.fromTo('.vision__img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: st })

    // Mission / goals: each card rises in as an orange block that then lifts away to show the card,
    // the number slides up and the text follows; one card after another
    gsap.utils.toArray<HTMLElement>('.vmg__cards').forEach((list) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: list, start: 'top 85%', once: true } })
      list.querySelectorAll<HTMLElement>('.vmg-card').forEach((card, i) => {
        const at = i * 0.18
        tl.fromTo(card, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.inOut' }, at)
          .fromTo(card.querySelector('.vmg-card__wipe'), { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: 'expo.inOut' }, at + 0.6)
          .from(card.querySelector('.vmg-card__num > span'), { yPercent: 110, duration: 0.9, ease: 'power4.out' }, at + 0.95)
          .from(card.querySelector('.vmg-card__text'), { y: 26, autoAlpha: 0, duration: 0.9, ease: 'power3.out' }, at + 1)
      })
    })
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

        <section className="wide-media" data-theme="dark">
          <div className="wide-media__frame" data-reveal>
            <div className="wide-media__inner" data-parallax="9">
              <Img id="labarka-garden" alt="La Barka Resort - taman dan massa bangunan" sizes="100vw" />
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="split wrap" data-theme="light">
          <div className="split__aside">
            <SectionLabel>Overview</SectionLabel>
            <dl className="meta-list" data-stagger>
              <div>
                <dt>Didirikan</dt>
                <dd>Akhir September 2020</dd>
              </div>
              <div>
                <dt>Pendiri</dt>
                <dd>{company.founder}</dd>
              </div>
              <div>
                <dt>Studio</dt>
                <dd>Ngaglik, Sleman, D.I. Yogyakarta</dd>
              </div>
              <div>
                <dt>Disiplin</dt>
                <dd>{disciplines.slice(0, 5).join(', ')}</dd>
              </div>
            </dl>
          </div>
          <div className="split__main">
            <p className="t-lead" data-scrub>
              {about.lead}
            </p>
            <p className="t-body-lg mt-10 max-w-[52ch]" data-fade>
              {about.ethos}
            </p>
            <p className="t-body-lg mt-4 max-w-[52ch] opacity-70" data-fade>
              {about.focus}
            </p>
          </div>
        </section>

        {/* Collaboration */}
        <section className="collab wrap" data-theme="light">
          <SectionLabel>A collaborative architectural solution</SectionLabel>
          <h2 className="t-h1 collab__title mt-6" data-split>
            Satu meja untuk klien, perencana, dan pelaksana.
          </h2>
          <p className="t-body-lg collab__body mt-6 opacity-75" data-fade>
            Tujuan kami tercapai lewat kerja sama yang baik antara ketiganya. Perencanaan dan pelaksanaan
            terintegrasi dalam satu pintu, supaya yang digambar benar-benar terbangun.
          </p>
        </section>

        {/* Two parameters */}
        <section className="params wrap" data-theme="light">
          <SectionLabel>Dua parameter keberhasilan proyek</SectionLabel>
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

        {/* Mission / goals: title over a hairline, cards stepping down from left to right */}
        <section className="vmg wrap" data-theme="light">
          {[
            { label: 'Mission', unit: 'misi', items: mission },
            { label: 'Our goals', unit: 'tujuan', items: goals },
          ].map((g) => (
            <div key={g.label} className="vmg__row">
              <div className="vmg__head">
                <h3 className="t-h1" data-split>
                  {g.label}
                </h3>
                <span className="t-serif vmg__count" data-fade>
                  {g.items.length} {g.unit}
                </span>
              </div>
              <ol className="vmg__cards" style={{ '--n': g.items.length } as CSSProperties}>
                {g.items.map((t, i) => (
                  <li key={t} className="vmg-card">
                    <span className="vmg-card__wipe" aria-hidden="true" />
                    <span className="vmg-card__num">
                      <span>0{i + 1}</span>
                    </span>
                    <p className="vmg-card__text">{t}</p>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>

        <Marquee className="band band--orange" seconds={30} theme="accent">
          <span>A Collaborative Architectural Solution</span>
          <span>✦</span>
          <span>Arsitektur untuk semua</span>
          <span>✦</span>
        </Marquee>

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

        <section className="cta-block wrap" data-theme="light">
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
