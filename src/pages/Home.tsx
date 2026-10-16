import { useRef } from 'react'
import { Page } from '../components/Page'
import { Img } from '../components/Img'
import { SectionLabel } from '../components/Bits'
import { HomeHero } from '../components/HomeHero'
import { SectorShowcase } from '../components/SectorShowcase'
import { SelectedWork } from '../components/SelectedWork'
import { NewsCard } from '../components/NewsCard'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { about } from '../data/site'
import { archive } from '../data/projects'
import { sortedNews } from '../data/news'

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
                <Img id="hmw-facade-day" alt="HMW House — fasad rumah tinggal" sizes="(min-width: 768px) 58vw, 100vw" />
              </div>
              <span className="intro__media-tag pill pill--solid">HMW House</span>
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

        {/* ---------- (03) SELECTED PROJECTS — stacked full-screen panels ---------- */}
        <section className="selected" data-theme="light">
          <div className="wrap selected__head">
            <div>
              <SectionLabel n="03">Our work</SectionLabel>
              <h2 className="t-display selected__title" data-split>
                Selected
                <br />
                projects
              </h2>
            </div>
            <div className="selected__side" data-fade>
              <p className="t-body-lg">
                Commercial, hospitality, dan residential — sebagian karya yang telah kami rancang dan bangun.
              </p>
              <TLink to="/work" className="link-line t-label mt-5 inline-block">
                Lihat semua karya →
              </TLink>
            </div>
          </div>
          <SelectedWork />
          <div className="wrap selected__foot">
            <TLink to="/work#arsip" className="btn-pill btn-pill--dark btn-pill--lg">
              Lihat arsip {archive.length} proyek <ArrowRight className="h-[0.8em] w-auto" />
            </TLink>
          </div>
        </section>

        {/* ---------- (05) LATEST UPDATES ---------- */}
        <section className="latest wrap" data-theme="light">
          <div className="latest__head">
            <SectionLabel n="04">Latest updates</SectionLabel>
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
