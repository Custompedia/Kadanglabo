import { useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Page } from '../components/Page'
import { RichText } from '../components/RichText'
import { Img } from '../components/Img'
import { NewsCard } from '../components/NewsCard'
import { ArrowRight, Search } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { formatDate, getNews, sortedNews, type NewsItem } from '../data/news'
import { getProject } from '../data/projects'
import { t, tr } from '../lib/i18n'
import NotFound from './NotFound'

/*
 * One article, laid out like a magazine page (after custompedia.agency/artikel): breadcrumb, topic, a large title,
 * the excerpt, author and date; the banner photo; then the text in a readable column with the share buttons beside
 * it and a sidebar (search, topics, latest) on the right; "Read next" at the end.
 */

export default function NewsDetail() {
  const { slug } = useParams()
  const n = slug ? getNews(slug) : undefined
  if (!n) return <NotFound />
  return <Article key={n.slug} n={n} />
}

function Article({ n }: { n: NewsItem }) {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root)
  const others = sortedNews.filter((x) => x.slug !== n.slug)
  const next = [...others.filter((x) => x.tag.en === n.tag.en), ...others.filter((x) => x.tag.en !== n.tag.en)].slice(0, 3)
  const project = n.project ? getProject(n.project) : undefined

  return (
    <Page title={t(n.title)}>
      <article ref={root} className="art" data-theme="light">
        <header className="art-head wrap">
          <nav className="art-crumbs t-label" aria-label={tr('Breadcrumb', 'Navigasi')} data-fade="now">
            <TLink to="/">{tr('Home', 'Beranda')}</TLink>
            <span aria-hidden="true">/</span>
            <TLink to="/articles">{tr('Articles', 'Artikel')}</TLink>
            <span aria-hidden="true">/</span>
            <TLink to={`/articles?tag=${encodeURIComponent(n.tag.en)}`}>{t(n.tag)}</TLink>
            <span aria-hidden="true">/</span>
            <span className="art-crumbs__here">{t(n.title)}</span>
          </nav>
          <p className="art-head__tags" data-fade="now" data-delay="0.1">
            <span className="pill">{t(n.tag)}</span>
          </p>
          <h1 className="art-head__title" data-split="now">
            {t(n.title)}
          </h1>
          <p className="art-head__excerpt" data-fade="now" data-delay="0.35">
            {t(n.excerpt)}
          </p>
          <p className="art-head__by" data-fade="now" data-delay="0.45">
            <span className="art-head__avatar">
              <img src="/brand/kadanglabo-mark.svg" alt="" width={20} height={20} />
            </span>
            <b>{tr('Kadanglabo team', 'Tim Kadanglabo')}</b>
            <span className="art-head__sep" aria-hidden="true" />
            <span className="t-label">{formatDate(n.date)}</span>
          </p>
        </header>

        {n.cover && (
          <figure className="art-banner wrap">
            <div className="art-banner__frame" data-reveal="now" data-delay="0.2">
              <Img id={n.cover} alt="" priority sizes="(min-width: 1280px) 1240px, 100vw" />
            </div>
            {n.coverCaption && t(n.coverCaption) && <figcaption>{t(n.coverCaption)}</figcaption>}
          </figure>
        )}

        <div className="art-layout wrap">
          <Share title={t(n.title)} />
          <div className="art-body">
            <RichText value={n.body} className="art-p" />
          </div>
          <Sidebar current={n} project={project} />
        </div>

        {next.length > 0 && (
          <section className="art-next wrap">
            <div className="art-next__head">
              <h2 className="art-next__title">{tr('Read next', 'Baca juga')}</h2>
              <TLink to="/articles" className="link-line t-label">
                {tr('All articles', 'Semua artikel')} →
              </TLink>
            </div>
            <div className="art-next__grid">
              {next.map((x) => (
                <NewsCard key={x.slug} n={x} />
              ))}
            </div>
          </section>
        )}
      </article>
    </Page>
  )
}

