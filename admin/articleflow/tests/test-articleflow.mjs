/**
 * ArticleFlow, end to end on the real Worker handlers (disposable SQLite, in-memory buckets) against the fake Tech
 * Partner API (../dev/fake-tech.mjs). Run from the repo root:  node admin/articleflow/tests/test-articleflow.mjs
 */
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { makeEnv, setupCache, client, handlePublic, root, article, worker } from '../../../scripts/test-support/cms-harness.mjs'
import { createFakeTech } from '../dev/fake-tech.mjs'

let passed = 0
async function test(name, run) { await run(); console.log(`PASS ${++passed}: ${name}`) }

const fake = await createFakeTech()
const control = (patch) => Object.assign(fake.state, patch)

async function setup({ connect = true } = {}) {
  setupCache()
  const env = await makeEnv()
  if (connect) Object.assign(env, { TECH_API_URL: fake.url, TECH_SITE_ID: fake.site, TECH_PARTNER_KEY: fake.key })
  const c = client(env)
  assert.equal((await c.login()).status, 200)
  const api = async (method, path, body, status = 200) => {
    const r = await c.request(method, path, body)
    assert.equal(r.status, status, `${method} ${path}: ${JSON.stringify(r.data)}`)
    return r.data
  }
  // the website's own topics (Pengaturan topik): the only ones an ArticleFlow article may be filed under
  await api('POST', '/api/topics', TOPIC, 201)
  await api('POST', '/api/topics', OTHER_TOPIC, 201)
  return { env, c, api }
}

const TOPIC = { en: 'Insight', id: 'Wawasan' }
const OTHER_TOPIC = { en: 'Project', id: 'Proyek' }
/** Publish from the preview, with the topic picked there (`body` null: the row's Publish, which sends no topic). */
const pub = (api, groupId, status = 200, body = { tag: TOPIC }) => api('POST', `/api/articleflow/items/${groupId}/publish`, body ?? undefined, status)
/** Every ArticleFlow row and article here, straight from the database. */
const rowOf = (env, groupId) => env.CONTENT_DB.db.prepare(`SELECT * FROM articleflow_items WHERE group_id = ?`).get(groupId) ?? null
const articleRows = (env) => env.CONTENT_DB.db.prepare(`SELECT id, slug, state, json_extract(draft, '$.tag') AS tag FROM articles ORDER BY id`).all()
const openJobs = (env) => env.CONTENT_DB.db.prepare(`SELECT kind, group_id FROM articleflow_outbox WHERE done_at IS NULL`).all()
const itemOf = async (api, groupId) => (await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === groupId)

const png = await sharp({ create: { width: 64, height: 40, channels: 3, background: '#b9a48c' } }).png().toBuffer()
const webp = await sharp(png).webp().toBuffer()
/** Store one picture in Media the way the dashboard does after resizing it in the browser. */
async function upload(api, name) {
  const form = new FormData()
  form.append('meta', JSON.stringify({ filename: `${name}.png`, w: 64, h: 40, color: '#b9a48c', sizes: [64] }))
  form.append('w64', new Blob([webp], { type: 'image/webp' }), '64.webp')
  form.append('original', new Blob([png], { type: 'image/png' }), `${name}.png`)
  return (await api('POST', '/api/media', form, 201)).id
}
/** Preview one group: upload what is missing, then import. */
async function importGroup(api, groupId) {
  const detail = await api('GET', `/api/articleflow/items/${groupId}`)
  const needed = [...new Set(detail.versions.flatMap((v) => [v.hero?.assetId, ...v.blocks.filter((b) => b.type === 'image').map((b) => b.assetId)]).filter(Boolean))]
  const assets = { ...detail.local.assets }
  for (const id of needed) if (!assets[id]) assets[id] = await upload(api, id)
  return { detail, assets, result: await api('POST', `/api/articleflow/items/${groupId}/import`, { assets }) }
}
const publicContent = async (env) => (await handlePublic(new Request('http://site/api/public/content'), env, { waitUntil() {} })).json()
const reset = () => fetch(`${fake.url}/__control`, { method: 'POST', body: JSON.stringify({ reset: true, mode: 'active', down: false, refuse: null, changed: false, failLive: 0, emptyAnalytics: false, slow: 0 }) })

