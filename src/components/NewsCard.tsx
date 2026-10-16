import { TLink } from '../lib/transition'
import { formatDate, type NewsItem } from '../data/news'
import { ArrowRight } from './Icons'
import { Img } from './Img'

/** One article card, the same everywhere (News grid, Home "Latest updates", article footer). */
export function NewsCard({ n }: { n: NewsItem }) {
  const day = new Date(n.date + 'T00:00:00')
  return (
    <TLink to={`/news/${n.slug}`} className="news-card group" data-cursor="Baca">
      <div className="news-card__media">
        <Img id={n.cover} alt="" sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 100vw" className="news-card__img" />
        <div className="news-card__tags">
          <span className="pill pill--solid">{n.type === 'event' ? 'Event' : 'News'}</span>
          <span className="pill pill--solid">{n.tag}</span>
        </div>
        {n.type === 'event' && (
          <span className="news-card__date-badge">
            <b>{day.getDate()}</b>
            {day.toLocaleDateString('id-ID', { month: 'short' })}
          </span>
        )}
      </div>
      <div className="news-card__body">
        <p className="t-label news-card__date">{formatDate(n.date)}</p>
        <h3 className="news-card__title">{n.title}</h3>
        <p className="news-card__excerpt">{n.excerpt}</p>
        <span className="t-label news-card__more">
          Baca selengkapnya <ArrowRight className="news-card__arrow" />
        </span>
      </div>
    </TLink>
  )
}
