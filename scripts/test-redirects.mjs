/** Old addresses of projects and articles keep leading to the page after its address changes. */
import assert from 'node:assert/strict'
import { makeEnv, setupCache, client, project, article, tx, pause } from './test-support/cms-harness.mjs'

const checks = []
const check = (name) => (checks.push(name), console.log('PASS', name))

setupCache()
const env = await makeEnv()
const c = client(env)
await c.login()
const hit = async (method, path, body, status = 200) => {
  const r = await c.request(method, path, body)
  assert.equal(r.status, status, `${method} ${path}: ${JSON.stringify(r.data)}`)
  return r.data
}
const pub = async () => (await hit('GET', '/api/public/content')).redirects
const rename = async (kind, id, slug, publish = true) => {
  const base = kind === 'project' ? '/api/projects' : '/api/articles'
  const rec = await hit('GET', `${base}/${id}`)
  await hit('PUT', `${base}/${id}`, { content: { ...rec.draft, slug } })
  if (publish) (await pause(), await hit('POST', `${base}/${id}/publish`))
}

assert.deepEqual(await pub(), { project: {}, article: {} })
check('nothing renamed: no redirects')

const { id: p1 } = await hit('POST', '/api/projects', { content: project('rumah-a', 'Rumah A') }, 201)
await hit('POST', `/api/projects/${p1}/publish`)
await rename('project', p1, 'rumah-b', false)
assert.deepEqual((await pub()).project, {})
check('a new address only saved as draft redirects nothing yet (the old one is still live)')

await pause()
await hit('POST', `/api/projects/${p1}/publish`)
assert.deepEqual((await pub()).project, { 'rumah-a': 'rumah-b' })
check('published under a new address: the old one leads to it')

await rename('project', p1, 'rumah-c')
assert.deepEqual((await pub()).project, { 'rumah-a': 'rumah-c', 'rumah-b': 'rumah-c' })
check('a chain of renames always leads to the current address')

await rename('project', p1, 'rumah-a')
assert.deepEqual((await pub()).project, { 'rumah-b': 'rumah-a', 'rumah-c': 'rumah-a' })
check('back to an earlier address: that one is live again, not a redirect')

// another project takes an old address: it is that project's page now
const { id: p2 } = await hit('POST', '/api/projects', { content: project('rumah-b', 'Rumah B baru') }, 201)
assert.deepEqual((await pub()).project, { 'rumah-b': 'rumah-a', 'rumah-c': 'rumah-a' }) // still a draft
await pause()
await hit('POST', `/api/projects/${p2}/publish`)
assert.deepEqual((await pub()).project, { 'rumah-c': 'rumah-a' })
check('an old address taken by another live project is that project’s page')

await pause()
await hit('POST', `/api/projects/${p1}/takedown`)
assert.deepEqual((await pub()).project, {})
await pause()
await hit('POST', `/api/projects/${p1}/publish`)
assert.deepEqual((await pub()).project, { 'rumah-c': 'rumah-a' })
check('taken down: old addresses lead nowhere; live again: they lead to it again')

// a project without a page of its own (archive only) is never a target
await hit('PUT', `/api/projects/${p1}`, { content: { ...(await hit('GET', `/api/projects/${p1}`)).draft, archiveOnly: true } })
await pause()
await hit('POST', `/api/projects/${p1}/publish`)
assert.deepEqual((await pub()).project, {})
await hit('PUT', `/api/projects/${p1}`, { content: { ...(await hit('GET', `/api/projects/${p1}`)).draft, archiveOnly: false } })
await pause()
await hit('POST', `/api/projects/${p1}/publish`)
check('archive-only projects are not redirected to')

await pause()
await hit('POST', `/api/projects/${p1}/trash`)
await hit('DELETE', `/api/projects/${p1}`)
const settings = JSON.parse(env.CONTENT_DB.db.prepare(`SELECT value FROM settings WHERE key = 'redirects'`).get().value)
assert.deepEqual(settings.project, {})
check('deleted for good: its old addresses are forgotten')

// articles work the same way, and keep their banner pin
const { id: a1 } = await hit('POST', '/api/articles', { content: { ...article('cerita-lama'), title: tx('Cerita') } }, 201)
await pause()
await hit('POST', `/api/articles/${a1}/publish`)
await hit('PUT', `/api/banner/articles/${a1}`, { mode: 'pinned' })
await rename('article', a1, 'cerita-baru')
const after = await hit('GET', '/api/public/content')
assert.deepEqual(after.redirects.article, { 'cerita-lama': 'cerita-baru' })
assert.deepEqual(after.banner.pinned, ['cerita-baru'])
check('articles: the old address leads to the new one; the banner follows too')

// a broken stored value never breaks the public answer
env.CONTENT_DB.db.prepare(`UPDATE settings SET value = '{not json' WHERE key = 'redirects'`).run()
env.CONTENT_DB.db.prepare(`UPDATE meta SET value = 'x' WHERE key = 'version'`).run()
assert.deepEqual(await pub(), { project: {}, article: {} })
check('a broken stored value redirects nothing and breaks nothing')

console.log(JSON.stringify({ checks }, null, 2))
