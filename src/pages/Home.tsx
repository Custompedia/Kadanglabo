import { useRef } from 'react'
import { Page } from '../components/Page'
import { Counter, SectionLabel } from '../components/Bits'
import { HomeHero } from '../components/HomeHero'
import { SpiritScatter, animateSpirit } from '../components/SpiritScatter'
import { ServiceSketch, animateServiceSketch } from '../components/ServiceSketch'
import { StudioNumbers, animateStudioNumbers } from '../components/StudioNumbers'
import { WorkMosaic } from '../components/WorkMosaic'
import { NewsCard } from '../components/NewsCard'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { tr } from '../lib/i18n'
import { archive, categoryLabel, categoryOrder } from '../data/projects'
import { sortedNews } from '../data/news'

export default function Home() {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root, (page) => {
    const undoSpirit = animateSpirit(page) // first: it sets the held field's height that later triggers measure against
    animateStudioNumbers(page)
    animateServiceSketch(page)
    return undoSpirit
  })

  return (
    <Page>
      <div ref={root}>
        <HomeHero />

        {/* ---------- (01) ABOUT x Kadanglabo spirit: four chapters held in a field of drifting project photos ---------- */}
        <SpiritScatter />

        {/* ---------- Kadanglabo dalam angka (moved from About): ring of photos, figures rolling past ---------- */}
        <StudioNumbers />

        {/* ---------- (02) SERVICES & SECTORS: studio drawing to finished space (ref. Archidomo) ---------- */}
        <ServiceSketch />

        {/* ---------- (03) OUR WORK — Coeval-style mosaic per category ---------- */}
        <WorkMosaic />
        {/* after the mosaic: a calm, centred close - the three sectors with their counts, one line, the way in */}
        <div className="wrap" data-theme="light">
          <div className="wm-foot">
            <div className="wm-foot__chips" data-stagger="0.08">
              {categoryOrder.map((c) => (
                <TLink key={c} to={`/work/${c}`} className="chip-btn">
                  {categoryLabel[c]}
                  <span className="chip-btn__count">{archive.filter((a) => a.category === c).length}</span>
                </TLink>
              ))}
            </div>
            <p className="t-serif wm-foot__text" data-fade>
              <Counter to={archive.length} />{' '}
              {tr(
                'projects in our archive since 2020, from family homes to healthcare facilities.',
                'proyek dalam arsip kami sejak 2020, dari rumah tinggal hingga fasilitas kesehatan.',
              )}
            </p>
            <TLink to="/work" className="btn-pill btn-pill--dark btn-pill--lg" data-fade>
              {tr('View all projects', 'Lihat semua proyek')} <ArrowRight className="h-[0.8em] w-auto" />
            </TLink>
          </div>
        </div>

        {/* ---------- (04) LATEST UPDATES ---------- */}
        <section className="latest wrap" data-theme="light">
          <div className="latest__head">
            <SectionLabel n="04">{tr('Latest articles', 'Artikel terbaru')}</SectionLabel>
            <TLink to="/news" className="link-line t-label">
              {tr('All articles →', 'Semua artikel →')}
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
