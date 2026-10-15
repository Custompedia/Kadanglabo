import { useRef } from 'react'
import { Page } from '../components/Page'
import { Img } from '../components/Img'
import { Counter, Marquee, SectionLabel } from '../components/Bits'
import { HomeHero } from '../components/HomeHero'
import { SectorShowcase } from '../components/SectorShowcase'
import { ProjectRing, type RingItem } from '../components/ProjectRing'
import { NewsCard } from '../components/NewsCard'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { about, team } from '../data/site'
import { archive, categoryLabel, projects } from '../data/projects'
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

  const projectCount = Math.floor(archive.length / 10) * 10

  return (
    <Page>
      <div ref={root}>
        <HomeHero />

        {/* ---------- (01) ABOUT — copy persis dari brief ---------- */}
        <section id="intro" className="intro wrap" data-theme="light">
          <SectionLabel n="01">About</SectionLabel>
          <p className="t-lead intro__lead" data-scrub>
            {about.lead}
          </p>

          <div className="intro__grid">
            <div className="intro__media" data-reveal>
              <div className="intro__media-inner" data-parallax="7">
                <Img id="cantrik-hall" alt="Omah Cantrik — ruang berkumpul yang telah terbangun" sizes="(min-width: 768px) 62vw, 100vw" />
              </div>
              <span className="intro__media-tag pill pill--solid">Omah Cantrik — terbangun</span>
            </div>
            <div className="intro__text">
              <SectionLabel>Kadanglabo spirit</SectionLabel>
              <p className="t-body-lg mt-5" data-fade>
                {about.ethos}
              </p>
              <TLink to="/about" className="btn-pill btn-pill--dark mt-8" data-fade>
                Tentang kami <ArrowRight className="h-[0.8em] w-auto" />
              </TLink>
            </div>
          </div>
        </section>

        {/* ---------- STATS ---------- */}
        <section className="stats wrap" data-theme="light" aria-label="Kadanglabo dalam angka">
          <div className="stats__grid" data-stagger>
            <div className="stat">
              <span className="stat__num">2020</span>
              <span className="stat__label">Didirikan di Yogyakarta, akhir September 2020</span>
            </div>
            <div className="stat">
              <span className="stat__num">
                <Counter to={projectCount} suffix="+" />
              </span>
              <span className="stat__label">Proyek dalam daftar karya kami</span>
            </div>
            <div className="stat">
              <span className="stat__num">
                <Counter to={team.length} />
              </span>
              <span className="stat__label">Tim in-house — arsitek hingga pengawas lapangan</span>
            </div>
            <div className="stat">
              <span className="stat__num">
                <Counter to={3} />
              </span>
              <span className="stat__label">Sektor: commercial, hospitality, residential</span>
            </div>
          </div>
        </section>

        {/* ---------- (02) SERVICES & SECTORS ---------- */}
        <section className="brand-section" data-theme="dark">
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

        <Marquee className="band band--orange" seconds={36} theme="accent">
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
