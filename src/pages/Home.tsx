import { useRef } from 'react'
import { Page } from '../components/Page'
import { Img } from '../components/Img'
import { Marquee, SectionLabel } from '../components/Bits'
import { HomeHero } from '../components/HomeHero'
import { SectorShowcase } from '../components/SectorShowcase'
import { ProjectRing, type RingItem } from '../components/ProjectRing'
import { NewsCard } from '../components/NewsCard'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { about } from '../data/site'
import { categoryLabel, projects } from '../data/projects'
import { sortedNews } from '../data/news'

const ringItems: RingItem[] = projects.map((p) => ({
  slug: p.slug,
  title: p.title,
  meta: `${categoryLabel[p.category]} — ${p.location ?? p.typology}`,
  img: p.cover,
}))

export default function Home() {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root)


  return (
    <Page>
      <div ref={root}>
        <HomeHero />

        {/* ---------- (01) ABOUT — copy persis dari brief ---------- */}
        <section id="intro" className="intro wrap" data-theme="light">
          <SectionLabel n="01">About</SectionLabel>
          <p className="t-lead intro__lead" data-scrub>
            {about.lead.split(/(Desain Kontekstual|Efektifitas Workflow)/).map((part, i) =>
              i % 2 ? (
                <span key={i} className="intro__hl">
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </p>

          <div className="intro__grid">
            <div className="intro__text">
              <p className="intro__ethos" data-fade>
                {about.ethos}
              </p>
              <div className="intro__foot">
                <ol className="intro__params" data-stagger="0.1">
                  <li>
                    <span>01</span>Desain Kontekstual
                  </li>
                  <li>
                    <span>02</span>Efektifitas Workflow
                  </li>
                </ol>
                <TLink to="/about" className="btn-pill btn-pill--dark" data-fade>
                  Tentang kami <ArrowRight className="h-[0.8em] w-auto" />
                </TLink>
              </div>
            </div>
            <div className="intro__media" data-reveal>
              <div className="intro__media-inner" data-parallax="7">
                <Img id="labarka-koi" alt="La Barka Resort — kolam dan taman yang telah terbangun" sizes="(min-width: 768px) 58vw, 100vw" />
              </div>
              <span className="intro__media-tag pill pill--solid">La Barka Resort — terbangun</span>
            </div>
          </div>
        </section>

        {/* ---------- (02) SERVICES & SECTORS ---------- */}
        <section className="brand-section" data-theme="accent">
          <div className="wrap brand-section__head">
            <div>
              <SectionLabel n="02">Core services & sectors</SectionLabel>
              <p className="t-body-lg brand-section__intro" data-fade>
                Kami merancang bangunan baru, renovasi, hingga pengembangan lahan — dibagi menjadi tiga sektor inti.
              </p>
              <TLink to="/services" className="link-line t-label mt-6 inline-block" data-fade>
                Our services →
              </TLink>
            </div>
          </div>
          <div className="wrap">
            <SectorShowcase />
          </div>
        </section>

        {/* ---------- (03) SELECTED WORK — 3D ring ---------- */}
        <section className="selected" data-theme="light">
          <div className="wrap selected__head">
            <SectionLabel n="03">Selected work</SectionLabel>
            <h2 className="t-h1 selected__title" data-split>
              Dirancang untuk
              <br />
              terbangun.
            </h2>
            <p className="selected__hint t-label" data-fade>
              Geser untuk menjelajah ↔
            </p>
          </div>
          <ProjectRing items={ringItems} />
          <div className="wrap selected__foot">
            <TLink to="/work" className="btn-pill btn-pill--dark btn-pill--lg">
              Lihat semua karya <ArrowRight className="h-[0.8em] w-auto" />
            </TLink>
          </div>
        </section>

        <Marquee className="band band--navy" seconds={36} theme="dark">
          <span>Desain kontekstual</span>
          <span>✦</span>
          <span>Efektifitas workflow</span>
          <span>✦</span>
          <span>Arsitektur untuk semua</span>
          <span>✦</span>
        </Marquee>

        {/* ---------- (04) PHILOSOPHY ---------- */}
        <section className="philo wrap" data-theme="light">
          <div className="philo__text">
            <SectionLabel n="04">Design philosophy</SectionLabel>
            <h2 className="t-display philo__title" data-split>
              Form
              <br />
              follows
              <br />
              function.
            </h2>
            <p className="t-body-lg philo__body" data-fade>
              {about.philosophy}
            </p>
          </div>
          <div className="philo__drawing" data-reveal>
            <Img id="draw-exploded" alt="Gambar isometri eksploded — studi ruang Kadanglabo" sizes="(min-width: 768px) 36vw, 90vw" />
          </div>
        </section>

        {/* ---------- (05) LATEST UPDATES ---------- */}
        <section className="latest wrap" data-theme="light">
          <div className="latest__head">
            <SectionLabel n="05">Latest updates</SectionLabel>
            <TLink to="/news" className="link-line t-label">
              News & events →
            </TLink>
          </div>
          <div className="latest__grid" data-stagger>
            {sortedNews.slice(0, 3).map((n) => (
              <NewsCard key={n.slug} n={n} />
            ))}
          </div>
        </section>
      </div>
    </Page>
  )
}
