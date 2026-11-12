import { TLink } from '../lib/transition'
import { t, tr } from '../lib/i18n'
import { formatDate, type NewsItem } from '../data/news'
import { ArrowRight } from './Icons'
import { Img } from './Img'

/** One article card, the same everywhere (Articles grid, Home "Latest updates", article footer). */
export function NewsCard({ n }: { n: NewsItem }) {
  return (
    <TLink to={`/articles/${n.slug}`} className="news-card group" data-cursor={tr('Read', 'Baca')}>
      <div className="news-card__media">
        <Img id={n.cover} alt="" sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 100vw" className="news-card__img" />
        <div className="news-card__tags">
          <span className="pill pill--solid">{t(n.tag)}</span>
        </div>
      </div>
      <div className="news-card__body">
        <p className="t-label news-card__date">{formatDate(n.date)}</p>
        <h3 className="news-card__title">{t(n.title)}</h3>
        <p className="news-card__excerpt">{t(n.excerpt)}</p>
        <span className="t-label news-card__more">
          {tr('Read more', 'Baca selengkapnya')} <ArrowRight className="news-card__arrow" />
        </span>
      </div>
    </TLink>
  )
}
