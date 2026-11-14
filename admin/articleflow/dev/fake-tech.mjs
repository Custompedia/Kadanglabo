/*
 * A stand-in for Custompedia Tech's Partner API (cms-partner/v1), for the tests and for looking at the ArticleFlow
 * page by hand. Sample data only; nothing here is real.
 *
 *   node admin/articleflow/dev/fake-tech.mjs [--port 8799] [--mode active|expiring|expired|none]
 *
 * then in admin/.dev.vars:
 *   TECH_API_URL=http://127.0.0.1:8799
 *   TECH_SITE_ID=kadanglabo
 *   TECH_PARTNER_KEY=dev-partner-key
 *
 * Switches while it runs:  curl -X POST http://127.0.0.1:8799/__control -d '{"mode":"expired"}'
 *   mode: active | expiring | expired | none      down: true (answers 503)      slow: ms
 *   refuse: ["HERO_REQUIRED"] (next publish is refused)      changed: true (next write answers 409 CHANGED)
 *   failLive: n (the next n "live" reports fail)      reset: true (sample data back to the start)
 */
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

export const FAKE_KEY = 'dev-partner-key'
export const FAKE_SITE = 'kadanglabo'

const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10)
const iso = (offsetHours) => new Date(Date.now() + offsetHours * 3600e3).toISOString()

const p = (...runs) => ({ type: 'paragraph', runs: runs.map((r) => (typeof r === 'string' ? { text: r } : r)) })

function version(locale, n, title, slug, extra = {}) {
  const id = locale === 'id'
  return {
    locale, articleId: `art_${n}_${locale}`, versionId: `ver_${n}_${locale}_1`, slug, title,
    metaTitle: title, metaDescription: id ? 'Ringkasan singkat untuk hasil pencarian.' : 'A short summary for search results.',
    excerpt: id ? 'Rincian yang bisa langsung dipakai untuk menyusun anggaran dan jadwal.' : 'A breakdown you can use to plan a budget and a schedule.',
    directAnswer: id ? 'Jawaban singkat: biaya bergantung pada luas, material, dan tingkat kerumitan.' : 'Short answer: cost depends on floor area, materials and complexity.',
    topic: id ? 'Wawasan' : 'Insight',
    hero: { assetId: `asset_${n}_hero`, alt: id ? 'Interior ruang dengan pencahayaan hangat' : 'Interior with warm lighting', caption: id ? 'Contoh ruang yang sudah selesai.' : 'A finished space.' },
    blocks: [
      { type: 'heading', level: 2, text: id ? 'Apa saja yang menentukan biaya' : 'What drives the cost' },
      p(id ? 'Tiga hal paling berpengaruh adalah ' : 'The three biggest factors are ', { text: id ? 'luas ruang' : 'floor area', bold: true }, id ? ', pilihan material, dan ' : ', material choices and ', { text: id ? 'detail khusus' : 'custom detailing', italic: true }, '.'),
      { type: 'list', ordered: false, items: [[{ text: id ? 'Tata letak dan sirkulasi' : 'Layout and circulation' }], [{ text: id ? 'Pencahayaan' : 'Lighting' }], [{ text: id ? 'Furnitur buatan khusus' : 'Custom furniture' }]] },
      { type: 'table', caption: id ? 'Kisaran per meter persegi' : 'Range per square metre', header: id ? ['Tingkat', 'Kisaran'] : ['Level', 'Range'], rows: id ? [['Dasar', '[KISARAN]'], ['Menengah', '[KISARAN]']] : [['Basic', '[RANGE]'], ['Mid', '[RANGE]']] },
      { type: 'image', assetId: `asset_${n}_body`, alt: id ? 'Detail material' : 'Material detail', caption: id ? 'Detail material lantai.' : 'Flooring detail.', layout: 'WIDE' },
      { type: 'heading', level: 3, text: id ? 'Urutan pengerjaan' : 'Order of work' },
      { type: 'list', ordered: true, items: [[{ text: id ? 'Survei dan konsep' : 'Survey and concept' }], [{ text: id ? 'Gambar kerja' : 'Working drawings' }], [{ text: id ? 'Pembangunan' : 'Build' }]] },
      { type: 'quote', text: id ? 'Anggaran yang jelas sejak awal menghemat banyak revisi.' : 'A clear budget from the start saves many revisions.', by: 'Kadanglabo' },
      { type: 'callout', tone: 'TIP', text: id ? 'Sisihkan cadangan untuk pekerjaan tak terduga.' : 'Keep a reserve for unexpected work.' },
      p(id ? 'Lihat juga ' : 'See also ', { text: id ? 'layanan Hospitality' : 'our Hospitality service', href: '/work/hospitality' }, '.'),
      { type: 'divider' },
      { type: 'cta', label: id ? 'Konsultasi projek' : 'Discuss a project', href: '/contact' },
      { type: 'hologram', text: 'a block type this dashboard does not know' },
    ],
    assets: [
      { assetId: `asset_${n}_hero`, alt: '', caption: '', width: 1600, height: 1000, format: 'webp' },
      { assetId: `asset_${n}_body`, alt: '', caption: '', width: 1280, height: 800, format: 'webp' },
    ],
    ...extra,
  }
}

