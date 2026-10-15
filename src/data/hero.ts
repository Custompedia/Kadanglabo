import type { ImgKey } from '../components/Img'
import { getProject } from './projects'

/** Projects shown in the home hero carousel (the first one is where the preloader lands). */
export const heroSlides = [
  'bale-catur-villa-resto',
  'la-barka-resort',
  'klinik-uii',
  'hmw-house',
  'perum-firlatata',
].map((slug) => getProject(slug)!)

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
