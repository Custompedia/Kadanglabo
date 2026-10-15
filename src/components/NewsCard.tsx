import { TLink } from '../lib/transition'
import { formatDate, type NewsItem } from '../data/news'
import { Img } from './Img'

export function NewsCard({ n, large = false }: { n: NewsItem; large?: boolean }) {
  return (
    <TLink to={`/news/${n.slug}`} className={`news-card group ${large ? 'news-card--large' : ''}`} data-cursor="Baca">
      <div className="news-card__media">
        <Img id={n.cover} alt="" sizes={large ? '(min-width: 768px) 60vw, 100vw' : '(min-width: 768px) 32vw, 100vw'} className="news-card__img" />
        <div className="news-card__tags">
          <span className="pill pill--solid">{n.type === 'event' ? 'Event' : 'News'}</span>
          <span className="pill pill--solid">{n.tag}</span>
        </div>
        {n.type === 'event' && (
          <span className="news-card__date-badge">
            <b>{new Date(n.date + 'T00:00:00').getDate()}</b>
            {new Date(n.date + 'T00:00:00').toLocaleDateString('id-ID', { month: 'short' })}
          </span>
        )}
      </div>
      <div className="news-card__body">
        <p className="t-label opacity-60">{formatDate(n.date)}</p>
        <h3 className="news-card__title">{n.title}</h3>
        {large && <p className="news-card__excerpt">{n.excerpt}</p>}
      </div>
    </TLink>
  )
}
