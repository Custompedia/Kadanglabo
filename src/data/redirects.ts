import type { SlugRedirects } from '../../shared/content'

/*
 * Old addresses of projects and articles (CMS: an address changed after it went live). The detail pages send a visitor
 * on an old address to the current one instead of showing "not found".
 */
let redirects: SlugRedirects = { project: {}, article: {} }
export const setRedirects = (r: SlugRedirects | null | undefined) => void (redirects = r ?? { project: {}, article: {} })
export const redirectFor = (kind: keyof SlugRedirects, slug: string): string | undefined => redirects[kind]?.[slug]
