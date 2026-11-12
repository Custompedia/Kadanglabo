import { useEffect, useRef, useState } from 'react'
import { Img } from './Img'
import { ArrowRight } from './Icons'
import { TLink } from '../lib/transition'
import { formatDate, type NewsItem } from '../data/news'
import { t, tr } from '../lib/i18n'

/*
 * The featured articles under the title of the Articles page (after custompedia.agency/artikel): one large card at
 * a time with the next one peeking in, moving on by itself every few seconds (the pause button stops it). Below: pause, "03 / 05", a progress
 * bar per article (the current one fills while it shows) and previous / next.
 */

const DWELL = 6000

export function NewsBanner({ items }: { items: NewsItem[] }) {
  const [at, setAt] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const n = items.length
  const go = (i: number) => setAt(((i % n) + n) % n)

  useEffect(() => {
    clearTimeout(timer.current)
    if (paused || n < 2) return
    timer.current = setTimeout(() => go(at + 1), DWELL)
    return () => clearTimeout(timer.current)
  }, [at, paused, n]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!n) return null
  const running = !paused && n > 1

  return (
    <section className="nb wrap" aria-roledescription="carousel" aria-label={tr('Featured articles', 'Artikel pilihan')} data-theme="light">
      <div className="nb__viewport">
        <div className="nb__track" style={{ transform: `translateX(calc(${-at} * (var(--nb-w) + var(--nb-gap))))` }}>
          {items.map((x, i) => (
            <TLink
              key={x.slug}
              to={`/articles/${x.slug}`}
              className="nb__slide"
              aria-hidden={i !== at}
              tabIndex={i === at ? 0 : -1}
              aria-label={`${i + 1} / ${n}: ${t(x.title)}`}
              data-cursor={tr('Read', 'Baca')}
            >
              <Img id={x.cover} alt="" sizes="(min-width: 1024px) 80vw, 100vw" priority={i === 0} className="nb__img" />
              <span className="nb__shade" />
              <span className="nb__content">
                <span className="pill pill--solid nb__tag">{t(x.tag)}</span>
                <span className="nb__title">{t(x.title)}</span>
                <span className="nb__excerpt">{t(x.excerpt)}</span>
                <span className="nb__foot">
                  <span className="t-label nb__by">
                    {tr('Kadanglabo team', 'Tim Kadanglabo')} · {formatDate(x.date)}
                  </span>
                  <span className="nb__read t-label">
                    {tr('Read article', 'Baca artikel')} <ArrowRight className="h-[0.8em] w-auto" />
                  </span>
                </span>
              </span>
            </TLink>
          ))}
        </div>
      </div>

      {n > 1 && (
        <div className="nb__controls">
          <button type="button" className="nb__play" onClick={() => setPaused((p) => !p)} aria-label={paused ? tr('Play', 'Putar') : tr('Pause', 'Jeda')}>
            {paused ? (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
                <path d="M4.5 2.8v10.4L13 8 4.5 2.8Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
                <path d="M4 3h2.6v10H4zM9.4 3H12v10H9.4z" />
              </svg>
            )}
          </button>
          <span className="nb__count t-label">
            <b>{String(at + 1).padStart(2, '0')}</b> / {String(n).padStart(2, '0')}
          </span>
          <span className="nb__bars">
            {items.map((x, i) => (
              <button key={x.slug} type="button" className="nb__bar" data-on={i === at ? '' : undefined} data-done={i < at ? '' : undefined} onClick={() => go(i)} aria-label={`${i + 1}`}>
                {i === at && <span key={`${at}-${running}`} className="nb__fill" data-run={running ? '' : undefined} style={{ animationDuration: `${DWELL}ms` }} />}
              </button>
            ))}
          </span>
          <span className="nb__nav">
            <button type="button" onClick={() => go(at - 1)} aria-label={tr('Previous', 'Sebelumnya')}>
              <ArrowRight className="h-3.5 w-auto rotate-180" />
            </button>
            <button type="button" onClick={() => go(at + 1)} aria-label={tr('Next', 'Berikutnya')}>
              <ArrowRight className="h-3.5 w-auto" />
            </button>
          </span>
        </div>
      )}
    </section>
  )
}
