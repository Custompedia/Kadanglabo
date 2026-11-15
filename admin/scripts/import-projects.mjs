// Bulk-imports projects (facts + photos + copy) into the CMS, merging with what is already there.
//
//   node scripts/import-projects.mjs --data <dir>            dry run: resizes the photos, writes the SQL, prints a summary
//   node scripts/import-projects.mjs --data <dir> --remote   the same, then uploads to R2 and writes to the real D1
//
// <dir> holds:
//   plan.json        [{ slug, title, category, year, city, region, status, landArea, buildingArea, manifest?, drive?, keepCopy?, draft? }]
//                    (`drive` = the folder in drive/ when it is not named after the slug; `draft` = import but keep it off the site)
//                    (one entry per project; `manifest` is a file name in manifests/, absent = no photos → draft)
//   manifests/*.json { cover, hero, gallery: blocks with photo file names, alt: {file: {en,id}}, copy: {...} | null }
//   drive/<slug>/*   the photos the manifests name
//   pages.json       optional PageSettings (photo file names written as "<slug>/<file>" are replaced by media ids)
//   order.json       optional [slug, …]: these projects go first, in this order
//
// Merging, per project (matched by slug):
//   - copy (typology, tagline, summary, scope, colours) is only written when the project has none yet, or keepCopy is false
//   - facts from the plan fill empty fields only (an existing location, year or area is never overwritten)
//   - gallery blocks from the manifest are appended after the existing ones; cover/hero are set when the manifest names one
//   - a project goes live only when nothing in publishIssues() is missing, otherwise it is saved as a draft
// Photos are resized exactly like the admin does (admin/src/lib/image.ts): fit in 1920px, WebP q80 at 640/960/1280/1920.
import { createServer } from 'vite'
import { execFileSync, execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const sharp = createRequire(import.meta.url)('sharp')
const here = path.dirname(fileURLToPath(import.meta.url))
const admin = path.resolve(here, '..')
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined)
const data = path.resolve(arg('--data') ?? '')
const remote = process.argv.includes('--remote')
if (!fs.existsSync(path.join(data, 'plan.json'))) throw new Error('--data <dir> with plan.json is required')

