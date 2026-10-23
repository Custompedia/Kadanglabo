import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Page } from '../components/Page'
import { Img, imgMeta, type ImgKey } from '../components/Img'
import { Counter, SectionLabel, TeamStack } from '../components/Bits'
import { WaFloat } from '../components/WaFloat'
import { InquiryForm } from '../components/InquiryForm'
import { ArrowRight, Plus } from '../components/Icons'
import { usePageAnimations } from '../lib/anim'
import { gsap, ScrollTrigger, finePointer, reducedMotion } from '../lib/gsap'
import { TLink } from '../lib/transition'
import { scrollToElement } from '../lib/smooth'
import { sectors, waHello, waLink, workLanding } from '../data/site'
import {
  archive,
  areaOf,
  categoryLabel,
  categoryOrder,
  categoryTitle,
  getProject,
  projects,
  type Category,
  fmtArea,
  type Project,
} from '../data/projects'
import { t, tr } from '../lib/i18n'
import './Category.css'

/*
 * One landing page per category (/work/commercial, /work/hospitality, /work/residential): the page an ad points to,
 * opened from the Home mosaic, Services and Our Work. In order: a cinematic hero with the promise and two ways to
 * act, one statement with photos set into the line, the selected projects as chapters, what we design (a photo per
 * typology), why clients choose us told sideways between the photos, this category's archive, the other two, and the inquiry
 * form last; a WhatsApp button waits in the corner.
 */

const heroImg: Record<Category, ImgKey> = {
  commercial: 'klinik-hero-hd',
  hospitality: 'labarka-bird-hd',
  residential: 'hmw-facade-hd',
}

const PEEK = 10 // archive rows shown before "Show all"
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

/** The statement: words and inline photos ([[img-key]] in the copy), each word its own span so the line can rise in. */
function Statement({ text }: { text: string }) {
  return (
    <p className="lp-st__text">
      {text.split(/(\[\[[a-z0-9-]+\]\])/).map((part, i) => {
        const img = part.match(/^\[\[([a-z0-9-]+)\]\]$/)
        if (img)
          return (
            <span key={i} className="lp-st__img" aria-hidden="true">
              <span className="lp-st__img-in">
                <Img id={img[1] as ImgKey} sizes="200px" />
              </span>
            </span>
          )
        return (
          <Fragment key={i}>
            {part
              .split(/\s+/)
              .filter(Boolean)
              .map((w, k) => (
                <Fragment key={k}>
                  <span className="lp-st__w">{w}</span>{' '}
                </Fragment>
              ))}
          </Fragment>
        )
      })}
    </p>
  )
}

