import { useRef } from 'react'
import { Page } from '../components/Page'
import { SectionLabel } from '../components/Bits'
import { HomeHero } from '../components/HomeHero'
import { ShowReel } from '../components/ShowReel'
import { SectorShowcase } from '../components/SectorShowcase'
import { WorkMosaic } from '../components/WorkMosaic'
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
                <span key={i} className="intro__hl" data-scrub-keep>
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </p>
        </section>

        {/* ---------- spirit: showreel left, ethos right (layout of shed.design "Shed spirit") ---------- */}
        <section className="spirit wrap" data-theme="light">
          <div className="spirit__media">
            <ShowReel />
          </div>
          <div className="spirit__side">
            <span className="pill" data-fade>
              Kadanglabo spirit
            </span>
            <div className="spirit__bottom">
              <p className="spirit__text" data-fade>
                {about.ethos}
              </p>
              <TLink to="/about" className="spirit__link" data-fade>
                Tentang kami
              </TLink>
            </div>
          </div>
        </section>

        {/* ---------- (02) SERVICES & SECTORS ---------- */}
        <section className="brand-section" data-theme="accent">
          <div className="wrap brand-section__head">
            <div>
              <SectionLabel n="02">Core services & sectors</SectionLabel>
              <p className="t-body-lg brand-section__intro" data-fade>
                Kami merancang bangunan baru, renovasi, hingga pengembangan lahan, dibagi menjadi tiga sektor inti.
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

        {/* ---------- (03) OUR WORK — Coeval-style mosaic per category ---------- */}
        <WorkMosaic />
        <div className="wrap wm-foot" data-theme="light">
          <p className="t-serif wm-foot__text" data-fade>
            Commercial, hospitality, dan residential: {archive.length} proyek dalam arsip kami.
          </p>
          <TLink to="/work" className="btn-pill btn-pill--dark btn-pill--lg" data-fade>
            Lihat detail Our Work <ArrowRight className="h-[0.8em] w-auto" />
          </TLink>
        </div>

        {/* ---------- (04) LATEST UPDATES ---------- */}
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
