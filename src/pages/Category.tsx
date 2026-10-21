import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Page } from '../components/Page'
import { Img, imgMeta, type ImgKey } from '../components/Img'
import { Counter, SectionLabel } from '../components/Bits'
import { Plus } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { gsap, ScrollTrigger, finePointer, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { sectors } from '../data/site'
import {
  archive,
  areaOf,
  categoryLabel,
  categoryOrder,
  categoryTitle,
  getProject,
  projects,
  type Category,
  type Project,
} from '../data/projects'
import './Category.css'

/*
 * One page per category (/work/commercial, /work/hospitality, /work/residential), opened from the Home mosaic,
 * Services and Our Work: the category name big, its photo opening to full width, the typologies as one running
 * line, every selected project as a chapter, a sideways gallery, then only this category's archive.
 */

const heroImg: Record<Category, ImgKey> = {
  commercial: 'klinik-hero-hd',
  hospitality: 'labarka-bird-hd',
  residential: 'hmw-facade-hd',
}

const PEEK = 10 // archive rows shown before "Tampilkan semua"
const GALLERY_MAX = 10

/** every photo of a project, cover first, without the -hd duplicates */
const photosOf = (p: Project): ImgKey[] =>
  Array.from(
    new Set<ImgKey>([
      p.cover,
      ...p.gallery.flatMap((b) => (b.t === 'pair' ? b.imgs : b.t === 'full' || b.t === 'offset' ? [b.img] : [])),
      ...(p.story?.map((s) => s.img) ?? []),
      p.hero,
    ]),
  ).filter((id) => !id.endsWith('-hd'))

const pad = (n: number) => String(n).padStart(2, '0')

/** A selected project as a chapter: a big photo with a second one tucked over its corner, the facts beside it */
function Chapter({ p, n, flip }: { p: Project; n: number; flip: boolean }) {
  const [main, second] = photosOf(p)
  const size = [p.landArea && ['Lahan', p.landArea], p.buildingArea && ['Bangunan', p.buildingArea]].filter(Boolean) as [string, string][]
  return (
    <article className={`cat-ch${flip ? ' cat-ch--flip' : ''}${second ? '' : ' cat-ch--single'}`}>
      <TLink to={`/work/${p.slug}`} className="cat-ch__media" data-cursor="Lihat" aria-label={p.title}>
        <span className="cat-ch__frame" data-reveal>
          {/* the reveal settles the image; the hover zoom lives on this wrapper so the two never fight */}
          <span className="cat-ch__zoom">
            <Img id={main} alt={p.title} sizes="(min-width: 900px) 58vw, 100vw" />
          </span>
        </span>
        {second && (
          <span className="cat-ch__second" data-parallax="14">
            <span className="cat-ch__second-frame" data-reveal data-delay="0.2">
              <Img id={second} sizes="(min-width: 900px) 22vw, 40vw" />
            </span>
          </span>
        )}
      </TLink>
      <div className="cat-ch__text">
        <span className="t-serif cat-ch__no" data-fade>
          {pad(n)}
        </span>
        <h3 className="cat-ch__name" data-split>
          {p.title}
        </h3>
        <p className="cat-ch__meta" data-fade>
          {[p.typology, p.region].filter(Boolean).join(' · ')}
        </p>
        <p className="t-serif cat-ch__tag" data-fade>
          {p.tagline}
        </p>
        {size.length > 0 && (
          <dl className="cat-ch__facts" data-fade>
            {size.map(([k, v]) => (
              <div key={k}>
                <dt className="t-label">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <TLink to={`/work/${p.slug}`} className="link-line t-label cat-ch__link" data-fade>
          Lihat proyek →
        </TLink>
      </div>
    </article>
  )
}

export default function CategoryPage({ cat }: { cat: Category }) {
  const root = useRef<HTMLDivElement>(null)
  const results = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)

  const ci = categoryOrder.indexOf(cat)
  const sector = sectors.find((s) => s.key === cat)!
  const list = projects.filter((p) => p.category === cat)
  const rows = archive
    .filter((a) => a.category === cat)
    .sort((a, b) => Number(!!b.slug) - Number(!!a.slug)) // projects with a page first
  const areaCount = new Set(rows.map((r) => areaOf(r.region)).filter(Boolean)).size
  const shown = open || rows.length <= PEEK ? rows : rows.slice(0, PEEK)
  const others = categoryOrder.filter((c) => c !== cat)

  // the gallery: the photos the chapters do not show yet, every project taking its turn
  const used = new Set<ImgKey>([heroImg[cat].replace(/-hd$/, '') as ImgKey, ...list.flatMap((p) => photosOf(p).slice(0, 2))])
  const pools = list.map((p) => photosOf(p).filter((id) => !used.has(id)).map((id) => ({ id, p })))
  const gallery: { id: ImgKey; p: Project }[] = []
  for (let i = 0; gallery.length < GALLERY_MAX && pools.some((pool) => pool.length > i); i++)
    for (const pool of pools) if (pool[i] && gallery.length < GALLERY_MAX) gallery.push(pool[i])

  usePageAnimations(
    root,
    (page) => {
      // the category photo opens from a framed picture to the full width while it comes up the screen
      const st = { trigger: '.cat-teaser', start: 'top bottom', end: 'top top', scrub: true }
      gsap.fromTo('.cat-teaser__frame', { clipPath: 'inset(0% 8% 0% 8%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: st })
      gsap.fromTo('.cat-teaser__frame img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: st })

      // the typologies run sideways as you scroll, the second line against the first
      gsap.utils.toArray<HTMLElement>('.cat-run__line', page).forEach((line, i) => {
        gsap.fromTo(
          line,
          { xPercent: i % 2 ? -28 : 0 },
          {
            xPercent: i % 2 ? 0 : -28,
            ease: 'none',
            scrollTrigger: { trigger: '.cat-run', start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )
      })

      // gallery: the section is as tall as the sideways travel; the track slides left while it is stuck
      const wall = page.querySelector<HTMLElement>('.cat-wall')
      const track = page.querySelector<HTMLElement>('.cat-wall__track')
      if (!wall || !track) return
      const travel = () => Math.max(0, track.scrollWidth - window.innerWidth)
      const size = () => {
        wall.style.height = `${window.innerHeight + travel()}px`
      }
      size()
      ScrollTrigger.addEventListener('refreshInit', size)
      gsap.to(track, {
        x: () => -travel(),
        ease: 'none',
        scrollTrigger: { trigger: wall, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
      })
      return () => {
        ScrollTrigger.removeEventListener('refreshInit', size)
        wall.style.height = ''
      }
    },
    [cat],
  )

  // Opening the archive: the rows past the first PEEK follow in one after another
  useEffect(() => {
    if (!open) return
    ScrollTrigger.refresh()
    if (reducedMotion() || !results.current) return
    const items = [...results.current.querySelectorAll('.index-row:not(.index-row--head)')].slice(PEEK)
    if (items.length) gsap.fromTo(items, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.02, ease: 'expo.out' })
  }, [open])

  // Archive: floating preview that trails the cursor over rows that have a project page.
  useEffect(() => {
    const el = preview.current
    if (!el || !finePointer()) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' })
    const move = (e: PointerEvent) => {
      xTo(e.clientX + 24)
      yTo(e.clientY - 90)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  const hoveredProject = hovered ? getProject(hovered) : undefined
  const run = sector.typologies

  return (
    <Page title={categoryTitle[cat]}>
      <div ref={root}>
        <section className="cat-hero wrap" data-theme="light">
          <div className="cat-hero__top">
            <span className="pill" data-fade="now">
              <span className="pill__n">
                ({pad(ci + 1)} / {pad(categoryOrder.length)})
              </span>
              {categoryTitle[cat]}
            </span>
            <nav className="cat-hero__switch" aria-label="Kategori" data-fade="now" data-delay="0.15">
              {categoryOrder.map((c) => (
                <TLink key={c} to={`/work/${c}`} className="chip-btn" aria-current={c === cat ? 'page' : undefined}>
                  {categoryLabel[c]}
                </TLink>
              ))}
            </nav>
          </div>
          <h1 className="cat-hero__title">
            <span className="t-display cat-hero__word" data-split="chars">
              {categoryLabel[cat]}
            </span>
            <span className="t-serif cat-hero__design" data-fade="now" data-delay="0.7">
              design
            </span>
          </h1>
          <div className="cat-hero__foot">
            <p className="t-serif cat-hero__desc" data-fade="now" data-delay="0.5">
              {sector.desc}
            </p>
            <dl className="cat-hero__stats" data-fade="now" data-delay="0.6">
              <div>
                <dd>
                  <Counter to={list.length} />
                </dd>
                <dt>Proyek terpilih</dt>
              </div>
              <div>
                <dd>
                  <Counter to={rows.length} />
                </dd>
                <dt>Proyek di arsip</dt>
              </div>
              <div>
                <dd>
                  <Counter to={areaCount} />
                </dd>
                <dt>Wilayah</dt>
              </div>
            </dl>
          </div>
        </section>

        <section className="cat-teaser" data-theme="dark">
          <div className="cat-teaser__frame">
            <Img id={heroImg[cat]} alt={sector.imgAlt} priority sizes="100vw" />
          </div>
        </section>

        {/* the typologies, one running line each way */}
        <section className="cat-run" data-theme="light" aria-label={`Tipologi ${categoryLabel[cat]}`}>
          {[0, 1].map((k) => (
            <p key={k} className="t-serif cat-run__line" aria-hidden={k === 1 ? true : undefined}>
              {[...run, ...run, ...run].map((t, i) => (
                <span key={i} className="cat-run__item" aria-hidden={i >= run.length ? true : undefined}>
                  {t}
                  <Plus className="cat-run__plus" />
                </span>
              ))}
            </p>
          ))}
        </section>

        <section className="cat-list wrap" data-theme="light" aria-labelledby="cat-list-title">
          <header className="cat-list__head">
            <SectionLabel>Selected projects</SectionLabel>
            <h2 id="cat-list-title" className="cat-list__title" data-split>
              {list.length === 1 ? 'Satu proyek, dari dekat.' : `${list.length} proyek terpilih.`}
            </h2>
          </header>
          {list.map((p, i) => (
            <Chapter key={p.slug} p={p} n={i + 1} flip={i % 2 === 1} />
          ))}
        </section>

        {gallery.length > 2 && (
          <section className="cat-wall" data-theme="light" aria-label="Galeri foto">
            <div className="cat-wall__stage">
              <div className="cat-wall__head wrap">
                <SectionLabel>Galeri</SectionLabel>
                <span className="t-serif cat-wall__count">{pad(gallery.length)} foto</span>
              </div>
              <div className="cat-wall__track">
                {gallery.map(({ id, p }, i) => {
                  const m = imgMeta(id)
                  return (
                    <TLink
                      key={id}
                      to={`/work/${p.slug}`}
                      className="cat-wall__item"
                      data-cursor="Lihat"
                      style={{ '--ar': `${m.w} / ${m.h}`, '--lift': i % 3 } as CSSProperties}
                    >
                      <span className="cat-wall__frame">
                        <Img id={id} alt={p.title} sizes="(min-width: 900px) 34vw, 70vw" />
                      </span>
                      <span className="cat-wall__cap">
                        <span>{p.title}</span>
                        <span className="t-serif">{pad(i + 1)}</span>
                      </span>
                    </TLink>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        <section className="cat-index wrap" data-theme="light" aria-labelledby="cat-index-title">
          <header className="cat-index__head">
            <SectionLabel>Project archive</SectionLabel>
            <div className="cat-index__heading">
              <h2 id="cat-index-title" className="cat-index__title" data-split>
                Semua proyek {categoryLabel[cat].toLowerCase()}
              </h2>
              <span className="t-serif cat-index__count" data-fade>
                ({rows.length})
              </span>
            </div>
          </header>
          <div ref={results} className="index-table" role="table" aria-label={`Arsip proyek ${categoryLabel[cat]}`}>
            <div className="index-row index-row--head" role="row">
              <span role="columnheader">No.</span>
              <span role="columnheader">Proyek</span>
              <span role="columnheader">Lokasi</span>
              <span role="columnheader">
                <span className="sr-only">Halaman proyek</span>
              </span>
            </div>
            {shown.map((e, i) => {
              const cells = (
                <>
                  <span role="cell" className="index-row__no">
                    {pad(i + 1)}
                  </span>
                  <span role="cell" className="index-row__title">
                    {e.title}
                  </span>
                  <span role="cell">{e.region ?? '-'}</span>
                  <span role="cell" className="cat-index__go">
                    {e.slug ? 'Lihat →' : ''}
                  </span>
                </>
              )
              return e.slug ? (
                <TLink
                  key={e.title}
                  to={`/work/${e.slug}`}
                  className="index-row index-row--link"
                  role="row"
                  onMouseEnter={() => setHovered(e.slug!)}
                  onMouseLeave={() => setHovered(null)}
                  data-cursor="Lihat"
                >
                  {cells}
                </TLink>
              ) : (
                <div key={e.title} className="index-row" role="row">
                  {cells}
                </div>
              )
            })}
          </div>
          {shown.length < rows.length && (
            <button type="button" className="archive__more" onClick={() => setOpen(true)}>
              <span>
                Tampilkan semua <b>{rows.length}</b> proyek
              </span>
              <Plus className="archive__more-icon" />
            </button>
          )}
        </section>

        <section className="cat-next wrap" data-theme="light" aria-labelledby="cat-next-title">
          <header className="cat-next__head">
            <SectionLabel>Kategori lain</SectionLabel>
            <TLink to="/work" className="link-line t-label">
              Semua di Our Work →
            </TLink>
          </header>
          <h2 id="cat-next-title" className="sr-only">
            Kategori lain
          </h2>
          <div className="cat-next__grid">
            {others.map((c, i) => {
              const s = sectors.find((x) => x.key === c)!
              return (
                <TLink key={c} to={`/work/${c}`} className="cat-next__card" data-cursor="Lihat">
                  <span className="cat-next__media" data-reveal data-delay={i * 0.12}>
                    <span className="cat-next__zoom">
                      <Img id={s.img} alt={s.imgAlt} sizes="(min-width: 768px) 48vw, 100vw" />
                    </span>
                  </span>
                  <span className="cat-next__cap">
                    <span className="t-serif cat-next__no">
                      {pad(categoryOrder.indexOf(c) + 1)} / {pad(categoryOrder.length)}
                    </span>
                    <span className="cat-next__name">{categoryTitle[c]}</span>
                    <span className="cat-next__more">{archive.filter((a) => a.category === c).length} proyek →</span>
                  </span>
                </TLink>
              )
            })}
          </div>
        </section>

        <div ref={preview} className="index-preview" data-on={hoveredProject ? '' : undefined} aria-hidden="true">
          {hoveredProject && <Img id={hoveredProject.cover} sizes="300px" />}
        </div>
      </div>
    </Page>
  )
}
