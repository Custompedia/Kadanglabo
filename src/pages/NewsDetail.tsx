import { useRef } from 'react'
import { useParams } from 'react-router'
import { Page } from '../components/Page'
import { Img } from '../components/Img'
import { NewsCard } from '../components/NewsCard'
import { ProjectCard, SectionLabel } from '../components/Bits'
import { ArrowRight } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { formatDate, getNews, sortedNews, typeName, type NewsItem } from '../data/news'
import { getProject } from '../data/projects'
import { mailLink, waLink } from '../data/site'
import { t, tr } from '../lib/i18n'
import NotFound from './NotFound'

export default function NewsDetail() {
  const { slug } = useParams()
  const n = slug ? getNews(slug) : undefined
  if (!n) return <NotFound />
  return <Article n={n} />
}

function infoHref(n: NewsItem, href?: string) {
  const title = t(n.title)
  if (href === 'whatsapp') return waLink(tr(`Hello Kadanglabo, I would like to register for ${title}`, `Halo Kadanglabo, saya ingin mendaftar: ${title}`))
  if (href === 'mailto') return mailLink(title)
  return href
}

function Article({ n }: { n: NewsItem }) {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root)

  const project = getProject(n.project ?? 'la-barka-resort')
  const others = sortedNews.filter((x) => x.slug !== n.slug)
  const related = others.find((x) => x.type === n.type) ?? others[0]

  return (
    <Page title={t(n.title)}>
      <article ref={root}>
        <header className="nd-hero wrap" data-theme="light">
          <p className="nd-hero__meta" data-fade="now">
            <span className="pill">{typeName(n.type)}</span>
            <span className="pill">{t(n.tag)}</span>
            <span className="t-label opacity-70">{formatDate(n.date)}</span>
          </p>
          <h1 className="t-h1 nd-hero__title" data-split="now">
            {t(n.title)}
          </h1>
          <p className="t-serif nd-hero__excerpt" data-fade="now" data-delay="0.4">
            {t(n.excerpt)}
          </p>
        </header>

        <div className="nd-cover wrap" data-theme="dark">
          <div className="nd-cover__frame" data-reveal="now" data-delay="0.2">
            <Img id={n.cover} alt="" priority sizes="(min-width: 768px) 92vw, 100vw" />
          </div>
        </div>

        <section className="nd-body wrap" data-theme="light">
          <aside className="nd-info">
            <SectionLabel>{tr('Good to know', 'Info penting')}</SectionLabel>
            <dl className="meta-list">
              {n.info.map((i) => (
                <div key={i.label.en}>
                  <dt>{t(i.label)}</dt>
                  <dd>
                    {i.href ? (
                      <a href={infoHref(n, i.href)} target="_blank" rel="noreferrer" className="link-line">
                        {t(i.value)} ↗
                      </a>
                    ) : (
                      t(i.value)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
          <div className="nd-content">
            <h2 className="t-label nd-content__label">{tr('Context', 'Konteks')}</h2>
            <p className="t-lead" data-split>
              {t(n.context)}
            </p>
            <h2 className="t-label nd-content__label">{tr('The story', 'Cerita')}</h2>
            {n.body.map((para) => (
              <p key={para.en.slice(0, 24)} className="t-body-lg nd-content__p" data-fade>
                {t(para)}
              </p>
            ))}
          </div>
        </section>

        <section className="nd-visual wrap" data-theme="light">
          <h2 className="t-label nd-content__label">{tr('Visuals', 'Visual')}</h2>
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
            <SectionLabel>{tr('Explore more', 'Jelajahi lainnya')}</SectionLabel>
          </div>
          <div className="nd-more__grid">
            {related && (
              <div>
                <p className="t-label nd-more__label">{tr('Related article', 'Artikel terkait')}</p>
                <NewsCard n={related} />
              </div>
            )}
            {project && (
              <div>
                <p className="t-label nd-more__label">{tr('Related project', 'Proyek terkait')}</p>
                <ProjectCard p={project} sizes="(min-width: 768px) 30vw, 100vw" />
              </div>
            )}
            <div className="nd-more__contact-col">
              <p className="t-label nd-more__label">{tr('Contact', 'Kontak')}</p>
              <div className="nd-more__contact">
                <p className="t-h2">
                  {n.type === 'event'
                    ? tr('Questions about this event?', 'Punya pertanyaan tentang acara ini?')
                    : tr('Questions about this article?', 'Punya pertanyaan tentang artikel ini?')}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={waLink(
                      tr(
                        `Hello Kadanglabo, I have a question about ${t(n.title)}`,
                        `Halo Kadanglabo, saya ingin bertanya tentang ${t(n.title)}`,
                      ),
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-pill btn-pill--orange"
                  >
                    {tr('Chat on WhatsApp', 'Chat WhatsApp')}
                  </a>
                  <TLink to="/contact" className="btn-pill btn-pill--dark">
                    {tr('Contact us', 'Hubungi kami')} <ArrowRight className="h-[0.8em] w-auto" />
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
