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
import { makeEnv, setupCache, client, handlePublic, root, article } from '../../../scripts/test-support/cms-harness.mjs'
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
  return { env, c, api }
}

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
  const { api } = await setup()
  const o = await api('GET', '/api/articleflow/overview')
  assert.equal(o.analytics.totals.clicks, 1284)
  assert.equal(o.analytics.daily.length, 28)
  assert.deepEqual(o.items.map((i) => i.view), ['waiting', 'waiting', 'waiting', 'approved', 'changes'])
  assert.ok(o.items.every((i) => i.local.state === 'none' && i.local.articleId === null))
  assert.equal(o.items[2].locales.length, 1)
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

  assert.deepEqual((await api('GET', '/api/articles')).items, [])
  assert.deepEqual((await publicContent(env)).articles, [])
  // looking again needs no new upload
  const again = await api('GET', '/api/articleflow/items/grp_1')
  assert.deepEqual(again.local.assets, assets)
  await api('POST', '/api/articleflow/items/grp_1/import', {})
})

await test('publish: Tech first, then the website, the sitemap, and the live address back to Tech', async () => {
  const { api, env } = await setup()
  assert.equal((await api('POST', '/api/articleflow/items/grp_1/publish', undefined, 409)).error, 'not_imported')
  await importGroup(api, 'grp_1')
  const done = await api('POST', '/api/articleflow/items/grp_1/publish')
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
  const twice = await api('POST', '/api/articleflow/items/grp_1/publish')
  assert.deepEqual([twice.state, twice.articleId], ['published', done.articleId])
  assert.equal(fake.state.groups[0].publishCount, 1)
  assert.equal((await api('GET', '/api/articles')).items.length, 1)
  await reset()
})

await test('two publishes at the same moment make one article and one publication', async () => {
  const { api, c, env } = await setup()
  await importGroup(api, 'grp_2')
  control({ slow: 60 })
  const results = await Promise.all([c.request('POST', '/api/articleflow/items/grp_2/publish'), c.request('POST', '/api/articleflow/items/grp_2/publish')])
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
  const done = await api('POST', '/api/articleflow/items/grp_3/publish')
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
  const refused = await api('POST', '/api/articleflow/items/grp_4/publish', undefined, 409)
  assert.equal(refused.error, 'publish_refused')
  assert.deepEqual(refused.reasons, ['HERO_REQUIRED'])
  assert.match(refused.message, /foto banner belum ada/)
  control({ changed: true })
  const changed = await api('POST', '/api/articleflow/items/grp_4/publish', undefined, 409)
  assert.equal(changed.error, 'changed')
  assert.deepEqual((await publicContent(env)).articles, [])
  assert.deepEqual((await api('GET', '/api/articles')).items, [])
  assert.equal((await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_4').local.state, 'imported')

  // Tech staff saved a newer version after the preview: the stale draft is refused, a fresh preview publishes
  fake.newVersion('grp_4')
  assert.equal((await api('POST', '/api/articleflow/items/grp_4/publish', undefined, 409)).error, 'changed')
  await importGroup(api, 'grp_4')
  assert.equal((await api('POST', '/api/articleflow/items/grp_4/publish')).state, 'published')
  assert.equal((await publicContent(env)).articles[0].title.en, 'Flooring Materials for Commercial Spaces (diperbarui)')
  await reset()
})

await test('the live report fails once: the article is live anyway and the report is retried', async () => {
  const { api, env } = await setup()
  await importGroup(api, 'grp_1')
  control({ failLive: 1 })
  assert.equal((await api('POST', '/api/articleflow/items/grp_1/publish')).state, 'published')
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
  const half = await api('POST', '/api/articleflow/items/grp_2/publish', undefined, 202)
  assert.equal(half.state, 'finishing')
  assert.equal(fake.state.groups[1].status, 'PUBLISHED')
  assert.deepEqual((await publicContent(env)).articles, [])
  const o = await api('GET', '/api/articleflow/overview')
  assert.equal(o.items.find((i) => i.groupId === 'grp_2').view, 'finishing')
  assert.ok(o.pendingJobs >= 1)
  // while it is being finished nothing else may start on it
  assert.equal((await api('POST', '/api/articleflow/items/grp_2/import', {}, 409)).error, 'busy')
  assert.equal((await api('POST', '/api/articleflow/items/grp_2/publish', undefined, 202)).state, 'finishing')

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
  const first = await api('POST', '/api/articleflow/items/grp_1/publish')
  fake.newVersion('grp_1')
  const before = (await api('GET', '/api/articleflow/overview')).items.find((i) => i.groupId === 'grp_1')
  assert.deepEqual([before.view, before.local.newVersion, before.local.state], ['waiting', true, 'published'])
  assert.equal((await publicContent(env)).articles[0].title.en, 'Cafe Interior Design Cost: A Breakdown per Square Metre') // still the old one
  const { result } = await importGroup(api, 'grp_1')
  assert.match(result.previewUrl, /\/articles\/cafe-interior-design-cost\?preview=/)
  const second = await api('POST', '/api/articleflow/items/grp_1/publish')
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
  const { articleId } = await api('POST', '/api/articleflow/items/grp_1/publish')
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
  await api('POST', '/api/articleflow/items/grp_1/publish')
  await importGroup(api, 'grp_2')
  assert.equal((await api('GET', '/api/articleflow/status?fresh=1')).locked, false)
  control({ mode: 'expired' })
  // the sidebar still holds the "active" answer; the first refused call flips it
  assert.equal((await api('GET', '/api/articleflow/status')).locked, false)
  assert.equal((await api('GET', '/api/articleflow/items/grp_2', undefined, 402)).error, 'subscription_expired')
  const s = await api('GET', '/api/articleflow/status')
  assert.deepEqual([s.locked, s.status.subscription.state], [true, 'EXPIRED'])
  assert.equal((await api('POST', '/api/articleflow/items/grp_2/publish', undefined, 402)).error, 'subscription_expired')
  assert.equal((await api('POST', '/api/articleflow/items/grp_2/import', {}, 402)).error, 'subscription_expired')
  const o = await api('GET', '/api/articleflow/overview')
  assert.deepEqual([o.locked, o.items, o.analytics, o.status.subscription.state], [true, [], null, 'EXPIRED'])
  assert.equal((await publicContent(env)).articles.length, 1) // what is live stays live
  assert.equal((await api('GET', '/api/articles')).items.length, 1)
  // renewed in Tech: open again
  control({ mode: 'active' })
  assert.equal((await api('GET', '/api/articleflow/overview')).items.length, 5)
  assert.equal((await api('POST', '/api/articleflow/items/grp_2/publish')).state, 'published')
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
  assert.equal((await api('POST', '/api/articleflow/items/grp_1/publish', undefined, 503)).error, 'unavailable')
  assert.deepEqual((await publicContent(env)).articles, [])
  assert.equal((await api('GET', '/api/articleflow/items/grp_1', undefined, 503)).error, 'unavailable')
  control({ down: false })
  // no answer at all keeps the idempotency key, so the retry cannot publish twice
  assert.equal((await api('POST', '/api/articleflow/items/grp_1/publish')).state, 'published')
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

await fake.close()
console.log(`\nArticleFlow: ${passed} tests passed`)
process.exit(0)
