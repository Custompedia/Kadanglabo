import assert from 'node:assert/strict'
import { loadConfigFromFile } from 'vite'
import { resolve } from 'node:path'
import { makeEnv, setupCache, client, project, article, pause, cleanupMedia, root } from './test-support/cms-harness.mjs'

let passed = 0
async function test(name, run) { await run(); console.log(`PASS ${++passed}: ${name}`) }
async function setup() {
  setupCache()
  const env = await makeEnv(), c = client(env)
  assert.equal((await c.login()).status, 200)
  const api = async (method, path, body, status = 200) => {
    const result = await c.request(method, path, body)
    assert.equal(result.status, status, `${method} ${path}: ${JSON.stringify(result.data)}`)
    return result.data
  }
  return { env, c, api }
}

await test('website/admin dev ports agree, cannot silently switch, and CMS override is preserved', async () => {
  const web = (await loadConfigFromFile({ command: 'serve', mode: 'development' }, resolve(root, 'vite.config.ts'))).config
  const admin = (await loadConfigFromFile({ command: 'serve', mode: 'development' }, resolve(root, 'admin/vite.config.ts'))).config
  assert.equal(web.server.port, 5173)
  assert.equal(admin.server.port, 5174)
  assert.equal(web.server.strictPort, true)
  assert.equal(admin.server.strictPort, true)
  for (const key of ['/api/public', '/media']) assert.equal(web.server.proxy[key].target, process.env.CMS_DEV_URL || 'http://localhost:5174')
})

await test('draft slug changes preserve live selection, article references, and reserved live addresses', async () => {
  const { api } = await setup()
  const p = project(), { id } = await api('POST', '/api/projects', { content: p }, 201)
  await api('POST', `/api/projects/${id}/publish`)
  const a = { ...article(), project: p.slug }, { id: aid } = await api('POST', '/api/articles', { content: a }, 201)
  await api('POST', `/api/articles/${aid}/publish`)
  const pages = { categories: Object.fromEntries(['commercial', 'hospitality', 'residential'].map(cat => [cat, { highlight: cat === 'residential' ? [p.slug] : [], selected: cat === 'residential' ? [p.slug] : [], hero: '' }])) }
  await api('PUT', '/api/pages', { pages })
  for (const slug of ['intermediate-slug', 'final-slug']) await api('PUT', `/api/projects/${id}`, { content: { ...p, slug } })
  assert.deepEqual((await api('GET', '/api/pages')).pages, pages)
  assert.equal((await api('GET', '/api/projects')).items.find(x => x.id === id).published_slug, p.slug)
  await api('POST', '/api/projects', { content: project(p.slug, 'Conflicting project') }, 409)
  await pause(); await api('POST', `/api/articles/${aid}/publish`)
  let live = await api('GET', '/api/public/content')
  assert.equal(live.projects[0].slug, p.slug)
  assert.equal(live.pages.categories.residential.highlight[0], p.slug)
  assert.equal(live.articles[0].project, p.slug)
  await pause(); await api('POST', `/api/projects/${id}/publish`)
  live = await api('GET', '/api/public/content')
  assert.equal(live.projects[0].slug, 'final-slug')
  assert.deepEqual(live.pages.categories.residential.highlight, ['final-slug'])
  assert.deepEqual(live.pages.categories.residential.selected, ['final-slug'])
  assert.equal(live.articles[0].project, 'final-slug')
  assert.equal((await api('GET', `/api/articles/${aid}`)).draft.project, 'final-slug')
  assert.equal((await api('GET', `/api/articles/${aid}`)).dirty, 0)
})

await test('article live addresses stay reserved and distinguishable from a pending draft slug', async () => {
  const { api } = await setup()
  const a = article(), { id } = await api('POST', '/api/articles', { content: a }, 201)
  await api('POST', `/api/articles/${id}/publish`)
  await api('PUT', `/api/articles/${id}`, { content: { ...a, slug: 'new-article-address' } })
  const row = (await api('GET', '/api/articles')).items.find(item => item.id === id)
  assert.equal(row.slug, 'new-article-address')
  assert.equal(row.published_slug, a.slug)
  await api('POST', '/api/articles', { content: a }, 409)
  await api('POST', `/api/articles/${id}/publish`)
  assert.equal((await api('GET', '/api/articles')).items.find(item => item.id === id).published_slug, 'new-article-address')
})

await test('renaming without page settings updates draft-only and trashed article references', async () => {
  const { api } = await setup()
  const p = project(), { id } = await api('POST', '/api/projects', { content: p }, 201)
  await api('POST', `/api/projects/${id}/publish`)
  const first = { ...article('draft-related'), project: p.slug }
  const { id: draft } = await api('POST', '/api/articles', { content: first }, 201)
  const { id: trashed } = await api('POST', '/api/articles', { content: { ...article('trashed-related'), project: p.slug } }, 201)
  await api('POST', `/api/articles/${trashed}/publish`)
  await api('POST', `/api/articles/${trashed}/trash`)
  await api('PUT', `/api/projects/${id}`, { content: { ...p, slug: 'new-house' } })
  await api('POST', `/api/projects/${id}/publish`)
  const pending = await api('GET', `/api/articles/${draft}`)
  assert.equal(pending.draft.project, 'new-house')
  assert.deepEqual(pending.draft.body, first.body)
  assert.equal(pending.published, null)
  await api('POST', `/api/articles/${trashed}/restore`)
  const restored = await api('GET', `/api/articles/${trashed}`)
  assert.equal(restored.draft.project, 'new-house')
  assert.equal(restored.published.project, 'new-house')
})

