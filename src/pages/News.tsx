import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { NewsCard } from '../components/NewsCard'
import { usePageAnimations } from '../lib/anim'
import { gsap, ScrollTrigger, reducedMotion } from '../lib/gsap'
import { sortedNews, type NewsType } from '../data/news'

const tabs: { key: 'all' | NewsType; label: string; note: string }[] = [
  { key: 'all', label: 'Semua', note: '' },
  { key: 'news', label: 'News', note: 'Berita, publikasi, dan aktivitas studio' },
  { key: 'event', label: 'Events', note: 'Agenda, pameran, talk, dan workshop' },
]

export default function News() {
  const root = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()
  const type = (params.get('type') as NewsType | null) ?? 'all'
  const items = sortedNews.filter((n) => type === 'all' || n.type === type)
  const [lead, ...rest] = items

  usePageAnimations(root)

  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ScrollTrigger.refresh()
    if (reducedMotion() || !grid.current) return
    gsap.fromTo(grid.current.querySelectorAll('.news-card'), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.05, ease: 'expo.out' })
  }, [type])

  return (
    <Page title="News & Events">
      <div ref={root}>
        <PageHero
          title={
            <>
              News
              <br />& events
            </>
          }
          sub="Latest updates from the studio — berita, publikasi, aktivitas studio, juga agenda, pameran, talk, dan workshop."
        />

        <section className="news wrap" data-theme="light">
          <div className="news__tabs" role="group" aria-label="Filter" data-fade="now" data-delay="0.6">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                className="chip-btn"
                aria-pressed={type === t.key}
                onClick={() => setParams(t.key === 'all' ? {} : { type: t.key }, { replace: true, preventScrollReset: true })}
              >
                {t.label}
              </button>
            ))}
            {tabs.find((t) => t.key === type)?.note && (
              <span className="t-serif news__note">{tabs.find((t) => t.key === type)?.note}</span>
            )}
          </div>

          <div ref={grid}>
            {lead && (
              <div className="news__lead" data-fade>
                <NewsCard n={lead} large />
              </div>
            )}
            <div className="news__grid" data-stagger>
              {rest.map((n) => (
                <NewsCard key={n.slug} n={n} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </Page>
  )
}