/** The share buttons, a column beside the text (a row on phones). */
function Share({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof location !== 'undefined' ? location.href.split('?')[0] : ''
  const u = encodeURIComponent(url)
  const links = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, d: 'M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Zm-3 4.6c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.6c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5 0 .9-.8 1.8-1.8 1.8-3.4 0-6.4-3-6.4-6.4 0-1 .8-1.8 1.6-1.9Z' },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${encodeURIComponent(title)}`, d: 'M4.5 4.5h3.8l3.9 5.4 4.6-5.4h1.6l-5.5 6.4 6.6 8.6h-3.8l-4.2-5.7-4.9 5.7H5l5.8-6.8-6.3-8.2Z' },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, d: 'M13.5 20.5v-7h2.4l.4-2.8h-2.8V9c0-.8.3-1.4 1.4-1.4h1.5V5.1a19 19 0 0 0-2.2-.1c-2.2 0-3.6 1.3-3.6 3.7v2h-2.4v2.8h2.4v7h2.9Z' },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, d: 'M6.5 9h2.8v9.5H6.5V9Zm1.4-4.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Zm3.2 4.4h2.7v1.3c.4-.8 1.4-1.5 2.8-1.5 3 0 3.5 1.9 3.5 4.4v5.3h-2.8v-4.7c0-1.1 0-2.6-1.6-2.6s-1.8 1.2-1.8 2.5v4.8h-2.8V9Z' },
  ]
  return (
    <aside className="art-share" aria-label={tr('Share', 'Bagikan')}>
      <span className="t-label art-share__label">{tr('Share', 'Bagikan')}</span>
      <span className="art-share__line" aria-hidden="true" />
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="art-share__btn" aria-label={`${tr('Share on', 'Bagikan ke')} ${l.label}`}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <path d={l.d} />
          </svg>
        </a>
      ))}
      <button
        type="button"
        className="art-share__btn"
        aria-label={tr('Copy link', 'Salin tautan')}
        onClick={() => {
          void navigator.clipboard?.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        }}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M10 14a4.5 4.5 0 0 0 6.4 0l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4L11.3 6.3M14 10a4.5 4.5 0 0 0-6.4 0L5 12.6A4.5 4.5 0 0 0 11.4 19l1.3-1.3" />
          </svg>
        )}
      </button>
    </aside>
  )
}

/** Search, topics, the latest articles and the related project. */
function Sidebar({ current, project }: { current: NewsItem; project?: ReturnType<typeof getProject> }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const topics = Array.from(new Set(sortedNews.map((x) => x.tag.en))).map((tag) => ({ tag, label: sortedNews.find((x) => x.tag.en === tag)!.tag, count: sortedNews.filter((x) => x.tag.en === tag).length }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/articles${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }
  return (
    <aside className="art-side">
      <form className="art-side__block" role="search" onSubmit={submit}>
        <p className="art-side__label">{tr('Search articles', 'Cari artikel')}</p>
        <div className="art-search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Type a topic', 'Ketik topik')} aria-label={tr('Search articles', 'Cari artikel')} />
          <button type="submit" aria-label={tr('Search', 'Cari')}>
            <Search className="h-4 w-4" />
          </button>
        </div>
      </form>

      <div className="art-side__block">
        <p className="art-side__label">{tr('Explore topics', 'Jelajahi topik')}</p>
        <div className="art-side__chips">
          {topics.map((x) => (
            <TLink key={x.tag} to={`/articles?tag=${encodeURIComponent(x.tag)}`} className="chip-btn" aria-pressed={x.tag === current.tag.en}>
              {t(x.label)} <span className="chip-btn__count">{x.count}</span>
            </TLink>
          ))}
        </div>
      </div>

      <div className="art-side__block">
        <p className="art-side__label">{tr('Latest articles', 'Artikel terbaru')}</p>
        <ol className="art-latest">
          {sortedNews
            .filter((x) => x.slug !== current.slug)
            .slice(0, 5)
            .map((x, i) => (
              <li key={x.slug}>
                <TLink to={`/articles/${x.slug}`}>
                  <span className="art-latest__no">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="art-latest__title">{t(x.title)}</span>
                    <span className="t-label art-latest__date">{formatDate(x.date)}</span>
                  </span>
                </TLink>
              </li>
            ))}
        </ol>
      </div>

      {project && (
        <div className="art-side__block">
          <p className="art-side__label">{tr('Related project', 'Proyek terkait')}</p>
          <TLink to={`/work/${project.slug}`} className="art-project">
            <Img id={project.cover} alt="" sizes="320px" />
            <span>
              <span className="art-project__title">{project.title}</span>
              <span className="art-project__more t-label">
                {tr('View project', 'Lihat proyek')} <ArrowRight className="h-[0.8em] w-auto" />
              </span>
            </span>
          </TLink>
        </div>
      )}
    </aside>
  )
}