await test('failed project publication rolls back every reference and the published snapshot', async () => {
  const { api, env } = await setup()
  const p = project(), { id } = await api('POST', '/api/projects', { content: p }, 201)
  await api('POST', `/api/projects/${id}/publish`)
  const { id: aid } = await api('POST', '/api/articles', { content: { ...article(), project: p.slug } }, 201)
  await api('POST', `/api/articles/${aid}/publish`)
  await api('PUT', `/api/projects/${id}`, { content: { ...p, slug: 'new-slug' } })
  const pages = { categories: Object.fromEntries(['commercial', 'hospitality', 'residential'].map(cat => [cat, { highlight: cat === 'residential' ? [p.slug] : [], selected: [], hero: '' }])) }
  await api('PUT', '/api/pages', { pages })
  env.CONTENT_DB.failOnSql = 'UPDATE articles SET published'
  const errors = []
  const originalError = console.error
  try {
    console.error = error => errors.push(error)
    await api('POST', `/api/projects/${id}/publish`, undefined, 500)
  } finally { console.error = originalError }
  assert.ok(errors.some(error => error.message === 'Injected transaction failure'))
  env.CONTENT_DB.failOnSql = null
  assert.deepEqual((await api('GET', '/api/pages')).pages, pages)
  assert.equal((await api('GET', `/api/projects/${id}`)).published.slug, p.slug)
  assert.equal((await api('GET', `/api/articles/${aid}`)).draft.project, p.slug)
  assert.equal((await api('GET', `/api/articles/${aid}`)).published.project, p.slug)
})

await test('hidden legacy summary cannot block publish; other bilingual requirements still apply', async () => {
  const { api, env } = await setup()
  const { id } = await api('POST', '/api/articles', { content: { ...article(), summary: { id: 'Legacy', en: '' } } }, 201)
  assert.equal((await api('GET', `/api/articles/${id}`)).draft.summary, undefined)
  // Reproduce an existing pre-fix record that has not passed through the new save schema.
  await env.CONTENT_DB.prepare("UPDATE articles SET draft = json_set(draft, '$.summary', json(?)) WHERE id = ?").bind(JSON.stringify({ id: 'Legacy', en: '' }), id).run()
  assert.deepEqual((await api('GET', `/api/articles/${id}`)).issues, [])
  await api('POST', `/api/articles/${id}/publish`)
  const invalid = { ...article('invalid-translation'), coverCaption: { id: 'Foto', en: '' } }
  const { id: other } = await api('POST', '/api/articles', { content: invalid }, 201)
  const rejected = await api('POST', `/api/articles/${other}/publish`, undefined, 400)
  assert.ok(rejected.issues.some(x => x.includes('Keterangan foto banner')))
})

await test('Trash protects article and project images from deletion and scheduled cleanup until permanent deletion', async () => {
  for (const kind of ['articles', 'projects']) {
    const { api, env } = await setup()
    const id = `photo-${kind}`, key = `media/${id}-8.webp`
    await env.MEDIA.put(key, 'test image')
    await env.ORIGINALS.put(id + '/photo.png', 'original')
    await env.MEDIA_DB.prepare('INSERT INTO media (id, filename, w, h, color, sizes, original_key, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, 'photo.webp', 8, 4, '#123456', '[8]', id + '/photo.png', '2000-01-01T00:00:00.000Z').run()
    const d = kind === 'articles' ? { ...article(), cover: id } : { ...project(), cover: id, hero: id }
    const { id: record } = await api('POST', `/api/${kind}`, { content: d }, 201)
    await api('POST', `/api/${kind}/${record}/publish`)
    await api('POST', `/api/${kind}/${record}/trash`)
    assert.ok((await api('GET', '/api/media')).items.find(x => x.id === id).usedIn.length)
    await api('DELETE', `/api/media/${id}`, undefined, 409)
    assert.equal(await cleanupMedia(env), 0)
    assert.ok(await env.MEDIA.get(key))
    assert.ok(await env.ORIGINALS.get(id + '/photo.png'))
    await api('POST', `/api/${kind}/${record}/restore`)
    await api('POST', `/api/${kind}/${record}/publish`)
    assert.equal((await api('GET', `/${key}`)).length > 0, true)
    await api('POST', `/api/${kind}/${record}/trash`)
    await api('DELETE', `/api/${kind}/${record}`)
    assert.equal(await cleanupMedia(env), 1)
    assert.equal(await env.MEDIA.get(key), null)
    assert.equal(await env.ORIGINALS.get(id + '/photo.png'), null)
  }
})

console.log(`All ${passed} CMS regression groups passed`)
