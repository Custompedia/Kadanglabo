import { useRef, type CSSProperties } from 'react'
import { useParams } from 'react-router'
import { Page } from '../components/Page'
import { RichText } from '../components/RichText'
import { Img, coverSizes, imgMeta } from '../components/Img'
import { ProjectCard, SectionLabel } from '../components/Bits'
import { usePageAnimations } from '../lib/anim'
import { gsap } from '../lib/gsap'
import {
  categoryLabel,
  getProject,
  relatedProjects,
  fmtArea,
  statusLabel,
  type Block,
  type Project,
} from '../data/projects'
import NotFound from './NotFound'
import { t, tr } from '../lib/i18n'

/** the four facts worth saying big: what, where, how large, and the state it is in */
function facts(p: Project): [string, string][] {
  const scope = p.scope.map(t)
  const out: [string, string][] = [[tr('Typology', 'Tipologi'), t(p.typology)]]
  if (p.region) out.push([tr('Location', 'Lokasi'), p.region])
  if (p.landArea) out.push([tr('Site area', 'Luas lahan'), fmtArea(p.landArea)])
  if (p.buildingArea) out.push([tr('Built area', 'Luas bangunan'), fmtArea(p.buildingArea)])
  if (out.length < 4 && scope.length)
    out.push([tr('Scope', 'Cakupan'), scope.length > 2 ? tr(`${scope.length} disciplines`, `${scope.length} bidang`) : scope.join(' & ')])
  if (out.length < 4 && p.status) out.push(['Status', t(statusLabel[p.status])])
  if (out.length < 4 && p.delivery) out.push([tr('Delivery', 'Skema'), t(p.delivery)])
  return out.slice(0, 4)
}