// the public site's own Worker, for the sitemap
const siteWorker = await (async () => {
  const out = await build({ stdin: { resolveDir: root, contents: `export { default } from './worker/public.ts'`, loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false })
  const file = join(await mkdtemp(join(tmpdir(), 'kadang-af-site-')), 'site.mjs')
  await writeFile(file, out.outputFiles[0].contents)
  return (await import(pathToFileURL(file).href)).default
})()
const sitemap = async (env) => (await siteWorker.fetch(new Request('https://kadanglabo.com/sitemap.xml'), env, { waitUntil() {} })).text()

await test('not connected: a clean "belum terhubung" state and nothing is called', async () => {
  const { api } = await setup({ connect: false })
  const before = fake.state.calls.length
  const s = await api('GET', '/api/articleflow/status')
  assert.deepEqual([s.configured, s.trouble, s.locked, s.status], [false, 'not_configured', true, null])
  const o = await api('GET', '/api/articleflow/overview')
  assert.deepEqual([o.items, o.analytics], [[], null])
  assert.equal(fake.state.calls.length, before)
})

await test('status: active, expiring, expired and no subscription', async () => {
  const { api } = await setup()
  for (const [mode, state, locked] of [['active', 'ACTIVE', false], ['expiring', 'EXPIRING', false], ['expired', 'EXPIRED', true], ['none', 'NONE', true]]) {
    control({ mode })
    const s = await api('GET', '/api/articleflow/status?fresh=1')
    assert.equal(s.status.subscription.state, state)
    assert.equal(s.locked, locked)
    assert.equal(s.trouble, null)
    assert.equal(s.status.counts === null, locked)
  }
  control({ mode: 'expiring' })
  assert.equal((await api('GET', '/api/articleflow/status?fresh=1')).status.subscription.daysLeft, 5)
  await reset()
})

await test('the sidebar status is cached for a short while; the page always reads fresh', async () => {
  const { api } = await setup()
  await api('GET', '/api/articleflow/status')
  const calls = fake.state.calls.length
  await api('GET', '/api/articleflow/status')
  await api('GET', '/api/articleflow/status')
  assert.equal(fake.state.calls.length, calls)
  await api('GET', '/api/articleflow/status?fresh=1')
  assert.equal(fake.state.calls.length, calls + 1)
})

await test('overview: numbers and the list, folded with the local state; empty analytics stays clean', async () => {
  const { api, c } = await setup()
  const o = await api('GET', '/api/articleflow/overview')
  assert.equal(o.analytics.totals.clicks, 1284)
  assert.equal(o.analytics.daily.length, 28)
  assert.deepEqual(o.items.map((i) => i.view), ['waiting', 'waiting', 'waiting', 'approved', 'changes'])
  assert.ok(o.items.every((i) => i.local.state === 'none' && i.local.articleId === null))
  assert.equal(o.items[2].locales.length, 1)
  // not previewed yet: the list shows Tech's banner through this Worker, and it really is a picture
  const first = o.items[0]
  assert.equal(first.heroUrl, `/api/articleflow/items/${first.groupId}/media/asset_1_hero`)
  const pic = await c.request('GET', first.heroUrl)
  assert.equal(pic.status, 200)
  control({ emptyAnalytics: true })
  const e = await api('GET', '/api/articleflow/overview')
  assert.deepEqual([e.analytics.connected, e.analytics.daily, e.analytics.ai], [false, [], null])
  assert.equal(e.items.length, 5)
  await reset()
})

await test('preview: images are asked for, the article arrives as a draft, and the Artikel menu does not see it', async () => {
  const { api, env } = await setup()
  const detail = await api('GET', '/api/articleflow/items/grp_1')
  assert.equal(detail.versions.length, 2)
  assert.deepEqual(detail.local.assets, {})
  const missing = await api('POST', '/api/articleflow/items/grp_1/import', { assets: {} }, 400)
  assert.equal(missing.error, 'assets_missing')
  assert.deepEqual(missing.missing.sort(), ['asset_1_body', 'asset_1_hero'])
  // a media id that does not exist is not accepted either
  assert.equal((await api('POST', '/api/articleflow/items/grp_1/import', { assets: { asset_1_hero: 'no-such-image', asset_1_body: 'no-such-image' } }, 400)).error, 'assets_missing')

  const image = await (await client(env).request('GET', '/api/articleflow/items/grp_1/media/asset_1_hero')).res
  assert.equal(image.status, 401) // signed in only
  const { result, assets } = await importGroup(api, 'grp_1')
  assert.match(result.previewUrl, /\/articles\/cafe-interior-design-cost\?preview=[\w-]{20,}$/)
  assert.deepEqual(result.issues, [])
  assert.equal(result.singleLang, null)
  assert.equal(result.local.state, 'imported')

  const token = new URL(result.previewUrl).searchParams.get('preview')
  const preview = await (await handlePublic(new Request(`http://site/api/public/preview/${token}`), env, { waitUntil() {} })).json()
  assert.equal(preview.kind, 'article')
  assert.equal(preview.content.title.en, 'Cafe Interior Design Cost: A Breakdown per Square Metre')
  assert.equal(preview.content.title.id, 'Biaya Desain Interior Kafe: Rincian per Meter')
  assert.equal(preview.content.cover, assets.asset_1_hero)
  assert.ok(preview.media[assets.asset_1_hero])
  const types = preview.content.body.en.content.map((b) => b.type)
  for (const t of ['paragraph', 'heading', 'bulletList', 'orderedList', 'articleCard', 'image', 'blockquote', 'horizontalRule']) assert.ok(types.includes(t), `body has ${t}`)
  assert.ok(!JSON.stringify(preview.content.body.en).includes('hologram')) // an unknown block type is left out
  const cards = preview.content.body.id.content.filter((b) => b.type === 'articleCard').map((b) => b.attrs.data.kind)
  assert.deepEqual(cards, ['table', 'callout', 'cta'])
  const link = preview.content.body.en.content.flatMap((b) => b.content ?? []).find((n) => n.marks?.some((m) => m.type === 'link'))
  assert.equal(link.marks.find((m) => m.type === 'link').attrs.href, '/work/hospitality')
  // AEO fields: the direct answer opens the text in both languages (once), the excerpt is Tech's excerpt
  assert.equal(preview.content.body.en.content[0].content[0].text, 'Short answer: cost depends on floor area, materials and complexity.')
  assert.equal(preview.content.body.id.content[0].content[0].text, 'Jawaban singkat: biaya bergantung pada luas, material, dan tingkat kerumitan.')
  assert.equal(preview.content.body.en.content.filter((b) => b.content?.[0]?.text?.startsWith('Short answer')).length, 1)
  assert.equal(preview.content.excerpt.en, 'A breakdown you can use to plan a budget and a schedule.')
  assert.equal(preview.content.coverCaption.id, 'Contoh ruang yang sudah selesai.')
  // Tech's SEO cluster is not a topic here: the draft has none until the client picks one, and the preview still opens
  assert.deepEqual([preview.content.tag, result.local.tag], [{ en: '', id: '' }, null])
  assert.ok(!(await api('GET', '/api/topics')).topics.some((t) => /cluster|klaster/i.test(`${t.en} ${t.id}`)))

  assert.deepEqual((await api('GET', '/api/articles')).items, [])
  assert.deepEqual((await publicContent(env)).articles, [])
  // looking again needs no new upload
  const again = await api('GET', '/api/articleflow/items/grp_1')
  assert.deepEqual(again.local.assets, assets)
  await api('POST', '/api/articleflow/items/grp_1/import', {})
})

await test('publish: Tech first, then the website, the sitemap, and the live address back to Tech', async () => {
  const { api, env } = await setup()
  assert.equal((await pub(api, 'grp_1', 409)).error, 'not_imported')
  await importGroup(api, 'grp_1')
  const done = await pub(api, 'grp_1')
  assert.equal(done.state, 'published')
  assert.equal(done.slug, 'cafe-interior-design-cost')
  assert.match(done.url, /\/articles\/cafe-interior-design-cost$/)

  const site = await publicContent(env)
  assert.equal(site.articles.length, 1)
  assert.equal(site.articles[0].slug, 'cafe-interior-design-cost')
  assert.equal(site.articles[0].title.id, 'Biaya Desain Interior Kafe: Rincian per Meter')
  assert.match(site.articles[0].date, /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(site.media[site.articles[0].cover])
  assert.ok((await sitemap(env)).includes('<loc>https://kadanglabo.com/articles/cafe-interior-design-cost</loc>'))

  const list = (await api('GET', '/api/articles')).items
  assert.deepEqual([list.length, list[0].state, list[0].id], [1, 'published', done.articleId])
  assert.equal(fake.state.groups[0].status, 'PUBLISHED')
  assert.deepEqual(fake.state.live.at(-1), { groupId: 'grp_1', urls: { en: `${env.PUBLIC_SITE_URL}/articles/cafe-interior-design-cost`, id: `${env.PUBLIC_SITE_URL}/articles/cafe-interior-design-cost?lang=id` } })

  const o = await api('GET', '/api/articleflow/overview')
  const item = o.items.find((i) => i.groupId === 'grp_1')
  assert.deepEqual([item.view, item.local.state, item.local.articleId, item.local.slug, item.local.newVersion], ['published', 'published', done.articleId, 'cafe-interior-design-cost', false])
  assert.equal(o.pendingJobs, 0)

  // a second click changes nothing anywhere
  const twice = await pub(api, 'grp_1')
  assert.deepEqual([twice.state, twice.articleId], ['published', done.articleId])
  assert.equal(fake.state.groups[0].publishCount, 1)
  assert.equal((await api('GET', '/api/articles')).items.length, 1)
  await reset()
})

await test('two publishes at the same moment make one article and one publication', async () => {
  const { api, c, env } = await setup()
  await importGroup(api, 'grp_2')
  control({ slow: 60 })
  const results = await Promise.all([c.request('POST', '/api/articleflow/items/grp_2/publish', { tag: TOPIC }), c.request('POST', '/api/articleflow/items/grp_2/publish', { tag: TOPIC })])
  control({ slow: 0 })
  const codes = results.map((r) => r.status).sort()
  assert.ok(codes[0] === 200 && [200, 202, 409].includes(codes[1]), `statuses ${codes}`)
  assert.equal(fake.state.groups[1].publishCount, 1)
  assert.equal((await api('GET', '/api/articles')).items.length, 1)
  assert.equal((await publicContent(env)).articles.length, 1)
  await reset()
})

await test('an address already taken gets a suffix; one language fills both and says so', async () => {
  const { api, env } = await setup()
  await api('POST', '/api/articles', { content: { ...article('villa-contractor-bali'), cover: await upload(api, 'existing') } }, 201)
  const { result } = await importGroup(api, 'grp_3')
  assert.equal(result.singleLang, 'id')
  assert.match(result.previewUrl, /\/articles\/villa-contractor-bali-2\?preview=/)
  const done = await pub(api, 'grp_3')
  assert.equal(done.slug, 'villa-contractor-bali-2')
  const live = (await publicContent(env)).articles.find((a) => a.slug === 'villa-contractor-bali-2')
  assert.equal(live.title.en, 'Panduan Memilih Kontraktor Villa di Bali')
  assert.equal(live.title.en, live.title.id)
  assert.deepEqual(fake.state.live.at(-1).urls, { id: `${env.PUBLIC_SITE_URL}/articles/villa-contractor-bali-2?lang=id` })
  assert.equal((await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_3').local.singleLang, 'id')
  await reset()
})

await test('Tech refuses or the version changed: nothing goes live, the reason is shown, and a retry works', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_4')
  control({ refuse: ['HERO_REQUIRED'] })
  const refused = await pub(api, 'grp_4', 409)
  assert.equal(refused.error, 'publish_refused')
  assert.deepEqual(refused.reasons, ['HERO_REQUIRED'])
  assert.match(refused.message, /foto banner belum ada/)
  control({ changed: true })
  const changed = await pub(api, 'grp_4', 409)
  assert.equal(changed.error, 'changed')
  assert.deepEqual((await publicContent(env)).articles, [])
  assert.deepEqual((await api('GET', '/api/articles')).items, [])
  assert.equal((await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_4').local.state, 'imported')

  // Tech staff saved a newer version after the preview: the stale draft is refused, a fresh preview publishes
  fake.newVersion('grp_4')
  assert.equal((await pub(api, 'grp_4', 409)).error, 'changed')
  await importGroup(api, 'grp_4')
  assert.equal((await pub(api, 'grp_4')).state, 'published')
  assert.equal((await publicContent(env)).articles[0].title.en, 'Flooring Materials for Commercial Spaces (diperbarui)')
  await reset()
})

await test('the live report fails once: the article is live anyway and the report is retried', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  control({ failLive: 1 })
  assert.equal((await pub(api, 'grp_1')).state, 'published')
  assert.equal((await publicContent(env)).articles.length, 1)
  assert.equal(fake.state.live.length, 0)
  assert.equal((await api('GET', '/api/articleflow/status?fresh=1')).pendingJobs, 1)
  assert.equal((await api('POST', '/api/articleflow/retry')).pendingJobs, 0)
  assert.equal(fake.state.live.length, 1)
  await reset()
})

await test('Tech published but the website step failed: "sedang diselesaikan", then finished by the retry, never twice', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_2')
  env.CONTENT_DB.failOnSql = `published = draft` // the normal publish statement fails once
  const half = await pub(api, 'grp_2', 202)
  assert.equal(half.state, 'finishing')
  assert.equal(fake.state.groups[1].status, 'PUBLISHED')
  assert.deepEqual((await publicContent(env)).articles, [])
  const o = await api('GET', '/api/articleflow/overview')
  assert.equal(o.items.find((i) => i.groupId === 'grp_2').view, 'finishing')
  assert.ok(o.pendingJobs >= 1)
  // while it is being finished nothing else may start on it
  assert.equal((await api('POST', '/api/articleflow/items/grp_2/import', {}, 409)).error, 'busy')
  assert.equal((await pub(api, 'grp_2', 202)).state, 'finishing')

  env.CONTENT_DB.failOnSql = null
  assert.equal((await api('POST', '/api/articleflow/retry')).pendingJobs, 0)
  assert.equal((await publicContent(env)).articles.length, 1)
  assert.equal((await api('GET', '/api/articles')).items.length, 1) // the half-made draft was reused, not duplicated
  assert.equal(fake.state.groups[1].publishCount, 1)
  assert.equal((await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_2').view, 'published')
  assert.equal(fake.state.live.at(-1).groupId, 'grp_2')
  await reset()
})

await test('a newer version of a live article: "Versi baru tersedia", and publishing updates the same article', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  const first = await pub(api, 'grp_1')
  fake.newVersion('grp_1')
  const before = (await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_1')
  assert.deepEqual([before.view, before.local.newVersion, before.local.state], ['waiting', true, 'published'])
  assert.equal((await publicContent(env)).articles[0].title.en, 'Cafe Interior Design Cost: A Breakdown per Square Metre') // still the old one
  const { result } = await importGroup(api, 'grp_1')
  assert.match(result.previewUrl, /\/articles\/cafe-interior-design-cost\?preview=/)
  const second = await pub(api, 'grp_1')
  assert.deepEqual([second.articleId, second.slug], [first.articleId, first.slug])
  const site = await publicContent(env)
  assert.equal(site.articles.length, 1)
  assert.equal(site.articles[0].title.en, 'Cafe Interior Design Cost: A Breakdown per Square Metre (diperbarui)')
  assert.equal((await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_1').local.newVersion, false)
  await reset()
})

await test('Minta revisi: a reason is required and reaches Tech once', async () => {
  const { api } = await setup()
  const item = (await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_2')
  const versions = Object.fromEntries(item.locales.map((l) => [l.articleId, l.versionId]))
  assert.equal((await api('POST', '/api/articleflow/items/grp_2/decision', { comment: '   ', versions, idempotencyKey: 'key-00000001' }, 400)).error, 'invalid')
  assert.equal((await api('POST', '/api/articleflow/items/grp_2/decision', { comment: 'x'.repeat(2001), versions, idempotencyKey: 'key-00000001' }, 400)).error, 'invalid')
  const body = { comment: 'Tolong pakai contoh projek Kadanglabo.', versions, idempotencyKey: 'key-00000002' }
  const r = await api('POST', '/api/articleflow/items/grp_2/decision', body)
  assert.equal(r.item.view, 'changes')
  assert.equal(r.item.decision.comment, 'Tolong pakai contoh projek Kadanglabo.')
  await api('POST', '/api/articleflow/items/grp_2/decision', body) // the same click again
  assert.equal(fake.state.groups[1].history.length, 1)
  assert.equal(fake.state.groups[1].decision.by, 'Custompedia')
  // a version Tech has replaced meanwhile
  assert.equal((await api('POST', '/api/articleflow/items/grp_3/decision', { comment: 'Revisi', versions: { art_3_id: 'ver_old' }, idempotencyKey: 'key-00000003' }, 409)).error, 'changed')
  await reset()
})

await test('taking an ArticleFlow article down in the Artikel menu is reported to Tech; putting it back too', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  const { articleId } = await pub(api, 'grp_1')
  // an ordinary article is none of Tech's business
  const { id: own } = await api('POST', '/api/articles', { content: { ...article('own-article'), cover: await upload(api, 'own') } }, 201)
  await api('POST', `/api/articles/${own}/publish`)
  await api('POST', `/api/articles/${own}/takedown`)
  assert.deepEqual(fake.state.takenDown, [])

  await api('POST', `/api/articles/${articleId}/takedown`)
  assert.deepEqual(fake.state.takenDown, ['grp_1'])
  assert.equal((await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_1').view, 'taken_down')
  assert.deepEqual((await publicContent(env)).articles, [])
  await api('POST', `/api/articles/${articleId}/publish`)
  assert.equal(fake.state.live.length, 2)
  assert.equal((await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_1').view, 'published')
  await api('POST', `/api/articles/${articleId}/trash`)
  assert.deepEqual(fake.state.takenDown, ['grp_1', 'grp_1'])
  await api('DELETE', `/api/articles/${articleId}`)
  const gone = (await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_1')
  assert.deepEqual([gone.local.articleId, gone.local.slug], [null, null])
  await reset()
})

await test('subscription over: everything locks, also in the middle of a session; live articles stay', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  await pub(api, 'grp_1')
  await importGroup(api, 'grp_2')
  assert.equal((await api('GET', '/api/articleflow/status?fresh=1')).locked, false)
  control({ mode: 'expired' })
  // the sidebar still holds the "active" answer; the first refused call flips it
  assert.equal((await api('GET', '/api/articleflow/status')).locked, false)
  assert.equal((await api('GET', '/api/articleflow/items/grp_2', undefined, 402)).error, 'subscription_expired')
  const s = await api('GET', '/api/articleflow/status')
  assert.deepEqual([s.locked, s.status.subscription.state], [true, 'EXPIRED'])
  assert.equal((await pub(api, 'grp_2', 402)).error, 'subscription_expired')
  assert.equal((await api('POST', '/api/articleflow/items/grp_2/import', {}, 402)).error, 'subscription_expired')
  const o = await api('GET', '/api/articleflow/overview')
  assert.deepEqual([o.locked, o.items, o.analytics, o.status.subscription.state], [true, [], null, 'EXPIRED'])
  assert.equal((await publicContent(env)).articles.length, 1) // what is live stays live
  assert.equal((await api('GET', '/api/articles')).items.length, 1)
  // renewed in Tech: open again
  control({ mode: 'active' })
  assert.equal((await api('GET', '/api/articleflow/overview')).items.length, 5)
  assert.equal((await pub(api, 'grp_2')).state, 'published')
  await reset()
})

await test('Tech cannot be reached: the last good answer with a notice, publish refused, nothing breaks', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  const good = await api('GET', '/api/articleflow/overview')
  control({ down: true })
  const o = await api('GET', '/api/articleflow/overview')
  assert.deepEqual([o.stale, o.trouble, o.locked], [true, 'unreachable', false])
  assert.equal(o.items.length, good.items.length)
  assert.equal(o.analytics.totals.clicks, 1284)
  assert.ok(o.fetchedAt)
  assert.equal((await pub(api, 'grp_1', 503)).error, 'unavailable')
  assert.deepEqual((await publicContent(env)).articles, [])
  assert.equal((await api('GET', '/api/articleflow/items/grp_1', undefined, 503)).error, 'unavailable')
  control({ down: false })
  // no answer at all keeps the idempotency key, so the retry cannot publish twice
  assert.equal((await pub(api, 'grp_1')).state, 'published')
  assert.equal(fake.state.groups[0].publishCount, 1)

  // a server nobody answers on, and a key Tech refuses
  env.TECH_API_URL = 'http://127.0.0.1:9'
  const dead = await api('GET', '/api/articleflow/overview')
  assert.deepEqual([dead.stale, dead.trouble], [true, 'unreachable'])
  env.TECH_API_URL = fake.url
  env.TECH_PARTNER_KEY = 'wrong-key'
  const denied = await api('GET', '/api/articleflow/overview')
  assert.deepEqual([denied.trouble, denied.locked, denied.items, denied.status], ['unauthorized', true, [], null])
  await reset()
})

await test('topic: the website picks it, required before Publish, checked against its topics, kept across versions', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  assert.equal((await itemOf(api, 'grp_1')).local.tag, null) // the row's Publish opens the preview for this
  // no topic yet: refused here in plain words, Tech is never asked
  const none = await pub(api, 'grp_1', 400, null)
  assert.deepEqual([none.error, none.issues], ['incomplete', ['Topik belum dipilih']])
  assert.match(none.message, /Topik belum dipilih/)
  // Tech's cluster name, or anything else that is not one of the website's topics, is refused
  assert.equal((await pub(api, 'grp_1', 400, { tag: { en: 'Interior cost cluster', id: 'Klaster biaya interior' } })).error, 'topic')
  assert.equal(fake.state.groups[0].publishCount, undefined)
  assert.deepEqual(articleRows(env), [])
  // picked in the preview (the list spells it): stored, and live with the article
  const first = await pub(api, 'grp_1', 200, { tag: { en: 'insight', id: 'wawasan' } })
  assert.deepEqual((await publicContent(env)).articles[0].tag, TOPIC)
  assert.deepEqual((await itemOf(api, 'grp_1')).local.tag, TOPIC)
  // a newer version keeps it without asking again (the row's Publish sends no topic)
  fake.newVersion('grp_1')
  assert.deepEqual((await importGroup(api, 'grp_1')).result.local.tag, TOPIC)
  assert.equal((await pub(api, 'grp_1', 200, null)).articleId, first.articleId)
  assert.deepEqual((await publicContent(env)).articles[0].tag, TOPIC)
  // changed in the Artikel menu: the article's own topic wins over the one picked earlier
  const live = await api('GET', `/api/articles/${first.articleId}`)
  await api('PUT', `/api/articles/${first.articleId}`, { content: { ...live.draft, tag: OTHER_TOPIC } })
  await api('POST', `/api/articles/${first.articleId}/publish`)
  fake.newVersion('grp_1')
  assert.deepEqual((await importGroup(api, 'grp_1')).result.local.tag, OTHER_TOPIC)
  await pub(api, 'grp_1', 200, null)
  assert.deepEqual((await publicContent(env)).articles[0].tag, OTHER_TOPIC)
  // a topic picked, then Tech refuses: the pick stays for the next try
  await importGroup(api, 'grp_4')
  control({ refuse: ['CHECKS_FAILED'] })
  await pub(api, 'grp_4', 409, { tag: OTHER_TOPIC })
  assert.deepEqual((await itemOf(api, 'grp_4')).local.tag, OTHER_TOPIC)
  assert.equal((await pub(api, 'grp_4', 200, null)).state, 'published')
  assert.equal(articleRows(env).length, 2)
  await reset()
})

await test('deleted in Tech (every language): the article leaves the website for good, the row goes, repeating does nothing', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  const { articleId } = await pub(api, 'grp_1')
  await importGroup(api, 'grp_2') // previewed only, never published
  // missing from the list is not deleted: only what Tech names under `removed`
  const kept = fake.state.groups.splice(1, 1)
  await api('GET', '/api/articleflow/overview')
  assert.ok(rowOf(env, 'grp_2'))
  fake.state.groups.splice(1, 0, ...kept)

  const reports = [fake.state.live.length, fake.state.takenDown.length]
  fake.deleteGroup('grp_1')
  fake.deleteGroup('grp_2')
  fake.state.removed.push({ groupId: 'grp_never_here', at: new Date().toISOString() }, { groupId: '../bad id', at: '' })
  const o = await api('GET', '/api/articleflow/overview')
  assert.deepEqual(o.items.map((i) => i.groupId), ['grp_3', 'grp_4', 'grp_5'])
  assert.deepEqual([rowOf(env, 'grp_1'), rowOf(env, 'grp_2'), rowOf(env, 'grp_never_here')], [null, null, null])
  assert.deepEqual(articleRows(env), [])
  assert.equal((await api('GET', `/api/articles/${articleId}`, undefined, 404)).error, 'not_found')
  assert.deepEqual((await publicContent(env)).articles, [])
  assert.ok(!(await sitemap(env)).includes('cafe-interior-design-cost'))
  assert.deepEqual([fake.state.live.length, fake.state.takenDown.length], reports) // Tech's own news: nothing reported back
  assert.deepEqual([o.pendingJobs, openJobs(env)], [0, []])
  // the same `removed` again on every read: nothing left to do, nothing queued
  await api('GET', '/api/articleflow/overview')
  await api('GET', '/api/articleflow/overview')
  assert.equal(env.CONTENT_DB.db.prepare(`SELECT COUNT(*) AS n FROM articleflow_outbox WHERE kind = 'remove'`).get().n, 2)
  await reset()
})

await test('deleted in Tech: a removal cut short finishes later; an article already in Trash or deleted here is handled too', async () => {
  const { api, env } = await setup()
  for (const g of ['grp_1', 'grp_2', 'grp_4']) await importGroup(api, g), await pub(api, g)
  const [a1, a2] = articleRows(env).map((a) => a.id)
  await api('POST', `/api/articles/${a1}/trash`) // in Trash here
  await api('POST', `/api/articles/${a2}/trash`)
  await api('DELETE', `/api/articles/${a2}`) // deleted here already: only the row is left
  env.CONTENT_DB.failOnSql = 'DELETE FROM articleflow_items' // the last step fails once
  for (const g of ['grp_1', 'grp_2', 'grp_4']) fake.deleteGroup(g)
  await api('GET', '/api/articleflow/overview')
  assert.ok(rowOf(env, 'grp_1') && rowOf(env, 'grp_4'))
  assert.equal(openJobs(env).filter((j) => j.kind === 'remove').length, 3)
  env.CONTENT_DB.failOnSql = null
  assert.equal((await api('POST', '/api/articleflow/retry')).pendingJobs, 0)
  assert.deepEqual([rowOf(env, 'grp_1'), rowOf(env, 'grp_2'), rowOf(env, 'grp_4')], [null, null, null])
  assert.deepEqual(articleRows(env), [])
  assert.deepEqual((await publicContent(env)).articles, [])
  await reset()
})

await test('one language deleted in Tech: flagged for a new preview, published again as one language into the same article', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  const first = await pub(api, 'grp_1')
  fake.deleteLocale('grp_1', 'en')
  const item = await itemOf(api, 'grp_1')
  assert.deepEqual([item.locales.length, item.local.newVersion, item.view], [1, true, 'approved'])
  assert.ok(rowOf(env, 'grp_1').article_id) // nothing was deleted: the group is still in the list
  const { result } = await importGroup(api, 'grp_1')
  assert.equal(result.singleLang, 'id')
  assert.equal((await pub(api, 'grp_1', 200, null)).articleId, first.articleId)
  const site = (await publicContent(env)).articles
  assert.equal(site.length, 1)
  assert.deepEqual([site[0].title.en, site[0].title.id], ['Biaya Desain Interior Kafe: Rincian per Meter', 'Biaya Desain Interior Kafe: Rincian per Meter'])
  const after = await itemOf(api, 'grp_1')
  assert.deepEqual([after.view, after.local.newVersion, after.local.singleLang], ['published', false, 'id'])
  await reset()
})

await test('withdrawn by Tech: taken down here (kept in the Artikel menu), not reported; a newer version goes live in the same article', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  const first = await pub(api, 'grp_1')
  const [live, calls] = [fake.state.live.length, fake.state.calls.length]
  fake.withdraw('grp_1')
  const item = await itemOf(api, 'grp_1')
  assert.deepEqual([item.view, item.local.state, item.local.articleId], ['withdrawn', 'taken_down', first.articleId])
  assert.match(item.local.withdrawnAt, /^\d{4}-\d{2}-\d{2}T/)
  assert.deepEqual(articleRows(env).map((a) => [a.id, a.state]), [[first.articleId, 'taken_down']])
  assert.deepEqual((await publicContent(env)).articles, [])
  assert.deepEqual(fake.state.takenDown, [])
  assert.ok(!fake.state.calls.slice(calls).some((c) => c.endsWith('/taken-down')))
  // again: nothing more happens; Tech refuses revision and publish on it
  await api('GET', '/api/articleflow/overview')
  assert.deepEqual([fake.state.takenDown, openJobs(env)], [[], []])
  const versions = Object.fromEntries(item.locales.map((l) => [l.articleId, l.versionId]))
  assert.equal((await api('POST', '/api/articleflow/items/grp_1/decision', { comment: 'Revisi', versions, idempotencyKey: 'key-withdrawn1' }, 409)).error, 'changed')
  assert.equal((await pub(api, 'grp_1', 409)).error, 'changed')
  // put live again from the Artikel menu: Tech refuses the report (dropped, not retried) and the next read takes it down again
  await api('POST', `/api/articles/${first.articleId}/publish`)
  assert.equal(fake.state.live.length, live)
  assert.equal((await itemOf(api, 'grp_1')).view, 'withdrawn')
  assert.deepEqual([articleRows(env)[0].state, openJobs(env)], ['taken_down', []])

  // Tech sends a newer version: back in Menunggu as a new version, published into the same article
  fake.newVersion('grp_1')
  const back = await itemOf(api, 'grp_1')
  assert.deepEqual([back.view, back.local.newVersion, back.local.withdrawnAt === null], ['waiting', true, false])
  await importGroup(api, 'grp_1')
  assert.equal((await pub(api, 'grp_1', 200, null)).articleId, first.articleId)
  assert.equal(articleRows(env).length, 1)
  assert.equal((await publicContent(env)).articles[0].title.en, 'Cafe Interior Design Cost: A Breakdown per Square Metre (diperbarui)')
  const done = await itemOf(api, 'grp_1')
  assert.deepEqual([done.view, done.local.withdrawnAt, done.local.newVersion], ['published', null, false])
  await reset()
})

await test('Minta revisi: the article moves to the revision tab, and comes back in Menunggu flagged as a new version', async () => {
  const { api } = await setup()
  for (const [g, preview] of [['grp_2', true], ['grp_4', false]]) {
    if (preview) await importGroup(api, g)
    const item = await itemOf(api, g)
    const versions = Object.fromEntries(item.locales.map((l) => [l.articleId, l.versionId]))
    const r = await api('POST', `/api/articleflow/items/${g}/decision`, { comment: 'Pakai contoh projek Kadanglabo.', versions, idempotencyKey: `key-rev-${g}-1` })
    assert.equal(r.item.view, 'changes')
    assert.equal((await itemOf(api, g)).view, 'changes')
    fake.newVersion(g)
    const back = await itemOf(api, g)
    assert.deepEqual([back.view, back.local.newVersion], ['waiting', true], g)
  }
  // a published article takes no revision (Tech refuses; the page does not offer it)
  await importGroup(api, 'grp_1')
  const published = await pub(api, 'grp_1')
  assert.equal(published.state, 'published')
  const item = await itemOf(api, 'grp_1')
  const versions = Object.fromEntries(item.locales.map((l) => [l.articleId, l.versionId]))
  assert.equal((await api('POST', '/api/articleflow/items/grp_1/decision', { comment: 'Revisi', versions, idempotencyKey: 'key-rev-pub-1' }, 409)).error, 'changed')
  await reset()
})

await test('never a second article for one Tech article: Trash, restore, delete here, take down, re-import, a finish run twice', async () => {
  const { api, env } = await setup()
  const count = () => articleRows(env).length
  await importGroup(api, 'grp_1')
  await importGroup(api, 'grp_1') // looking twice makes nothing
  assert.equal(count(), 0)
  const { articleId } = await pub(api, 'grp_1')
  // taken down in the Artikel menu, then a newer version
  await api('POST', `/api/articles/${articleId}/takedown`)
  fake.newVersion('grp_1')
  await importGroup(api, 'grp_1')
  assert.equal((await pub(api, 'grp_1', 200, null)).articleId, articleId)
  // in Trash, then a newer version: brought back from Trash, the same article
  await api('POST', `/api/articles/${articleId}/trash`)
  fake.newVersion('grp_1')
  await importGroup(api, 'grp_1')
  assert.equal((await pub(api, 'grp_1', 200, null)).articleId, articleId)
  // Trash and restore by hand, then a newer version
  await api('POST', `/api/articles/${articleId}/trash`)
  await api('POST', `/api/articles/${articleId}/restore`)
  fake.newVersion('grp_1')
  await importGroup(api, 'grp_1')
  assert.equal((await pub(api, 'grp_1', 200, null)).articleId, articleId)
  assert.equal(count(), 1)
  // deleted for good in the Artikel menu: the next publish makes the one article again, and links it
  await api('POST', `/api/articles/${articleId}/trash`)
  await api('DELETE', `/api/articles/${articleId}`)
  fake.newVersion('grp_1')
  await importGroup(api, 'grp_1')
  const again = await pub(api, 'grp_1', 200, null)
  assert.notEqual(again.articleId, articleId)
  assert.deepEqual([count(), rowOf(env, 'grp_1').article_id], [1, again.articleId])

  // two finishing runs side by side (the publish request and a drain of its follow-up): the second one's article is
  // linked first here, so the publish request's own new draft must be removed again instead of becoming a double
  await importGroup(api, 'grp_2')
  const { id: rival } = await api('POST', '/api/articles', { content: { ...article('rival-draft'), cover: await upload(api, 'rival') } }, 201)
  const prepare = env.CONTENT_DB.prepare.bind(env.CONTENT_DB)
  let raced = false
  env.CONTENT_DB.prepare = (sql) => {
    if (!raced && sql.startsWith('UPDATE articleflow_items SET article_id = ?')) {
      raced = true
      env.CONTENT_DB.db.prepare(`UPDATE articleflow_items SET article_id = ? WHERE group_id = 'grp_2'`).run(rival)
    }
    return prepare(sql)
  }
  const done = await pub(api, 'grp_2')
  env.CONTENT_DB.prepare = prepare
  assert.ok(raced)
  assert.equal(done.articleId, rival)
  assert.deepEqual(articleRows(env).map((a) => a.id), [again.articleId, rival])
  assert.equal(articleRows(env)[1].state, 'published')
  assert.equal((await publicContent(env)).articles.length, 2)
  await reset()
})

await test('the cron reads the list from Tech itself: deletes and withdrawals land without anyone opening the page', async () => {
  const { api, env } = await setup()
  for (const g of ['grp_1', 'grp_2']) await importGroup(api, g), await pub(api, g)
  const [a1, a2] = articleRows(env).map((a) => a.id)
  fake.deleteGroup('grp_1')
  fake.withdraw('grp_2')
  const calls = fake.state.calls.length
  const work = []
  await worker.scheduled({}, env, { waitUntil: (p) => work.push(p) })
  await Promise.all(work)
  assert.ok(fake.state.calls.slice(calls).includes('GET /v2/sites/kadanglabo/partner/articles'))
  assert.equal(rowOf(env, 'grp_1'), null)
  assert.deepEqual(articleRows(env).map((a) => [a.id, a.state]), [[a2, 'taken_down']])
  assert.notEqual(a1, a2)
  assert.ok(env.CONTENT_DB.db.prepare(`SELECT 1 FROM articleflow_withdrawn WHERE group_id = 'grp_2'`).get())
  assert.deepEqual([fake.state.takenDown, (await publicContent(env)).articles], [[], []])
  // not connected: the cron calls nobody
  const quiet = fake.state.calls.length
  delete env.TECH_PARTNER_KEY
  await worker.scheduled({}, env, { waitUntil: (p) => work.push(p) })
  await Promise.all(work)
  assert.equal(fake.state.calls.length, quiet)
  await reset()
})

await test('migration 0002 runs again safely: rows and follow-ups are kept', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  control({ failLive: 1 })
  await pub(api, 'grp_1')
  const before = env.CONTENT_DB.db.prepare(`SELECT * FROM articleflow_outbox ORDER BY id`).all()
  const sql = await readFile(resolve(root, 'admin/articleflow/migrations/0002_articleflow_sync.sql'), 'utf8')
  env.CONTENT_DB.db.exec(sql)
  env.CONTENT_DB.db.exec(sql)
  assert.deepEqual(env.CONTENT_DB.db.prepare(`SELECT * FROM articleflow_outbox ORDER BY id`).all(), before)
  assert.equal((await itemOf(api, 'grp_1')).view, 'published')
  assert.equal((await api('POST', '/api/articleflow/retry')).pendingJobs, 0)
  await reset()
})

await test('the migration has not run: the page is told so, the rest of the CMS works', async () => {
  const { api, env } = await setup()
  env.CONTENT_DB.db.exec(await readFile(resolve(root, 'admin/articleflow/migrations/9999_remove_articleflow.sql'), 'utf8'))
  assert.equal((await api('GET', '/api/articleflow/status', undefined, 503)).error, 'not_installed')
  const { id } = await api('POST', '/api/articles', { content: { ...article(), cover: await upload(api, 'plain') } }, 201)
  await api('POST', `/api/articles/${id}/publish`)
  await api('POST', `/api/articles/${id}/takedown`)
})

await test('take out: with the two connector files emptied the Worker builds and runs without ArticleFlow', async () => {
  // nothing outside admin/articleflow knows the folder, except the two connectors
  const walk = async (dir) => (await Promise.all((await readdir(dir, { withFileTypes: true })).map((e) => {
    const path = join(dir, e.name)
    return e.isDirectory() ? (['node_modules', 'dist', '.wrangler', 'articleflow'].includes(e.name) ? [] : walk(path)) : /\.(ts|tsx)$/.test(e.name) ? [path] : []
  }))).flat()
  const importers = []
  for (const file of await walk(resolve(root, 'admin'))) if (/from '[^']*articleflow/.test(await readFile(file, 'utf8'))) importers.push(file.replace(resolve(root, 'admin') + '/', ''))
  assert.deepEqual(importers.sort(), ['src/integrations.tsx', 'worker/integrations.ts'])

  const out = await build({
    stdin: { resolveDir: root, contents: `export { default as worker } from './admin/worker/index.ts'`, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', write: false,
    plugins: [{
      name: 'emptied-connector',
      setup(b) {
        b.onLoad({ filter: /admin\/worker\/integrations\.ts$/ }, () => ({ contents: `export const integrations = []`, loader: 'ts' }))
        b.onResolve({ filter: /articleflow/ }, () => ({ errors: [{ text: 'ArticleFlow is still imported' }] }))
      },
    }],
  })
  const file = join(await mkdtemp(join(tmpdir(), 'kadang-af-out-')), 'worker.mjs')
  await writeFile(file, out.outputFiles[0].contents)
  const { worker } = await import(pathToFileURL(file).href)
  setupCache()
  const env = await makeEnv()
  const call = async (method, path, body, cookie) => worker.fetch(new Request('http://localhost' + path, { method, headers: { 'x-requested-with': 'kadanglabo-admin', 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} })
  const login = await call('POST', '/api/auth/login', { username: 'custompedia', password: '12345' })
  const cookie = login.headers.get('set-cookie').split(';')[0]
  assert.equal((await call('GET', '/api/articles', undefined, cookie)).status, 200)
  assert.equal((await call('GET', '/api/articleflow/status', undefined, cookie)).status, 404)
  await worker.scheduled({}, env, { waitUntil() {} })
})

/* ---- EN and ID side by side, and the topic suggestion (pure functions) ------------------------------------------ */

const pure = await (async () => {
  const out = await build({
    stdin: { resolveDir: root, loader: 'ts', contents: `export { checkAlignment } from './admin/articleflow/worker/align.ts'\nexport { recommendTopic, articleWords } from './admin/articleflow/ui/recommend.ts'` },
    bundle: true, platform: 'node', format: 'esm', write: false,
  })
  const file = join(await mkdtemp(join(tmpdir(), 'kadang-af-pure-')), 'pure.mjs')
  await writeFile(file, out.outputFiles[0].contents)
  return import(pathToFileURL(file).href)
})()

const t = (text) => [{ type: 'text', text }]
const P = (text) => ({ type: 'paragraph', content: t(text) })
const H = (text, level = 2) => ({ type: 'heading', attrs: { level }, content: t(text) })
const L = (...items) => ({ type: 'bulletList', content: items.map((x) => ({ type: 'listItem', content: [P(x)] })) })
const doc = (...content) => ({ type: 'doc', content })

await test('alignment: a translation is aligned; other sections, other blocks, other order or much less text are not', () => {
  const { checkAlignment } = pure
  const en = doc(P('Short answer: cost depends on area.'), H('What drives the cost'), P('Area, materials and detailing.'), L('Layout', 'Lighting'), H('Order of work'), P('Survey, drawings, build.'))
  const id = doc(P('Jawaban singkat: biaya bergantung pada luas.'), H('Apa yang menentukan biaya'), P('Luas, material, dan detail.'), L('Tata letak', 'Pencahayaan'), H('Urutan pengerjaan'), P('Survei, gambar, bangun.'), { type: 'paragraph' })
  const ok = checkAlignment(en, id)
  assert.equal(ok.aligned, true) // the trailing empty paragraph is no content
  assert.match(ok.reason, /sejajar/)

  // the case seen in production: other sections in each language
  const four = doc(...['A', 'B', 'C', 'D'].flatMap((h) => [H(h), P(`Text about ${h}, long enough to read.`)]))
  const five = doc(...['V', 'W', 'X', 'Y', 'Z'].flatMap((h) => [H(h), P(`Teks tentang ${h}, cukup panjang.`)]))
  const bad = checkAlignment(four, five)
  assert.equal(bad.aligned, false)
  assert.match(bad.reason, /EN 4 bagian, ID 5 bagian/)
  assert.match(bad.reason, /EN 8 blok isi, ID 10 blok isi/)

  const swapped = checkAlignment(doc(H('A'), P('one two three'), L('x')), doc(H('A'), L('x'), P('satu dua tiga')))
  assert.equal(swapped.aligned, false)
  assert.match(swapped.reason, /urutan isi berbeda mulai blok ke-2 \(EN paragraf, ID daftar\)/)

  const long = 'Kalimat yang cukup panjang untuk mengisi satu paragraf penuh. '.repeat(10)
  const short = checkAlignment(doc(H('A'), P(long.slice(0, 200))), doc(H('A'), P(long)))
  assert.equal(short.aligned, false)
  assert.match(short.reason, /teks EN hanya \d+% dari panjang teks ID/)
  assert.equal(checkAlignment(doc(H('A'), P(long.slice(0, 500))), doc(H('A'), P(long))).aligned, true) // within 60%
  assert.equal(checkAlignment(doc(H('A', 3), P('x')), doc(H('A'), P('x'))).reason.includes('subjudul'), true)
})

const SITE_TOPICS = [{ en: 'Open Studio', id: 'Open Studio' }, { en: 'Project', id: 'Proyek' }, { en: 'Publication', id: 'Publikasi' }, { en: 'Studio', id: 'Studio' }, { en: 'Talk', id: 'Talk' }]
const words = (title, excerpt = '', body = '') => ({ title: [title], excerpt: [excerpt], body: [body] })

await test('topic suggestion: plain keyword scoring over the website topics, with the words that led to it', () => {
  const { recommendTopic } = pure
  const pick = (w, topics = SITE_TOPICS) => recommendTopic(w, topics)
  const project = pick(words('Desain Klinik Gigi di Sleman: Studi Kasus', 'Bagaimana proyek klinik ini dirancang.', 'Proyek ini dimulai dari survei. Klinik membutuhkan alur pasien yang jelas.'))
  assert.deepEqual(project.topic, { en: 'Project', id: 'Proyek' })
  assert.equal(project.fallback, false)
  assert.match(project.reason, /“klinik” \(judul\)/)
  assert.equal(pick(words('Bincang Desain: Seminar Arsitektur Tropis', '', 'Diskusi bersama arsitek muda.')).topic.en, 'Talk')
  // "open studio" is the event, not two words for Studio
  const open = pick(words('Open Studio Kadanglabo Bulan Ini', 'Konsultasi gratis dengan tim kami.', 'Datang ke open studio untuk konsultasi gratis.'))
  assert.equal(open.topic.en, 'Open Studio')
  assert.equal(pick(words('Di Balik Layar Studio Kadanglabo', '', 'Hari-hari tim di studio.')).topic.en, 'Studio')
  assert.equal(pick(words('Panduan Memilih Material Lantai', 'Langkah dan tips memilih.', 'Cara memilih material: apa itu vinyl?')).topic.en, 'Publication')
  // whole words only: "secara" is not "cara", "timur" is not "tim"
  const none = pick(words('Biaya per Meter Persegi', '', 'Dihitung secara rinci di Jawa Timur.'))
  assert.deepEqual([none.topic.en, none.fallback], ['Publication', true])
  assert.match(none.reason, /Tidak ada kata kunci/)
  // other topics: matched by their own names; no Publication and nothing found: no suggestion
  const own = [{ en: 'Hospitality', id: 'Hospitality' }, { en: 'Insight', id: 'Wawasan' }]
  assert.equal(pick(words('Desain Hotel Butik', '', 'Hospitality yang hangat.'), own).topic.en, 'Hospitality')
  assert.equal(pick(words('Biaya per meter persegi'), own), null)
  assert.equal(pick(words('anything'), []), null)
  // the same article always gives the same answer; ties go to the first topic in the list
  const w = words('Proyek talk', '', '')
  assert.deepEqual(pick(w), pick(w))
  assert.equal(pick(w).topic.en, 'Project')
  // a tie with the guide topic goes to the guide: "Panduan" in the title weighs as much as "villa"
  assert.equal(pick(words('Panduan Memilih Kontraktor Villa di Bali')).topic.en, 'Publication')
})

await test('topic suggestion reads both languages of a Tech article, without the call-to-action button', () => {
  const { recommendTopic, articleWords } = pure
  const v = (title, blocks) => ({ title, excerpt: '', metaDescription: '', directAnswer: '', blocks })
  const w = articleWords([
    v('Choosing floor tiles', [{ type: 'paragraph', runs: [{ text: 'A guide with ' }, { text: 'tips', bold: true }] }, { type: 'cta', label: 'Konsultasi gratis', href: '/contact' }]),
    v('Memilih ubin lantai', [{ type: 'list', ordered: false, items: [[{ text: 'Langkah pertama' }]] }, { type: 'cta', label: 'Konsultasi gratis', href: '/contact' }]),
  ])
  assert.equal(w.body.join(' ').includes('Konsultasi'), false)
  const r = recommendTopic(w, SITE_TOPICS)
  assert.equal(r.topic.en, 'Publication')
  assert.match(r.reason, /guide|tips|langkah/)
})

await test('overview and preview flag an article whose EN and ID from Tech are not the same article; publish still works', async () => {
  const { api } = await setup()
  // grp_2: Tech wrote the English separately, with a section the Indonesian does not have
  const g = fake.state.groups.find((x) => x.groupId === 'grp_2')
  const en = g.versions.find((v) => v.locale === 'en')
  en.blocks = [...en.blocks, { type: 'heading', level: 2, text: 'Budget checklist' }, { type: 'paragraph', runs: [{ text: 'Plan the reserve before the build starts.' }] }]
  let o = await api('GET', '/api/articleflow/overview')
  const of = (g) => o.items.find((i) => i.groupId === g)
  // before any preview: read from Tech's own versions
  assert.equal(of('grp_2').alignment.aligned, false)
  assert.match(of('grp_2').alignment.reason, /EN 2 bagian, ID 1 bagian/)
  assert.equal(of('grp_1').alignment.aligned, true)
  assert.equal(of('grp_3').alignment, null) // one language only: nothing to compare
  // the preview's draft says the same, and the list then reads it from the draft
  const { result } = await importGroup(api, 'grp_2')
  assert.equal(result.local.alignment.aligned, false)
  assert.equal((await importGroup(api, 'grp_3')).result.local.alignment, null)
  o = await api('GET', '/api/articleflow/overview')
  assert.equal(of('grp_2').local.alignment.aligned, false)
  assert.equal(of('grp_2').alignment.aligned, false)
  // only a warning: the client may still publish after confirming
  assert.equal((await pub(api, 'grp_2')).state, 'published')
  await reset()
})

await fake.close()
console.log(`\nArticleFlow: ${passed} tests passed`)
process.exit(0)