function sample() {
  const group = (n, status, sentHours, titles, slug, query, why, both = true, extra = {}) => ({
    groupId: `grp_${n}`, status, sentAt: iso(-sentHours), title: titles.id, excerpt: 'Rincian yang bisa langsung dipakai untuk menyusun anggaran dan jadwal.',
    primaryQuery: query, why, decision: null, history: [],
    why_detail: [
      { label: 'Kata kunci utama', text: query },
      { label: 'Permintaan pencarian', text: 'Dicari rutin setiap bulan di Indonesia.' },
      { label: 'Celah yang diisi', text: 'Halaman 1 Google belum ada yang memberi rincian per meter persegi.' },
      { label: 'Hubungan dengan website', text: 'Mengarah ke halaman layanan yang relevan.' },
      { label: 'Hasil yang diharapkan', text: 'Masuk 10 besar dalam beberapa minggu.' },
    ],
    quality: { passed: true, notes: [] },
    versions: both ? [version('id', n, titles.id, slug + '-id'), version('en', n, titles.en, slug)] : [version('id', n, titles.id, slug)],
    ...extra,
  })
  return [
    group(1, 'PENDING', 2, { id: 'Biaya Desain Interior Kafe: Rincian per Meter', en: 'Cafe Interior Design Cost: A Breakdown per Square Metre' }, 'cafe-interior-design-cost', 'biaya desain interior kafe', 'Banyak dicari, belum ada halaman Kadanglabo yang menjawabnya.'),
    group(2, 'PENDING', 26, { id: '7 Kesalahan Renovasi Restoran yang Membuat Biaya Membengkak', en: '7 Restaurant Renovation Mistakes That Inflate the Budget' }, 'restaurant-renovation-mistakes', 'renovasi restoran', 'Pesaing di halaman 1 belum membahas urutan pengerjaan.'),
    group(3, 'PENDING', 50, { id: 'Panduan Memilih Kontraktor Villa di Bali', en: 'A Guide to Choosing a Villa Contractor in Bali' }, 'villa-contractor-bali', 'kontraktor villa bali', 'Mendukung halaman layanan Hospitality.', false),
    group(4, 'APPROVED', 70, { id: 'Material Lantai untuk Ruang Komersial', en: 'Flooring Materials for Commercial Spaces' }, 'commercial-flooring-materials', 'material lantai komersial', 'Melengkapi kelompok artikel Commercial.'),
    group(5, 'CHANGES_REQUESTED', 90, { id: 'Tren Desain Kantor Hybrid untuk Tim Kecil', en: 'Hybrid Office Design Trends for Small Teams' }, 'hybrid-office-design', 'desain kantor hybrid', 'Topik baru yang sedang naik.', true, {
      decision: { decision: 'CHANGES_REQUESTED', by: 'Custompedia', at: iso(-48), comment: 'Contoh projek harus memakai projek Kadanglabo.' },
      history: [{ decision: 'CHANGES_REQUESTED', by: 'Custompedia', at: iso(-48), comment: 'Contoh projek harus memakai projek Kadanglabo.' }],
    }),
  ]
}

