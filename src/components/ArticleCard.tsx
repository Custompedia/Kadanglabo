import { safeArticleUrl, videoEmbed, type ArticleCard as Card } from '../../shared/article-blocks'

/** Render only structured content; arbitrary iframe HTML is never accepted. */
export function ArticleCard({ data }: { data: Card }) {
  switch (data.kind) {
    case 'callout': return <aside className={`article-callout article-callout--${data.tone}`}><p>{data.text}</p></aside>
    case 'cta': return safeArticleUrl(data.href) ? <div className="article-cta"><a href={safeArticleUrl(data.href)}>{data.label}</a></div> : null
    case 'table': return <figure className="article-table"><div className="article-table-scroll" tabIndex={0} role="region" aria-label={data.caption || 'Tabel artikel'}><table><thead><tr>{data.header.map((cell, i) => <th scope="col" key={i}>{cell}</th>)}</tr></thead><tbody>{data.rows.map((row, r) => <tr key={r}>{data.header.map((_, c) => <td key={c}>{row[c] ?? ''}</td>)}</tr>)}</tbody></table></div>{data.caption && <figcaption>{data.caption}</figcaption>}</figure>
    case 'embed': {
      const frame = videoEmbed(data.url)
      const href = safeArticleUrl(data.url)
      return <figure className="article-embed">{frame ? <iframe src={frame} title={data.caption || 'Video artikel'} loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen; picture-in-picture" allowFullScreen /> : href ? <a href={href} target="_blank" rel="noopener noreferrer">{data.caption || href}</a> : null}{frame && data.caption && <figcaption>{data.caption}</figcaption>}</figure>
    }
  }
}
