import { useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img } from '../components/Img'
import { CollabDiagram } from '../components/CollabDiagram'
import { Marquee, SectionLabel } from '../components/Bits'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { gsap } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { about, company, disciplines, goals, mission, parametersDetail, team, vision } from '../data/site'

export default function About() {
  const root = useRef<HTMLDivElement>(null)

  usePageAnimations(root, () => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.collab__visual', start: 'top 85%', end: 'center 45%', scrub: 1 },
    })
    tl.fromTo('.collab__node--plan', { y: -35, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'none' }, 0)
      .fromTo('.collab__node--client', { x: -35, y: 20, autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, ease: 'none' }, 0)
      .fromTo('.collab__node--build', { x: 35, y: 20, autoAlpha: 0 }, { x: 0, y: 0, autoAlpha: 1, ease: 'none' }, 0)
      .fromTo('.collab__connections', { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none' }, 0.35)
      .fromTo('.collab__node--together', { autoAlpha: 0, scale: 0.88 }, { autoAlpha: 1, scale: 1, ease: 'none' }, 0.55)
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
          sub="Konsultan arsitektur berbasis komunitas di Yogyakarta — didirikan oleh Raditya Alvin pada akhir September 2020."
        />

        <section className="wide-media" data-theme="dark">
          <div className="wide-media__frame" data-reveal>
            <div className="wide-media__inner" data-parallax="9">
              <Img id="labarka-garden" alt="La Barka Resort — taman dan massa bangunan" sizes="100vw" />
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
          <div className="collab__text">
            <SectionLabel>A collaborative architectural solution</SectionLabel>
            <h2 className="t-h1 mt-6" data-split>
              Satu meja untuk klien, perencana, dan pelaksana.
            </h2>
            <p className="t-body-lg mt-6 max-w-[44ch] opacity-75" data-fade>
              Tujuan kami tercapai lewat kerja sama yang baik antara ketiganya. Perencanaan dan pelaksanaan
              terintegrasi dalam satu pintu — supaya yang digambar benar-benar terbangun.
            </p>
          </div>
          <CollabDiagram />
        </section>

        {/* Two parameters */}
        <section className="params" data-theme="dark">
          <div className="wrap">
            <SectionLabel>Dua parameter keberhasilan proyek</SectionLabel>
            <div className="params__grid">
              {parametersDetail.map((p, i) => (
                <article key={p.title} className="param" data-fade data-delay={i * 0.12}>
                  <span className="param__num">0{i + 1}</span>
                  <h3 className="t-h1 param__title">{p.title}</h3>
                  <p className="t-body-lg param__body">{p.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Vision / mission / goals */}
        <section className="vmg wrap" data-theme="light">
          <div className="vmg__vision">
            <SectionLabel>Vision</SectionLabel>
            <p className="t-h2 mt-6" data-split>
              {vision}
            </p>
          </div>
          <div className="vmg__cols">
            <div>
              <SectionLabel>Mission</SectionLabel>
              <ol className="num-list" data-stagger>
                {mission.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ol>
            </div>
            <div>
              <SectionLabel>Our goals</SectionLabel>
              <ol className="num-list" data-stagger>
                {goals.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <Marquee className="band band--orange" seconds={30} theme="accent">
          <span>A Collaborative Architectural Solution</span>
          <span>✦</span>
          <span>Arsitektur untuk semua</span>
          <span>✦</span>
        </Marquee>

        {/* Philosophy */}
        <section className="philo-dark" data-theme="dark">
          <div className="wrap philo-dark__grid">
            <div className="philo-dark__img" data-reveal>
              <Img id="draw-plan" alt="Gambar denah — studi ruang Kadanglabo" sizes="(min-width: 768px) 34vw, 80vw" />
            </div>
            <div>
              <SectionLabel>Company philosophy</SectionLabel>
              <h2 className="t-h1 mt-6" data-split>
                Problem solving lebih dulu. Langgam kemudian.
              </h2>
              <p className="t-body-lg mt-8 max-w-[50ch] opacity-80" data-fade>
                {about.philosophy}
              </p>
              <p className="t-serif philo-dark__quote" data-fade>
                “Form follows function.”
              </p>
            </div>
          </div>
        </section>

        {/* Team */}
        <section id="team" className="team wrap" data-theme="light">
          <div className="team__head">
            <SectionLabel>Tim in-house</SectionLabel>
            <h2 className="t-h1 mt-6" data-split>
              Orang-orang di balik setiap gambar — dan setiap bangunan.
            </h2>
          </div>
          <div className="team__grid" data-stagger="0.06">
            {team.map((m) => (
              <figure key={m.name} className="member">
                <div className="member__photo">
                  <Img id={m.img} alt={m.name} sizes="(min-width: 1024px) 19vw, (min-width: 640px) 30vw, 46vw" />
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
              Ceritakan rencana Anda — rumah, usaha, atau kawasan. Kami bantu dari pertanyaan pertama sampai bangunan
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