const analytics = () => ({
  connected: true, window: { start: day(-28), end: day(-1) }, syncedThrough: day(-2),
  totals: { clicks: 1284, impressions: 38920, ctr: 0.033, position: 14.2 },
  previous: { clicks: 1088, impressions: 31390, ctr: 0.0347, position: 17.3 },
  daily: Array.from({ length: 28 }, (_, i) => ({ date: day(i - 28), clicks: 24 + Math.round(i * 1.6 + (i % 3) * 5), impressions: 900 + i * 38 + (i % 4) * 60 })),
  articles: [
    { title: 'Desain Interior Kafe di Jogja', url: 'https://kadanglabo.com/articles/cafe-interior-jogja', primaryQuery: 'desain interior kafe jogja', publishedAt: iso(-24 * 8), clicks: 412, impressions: 9800, position: 4.1 },
    { title: 'Berapa Lama Membangun Rumah Tropis Dua Lantai', url: 'https://kadanglabo.com/articles/tropical-house-timeline', primaryQuery: 'lama bangun rumah', publishedAt: iso(-24 * 16), clicks: 268, impressions: 7400, position: 8.3 },
  ],
  queries: [
    { query: 'desain interior kafe jogja', clicks: 212, impressions: 4100, position: 4 },
    { query: 'biaya renovasi restoran', clicks: 148, impressions: 3900, position: 7 },
    { query: 'kontraktor villa bali', clicks: 96, impressions: 3100, position: 9 },
    { query: 'desain kantor modern', clicks: 71, impressions: 2800, position: 12 },
    { query: 'arsitek rumah tropis', clicks: 44, impressions: 2100, position: 15 },
  ],
  published: { total: 12, thisMonth: 4 },
  ai: { asked: 20, mentioned: 5 },
})

const emptyAnalytics = () => ({ connected: false, window: null, syncedThrough: null, totals: { clicks: 0, impressions: 0, ctr: null, position: null }, previous: { clicks: 0, impressions: 0, ctr: null, position: null }, daily: [], articles: [], queries: [], published: { total: 0, thisMonth: 0 }, ai: null })

