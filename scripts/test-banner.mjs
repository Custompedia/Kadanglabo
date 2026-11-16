/** The banner of the Articles page: the CMS settings (by article id), the public answer (live slugs) and the pick. */
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { makeEnv, setupCache, client, article, tx, pause, root } from './test-support/cms-harness.mjs'

const checks = []
const check = (name) => (checks.push(name), console.log('PASS', name))

// the pick the site and the dashboard share
const shared = await build({ entryPoints: [`${root}shared/content.ts`], bundle: true, platform: 'node', format: 'esm', write: false })
const { bannerPick, BANNER_MAX } = await import(`data:text/javascript;base64,${Buffer.from(shared.outputFiles[0].text).toString('base64')}`)
const L = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
const id = (x) => x
assert.deepEqual(bannerPick(L, id, null), ['a', 'b', 'c', 'd', 'e'])
assert.deepEqual(bannerPick(L, id, { pinned: [], hidden: [] }), ['a', 'b', 'c', 'd', 'e'])
assert.deepEqual(bannerPick(L, id, { pinned: ['g', 'f'], hidden: ['a'] }), ['g', 'f', 'b', 'c', 'd'])
assert.deepEqual(bannerPick(L, id, { pinned: ['gone', 'c'], hidden: [] }), ['c', 'a', 'b', 'd', 'e'])
assert.deepEqual(bannerPick(L, id, { pinned: [], hidden: L }), [])
assert.deepEqual(bannerPick(L, id, { pinned: ['b', 'b'], hidden: [] }), ['b', 'a', 'c', 'd', 'e'])
assert.deepEqual(bannerPick(L, id, { pinned: L, hidden: [] }).length, BANNER_MAX)
assert.deepEqual(bannerPick([], id, { pinned: ['a'], hidden: [] }), [])
check('pick: pinned first in order, then newest, hidden left out, at most 5')

setupCache()
const env = await makeEnv()
const c = client(env)
await c.login()
const hit = async (method, path, body, status = 200) => {
  const r = await c.request(method, path, body)
  assert.equal(r.status, status, `${method} ${path}: ${JSON.stringify(r.data)}`)
  return r.data
}
const pub = async () => (await hit('GET', '/api/public/content'))
const make = async (slug, live = true) => {
  const { id } = await hit('POST', '/api/articles', { content: { ...article(slug), title: tx(slug) } }, 201)
  if (live) (await pause(), await hit('POST', `/api/articles/${id}/publish`))
  return id
}
const mode = (id, m, status = 200) => hit('PUT', `/api/banner/articles/${id}`, { mode: m }, status)

// nothing chosen yet: the site shows the newest
assert.equal((await pub()).banner, null)
const ov0 = await hit('GET', '/api/banner')
assert.deepEqual(ov0.settings, { pinned: [], hidden: [] })
assert.equal(ov0.articles.length, 0)
check('nothing saved: public banner null, dashboard empty')