function Meta({ p }: { p: Project }) {
  const rows: [string, string | null | undefined][] = [
    [tr('Location', 'Lokasi'), p.location],
    [tr('Sector', 'Sektor'), `${categoryLabel[p.category]}, ${t(p.typology)}`],
    [tr('Scope', 'Cakupan'), p.scope.map(t).join(', ')],
    [tr('Client', 'Klien'), p.client],
    [tr('Site area', 'Luas lahan'), p.landArea && fmtArea(p.landArea)],
    [tr('Built area', 'Luas bangunan'), p.buildingArea && fmtArea(p.buildingArea)],
    [tr('Delivery', 'Skema'), p.delivery && t(p.delivery)],
    ['Status', p.status && t(statusLabel[p.status])],
    [tr('Year', 'Tahun'), p.year ? String(p.year) : null],
  ]
  return (
    <dl className="meta-list" data-stagger="0.05">
      {rows
        .filter(([, v]) => !!v)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  )
}

function GalleryBlock({ b }: { b: Block }) {
  switch (b.t) {
    case 'full':
      return (
        <figure className="g-full">
          <div className="g-media" data-reveal>
            <div className="g-parallax" data-parallax="6">
              <Img id={b.img} sizes="(min-width: 768px) 66vw, 100vw" />
            </div>
          </div>
        </figure>
      )
    case 'pair': {
      const landscape = b.imgs.every((id) => imgMeta(id).w > imgMeta(id).h)
      return (
        <figure className="g-pair wrap" style={{ '--pair-ratio': landscape ? '4 / 3' : '4 / 5' } as CSSProperties}>
          {b.imgs.map((id, i) => (
            <div key={id} className="g-media" data-reveal data-delay={i * 0.12}>
              <Img id={id} sizes="(min-width: 768px) 48vw, 100vw" />
            </div>
          ))}
        </figure>
      )
    }
    case 'offset':
      return (
        <figure className="g-offset wrap">
          <div className="g-media" data-reveal>
            <Img id={b.img} sizes="100vw" />
          </div>
          {b.caption && <figcaption className="g-cap">{t(b.caption)}</figcaption>}
        </figure>
      )
    case 'text':
      return (
        <div className="g-text wrap">
          <span className="pill" data-fade>
            {t(b.label)}
          </span>
          <RichText value={b.body} className="t-lead" wrap="g-text__body" data-split="" />
        </div>
      )
    case 'quote':
      return (
        <blockquote className="g-quote wrap">
          <p className="g-quote__text" data-split>
            “{t(b.text)}”
          </p>
        </blockquote>
      )
  }
}

export default function ProjectDetail() {
  const { slug } = useParams()
  const p = slug ? getProject(slug) : undefined
  if (!p) return <NotFound />
  return <ProjectView p={p} />
}

function ProjectView({ p }: { p: Project }) {
  const root = useRef<HTMLDivElement>(null)

  usePageAnimations(root, () => {
    const st = { trigger: '.p-teaser', start: 'top bottom', end: 'top top', scrub: true }
    gsap.fromTo('.p-teaser__frame', { clipPath: 'inset(0% 7% 0% 7%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: st })
    gsap.fromTo('.p-teaser__frame img', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: st })
    gsap.to('.p-hero__inner', {
      yPercent: -30,
      autoAlpha: 0.2,
      ease: 'none',
      scrollTrigger: { trigger: '.p-hero', start: 'top top', end: 'bottom top', scrub: true },
    })
  })

  const related = relatedProjects(p)
  const vars = { '--p-color': p.color, '--p-accent': p.accent } as CSSProperties
  const heroTheme = p.color.toUpperCase() === '#D34614' ? 'accent' : 'dark' // deep orange (white text) or navy

  return (
    <Page title={p.title}>
      <div ref={root} style={vars}>
        <section className="p-hero" data-theme={heroTheme}>
          <div className="p-hero__inner wrap">
            <h1 className="t-display p-hero__title" data-split="chars">
              {p.title}
            </h1>
            <p className="t-serif p-hero__sub" data-fade="now" data-delay="0.45">
              {t(p.tagline)}
            </p>
            <p className="p-hero__tags" data-fade="now" data-delay="0.6">
              <span className="pill">{categoryLabel[p.category]}</span>
              <span className="pill">{t(p.typology)}</span>
              {p.status && <span className="pill">{t(statusLabel[p.status])}</span>}
            </p>
          </div>
        </section>

        <section className="p-teaser" data-theme={heroTheme}>
          <div className="p-teaser__frame">
            <Img id={p.hero} alt={p.title} priority sizes={coverSizes(p.hero, 100)} />
          </div>
        </section>

        {/* the project's key facts in one big band (STANZZA's project figures), the finer rows below */}
        <section className="p-facts wrap" data-theme="light" aria-label={tr('Project facts', 'Fakta proyek')}>
          <dl className="p-facts__list" data-stagger="0.08">
            {facts(p).map(([k, v]) => (
              <div key={k} className="p-facts__item">
                <dt className="t-label p-facts__key">{k}</dt>
                <dd className="p-facts__val">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="p-intro wrap" data-theme="light">
          <div className="p-intro__aside">
            <SectionLabel>{tr('Project info', 'Info proyek')}</SectionLabel>
            <Meta p={p} />
          </div>
          <RichText value={p.summary} className="t-lead" wrap="p-intro__summary" data-scrub="" />
        </section>


        {p.gallery.length > 0 && (
          <section className="gallery" data-theme="light">
            {p.gallery.map((b, i) => (
              <GalleryBlock key={i} b={b} />
            ))}
          </section>
        )}

        <section className="related wrap" data-theme="light">
          <div className="related__head">
            <SectionLabel>{tr('Related projects', 'Proyek terkait')}</SectionLabel>
            <p className="t-serif related__note" data-fade>
              {tr('More work with a similar typology or approach.', 'Proyek lain dengan tipologi atau pendekatan serupa.')}
            </p>
          </div>
          <div className="related__grid" data-stagger>
            {related.map((r) => (
              <ProjectCard key={r.slug} p={r} />
            ))}
          </div>
        </section>
      </div>
    </Page>
  )
}