/** A picture to serve as article media: a real WebP when sharp is around, else a one-pixel PNG. */
async function picture(width, height, tone) {
  try {
    const sharp = (await import('sharp')).default
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="${tone[0]}"/><stop offset="1" stop-color="${tone[1]}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><rect x="${width * 0.12}" y="${height * 0.5}" width="${width * 0.3}" height="${height * 0.38}" fill="${tone[2]}"/><rect x="${width * 0.5}" y="${height * 0.3}" width="${width * 0.36}" height="${height * 0.58}" fill="${tone[3]}"/></svg>`
    return { type: 'image/webp', bytes: await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer() }
  } catch {
    return { type: 'image/png', bytes: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8e/fufwAIhgNmlJzc8gAAAABJRU5ErkJggg==', 'base64') }
  }
}

export async function createFakeTech({ port = 0, mode = 'active', key = FAKE_KEY, site = FAKE_SITE } = {}) {
  const state = { mode, down: false, slow: 0, refuse: null, changed: false, failLive: 0, emptyAnalytics: false, groups: sample(), calls: [], idem: new Map(), live: [], takenDown: [] }
  const pictures = { hero: await picture(1600, 1000, ['#e7d9c4', '#b9a48c', '#8c7458', '#d9c8b4']), body: await picture(1280, 800, ['#d8dde6', '#9aa7bf', '#3c4c74', '#ec6434']) }

  const subscription = () => {
    const days = { active: 62, expiring: 5, expired: 0, none: null }[state.mode]
    if (state.mode === 'none') return { state: 'NONE', startsOn: null, endsOn: null, endsAt: null, totalDays: null, daysLeft: null }
    const left = days
    const endsOn = state.mode === 'expired' ? day(-3) : day(left)
    return { state: { active: 'ACTIVE', expiring: 'EXPIRING', expired: 'EXPIRED' }[state.mode], startsOn: day(left - 90), endsOn, endsAt: `${endsOn}T16:59:59.000Z`, totalDays: 90, daysLeft: left }
  }
  const locked = () => state.mode === 'expired' || state.mode === 'none'
  const item = (g) => ({
    groupId: g.groupId, status: g.status, sentAt: g.sentAt, title: g.title, excerpt: g.excerpt, primaryQuery: g.primaryQuery, why: g.why, decision: g.decision,
    locales: g.versions.map((v) => ({ locale: v.locale, articleId: v.articleId, versionId: v.versionId, title: v.title, slug: v.slug, status: g.status, publishedAt: g.publishedAt ?? null })),
  })
  const counts = () => ({
    pending: state.groups.filter((g) => g.status === 'PENDING').length,
    approved: state.groups.filter((g) => g.status === 'APPROVED').length,
    changes: state.groups.filter((g) => g.status === 'CHANGES_REQUESTED' || g.status === 'UPDATING').length,
    published: state.groups.filter((g) => g.status === 'PUBLISHED').length,
  })
  const sameVersions = (g, versions) => versions && typeof versions === 'object' && g.versions.every((v) => versions[v.articleId] === v.versionId) && Object.keys(versions).length === g.versions.length

  const server = createServer(async (req, res) => {
    const chunks = []
    for await (const c of req) chunks.push(c)
    const raw = Buffer.concat(chunks).toString('utf8')
    let body = {}
    try { body = raw ? JSON.parse(raw) : {} } catch { body = null }
    const url = new URL(req.url, 'http://fake')
    const send = (status, data, headers = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers })
      res.end(data === null ? undefined : JSON.stringify(data))
    }
    if (url.pathname === '/__control' && req.method === 'POST') {
      if (body?.reset) { state.groups = sample(); state.idem.clear(); state.live = []; state.takenDown = [] }
      for (const k of ['mode', 'down', 'slow', 'refuse', 'changed', 'failLive', 'emptyAnalytics']) if (body && k in body) state[k] = body[k]
      return send(200, { ok: true, mode: state.mode })
    }
    state.calls.push(`${req.method} ${url.pathname}`)
    if (state.slow) await new Promise((r) => setTimeout(r, state.slow))
    if (state.down) return send(503, { error: 'UNAVAILABLE' })
    const m = new RegExp(`^/v2/sites/${site}/partner(/.*)$`).exec(url.pathname)
    if (!m) return send(404, { error: 'NOT_FOUND' })
    if (req.headers['x-cms-partner-key'] !== key) return send(401, { error: 'UNAUTHORIZED' })
    const path = m[1]

    if (path === '/status' && req.method === 'GET')
      return send(200, { contractVersion: 'cms-partner/v1', siteId: site, hostname: 'kadanglabo.com', serverTime: new Date().toISOString(), subscription: subscription(), counts: locked() ? null : counts() })
    if (locked()) return send(402, { error: 'SUBSCRIPTION_EXPIRED' })
    if (path === '/analytics' && req.method === 'GET') return send(200, state.emptyAnalytics ? emptyAnalytics() : analytics())
    if (path === '/articles' && req.method === 'GET') return send(200, { items: state.groups.map(item) })

    const a = /^\/articles\/([^/]+)(?:\/(media|decision|publish|live|taken-down)(?:\/([^/]+))?)?$/.exec(path)
    if (!a) return send(404, { error: 'NOT_FOUND' })
    const g = state.groups.find((x) => x.groupId === decodeURIComponent(a[1]))
    if (!g) return send(404, { error: 'NOT_FOUND' })
    const [, , action, asset] = a
    if (!action && req.method === 'GET') return send(200, { ...item(g), history: g.history, why_detail: g.why_detail, quality: g.quality, versions: g.versions })
    if (action === 'media' && req.method === 'GET') {
      if (!g.versions.some((v) => v.assets.some((x) => x.assetId === asset))) return send(404, { error: 'NOT_FOUND' })
      const pic = asset.endsWith('_hero') ? pictures.hero : pictures.body
      res.writeHead(200, { 'content-type': pic.type, 'cache-control': 'no-store' })
      return res.end(pic.bytes)
    }
    if (req.method !== 'POST' || !action) return send(404, { error: 'NOT_FOUND' })
    if (body === null || typeof body.idempotencyKey !== 'string' || !body.idempotencyKey) return send(400, { error: 'INVALID_INPUT' })
    const idemKey = `${action}:${g.groupId}:${body.idempotencyKey}`
    if (state.idem.has(idemKey)) { const prev = state.idem.get(idemKey); return send(prev.status, prev.data) }
    const remember = (status, data) => { state.idem.set(idemKey, { status, data }); return send(status, data) }

    if (action === 'decision') {
      if (state.changed) { state.changed = false; return send(409, { error: 'CHANGED' }) }
      if (body.decision !== 'CHANGES_REQUESTED' || typeof body.comment !== 'string' || !body.comment.trim() || body.comment.length > 2000 || !body.actor?.name) return send(400, { error: 'INVALID_INPUT' })
      if (!sameVersions(g, body.versions)) return send(409, { error: 'CHANGED' })
      g.decision = { decision: 'CHANGES_REQUESTED', by: body.actor.name, at: new Date().toISOString(), comment: body.comment.trim() }
      g.history.unshift(g.decision)
      g.status = 'CHANGES_REQUESTED'
      return remember(200, item(g))
    }
    if (action === 'publish') {
      if (state.changed) { state.changed = false; return send(409, { error: 'CHANGED' }) }
      if (!body.actor?.name) return send(400, { error: 'INVALID_INPUT' })
      if (!sameVersions(g, body.versions)) return send(409, { error: 'CHANGED' })
      if (state.refuse) { const reasons = state.refuse; state.refuse = null; return send(409, { error: 'PUBLISH_REFUSED', reasons }) }
      const at = g.publishedAt ?? new Date().toISOString()
      g.status = 'PUBLISHED'
      g.publishedAt = at
      g.decision = { decision: 'APPROVED', by: body.actor.name, at, comment: '' }
      g.publishCount = (g.publishCount ?? 0) + 1
      return remember(200, { item: item(g), published: g.versions.map((v) => ({ articleId: v.articleId, locale: v.locale, versionId: v.versionId, publishedAt: at })) })
    }
    if (action === 'live') {
      if (state.failLive > 0) { state.failLive--; return send(503, { error: 'UNAVAILABLE' }) }
      state.live.push({ groupId: g.groupId, urls: body.urls })
      state.idem.set(idemKey, { status: 204, data: null })
      return send(204, null)
    }
    state.takenDown.push(g.groupId)
    state.idem.set(idemKey, { status: 204, data: null })
    return send(204, null)
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve) })
  return {
    url: `http://127.0.0.1:${server.address().port}`, key, site, state,
    /** Tech staff save a newer version of a group and send it again. */
    newVersion(groupId) {
      const g = state.groups.find((x) => x.groupId === groupId)
      g.versions = g.versions.map((v) => ({ ...v, versionId: v.versionId.replace(/_(\d+)$/, (_, n) => `_${Number(n) + 1}`), title: `${v.title} (diperbarui)` }))
      g.title = g.versions[0].title
      g.status = 'PENDING'
      g.sentAt = new Date().toISOString()
    },
    close: () => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }),
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback }
  const fake = await createFakeTech({ port: Number(arg('port', 8799)), mode: arg('mode', 'active') })
  console.log(`Fake Tech Partner API at ${fake.url} (site "${fake.site}", key "${fake.key}", mode ${fake.state.mode})`)
}
