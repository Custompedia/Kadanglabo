import { useRef } from 'react'
import { useParams } from 'react-router'
import { Page } from '../components/Page'
import { Img } from '../components/Img'
import { NewsCard } from '../components/NewsCard'
import { ProjectCard, SectionLabel } from '../components/Bits'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { formatDate, getNews, sortedNews, type NewsItem } from '../data/news'
import { getProject } from '../data/projects'
import { company, waLink } from '../data/site'
import NotFound from './NotFound'

export default function NewsDetail() {
  const { slug } = useParams()
  const n = slug ? getNews(slug) : undefined
  if (!n) return <NotFound />
  return <Article n={n} />
}

function infoHref(n: NewsItem, href?: string) {
  if (href === 'whatsapp') return waLink(`Halo Kadanglabo, saya ingin mendaftar: ${n.title}`)
  if (href === 'mailto') return `mailto:${company.email}?subject=${encodeURIComponent(n.title)}`
  return href
}

function Article({ n }: { n: NewsItem }) {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root)

  const project = getProject(n.project ?? 'la-barka-resort')
  const others = sortedNews.filter((x) => x.slug !== n.slug)
  const related = others.find((x) => x.type === n.type) ?? others[0]

  return (
    <Page title={n.title}>
      <article ref={root}>
        <header className="nd-hero wrap" data-theme="light">
          <p className="nd-hero__meta" data-fade="now">
            <span className="pill">{n.type === 'event' ? 'Event' : 'News'}</span>
            <span className="pill">{n.tag}</span>
            <span className="t-label opacity-70">{formatDate(n.date)}</span>
          </p>
          <h1 className="t-h1 nd-hero__title" data-split="now">
            {n.title}
          </h1>
          <p className="t-serif nd-hero__excerpt" data-fade="now" data-delay="0.4">
            {n.excerpt}
          </p>
        </header>

        <div className="nd-cover wrap" data-theme="dark">
          <div className="nd-cover__frame" data-reveal="now" data-delay="0.2">
            <Img id={n.cover} alt="" priority sizes="(min-width: 768px) 92vw, 100vw" />
          </div>
        </div>

        <section className="nd-body wrap" data-theme="light">
          <aside className="nd-info">
            <SectionLabel>Informasi lanjutan</SectionLabel>
            <dl className="meta-list">
              {n.info.map((i) => (
                <div key={i.label}>
                  <dt>{i.label}</dt>
                  <dd>
                    {i.href ? (
                      <a href={infoHref(n, i.href)} target="_blank" rel="noreferrer" className="link-line">
                        {i.value} ↗
                      </a>
                    ) : (
                      i.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
          <div className="nd-content">
            <h2 className="t-label nd-content__label">Konteks</h2>
            <p className="t-lead" data-split>
              {n.context}
            </p>
            <h2 className="t-label nd-content__label">Isi utama</h2>
            {n.body.map((para) => (
              <p key={para.slice(0, 24)} className="t-body-lg nd-content__p" data-fade>
                {para}
              </p>
            ))}
          </div>
        </section>

        <section className="nd-visual wrap" data-theme="light">
          <h2 className="t-label nd-content__label">Visual</h2>
          <div className="nd-visual__grid">
            {n.gallery.map((id, i) => (
              <div key={id} className={`nd-visual__item nd-visual__item--${i}`} data-reveal data-delay={i * 0.1}>
                <Img id={id} sizes="(min-width: 768px) 46vw, 100vw" />
              </div>
            ))}
          </div>
        </section>

        <section className="nd-more wrap" data-theme="light">
          <div className="nd-more__head">
            <SectionLabel>Explore more</SectionLabel>
          </div>
          <div className="nd-more__grid">
            {related && (
              <div>
                <p className="t-label nd-more__label">Artikel terkait</p>
                <NewsCard n={related} />
              </div>
            )}
            {project && (
              <div>
                <p className="t-label nd-more__label">Proyek relevan</p>
                <ProjectCard p={project} sizes="(min-width: 768px) 30vw, 100vw" />
              </div>
            )}
            <div className="nd-more__contact-col">
              <p className="t-label nd-more__label">Contact</p>
              <div className="nd-more__contact">
                <p className="t-h2">Punya pertanyaan tentang {n.type === 'event' ? 'acara' : 'artikel'} ini?</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={waLink(`Halo Kadanglabo, saya ingin bertanya tentang: ${n.title}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-pill btn-pill--orange"
                  >
                    Chat WhatsApp
                  </a>
                  <TLink to="/contact" className="btn-pill btn-pill--dark">
                    Hubungi kami <ArrowRight className="h-[0.8em] w-auto" />
                  </TLink>
                </div>
              </div>
            </div>
          </div>
        </section>
      </article>
    </Page>
  )
}