const vite = await createServer({ root: admin, configFile: false, logLevel: 'error', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const { txToRich } = await vite.ssrLoadModule('/../shared/content.ts')
const { projectSchema } = await vite.ssrLoadModule('/worker/validate.ts')
const { publishIssues } = await vite.ssrLoadModule('/worker/content.ts')
await vite.close()

const wrangler = (args) => execFileSync('npx', ['wrangler', ...args], { cwd: admin, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }).toString()
const query = (db, sql) => JSON.parse(wrangler(['d1', 'execute', db, '--remote', '--json', '--command', sql]))[0].results
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const slugify = (s) => s.replace(/\.[a-z0-9]+$/i, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image'
const shortId = () => crypto.randomBytes(4).toString('hex').slice(0, 6)
const blank = { en: '', id: '' }
const filled = (t) => !!(t && t.en?.trim() && t.id?.trim())

const plan = JSON.parse(fs.readFileSync(path.join(data, 'plan.json'), 'utf8'))
const out = path.join(data, 'out')
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(path.join(out, 'webp'), { recursive: true })

// ---- what is in the CMS now ----------------------------------------------------------------------------------------
const existing = new Map(query('kadanglabo-content', 'SELECT id, slug, state, position, draft FROM projects').map((r) => [r.slug, { ...r, draft: JSON.parse(r.draft) }]))
const maxPos = Math.max(-1, ...[...existing.values()].map((r) => r.position))

// ---- photos ----------------------------------------------------------------------------------------------------------
const WIDTHS = [640, 960, 1280, 1920]
const media = new Map() // "<slug>/<file>" → { id, … }
async function photo(slug, file, alt, dir = slug) {
  const key = `${dir}/${file}`
  if (media.has(key)) return media.get(key).id
  const src = path.join(data, 'drive', dir, file)
  if (!fs.existsSync(src)) throw new Error(`Missing photo ${src}`)
  const id = `${slugify(`${slug}-${file.replace(/^\d+__/, '')}`).slice(0, 33).replace(/-+$/, '')}-${shortId()}`
  const { info: { width, height } } = await sharp(src).rotate().toBuffer({ resolveWithObject: true }) // size after EXIF rotation
  const scale = Math.min(1, 1920 / width, 1920 / height)
  const mw = Math.round(width * scale)
  const mh = Math.round(height * scale)
  const sizes = [...WIDTHS.filter((w) => w < mw), mw]
  let bytes = 0
  const files = []
  for (const w of sizes) {
    const f = path.join(out, 'webp', `${id}-${w}.webp`)
    await sharp(src).rotate().resize({ width: w, height: Math.round((mh * w) / mw), fit: 'fill' }).webp({ quality: 80 }).toFile(f)
    bytes += fs.statSync(f).size
    files.push([`media/${id}-${w}.webp`, f])
  }
  const { data: px } = await sharp(src).rotate().resize(24, 24, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const avg = [0, 1, 2].map((c) => Math.round(px.filter((_, i) => i % 3 === c).reduce((a, b) => a + b, 0) / (px.length / 3)))
  const color = '#' + avg.map((v) => v.toString(16).padStart(2, '0')).join('')
  const filename = file.replace(/^\d+__/, '')
  media.set(key, { id, filename, w: mw, h: mh, color, sizes, bytes, files, src, originalKey: `${id}/${filename.replace(/[^\w.-]+/g, '_')}`, originalBytes: fs.statSync(src).size, alt: alt ?? blank })
  return id
}

// ---- projects ----------------------------------------------------------------------------------------------------------
const at = new Date().toISOString()
let contentSql = ''
const summary = []
let nextPos = maxPos + 1
for (const p of plan) {
  const row = existing.get(p.slug)
  const base = row?.draft ?? {
    slug: p.slug, title: p.title, category: p.category, archiveOnly: false, typology: blank, location: null, region: null, year: null, status: null,
    scope: [], color: '#1B2238', accent: '#EC6434', tagline: blank, summary: txToRich(blank), story: [], hero: '', cover: '', gallery: [],
  }
  const c = structuredClone(base)
  // facts: the sheet decides the category; everything else only fills what is empty
  c.category = p.category
  c.title = c.title || p.title
  if (c.location == null && p.city) c.location = p.city
  if (c.region == null && p.region) c.region = p.region
  if (c.year == null && p.year) c.year = p.year
  if (c.status == null && p.status) c.status = p.status
  if (!c.landArea && p.landArea) c.landArea = p.landArea
  if (!c.buildingArea && p.buildingArea) c.buildingArea = p.buildingArea

  const m = p.manifest ? JSON.parse(fs.readFileSync(path.join(data, 'manifests', p.manifest), 'utf8')) : null
  if (m && m.usable !== false) {
    const alt = m.alt ?? {}
    const ph = (f) => photo(p.slug, f, alt[f], p.drive ?? p.slug)
    if (m.copy && !(p.keepCopy && filled(c.tagline))) {
      c.archiveOnly = false
      c.typology = m.copy.typology
      c.tagline = m.copy.tagline
      c.summary = txToRich(m.copy.summary)
      c.scope = m.copy.scope
      if (m.copy.color) c.color = m.copy.color
      if (m.copy.accent) c.accent = m.copy.accent
    }
    if (m.cover) c.cover = await ph(m.cover)
    if (m.hero) c.hero = await ph(m.hero)
    if (!c.cover && c.hero) c.cover = c.hero
    if (!c.hero && c.cover) c.hero = c.cover
    const blocks = []
    for (const b of m.gallery ?? []) {
      if (b.t === 'full' || b.t === 'offset') blocks.push({ ...b, img: await ph(b.img) })
      else if (b.t === 'pair') blocks.push({ ...b, imgs: [await ph(b.imgs[0]), await ph(b.imgs[1])] })
    }
    if (m.copy?.galleryText && filled(m.copy.galleryText.label) && filled(m.copy.galleryText.body)) {
      blocks.splice(Math.min(2, blocks.length), 0, { t: 'text', label: m.copy.galleryText.label, body: txToRich(m.copy.galleryText.body) })
    }
    c.gallery = [...c.gallery, ...blocks]
  }

  const parsed = projectSchema.safeParse(c)
  if (!parsed.success) throw new Error(`${p.slug}: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  const issues = publishIssues('project', c)
  const live = issues.length === 0 && !c.archiveOnly && !(p.draft && row?.state !== 'published')
  // a live project that would lose its page stays as it is (never take something down here)
  const state = live ? 'published' : row?.state === 'published' ? 'published' : 'draft'
  if (row?.state === 'published' && !live) throw new Error(`${p.slug} is live but would not pass publishing: ${issues.join(', ')}`)
  const json = JSON.stringify(c)
  if (row) {
    contentSql += `UPDATE projects SET title = ${q(c.title)}, category = ${q(c.category)}, archive_only = ${c.archiveOnly ? 1 : 0}, draft = ${q(json)}, ${state === 'published' ? `published = ${q(json)}, dirty = 0, state = 'published', published_at = COALESCE(published_at, ${q(at)}),` : `dirty = 1,`} updated_by = 'import', updated_at = ${q(at)} WHERE slug = ${q(p.slug)};\n`
  } else {
    contentSql += `INSERT INTO projects (slug, state, position, title, category, archive_only, draft, published, dirty, created_by, updated_by, published_at) VALUES (${[p.slug, state, nextPos++, c.title, c.category, c.archiveOnly ? 1 : 0, json, state === 'published' ? json : null, state === 'published' ? 0 : 1, 'import', 'import', state === 'published' ? at : null].map(q).join(', ')});\n`
  }
  summary.push({ slug: p.slug, was: row?.state ?? 'new', now: state, gallery: c.gallery.length, cover: !!c.cover, missing: issues.join(', ') })
}

// ---- order: the listed projects first, everything else after in its current order --------------------------------
const orderFile = path.join(data, 'order.json')
if (fs.existsSync(orderFile)) {
  const first = JSON.parse(fs.readFileSync(orderFile, 'utf8'))
  const rest = [...new Set([...[...existing.values()].sort((a, b) => a.position - b.position).map((r) => r.slug), ...plan.map((p) => p.slug)])].filter((s) => !first.includes(s))
  ;[...first, ...rest].forEach((s, i) => (contentSql += `UPDATE projects SET position = ${i} WHERE slug = ${q(s)};\n`))
}

// ---- page settings ------------------------------------------------------------------------------------------------------
const pagesFile = path.join(data, 'pages.json')
if (fs.existsSync(pagesFile)) {
  const pages = JSON.parse(fs.readFileSync(pagesFile, 'utf8'))
  for (const cat of Object.values(pages.categories)) {
    if (cat.hero && cat.hero.includes('/')) {
      const [slug, ...f] = cat.hero.split('/')
      cat.hero = await photo(slug, f.join('/'))
    }
  }
  contentSql += `INSERT INTO settings (key, value, updated_by) VALUES ('pages', ${q(JSON.stringify(pages))}, 'import') ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = 'import', updated_at = ${q(at)};\n`
}
contentSql += `UPDATE meta SET value = ${q(at)} WHERE key = 'version';\n`

let mediaSql = ''
for (const m of media.values()) {
  mediaSql += `INSERT INTO media (id, filename, w, h, color, sizes, bytes, original_bytes, original_key, alt_en, alt_id, created_by) VALUES (${[m.id, m.filename, m.w, m.h, m.color, JSON.stringify(m.sizes), m.bytes, m.originalBytes, m.originalKey, m.alt.en ?? '', m.alt.id ?? '', 'import'].map(q).join(', ')});\n`
}
fs.writeFileSync(path.join(out, 'content.sql'), contentSql)
fs.writeFileSync(path.join(out, 'media.sql'), mediaSql)
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 1))
console.table(summary)
const files = [...media.values()].flatMap((m) => m.files)
console.log(`${media.size} photos → ${files.length} WebP files (${(files.reduce((s, [, f]) => s + fs.statSync(f).size, 0) / 1e6).toFixed(1)} MB). SQL in ${out}`)
if (!remote) {
  console.log('Dry run: nothing written. Add --remote to upload and write.')
  process.exit(0)
}

// ---- write: photos first, then their media rows, then the projects that use them --------------------------------------
const put = (bucket, key, file, type, cache) =>
  new Promise((resolve, reject) =>
    execFile('npx', ['wrangler', 'r2', 'object', 'put', `${bucket}/${key}`, '--file', file, '--content-type', type, ...(cache ? ['--cache-control', cache] : []), '--remote'], { cwd: admin }, (err) => (err ? reject(err) : resolve())),
  )
const jobs = [
  ...files.map(([key, file]) => () => put('kadanglabo-media', key, file, 'image/webp', 'public, max-age=31536000, immutable')),
  ...[...media.values()].map((m) => () => put('kadanglabo-originals', m.originalKey, m.src, m.src.endsWith('.png') ? 'image/png' : 'image/jpeg')),
]
let done = 0
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let job; (job = jobs.shift()); ) {
      for (let attempt = 1; ; attempt++) {
        try {
          await job()
          break
        } catch (err) {
          if (attempt >= 4) throw err
          await new Promise((r) => setTimeout(r, attempt * 1500))
        }
      }
      if (++done % 25 === 0) console.log(`  uploaded ${done}`)
    }
  }),
)
console.log(`✓ ${done} files in R2`)
wrangler(['d1', 'execute', 'kadanglabo-media', '--remote', '--yes', '--file', path.join(out, 'media.sql')])
console.log('✓ media rows')
wrangler(['d1', 'execute', 'kadanglabo-content', '--remote', '--yes', '--file', path.join(out, 'content.sql')])
console.log('✓ projects, page settings and version')
