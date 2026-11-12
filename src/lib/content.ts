import type { ArticleContent, MediaMeta, ProjectContent, PublicContent } from '../../shared/content'
import { registerMedia } from '../components/Img'
import { setProjects, type Project } from '../data/projects'
import { setNews, type NewsItem } from '../data/news'
import { setPages } from '../data/pages'

/*
 * The content the CMS has published (admin.kadanglabo.com), loaded once before the app renders (src/main.tsx).
 * If the CMS cannot be reached in time, the site simply keeps the content bundled in src/data, so it is never empty.
 * A ?preview=<token> link from the dashboard shows one draft on top of the published content.
 */

const TIMEOUT_MS = 3500

async function getJson<T>(url: string): Promise<T | null> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctl.signal, credentials: 'same-origin' })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const toProject = (p: ProjectContent): Project => ({
  slug: p.slug,
  title: p.title,
  category: p.category,
  typology: p.typology,
  location: p.location,
  region: p.region,
  year: p.year,
  status: p.status,
  scope: p.scope,
  landArea: p.landArea,
  buildingArea: p.buildingArea,
  delivery: p.delivery,
  client: p.client,
  color: p.color,
  accent: p.accent,
  tagline: p.tagline,
  summary: p.summary,
  story: p.story.length ? p.story : undefined,
  hero: p.hero || p.cover,
  cover: p.cover || p.hero,
  gallery: p.gallery,
})

const toNews = (a: ArticleContent): NewsItem => ({ ...a })

function apply(projects: ProjectContent[], articles: ArticleContent[], media: Record<string, MediaMeta>, extra?: Pick<PublicContent, 'areas' | 'pages'>) {
  registerMedia(media)
  if (extra) setPages(extra.pages)
  setProjects(
    projects.filter((p) => !p.archiveOnly).map(toProject),
    projects.filter((p) => p.archiveOnly).map((p) => [p.title, p.category, p.region, p.year, p.status, p.cover || undefined]),
    extra?.areas,
  )
  setNews(articles.map(toNews))
}

export async function loadContent() {
  const preview = new URLSearchParams(location.search).get('preview')
  const [live, draft] = await Promise.all([
    getJson<PublicContent>('/api/public/content'),
    preview ? getJson<{ kind: 'project' | 'article'; content: ProjectContent & ArticleContent; media: Record<string, MediaMeta> }>(`/api/public/preview/${encodeURIComponent(preview)}`) : null,
  ])
  if (!live && !draft) return // keep the bundled content

  if (!live && draft) {
    // CMS list unreachable but a preview link: show the draft on top of the bundled content
    const { projects, archive } = await import('../data/projects')
    const { news } = await import('../data/news')
    registerMedia(draft.media)
    if (draft.kind === 'project' && !draft.content.archiveOnly) {
      const p = toProject(draft.content)
      const listed = archive.filter((e) => !e.slug).map((e) => [e.title, e.category, e.region, e.year, e.status, e.cover] as [string, Project['category'], string | null, number | null, Project['status'], string | undefined])
      setProjects(projects.some((x) => x.slug === p.slug) ? projects.map((x) => (x.slug === p.slug ? p : x)) : [p, ...projects], listed)
    } else if (draft.kind === 'article') {
      const n = toNews(draft.content)
      setNews(news.some((x) => x.slug === n.slug) ? news.map((x) => (x.slug === n.slug ? n : x)) : [n, ...news])
    }
    document.documentElement.dataset.preview = ''
    return
  }

  let projects = live!.projects
  let articles = live!.articles
  if (draft) {
    // the draft takes the place of its published version (or joins the list if it was never published)
    if (draft.kind === 'project')
      projects = projects.some((p) => p.slug === draft.content.slug) ? projects.map((p) => (p.slug === draft.content.slug ? draft.content : p)) : [draft.content, ...projects]
    else articles = articles.some((a) => a.slug === draft.content.slug) ? articles.map((a) => (a.slug === draft.content.slug ? draft.content : a)) : [draft.content, ...articles]
    document.documentElement.dataset.preview = ''
  }
  apply(projects, articles, { ...live!.media, ...draft?.media }, { areas: live!.areas, pages: live!.pages })
}
