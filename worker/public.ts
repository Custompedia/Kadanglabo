import { handlePublic, type PublicEnv } from '../shared/public-api'
import { categories } from '../shared/content'

/*
 * kadanglabo-website: the static site (dist/) plus the read-only content the CMS publishes (/api/public/*), its
 * uploaded images (/media/*) and the sitemap (/sitemap.xml). See shared/public-api.ts. It only reads; all writing
 * happens in kadanglabo-admin.
 */

type Env = PublicEnv & { ASSETS: Fetcher }

/** The pages every visitor can reach from the menu, most important first. */
const PAGES = ['/', '/about', '/services', '/work', ...categories.map((c) => `/work/${c}`), '/work/archive', '/articles', '/contact']

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null)

/**
 * sitemap.xml, built from what the CMS has published, so a new project or article is listed the moment it goes live.
 * Every page exists in English (the default) and Indonesian (?lang=id); hreflang tells search engines both are the
 * same page.
 */
async function sitemap(env: Env, origin: string) {
  const [projects, articles, version] = await env.CONTENT_DB.batch<{ slug?: string; at?: string | null; value?: string }>([
    env.CONTENT_DB.prepare(
      `SELECT slug, COALESCE(published_at, updated_at) AS at FROM projects WHERE state = 'published' AND published IS NOT NULL AND archive_only = 0 ORDER BY position, id`,
    ),
    env.CONTENT_DB.prepare(`SELECT slug, COALESCE(published_at, updated_at) AS at FROM articles WHERE state = 'published' AND published IS NOT NULL ORDER BY date DESC, id DESC`),
    env.CONTENT_DB.prepare(`SELECT value FROM meta WHERE key = 'version'`),
  ])
  const site = day(version.results[0]?.value) // the last publish: what the overview pages show changes with it
  const urls: { path: string; lastmod: string | null }[] = [
    ...PAGES.map((path) => ({ path, lastmod: site })),
    ...projects.results.map((p) => ({ path: `/work/${p.slug}`, lastmod: day(p.at) })),
    ...articles.results.map((a) => ({ path: `/articles/${a.slug}`, lastmod: day(a.at) })),
  ]
  const entry = ({ path, lastmod }: (typeof urls)[number]) => {
    const en = esc(`${origin}${path}`)
    const id = esc(`${origin}${path}?lang=id`)
    return [
      '  <url>',
      `    <loc>${en}</loc>`,
      lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
      `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
      `    <xhtml:link rel="alternate" hreflang="id" href="${id}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n')
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(entry).join('\n')}
</urlset>
`
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url)
    if (url.pathname === '/sitemap.xml' && (req.method === 'GET' || req.method === 'HEAD')) return sitemap(env, url.origin)
    return (await handlePublic(req, env, ctx)) ?? env.ASSETS.fetch(req)
  },
} satisfies ExportedHandler<Env>
