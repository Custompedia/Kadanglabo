// Moves the site's existing content into the CMS: the 12 projects, the 49 archive-only entries and the articles
// from src/data/*.ts, and every image they use (the WebP sizes already in public/img, uploaded as they are).
// Everything with a photo goes in as published; entries without one (the archive list) wait as drafts.
//
//   node scripts/seed.mjs            local D1 + R2 (what `npm run dev` uses)
//   node scripts/seed.mjs --remote   the real databases and buckets on Cloudflare
//   add --force to empty the content tables first (images already in R2 are simply overwritten)
import { createServer } from 'vite'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const admin = path.resolve(here, '..')
const site = path.resolve(admin, '..')
const remote = process.argv.includes('--remote')
const force = process.argv.includes('--force')
// only the Our Work / category page settings (and their photos): leaves projects and articles as they are
const pagesOnly = process.argv.includes('--pages-only')
const where = remote ? '--remote' : '--local'

// ---- load the site's data modules (TypeScript, with the browser bits they touch at import stubbed out) ----------
globalThis.window = { location: { search: '' } }
globalThis.localStorage = { getItem: () => null, setItem: () => {} }
globalThis.document = { documentElement: {} }
const vite = await createServer({ root: site, configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const { projects, archive } = await vite.ssrLoadModule('/src/data/projects.ts')
const { news } = await vite.ssrLoadModule('/src/data/news.ts')
const { txToRich, textToDoc } = await vite.ssrLoadModule('/shared/content.ts')
await vite.close()
const images = JSON.parse(fs.readFileSync(path.join(site, 'src/data/images.json'), 'utf8'))

// ---- convert -----------------------------------------------------------------------------------------------------
const slugify = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const used = new Set()
const img = (k) => (k && used.add(k), k ?? '')

const projectRows = projects.map((p, i) => ({
  position: i,
  content: {
    slug: p.slug,
    title: p.title,
    category: p.category,
    archiveOnly: false,
    typology: p.typology,
    location: p.location,
    region: p.region,
    year: p.year,
    status: p.status,
    scope: p.scope,
    ...(p.landArea && { landArea: p.landArea }),
    ...(p.buildingArea && { buildingArea: p.buildingArea }),
    ...(p.delivery && { delivery: p.delivery }),
    ...(p.client && { client: p.client }),
    color: p.color,
    accent: p.accent,
    tagline: p.tagline,
    summary: txToRich(p.summary),
    story: (p.story ?? []).map((s) => ({ key: s.key, text: txToRich(s.text), img: img(s.img) })),
    hero: img(p.hero),
    cover: img(p.cover),
    gallery: p.gallery.map((b) => {
      if (b.t === 'full' || b.t === 'offset') return { ...b, img: img(b.img) }
      if (b.t === 'pair') return { ...b, imgs: [img(b.imgs[0]), img(b.imgs[1])] }
      if (b.t === 'text') return { t: 'text', label: b.label, body: txToRich(b.body) }
      return b
    }),
  },
}))

const taken = new Set(projects.map((p) => p.slug))
const archiveRows = archive
  .filter((a) => !a.slug)
  .map((a, i) => {
    let slug = slugify(a.title)
    for (let n = 2; taken.has(slug); n++) slug = `${slugify(a.title)}-${n}`
    taken.add(slug)
    const blank = { en: '', id: '' }
    return {
      position: projects.length + i,
      content: {
        slug, title: a.title, category: a.category, archiveOnly: true, typology: blank, location: null, region: a.region, year: a.year,
        status: a.status, scope: [], color: '#1B2238', accent: '#EC6434', tagline: blank, summary: txToRich(blank), story: [], hero: '', cover: '', gallery: [],
      },
    }
  })

// articles are already in the one-text shape (src/data/news.ts reads the old ones through normalizeArticle)
const articleRows = news.map((n) => {
  img(n.cover)
  for (const lang of ['en', 'id']) for (const b of n.body[lang].content) if (b.type === 'image') img(b.attrs.id)
  return { content: n }
})

// ---- page settings: what Our Work and the category pages show today ------------------------------------------
// (the hero photos are the ones src/pages/Category.tsx used before the CMS)
const heroImg = { commercial: 'klinik-hero-hd', hospitality: 'labarka-bird-hd', residential: 'hmw-facade-hd' }
const pages = {
  categories: Object.fromEntries(
    ['commercial', 'hospitality', 'residential'].map((cat) => {
      const slugs = projects.filter((p) => p.category === cat).map((p) => p.slug)
      return [cat, { highlight: slugs.slice(0, 5), hero: img(heroImg[cat]), selected: slugs.slice(0, 6) }]
    }),
  ),
}

// ---- SQL ---------------------------------------------------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const at = new Date().toISOString()
let content = force ? 'DELETE FROM projects;\nDELETE FROM articles;\n' : ''
for (const r of [...projectRows, ...archiveRows]) {
  const c = r.content
  const json = JSON.stringify(c)
  // only what has a photo goes live; the rest (the archive entries, so far) waits as a draft until one is added
  const live = !!c.cover
  content += `INSERT INTO projects (slug, state, position, title, category, archive_only, draft, published, dirty, created_by, updated_by, published_at) VALUES (${[c.slug, live ? 'published' : 'draft', r.position, c.title, c.category, c.archiveOnly ? 1 : 0, json, live ? json : null, live ? 0 : 1, 'seed', 'seed', live ? at : null].map(q).join(', ')});\n`
}
for (const r of articleRows) {
  const c = r.content
  const json = JSON.stringify(c)
  content += `INSERT INTO articles (slug, state, title, type, date, draft, published, dirty, created_by, updated_by, published_at) VALUES (${[c.slug, 'published', c.title.en, c.type, c.date, json, json, 0, 'seed', 'seed', at].map(q).join(', ')});\n`
}
content += `INSERT INTO settings (key, value, updated_by) VALUES ('pages', ${q(JSON.stringify(pages))}, 'seed') ON CONFLICT(key) DO ${force ? `UPDATE SET value = excluded.value` : 'NOTHING'};\n`
content += `UPDATE meta SET value = ${q(at)} WHERE key = 'version';\n`
if (pagesOnly) content = `INSERT INTO settings (key, value, updated_by) VALUES ('pages', ${q(JSON.stringify(pages))}, 'seed') ON CONFLICT(key) DO NOTHING;\nUPDATE meta SET value = ${q(at)} WHERE key = 'version';\n`

const files = [] // [key in the bucket, file on disk]
let media = force ? 'DELETE FROM media;\n' : ''
for (const key of [...used].sort()) {
  const m = images[key]
  if (!m) throw new Error(`Image "${key}" is used but missing from src/data/images.json`)
  let total = 0
  for (const w of m.s) {
    const file = path.join(site, 'public/img', `${key}-${w}.webp`)
    if (!fs.existsSync(file)) throw new Error(`Missing file ${file}`)
    total += fs.statSync(file).size
    files.push([`media/${key}-${w}.webp`, file])
  }
  media += `INSERT OR REPLACE INTO media (id, filename, w, h, color, sizes, bytes, created_by) VALUES (${[key, `${key}.webp`, m.w, m.h, m.c === 'transparent' ? '#ffffff' : m.c, JSON.stringify(m.s), total, 'seed'].map(q).join(', ')});\n`
}

// ---- write -------------------------------------------------------------------------------------------------------
const wrangler = (args) => execFileSync('npx', ['wrangler', ...args], { cwd: admin, stdio: ['ignore', 'pipe', 'pipe'] }).toString()
const count = wrangler(['d1', 'execute', 'kadanglabo-content', where, '--json', '--command', 'SELECT COUNT(*) AS n FROM projects'])
if (!force && !pagesOnly && JSON.parse(count)[0].results[0].n > 0) {
  console.error('kadanglabo-content already has projects. Run again with --force to replace them.')
  process.exit(1)
}

const tmp = fs.mkdtempSync(path.join(admin, '.wrangler', 'seed-'))
fs.writeFileSync(path.join(tmp, 'content.sql'), content)
fs.writeFileSync(path.join(tmp, 'media.sql'), media)
console.log(`→ ${projectRows.length} projects, ${archiveRows.length} archive entries, ${articleRows.length} articles`)
wrangler(['d1', 'execute', 'kadanglabo-content', where, '--yes', '--file', path.join(tmp, 'content.sql')])
console.log(`→ ${used.size} images (${files.length} files)`)
wrangler(['d1', 'execute', 'kadanglabo-media', where, '--yes', '--file', path.join(tmp, 'media.sql')])

// uploads: locally straight into the local bucket (one process), remotely a few wrangler calls at a time, with retries
let done = 0
const tick = () => (++done % 25 === 0 || done === files.length) && console.log(`  ${done}/${files.length}`)
const httpMetadata = { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' }
if (!remote) {
  const { getPlatformProxy } = await import('wrangler')
  const proxy = await getPlatformProxy({ configPath: path.join(admin, 'wrangler.jsonc') })
  for (const [key, file] of files) {
    await proxy.env.MEDIA.put(key, fs.readFileSync(file), { httpMetadata })
    tick()
  }
  await proxy.dispose()
} else {
  const { execFile } = await import('node:child_process')
  const put = ([key, file]) =>
    new Promise((resolve, reject) =>
      execFile('npx', ['wrangler', 'r2', 'object', 'put', `kadanglabo-media/${key}`, '--file', file, '--content-type', httpMetadata.contentType, '--cache-control', httpMetadata.cacheControl, '--remote'], { cwd: admin }, (err) => (err ? reject(err) : resolve())),
    )
  const queue = [...files]
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let f; (f = queue.shift()); ) {
        for (let attempt = 1; ; attempt++) {
          try {
            await put(f)
            break
          } catch (err) {
            if (attempt >= 4) throw err
            await new Promise((r) => setTimeout(r, attempt * 1500))
          }
        }
        tick()
      }
    }),
  )
}
fs.rmSync(tmp, { recursive: true, force: true })
console.log('✓ done')
