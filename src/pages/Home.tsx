import { useRef } from 'react'
import { Page } from '../components/Page'
import { Counter, SectionLabel } from '../components/Bits'
import { HomeHero } from '../components/HomeHero'
import { ShowReel } from '../components/ShowReel'
import { ServiceSketch, animateServiceSketch } from '../components/ServiceSketch'
import { WorkMosaic } from '../components/WorkMosaic'
import { NewsCard } from '../components/NewsCard'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { about } from '../data/site'
import { archive, categoryLabel, categoryOrder } from '../data/projects'
import { sortedNews } from '../data/news'

export default function Home() {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root, (page) => {
    animateServiceSketch(page)
  })

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
                Kadanglabo menargetkan setiap proyek yang didesain harus terbangun. Etos inilah yang menjaga dua parameter
                keberhasilan proyek kami.
              </p>
              <TLink to="/about" className="spirit__link" data-fade>
                Tentang kami
              </TLink>
            </div>
          </div>
        </section>

        {/* ---------- (02) SERVICES & SECTORS: studio drawing to finished space (ref. Archidomo) ---------- */}
        <ServiceSketch />

        {/* ---------- (03) OUR WORK — Coeval-style mosaic per category ---------- */}
        <WorkMosaic />
        {/* after the mosaic: a calm, centred close - the three sectors with their counts, one line, the way in */}
        <div className="wrap" data-theme="light">
          <div className="wm-foot">
            <div className="wm-foot__chips" data-stagger="0.08">
              {categoryOrder.map((c) => (
                <TLink key={c} to={`/work#${c}`} className="chip-btn">
                  {categoryLabel[c]}
                  <span className="chip-btn__count">{archive.filter((a) => a.category === c).length}</span>
                </TLink>
              ))}
            </div>
            <p className="t-serif wm-foot__text" data-fade>
              <Counter to={archive.length} /> proyek dalam arsip kami sejak 2020, dari rumah tinggal sampai fasilitas kesehatan.
            </p>
            <TLink to="/work" className="btn-pill btn-pill--dark btn-pill--lg" data-fade>
              Lihat semua proyek <ArrowRight className="h-[0.8em] w-auto" />
            </TLink>
          </div>
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
