import { imgMeta, type ImgKey } from '../components/Img'
import { getProject } from './projects'

const heroImages: Partial<Record<ImgKey, ImgKey>> = {
  'balecatur-front': 'balecatur-front-hd',
  'labarka-bird': 'labarka-bird-hd',
  'klinik-hero': 'klinik-hero-hd',
  'hmw-facade': 'hmw-facade-hd',
  'firlatata-front': 'firlatata-front-hd',
}

/** Projects shown in the home hero carousel (the first one is where the preloader lands). */
export const heroSlides = [
  'bale-catur-villa-resto',
  'la-barka-resort',
  'klinik-uii',
  'hmw-house',
  'perum-firlatata',
].map((slug) => {
  const project = getProject(slug)!
  return { ...project, hero: heroImages[project.hero] ?? project.hero }
})

/** Account for object-fit: cover, the 128% pan height, and the hero's 560px minimum height. */
export function heroImageSizes(id: ImgKey) {
  const { w, h } = imgMeta(id)
  const ratio = w / h
  return `max(100vw, ${(ratio * 128).toFixed(2)}svh, ${(ratio * 1.28 * 560).toFixed(2)}px)`
}

/** Images the preloader flips through before growing into the hero (shed.design-style intro). */
export const preloaderFlip: ImgKey[] = [
  'labarka-river',
  'klinik-plaza',
  'labarka-gables',
  'hmw-dining',
  'balecatur-pool',
  'giripeni-aerial',
  'firlatata-front',
]
