import type { PageSettings } from '../../shared/content'
import { CATEGORY_SELECTED_MAX, WORK_HIGHLIGHT_MAX } from '../../shared/content'
import type { ImgKey } from '../components/Img'
import { getProject, projects, type Category, type Project } from './projects'

/*
 * What Our Work and the category pages show, as set in the CMS ("Our Work" page). Without settings (the CMS is
 * unreachable, or nothing was saved yet) every place falls back to what the site showed before: the category's
 * projects in their order.
 */

let pages: PageSettings | null = null
export const setPages = (p: PageSettings | null) => void (pages = p)

/** The hero photo of each category page before the CMS. */
const HERO: Record<Category, ImgKey> = {
  commercial: 'klinik-hero-hd',
  hospitality: 'labarka-bird-hd',
  residential: 'hmw-facade-hd',
}

const pick = (slugs: string[] | undefined, cat: Category, max: number): Project[] => {
  const chosen = (slugs ?? []).map(getProject).filter((p): p is Project => !!p && p.category === cat)
  return (chosen.length ? chosen : projects.filter((p) => p.category === cat)).slice(0, max)
}

/** The projects in a category's band on Our Work (at most 5). */
export const workHighlight = (cat: Category) => pick(pages?.categories[cat]?.highlight, cat, WORK_HIGHLIGHT_MAX)

/** The projects told as chapters on a category page (at most 6). */
export const categorySelected = (cat: Category) => pick(pages?.categories[cat]?.selected, cat, CATEGORY_SELECTED_MAX)

/** A category page's hero photo. */
export const categoryHero = (cat: Category): ImgKey => pages?.categories[cat]?.hero || HERO[cat]

/** Every photo of a project, cover first (no duplicates, no -hd copies). */
export const projectPhotos = (p: Project): ImgKey[] =>
  Array.from(
    new Set<ImgKey>([
      p.cover,
      ...p.gallery.flatMap((b) => (b.t === 'pair' ? b.imgs : b.t === 'full' || b.t === 'offset' ? [b.img] : [])),
      ...(p.story?.map((s) => s.img) ?? []),
      p.hero,
    ]),
  ).filter((id) => !!id && !id.endsWith('-hd'))

/**
 * Photo tiles for a category (the Home mosaic): the hand-picked ones whose project is still live, then photos of
 * the category's live projects (in the order chosen in the CMS), taking turns, until there are `n`.
 */
export function categoryTiles(cat: Category, picked: { img: ImgKey; slug: string }[], n: number) {
  const live = (slug: string) => projects.some((p) => p.slug === slug)
  const tiles = picked.filter((t) => live(t.slug)).slice(0, n)
  const used = new Set(tiles.map((t) => t.img))
  const order = [...workHighlight(cat), ...projects.filter((p) => p.category === cat)]
  const pools = Array.from(new Set(order)).map((p) => projectPhotos(p).filter((id) => !used.has(id)).map((img) => ({ img, slug: p.slug })))
  for (let i = 0; tiles.length < n && pools.some((pool) => pool.length > i); i++)
    for (const pool of pools) if (pool[i] && tiles.length < n && !used.has(pool[i].img)) (tiles.push(pool[i]), used.add(pool[i].img))
  return tiles
}
