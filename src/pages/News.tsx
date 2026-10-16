import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { NewsCard } from '../components/NewsCard'
import { ArrowRight, Plus, Search } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { gsap, ScrollTrigger, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { formatDate, sortedNews, type NewsType } from '../data/news'
import { waLink } from '../data/site'

const types: { key: 'all' | NewsType; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'news', label: 'News' },
  { key: 'event', label: 'Events' },
]
const typeLabel = { news: 'News', event: 'Events' } as const

// every topic once, with its type (a topic belongs to one type) and how many articles carry it
const topics = Array.from(new Set(sortedNews.map((n) => n.tag)))
  .map((tag) => ({ tag, type: sortedNews.find((n) => n.tag === tag)!.type, count: sortedNews.filter((n) => n.tag === tag).length }))
  .sort((a, b) => a.tag.localeCompare(b.tag, 'id'))

/** lower case, accents dropped, so "kontekstual" also finds "Kontekstual" */
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function News() {
  const root = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const [params, setParams] = useSearchParams()
  const rawType = params.get('type')
  const type: 'all' | NewsType = rawType === 'news' || rawType === 'event' ? rawType : 'all'
  const tag = params.get('tag')
  const q = params.get('q') ?? ''

  const words = fold(q).split(/\s+/).filter(Boolean)
  const items = sortedNews.filter(
    (n) =>
      (type === 'all' || n.type === type) &&
      (!tag || n.tag === tag) &&
      words.every((w) => fold(`${n.title} ${n.excerpt} ${n.tag} ${typeLabel[n.type]} ${n.context}`).includes(w)),
  )
  const filtered = type !== 'all' || !!tag || words.length > 0
  const heading = words.length ? `Hasil untuk “${q.trim()}”` : (tag ?? (type === 'all' ? 'Semua artikel' : typeLabel[type]))

  const update = (next: { type?: 'all' | NewsType; tag?: string | null; q?: string }) => {
    const p = new URLSearchParams()
    const t = next.type ?? type
    const tg = next.tag === undefined ? tag : next.tag
    const s = next.q ?? q
    if (t !== 'all') p.set('type', t)
    if (tg) p.set('tag', tg)
    if (s) p.set('q', s)
    setParams(p, { replace: true, preventScrollReset: true })
  }
  // a topic implies its type; picking a type drops a topic from the other type
  const pickType = (t: 'all' | NewsType) => update({ type: t, tag: tag && topics.find((x) => x.tag === tag)?.type === t ? tag : null })
  const pickTopic = (x: (typeof topics)[number]) => update(tag === x.tag ? { tag: null } : { tag: x.tag, type: x.type })
  const reset = () => setParams(new URLSearchParams(), { replace: true, preventScrollReset: true })

  usePageAnimations(root)

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
    <Page title="News & Events">
      <div ref={root}>
        <PageHero
          title={
            <>
              News
              <br />& events
            </>
          }
          sub="Latest updates from the studio: berita, publikasi, aktivitas studio, juga agenda, pameran, talk, dan workshop."
        />

        <section className="news wrap" data-theme="light">
          {/* Search + filters: right column on desktop, above the cards on small screens.
              The search shares the first row with the heading, so both hairlines run on one line. */}
          <form role="search" className="news-search" onSubmit={(e) => e.preventDefault()} data-fade>
            <label htmlFor="news-q" className="news-side__label">
              Cari artikel
            </label>
            <div className="news-search__box">
              <input
                id="news-q"
                type="search"
                value={q}
                placeholder="Mis. talk, open studio, Klinik UII"
                autoComplete="off"
                onChange={(e) => update({ q: e.target.value })}
              />
              {q ? (
                <button type="button" className="news-search__btn" aria-label="Hapus pencarian" onClick={() => update({ q: '' })}>
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
              <p className="news-side__label">Kategori</p>
              <div className="news-side__chips" role="group" aria-label="Kategori">
                {types.map((t) => (
                  <button key={t.key} type="button" className="chip-btn" aria-pressed={type === t.key} onClick={() => pickType(t.key)}>
                    {t.label}
                    <span className="chip-btn__count">
                      {t.key === 'all' ? sortedNews.length : sortedNews.filter((n) => n.type === t.key).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="news-side__block">
              <p className="news-side__label">Topik</p>
              <div className="news-side__chips" role="group" aria-label="Topik">
                {topics.map((x) => (
                  <button key={x.tag} type="button" className="chip-btn" aria-pressed={tag === x.tag} onClick={() => pickTopic(x)}>
                    {x.tag}
                    <span className="chip-btn__count">{x.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="news__head">
            <h2 className="news__title">{heading}</h2>
            <p className="news__count" aria-live="polite">
              <b>{items.length}</b> artikel
              {filtered && (
                <button type="button" className="link-line t-label news__reset" onClick={reset}>
                  Reset
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
                <p className="t-serif news__empty-text">Belum ada artikel yang cocok dengan pencarian ini.</p>
                <button type="button" className="btn-pill btn-pill--dark" onClick={reset}>
                  Tampilkan semua artikel
                </button>
              </div>
            )}
          </div>

          <aside className="news__extras" aria-label="Lainnya">
            <div className="news-side__block news-latest">
              <p className="news-side__label">Terbaru</p>
              <ol>
                {sortedNews.slice(0, 3).map((n, i) => (
                  <li key={n.slug}>
                    <TLink to={`/news/${n.slug}`} className="news-latest__link">
                      <span className="news-latest__no">0{i + 1}</span>
                      <span>
                        <span className="news-latest__title">{n.title}</span>
                        <span className="t-label news-latest__date">{formatDate(n.date)}</span>
                      </span>
                    </TLink>
                  </li>
                ))}
              </ol>
            </div>

            <div className="news-cta">
              <p className="t-label news-cta__kicker">Kadanglabo</p>
              <p className="news-cta__title">Mari berkolaborasi.</p>
              <p className="news-cta__text">
                Ceritakan rencana Anda: rumah, usaha, atau kawasan. Kami bantu dari pertanyaan pertama sampai bangunan
                berdiri.
              </p>
              <div className="news-cta__actions">
                <TLink to="/contact#start" className="btn-pill news-cta__btn">
                  Start a project <ArrowRight className="h-[0.8em] w-auto" />
                </TLink>
                <a
                  href={waLink('Halo Kadanglabo, saya ingin konsultasi proyek.')}
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
