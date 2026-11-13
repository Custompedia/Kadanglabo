import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { BrandMark } from '../components/BrandMark'
import { NewsCard } from '../components/NewsCard'
import { NewsBanner } from '../components/NewsBanner'
import { plainText } from '../components/RichText'
import { ArrowRight, Plus, Search } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { gsap, ScrollTrigger, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { formatDate, sortedNews } from '../data/news'
import { waHello, waLink } from '../data/site'
import { locale, t, tr } from '../lib/i18n'

// every topic once, keyed by its English name (stable in the URL), with how many articles carry it.
// The label is resolved at render time.
const topicKeys = Array.from(new Set(sortedNews.map((n) => n.tag.en))).map((tag) => {
  const first = sortedNews.find((n) => n.tag.en === tag)!
  return { tag, label: first.tag, count: sortedNews.filter((n) => n.tag.en === tag).length }
})

/** lower case, accents dropped, so "kontekstual" also finds "Kontekstual" */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function News() {
  const root = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()
  const tag = params.get('tag')
  const q = params.get('q') ?? ''
  const topics = [...topicKeys].sort((a, b) => t(a.label).localeCompare(t(b.label), locale()))
  const activeTopic = topics.find((x) => x.tag === tag)

  const words = fold(q).split(/\s+/).filter(Boolean)
  const items = sortedNews.filter(
    (n) =>
      (!tag || n.tag.en === tag) &&
      words.every((w) => fold(`${t(n.title)} ${t(n.excerpt)} ${t(n.tag)} ${plainText(n.body)}`).includes(w)),
  )
  const filtered = !!tag || words.length > 0
  const heading = words.length
    ? tr(`Results for “${q.trim()}”`, `Hasil untuk “${q.trim()}”`)
    : activeTopic
      ? t(activeTopic.label)
      : tr('All articles', 'Semua artikel')

  const update = (next: { tag?: string | null; q?: string }) => {
    const p = new URLSearchParams()
    const tg = next.tag === undefined ? tag : next.tag
    const s = next.q ?? q
    if (tg) p.set('tag', tg)
    if (s) p.set('q', s)
    setParams(p, { replace: true, preventScrollReset: true })
  }
  const pickTopic = (x: (typeof topics)[number]) => update({ tag: tag === x.tag ? null : x.tag })
  const reset = () => setParams(new URLSearchParams(), { replace: true, preventScrollReset: true })

  usePageAnimations(root, () => {
    // CTA card: the watermark K draws its ring and pops its pieces in, like the logo intro
    gsap
      .timeline({ scrollTrigger: { trigger: '.news-cta', start: 'top 85%', once: true } })
      .fromTo('.news-cta__mark .bm-ring', { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' })
      .from('.news-cta__mark .bm-piece', { scale: 0, transformOrigin: '50% 50%', duration: 0.9, stagger: 0.12, ease: 'back.out(1.8)' }, 0.6)
  })

  // Re-animate the cards when the result set changes (not on every keystroke that leaves it the same).
  const resultKey = items.map((n) => n.slug).join('|')
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    ScrollTrigger.refresh()
    if (reducedMotion() || !grid.current) return
    const cards = grid.current.querySelectorAll('.news-card')
    if (!cards.length) return
    gsap.killTweensOf(cards)
    gsap.fromTo(cards, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.05, ease: 'expo.out' })
  }, [resultKey])

  return (
    <Page
      title={tr('Articles', 'Artikel')}
      description={tr(
        'News and events from the Kadanglabo studio in Yogyakarta: talks, open studio, publications and project stories.',
        'Berita dan acara dari studio Kadanglabo di Yogyakarta: talk, open studio, publikasi, dan cerita proyek.',
      )}
    >
      <div ref={root}>
        <PageHero
          title={tr('Articles', 'Artikel')}
          sub={tr(
            'Ideas, project stories and studio notes from Kadanglabo, a community-based architecture consultancy in Yogyakarta.',
            'Ide, cerita proyek, dan catatan studio dari Kadanglabo, konsultan arsitektur berbasis komunitas di Yogyakarta.',
          )}
        />

        {/* the latest articles, one at a time, moving on by themselves */}
        <NewsBanner items={sortedNews.slice(0, 5)} />

        <section className="news wrap" data-theme="light">
          {/* Search + filters: right column on desktop, above the cards on small screens.
              The search shares the first row with the heading, so both hairlines run on one line. */}
          <form role="search" className="news-search" onSubmit={(e) => e.preventDefault()} data-fade>
            <label htmlFor="news-q" className="news-side__label">
              {tr('Search articles', 'Cari artikel')}
            </label>
            <div className="news-search__box">
              <input
                id="news-q"
                type="search"
                value={q}
                placeholder={tr('E.g. talk, open studio, Klinik UII', 'Mis. talk, open studio, Klinik UII')}
                autoComplete="off"
                onChange={(e) => update({ q: e.target.value })}
              />
              {q ? (
                <button type="button" className="news-search__btn" aria-label={tr('Clear search', 'Hapus pencarian')} onClick={() => update({ q: '' })}>
                  <Plus className="news-search__clear" />
                </button>
              ) : (
                <span className="news-search__btn" aria-hidden="true">
                  <Search className="news-search__icon" />
                </span>
              )}
            </div>
          </form>

          <div className="news__filters" data-fade>
            <div className="news-side__block">
              <p className="news-side__label">{tr('Topic', 'Topik')}</p>
              <div className="news-side__chips" role="group" aria-label={tr('Topic', 'Topik')}>
                {topics.map((x) => (
                  <button key={x.tag} type="button" className="chip-btn" aria-pressed={tag === x.tag} onClick={() => pickTopic(x)}>
                    {t(x.label)}
                    <span className="chip-btn__count">{x.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="news__head">
            <h2 className="news__title">{heading}</h2>
            <p className="news__count" aria-live="polite">
              <b>{items.length}</b> {tr(items.length === 1 ? 'article' : 'articles', 'artikel')}
              {filtered && (
                <button type="button" className="link-line t-label news__reset" onClick={reset}>
                  {tr('Reset', 'Reset')}
                </button>
              )}
            </p>
          </div>

          <div className="news__main">
            <div ref={grid} className="news__list" data-stagger="0.06">
              {items.map((n) => (
                <NewsCard key={n.slug} n={n} />
              ))}
            </div>

            {items.length === 0 && (
              <div className="news__empty">
                <p className="t-serif news__empty-text">
                  {tr('No articles match your search.', 'Tidak ada artikel sesuai dengan pencarian Anda.')}
                </p>
                <button type="button" className="btn-pill btn-pill--dark" onClick={reset}>
                  {tr('Show all articles', 'Tampilkan semua artikel')}
                </button>
              </div>
            )}
          </div>

          <aside className="news__extras" aria-label={tr('More', 'Lainnya')}>
            <div className="news-side__block news-latest">
              <p className="news-side__label">{tr('Latest', 'Terbaru')}</p>
              <ol>
                {sortedNews.slice(0, 3).map((n, i) => (
                  <li key={n.slug}>
                    <TLink to={`/articles/${n.slug}`} className="news-latest__link">
                      <span className="news-latest__no">0{i + 1}</span>
                      <span>
                        <span className="news-latest__title">{t(n.title)}</span>
                        <span className="t-label news-latest__date">{formatDate(n.date)}</span>
                      </span>
                    </TLink>
                  </li>
                ))}
              </ol>
            </div>

            <div className="news-cta" data-fade>
              <BrandMark className="news-cta__mark" />
              <img src="/brand/kadanglabo-logo-white.svg" alt="Kadanglabo" width={1400} height={324} className="news-cta__logo" />
              <p className="news-cta__title">{tr('Let’s work together.', 'Mari berkolaborasi.')}</p>
              <p className="news-cta__text">
                {tr(
                  'A home, a business or an estate: bring us your plans. Design and construction under one roof, from brief to completion.',
                  'Rumah, usaha, atau kawasan: ceritakan rencana Anda. Desain dan pelaksanaan satu pintu, dari brief hingga bangunan selesai.',
                )}
              </p>
              <div className="news-cta__actions">
                <TLink to="/contact#start" className="btn-pill news-cta__btn">
                  {tr('Start a project', 'Mulai proyek')} <ArrowRight className="h-[0.8em] w-auto" />
                </TLink>
                <a
                  href={waLink(waHello())}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pill news-cta__btn news-cta__btn--ghost"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </Page>
  )
}
