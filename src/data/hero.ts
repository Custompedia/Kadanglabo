import { imgMeta, type ImgKey } from '../components/Img'
import { getProject, projects } from './projects'

const heroImages: Partial<Record<ImgKey, ImgKey>> = {
  'balecatur-front': 'balecatur-front-hd',
  'labarka-bird': 'labarka-bird-hd',
  'klinik-hero': 'klinik-hero-hd',
  'hmw-facade': 'hmw-facade-hd',
  'firlatata-front': 'firlatata-front-hd',
}

/** Projects shown in the home hero carousel (the first one is where the preloader lands). */
const preferredProjects = [
  'hmw-house',
  'bale-catur-villa-resto',
  'la-barka-resort',
  'klinik-uii',
  'perum-firlatata',
].flatMap((slug) => {
  // a project taken off the site in the CMS simply drops out of the carousel
  const project = getProject(slug)
  return project ? [project] : []
})

/** New CMS projects can supply the hero even when none of the original selections remain live. */
export const heroSlides = (preferredProjects.length ? preferredProjects : projects.slice(0, 5)).map((project) => ({
  ...project,
  hero: heroImages[project.hero || project.cover] ?? (project.hero || project.cover),
}))

/** Account for object-fit: cover, the 128% pan height, and the hero's 560px minimum height. */
export function heroImageSizes(id: ImgKey) {
  const { w, h } = imgMeta(id)
  const ratio = w / h
  return `max(100vw, ${(ratio * 128).toFixed(2)}svh, ${(ratio * 1.28 * 560).toFixed(2)}px)`
}