/** A selected project as a chapter: a big photo with a second one tucked over its corner, the facts beside it */
function Chapter({ p, n, flip }: { p: Project; n: number; flip: boolean }) {
  const [main, second] = photosOf(p)
  const size = [
    p.landArea && [tr('Site', 'Lahan'), fmtArea(p.landArea)],
    p.buildingArea && [tr('Building', 'Bangunan'), fmtArea(p.buildingArea)],
  ].filter(Boolean) as [string, string][]
  return (
    <article className={`cat-ch${flip ? ' cat-ch--flip' : ''}${second ? '' : ' cat-ch--single'}`}>
      <TLink to={`/work/${p.slug}`} className="cat-ch__media" data-cursor={tr('View', 'Lihat')} aria-label={p.title}>
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
          {[t(p.typology), p.region].filter(Boolean).join(' · ')}
        </p>
        <p className="t-serif cat-ch__tag" data-fade>
          {t(p.tagline)}
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
          {tr('View project', 'Lihat proyek')} →
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
  const lp = workLanding[cat]
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
  // the sideways "why" track: a reason card, then a few photos, and so on; reasons left over close the row
  type WallItem = { kind: 'why'; n: number; b: (typeof sector.benefits)[number] } | { kind: 'photo'; id: ImgKey; p: Project }
  const wallItems: WallItem[] = []
  const per = Math.max(1, Math.ceil(gallery.length / sector.benefits.length))
  sector.benefits.forEach((b, n) => {
    wallItems.push({ kind: 'why', n, b })
    gallery.slice(n * per, (n + 1) * per).forEach((g) => wallItems.push({ kind: 'photo', ...g }))
  })

  usePageAnimations(
    root,
    (page) => {
      // hero: the photo settles from a slow zoom as the page opens, then drifts and the words lift away on scroll
      const hero = page.querySelector<HTMLElement>('.lp-h')!
      gsap.fromTo('.lp-h__media img', { scale: 1.18 }, { scale: 1, duration: 2.6, ease: 'expo.out' })
      gsap.to('.lp-h__media', { yPercent: 16, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      gsap.to('.lp-h__body', { y: -90, autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })

      // statement: the words rise in order and each photo opens out of its slot in the line
      const st = page.querySelector<HTMLElement>('.lp-st__text')!
      gsap
        .timeline({ scrollTrigger: { trigger: st, start: 'top 78%', once: true } })
        .from(st.querySelectorAll('.lp-st__w'), { yPercent: 60, autoAlpha: 0, duration: 0.9, stagger: 0.035, ease: 'power3.out' })
        .fromTo(
          st.querySelectorAll('.lp-st__img'),
          { clipPath: 'inset(0% 50% 0% 50% round 999px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 999px)', duration: 1.2, stagger: 0.25, ease: 'expo.inOut' },
          0.3,
        )
        .from(st.querySelectorAll('.lp-st__img img'), { scale: 1.5, duration: 1.6, stagger: 0.25, ease: 'power3.out' }, 0.3)

      // why us + gallery: the section is as tall as the sideways travel; the track slides left while it is stuck
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
  const name = categoryLabel[cat]

  return (
    <Page title={categoryTitle[cat]}>
      <div ref={root}>
        {/* ---------- hero: the promise on the category's photo, two ways to act, the numbers ---------- */}
        <section className="lp-h" data-theme="dark" aria-labelledby="lp-h-title">
          <div className="lp-h__media">
            <Img id={heroImg[cat]} alt={t(sector.imgAlt)} priority sizes="100vw" />
          </div>
          <div className="lp-h__shade" aria-hidden="true" />
          <div className="lp-h__body wrap">
            <div className="lp-h__top">
              <span className="pill" data-fade="now">
                <span className="pill__n">
                  ({pad(ci + 1)} / {pad(categoryOrder.length)})
                </span>
                {categoryTitle[cat]}
              </span>
              <nav className="lp-h__switch" aria-label={tr('Sectors', 'Sektor')} data-fade="now" data-delay="0.15">
                {categoryOrder.map((c) => (
                  <TLink key={c} to={`/work/${c}`} className="chip-btn" aria-current={c === cat ? 'page' : undefined}>
                    {categoryLabel[c]}
                  </TLink>
                ))}
              </nav>
            </div>
            <div className="lp-h__main">
              <h1 id="lp-h-title" className="lp-h__title" data-split="now" data-delay="0.25">
                {t(lp.headline)}
              </h1>
              <div className="lp-h__side">
                <p className="lp-h__sub" data-fade="now" data-delay="0.6">
                  {t(lp.sub)}
                </p>
                <div className="cta-row" data-fade="now" data-delay="0.75">
                  <TLink to={`/work/${cat}#start`} className="cta-btn">
                    <span className="cta-btn__label">{tr('Start your project', 'Mulai proyek Anda')}</span>
                    <span className="cta-btn__icon" aria-hidden="true">
                      <ArrowRight />
                      <ArrowRight />
                    </span>
                  </TLink>
                  <button type="button" className="cta-link" onClick={() => scrollToElement('#projects', -20)}>
                    {tr('See the projects', 'Lihat proyeknya')}
                    <ArrowRight className="cta-link__arrow lp-h__down" />
                  </button>
                </div>
              </div>
            </div>
            <dl className="lp-h__stats" data-fade="now" data-delay="0.9">
              <div>
                <dt>{tr('Selected projects', 'Proyek pilihan')}</dt>
                <dd>
                  <Counter to={list.length} />
                </dd>
              </div>
              <div>
                <dt>{tr('In our archive', 'Di arsip kami')}</dt>
                <dd>
                  <Counter to={rows.length} />
                </dd>
              </div>
              <div>
                <dt>{tr('Regions', 'Wilayah')}</dt>
                <dd>
                  <Counter to={areaCount} />
                </dd>
              </div>
              <div>
                <dt>{tr('Designing since', 'Berkarya sejak')}</dt>
                <dd>2020</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ---------- one statement, photos set into the line ---------- */}
        <section className="lp-st wrap" data-theme="light">
          <SectionLabel n="01">{categoryTitle[cat]}</SectionLabel>
          <Statement text={t(lp.statement)} />
        </section>

        {/* ---------- the proof: every selected project as a chapter ---------- */}
        <section id="projects" className="cat-list wrap" data-theme="light" aria-labelledby="cat-list-title">
          <header className="cat-list__head">
            <SectionLabel n="02">{tr('Selected projects', 'Proyek pilihan')}</SectionLabel>
            <h2 id="cat-list-title" className="cat-list__title" data-split>
              {list.length === 1
                ? tr('One project, up close.', 'Satu proyek, dari dekat.')
                : tr(`${list.length} selected projects.`, `${list.length} proyek pilihan.`)}
            </h2>
            <p className="cat-list__intro" data-fade>
              {t(lp.projectsIntro)}
            </p>
          </header>
          {list.map((p, i) => (
            <Chapter key={p.slug} p={p} n={i + 1} flip={i % 2 === 1} />
          ))}
        </section>

        {/* ---------- what we design: a photo per typology ---------- */}
        <section className="lp-ty wrap" data-theme="light" aria-labelledby="lp-ty-title">
          <header className="lp-ty__head">
            <SectionLabel n="03">{tr('What we design', 'Yang kami rancang')}</SectionLabel>
            <h2 id="lp-ty-title" className="t-h1 lp-ty__title" data-split>
              {tr(`Every kind of ${name.toLowerCase()} space.`, `Semua jenis ruang ${name.toLowerCase()}.`)}
            </h2>
          </header>
          <ul className="lp-ty__grid" style={{ '--cols': sector.typologies.length } as CSSProperties}>
            {sector.typologies.map((ty, i) => (
              <li key={ty.en} className="lp-ty__card">
                <span className="lp-ty__frame" data-reveal data-delay={i * 0.1}>
                  <span className="lp-ty__zoom">
                    <Img id={lp.typologyImgs[i] ?? sector.img} sizes="(min-width: 900px) 25vw, 50vw" />
                  </span>
                </span>
                <span className="lp-ty__shade" aria-hidden="true" />
                <span className="t-serif lp-ty__no">{pad(i + 1)}</span>
                <span className="lp-ty__name">{t(ty)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- why us, told sideways: the reasons on orange cards between the photos that prove them ---------- */}
        <section className="cat-wall" data-theme="light" aria-labelledby="cat-wall-title">
          <div className="cat-wall__stage">
            <div className="cat-wall__head wrap">
              <SectionLabel n="04">{tr('Why Kadanglabo', 'Kenapa Kadanglabo')}</SectionLabel>
              <span className="t-serif cat-wall__count">
                {pad(sector.benefits.length)} {tr('reasons', 'alasan')} · {pad(gallery.length)} {tr('photos', 'foto')}
              </span>
            </div>
            <div className="cat-wall__track">
              <div className="cat-wall__intro">
                <h2 id="cat-wall-title" className="t-h1 cat-wall__title">
                  {tr('Why clients choose Kadanglabo.', 'Alasan klien memilih Kadanglabo.')}
                </h2>
                <p className="t-serif cat-wall__lead">
                  {tr('Three reasons, and the work that proves them.', 'Tiga alasan, dan karya yang membuktikannya.')}
                </p>
              </div>
              {wallItems.map((item, k) =>
                item.kind === 'why' ? (
                  <article key={`why-${item.n}`} className="cat-wall__why">
                    <span className="t-serif cat-wall__why-no">{pad(item.n + 1)}</span>
                    <div>
                      <h3 className="cat-wall__why-name">{t(item.b.title)}</h3>
                      <p className="cat-wall__why-body">{t(item.b.body)}</p>
                    </div>
                  </article>
                ) : (
                  <TLink
                    key={item.id}
                    to={`/work/${item.p.slug}`}
                    className="cat-wall__item"
                    data-cursor={tr('View', 'Lihat')}
                    style={{ '--ar': `${imgMeta(item.id).w} / ${imgMeta(item.id).h}`, '--lift': k % 3 } as CSSProperties}
                  >
                    <span className="cat-wall__frame">
                      <Img id={item.id} alt={item.p.title} sizes="(min-width: 900px) 34vw, 70vw" />
                    </span>
                    <span className="cat-wall__cap">
                      <span>{item.p.title}</span>
                    </span>
                  </TLink>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="cat-index wrap" data-theme="light" aria-labelledby="cat-index-title">
          <header className="cat-index__head">
            <SectionLabel n="05">{tr('Project archive', 'Arsip proyek')}</SectionLabel>
            <div className="cat-index__heading">
              <h2 id="cat-index-title" className="cat-index__title" data-split>
                {tr(`All ${categoryLabel[cat].toLowerCase()} projects`, `Semua proyek ${categoryLabel[cat].toLowerCase()}`)}
              </h2>
              <span className="t-serif cat-index__count" data-fade>
                ({rows.length})
              </span>
            </div>
          </header>
          <div ref={results} className="index-table" role="table" aria-label={tr(`${categoryLabel[cat]} project archive`, `Arsip proyek ${categoryLabel[cat]}`)}>
            <div className="index-row index-row--head" role="row">
              <span role="columnheader">No.</span>
              <span role="columnheader">{tr('Project', 'Proyek')}</span>
              <span role="columnheader">{tr('Location', 'Lokasi')}</span>
              <span role="columnheader">
                <span className="sr-only">{tr('Project page', 'Halaman proyek')}</span>
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
                    {e.slug ? `${tr('View', 'Lihat')} →` : ''}
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
                  data-cursor={tr('View', 'Lihat')}
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
                {tr('Show all', 'Tampilkan semua')} <b>{rows.length}</b> {tr('projects', 'proyek')}
              </span>
              <Plus className="archive__more-icon" />
            </button>
          )}
        </section>

        <section className="cat-next wrap" data-theme="light" aria-labelledby="cat-next-title">
          <header className="cat-next__head">
            <SectionLabel n="06">{tr('Other sectors', 'Sektor lain')}</SectionLabel>
            <span className="cat-next__links">
              <TLink to="/services" className="link-line t-label">
                {tr('All services', 'Semua layanan')} →
              </TLink>
              <TLink to="/work" className="link-line t-label">
                {tr('All our work', 'Semua proyek')} →
              </TLink>
            </span>
          </header>
          <h2 id="cat-next-title" className="sr-only">
            {tr('Other sectors', 'Sektor lain')}
          </h2>
          <div className="cat-next__grid">
            {others.map((c, i) => {
              const s = sectors.find((x) => x.key === c)!
              return (
                <TLink key={c} to={`/work/${c}`} className="cat-next__card" data-cursor={tr('View', 'Lihat')}>
                  <span className="cat-next__media" data-reveal data-delay={i * 0.12}>
                    <span className="cat-next__zoom">
                      <Img id={s.img} alt={t(s.imgAlt)} sizes="(min-width: 768px) 48vw, 100vw" />
                    </span>
                  </span>
                  <span className="cat-next__cap">
                    <span className="t-serif cat-next__no">
                      {pad(categoryOrder.indexOf(c) + 1)} / {pad(categoryOrder.length)}
                    </span>
                    <span className="cat-next__name">{categoryTitle[c]}</span>
                    <span className="cat-next__more">{archive.filter((a) => a.category === c).length} {tr('projects', 'proyek')} →</span>
                  </span>
                </TLink>
              )
            })}
          </div>
        </section>

        {/* ---------- act, at the very end: the inquiry form, this category already chosen ---------- */}
        <section id="start" className="start wrap" data-theme="light">
          <div className="start__head">
            <SectionLabel n="07">{tr('Start a project', 'Mulai proyek')}</SectionLabel>
            <h2 className="t-display start__title" data-split>
              {tr(`Let’s build your ${name.toLowerCase()} project.`, `Wujudkan proyek ${name.toLowerCase()} Anda.`)}
            </h2>
            <p className="t-body-lg max-w-[40ch] opacity-75 mt-6" data-fade>
              {tr(
                'Tell us a little about your plans. Our team will get back to you to map out the next step together.',
                'Ceritakan sedikit tentang rencana Anda. Tim kami akan menghubungi Anda untuk menyusun langkah berikutnya bersama.',
              )}
            </p>
            <TeamStack />
            <a href={waLink(`${waHello()} (${categoryTitle[cat]})`)} target="_blank" rel="noreferrer" className="cta-link mt-6" data-fade>
              {tr('Or chat on WhatsApp', 'Atau chat via WhatsApp')}
              <ArrowRight className="cta-link__arrow" />
            </a>
          </div>
          <InquiryForm sector={name as 'Commercial' | 'Hospitality' | 'Residential'} />
        </section>

        <WaFloat text={`${waHello()} (${categoryTitle[cat]})`} />

        <div ref={preview} className="index-preview" data-on={hoveredProject ? '' : undefined} aria-hidden="true">
          {hoveredProject && <Img id={hoveredProject.cover} sizes="300px" />}
        </div>
      </div>
    </Page>
  )
}