const ids = []
for (const s of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']) ids.push(await make(s))
const draft = await make('draft-only', false)
let ov = await hit('GET', '/api/banner')
assert.equal(ov.articles.length, 7)
assert.deepEqual(ov.shown, [...ids].reverse().slice(0, 5)) // same day: newest id first
assert.ok(ov.articles.every((a) => a.mode === 'auto'))
check('automatic: the five newest live articles')

// a mode that changes nothing does not create a row or move the content version
const v1 = (await pub()).version
await mode(ids[0], 'auto')
assert.equal((await pub()).version, v1)
assert.equal((await pub()).banner, null)
check('choosing Otomatis on an untouched article writes nothing')

await pause()
ov = await mode(ids[0], 'pinned')
assert.deepEqual(ov.shown[0], ids[0])
assert.notEqual((await pub()).version, v1)
let p = await pub()
assert.deepEqual(p.banner, { pinned: ['a1'], hidden: [] })
await pause()
ov = await mode(ids[6], 'hidden')
assert.ok(!ov.shown.includes(ids[6]))
assert.equal(ov.shown.length, 5)
p = await pub()
assert.deepEqual(p.banner, { pinned: ['a1'], hidden: ['a7'] })
check('pin and hide reach the public answer at once (version bumped)')

// switching between modes keeps them exclusive
ov = await mode(ids[6], 'pinned')
assert.deepEqual(ov.settings, { pinned: [ids[0], ids[6]], hidden: [] })
ov = await mode(ids[6], 'hidden')
assert.deepEqual(ov.settings, { pinned: [ids[0]], hidden: [ids[6]] })
ov = await mode(ids[6], 'auto')
assert.deepEqual(ov.settings, { pinned: [ids[0]], hidden: [] })
ov = await mode(ids[0], 'pinned')
assert.deepEqual(ov.settings.pinned, [ids[0]])
check('modes are exclusive; pinning again keeps the place')

for (const i of [1, 2, 3, 4]) await mode(ids[i], 'pinned')
const full = await mode(ids[5], 'pinned', 409)
assert.match(full.message, /Sudah 5 artikel disematkan/)
check('at most five live articles pinned')

ov = await hit('PUT', '/api/banner/order', { pinned: [ids[4], ids[3], ids[2], ids[1], ids[0]] })
assert.deepEqual(ov.shown, [ids[4], ids[3], ids[2], ids[1], ids[0]])
assert.deepEqual((await pub()).banner.pinned, ['a5', 'a4', 'a3', 'a2', 'a1'])
await hit('PUT', '/api/banner/order', { pinned: [ids[4], ids[3]] }, 409)
await hit('PUT', '/api/banner/order', { pinned: [ids[4], ids[3], ids[2], ids[1], ids[6]] }, 409)
check('reorder pinned; a stale order is refused')

// taken down: out of the banner and its slot freed, but the pin kept for when it comes back
await pause()
await hit('POST', `/api/articles/${ids[2]}/takedown`)
p = await pub()
assert.deepEqual(p.banner.pinned, ['a5', 'a4', 'a2', 'a1'])
ov = await hit('GET', '/api/banner')
assert.ok(ov.settings.pinned.includes(ids[2]))
assert.ok(!ov.articles.some((a) => a.id === ids[2]))
await mode(ids[5], 'pinned') // the freed slot can be used
await pause()
await hit('POST', `/api/articles/${ids[2]}/publish`)
ov = await hit('GET', '/api/banner')
assert.equal(ov.settings.pinned.length, 6)
assert.equal(ov.shown.length, 5)
assert.equal(ov.articles.find((a) => a.id === ids[5]).position, null)
await mode(ids[6], 'pinned', 409)
check('take down keeps the pin; back live it takes its place again (six pinned show five)')
await mode(ids[5], 'auto')

// order with a pinned article that is not live: it keeps its place behind the live ones
await pause()
await hit('POST', `/api/articles/${ids[1]}/takedown`)
ov = await hit('GET', '/api/banner')
const livePinned = ov.articles.filter((a) => a.mode === 'pinned').map((a) => a.id)
ov = await hit('PUT', '/api/banner/order', { pinned: [...livePinned].reverse() })
assert.deepEqual(ov.settings.pinned, [...[...livePinned].reverse(), ids[1]])
await pause()
await hit('POST', `/api/articles/${ids[1]}/publish`)
check('reorder leaves pinned articles that are not live in place')

// a new address on publish: the banner follows the article (it is kept by id)
const rec = await hit('GET', `/api/articles/${ids[0]}`)
await hit('PUT', `/api/articles/${ids[0]}`, { content: { ...rec.draft, slug: 'a1-renamed' } })
assert.ok((await pub()).banner.pinned.includes('a1'))
await pause()
await hit('POST', `/api/articles/${ids[0]}/publish`)
p = await pub()
assert.ok(p.banner.pinned.includes('a1-renamed') && !p.banner.pinned.includes('a1'))
assert.ok(p.articles.some((a) => a.slug === 'a1-renamed'))
check('a renamed article stays pinned under its new address')

// a draft can be given its banner choice before it goes live
await mode(draft, 'hidden')
assert.ok(!(await pub()).banner.hidden.includes('draft-only'))
await pause()
await hit('POST', `/api/articles/${draft}/publish`)
p = await pub()
assert.ok(p.banner.hidden.includes('draft-only'))
check('a choice made on a draft applies once it is live')

// trash keeps the choice (restore brings it back), deleting for good removes it
await pause()
await hit('POST', `/api/articles/${ids[3]}/trash`)
assert.ok(!(await pub()).banner.pinned.includes('a4'))
assert.ok((await hit('GET', '/api/banner')).settings.pinned.includes(ids[3]))
await hit('DELETE', `/api/articles/${ids[3]}`)
ov = await hit('GET', '/api/banner')
assert.ok(!ov.settings.pinned.includes(ids[3]))
await mode(ids[3], 'pinned', 404)
await mode(999999, 'hidden', 404)
check('trash keeps the choice; permanent deletion forgets it; unknown articles refused')

// everything hidden: no banner at all
for (const a of (await hit('GET', '/api/banner')).articles) await mode(a.id, 'hidden')
ov = await hit('GET', '/api/banner')
assert.deepEqual(ov.shown, [])
p = await pub()
assert.equal(p.banner.pinned.length, 0)
assert.equal(bannerPick(p.articles, (x) => x.slug, p.banner).length, 0)
check('every article hidden: the banner is empty')

// what the site computes from the public answer is what the dashboard says it shows
await mode(ids[4], 'pinned')
await mode(ids[6], 'auto')
await mode(ids[5], 'auto')
ov = await hit('GET', '/api/banner')
p = await pub()
const slugById = new Map(ov.articles.map((a) => [a.id, a.slug]))
assert.deepEqual(bannerPick(p.articles, (x) => x.slug, p.banner).map((a) => a.slug), ov.shown.map((i) => slugById.get(i)))
check('site and dashboard agree on what the banner shows')

// bad input
await hit('PUT', `/api/banner/articles/${ids[4]}`, { mode: 'featured' }, 400)
await hit('PUT', '/api/banner/order', { pinned: ['x'] }, 400)
assert.equal((await c.request('GET', '/api/banner', undefined, { auth: false })).status, 401)
check('invalid modes and orders refused; signed-out refused')

console.log(JSON.stringify({ checks }, null, 2))
