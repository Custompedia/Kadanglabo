/** Browser regressions for the audited admin -> website flows. Requires built admin/site assets. */
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { makeEnv, setupCache, client, project, article, pause } from './test-support/cms-harness.mjs'
import { startServers } from './test-support/cms-servers.mjs'

const executablePath = [process.env.CHROME_BIN, chromium.executablePath(), '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(path => path && existsSync(path))
assert.ok(executablePath, 'Install Chrome/Chromium, or set CHROME_BIN to its executable')
setupCache()
const env = await makeEnv(), c = client(env)
await c.login()
const api = async (method, path, body, status = 200) => {
  const result = await c.request(method, path, body)
  assert.equal(result.status, status, `${method} ${path}: ${JSON.stringify(result.data)}`)
  return result.data
}
// Use real, generated image bytes through the actual media upload handler.
const png = await sharp({ create: { width: 32, height: 20, channels: 3, background: '#627c77' } }).png().toBuffer()
const form = new FormData()
form.append('meta', JSON.stringify({ filename: 'fixture.png', w: 32, h: 20, color: '#627c77', sizes: [32] }))
form.append('w32', new Blob([await sharp(png).webp().toBuffer()], { type: 'image/webp' }), '32.webp')
form.append('original', new Blob([png], { type: 'image/png' }), 'fixture.png')
const media = await api('POST', '/api/media', form, 201)
const fixtures = [project('hmw-house', 'First selected house'), project('second-house', 'Second selected house'), project('third-house', 'Unselected house')]
for (const fixture of fixtures) { fixture.cover = media.id; fixture.hero = media.id }
const ids = []
for (const content of fixtures) {
  const { id } = await api('POST', '/api/projects', { content }, 201)
  await api('POST', `/api/projects/${id}/publish`)
  ids.push(id)
}
const a = { ...article(), cover: media.id, project: fixtures[0].slug }
const { id: aid } = await api('POST', '/api/articles', { content: a }, 201)
await api('POST', `/api/articles/${aid}/publish`)
const pages = { categories: Object.fromEntries(['commercial', 'hospitality', 'residential'].map(cat => [cat, { highlight: cat === 'residential' ? fixtures.slice(0, 2).map(p => p.slug) : [], selected: cat === 'residential' ? fixtures.slice(0, 2).map(p => p.slug) : [], hero: '' }])) }
await api('PUT', '/api/pages', { pages })
const servers = await startServers(env)
let browser, passed = 0
const errors = []
const pass = name => console.log(`PASS ${++passed}: ${name}`)
try {
  browser = await chromium.launch({ executablePath, headless: true, args: process.platform === 'linux' ? ['--no-sandbox'] : [] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.setDefaultNavigationTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(servers.admin)
  await page.getByPlaceholder('nama pengguna').fill('custompedia')
  await page.getByPlaceholder('••••••••').fill('12345')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page.getByRole('heading', { name: 'Halo, Custompedia', exact: true }).waitFor()
  pass('real login UI and session')

  for (const slug of ['intermediate-house', 'new-house']) await api('PUT', `/api/projects/${ids[0]}`, { content: { ...fixtures[0], slug } })
  await pause(); await api('POST', `/api/articles/${aid}/publish`)
  await page.goto(servers.web + '/work?lang=en')
  await page.locator('#residential .work-flow a[href="/work/hmw-house"]').first().waitFor()
  assert.ok(await page.locator('#residential .work-flow a[href="/work/second-house"]').count())
  await page.goto(servers.admin + '/pages/work')
  await page.getByRole('button', { name: 'Keluarkan First selected house', exact: true }).waitFor()
  assert.ok(!(await page.locator('main').innerText()).includes('Tidak tayang lagi'))
  await page.goto(servers.admin + '/projects')
  const row = page.getByRole('listitem').filter({ hasText: 'First selected house' })
  await row.getByRole('button', { name: 'Pilihan lain', exact: true }).click()
  assert.ok((await page.getByRole('menuitem', { name: 'Lihat di website', exact: true }).getAttribute('href')).endsWith('/work/hmw-house'))
  await page.keyboard.press('Escape')
  await page.goto(`${servers.admin}/projects/${ids[0]}`)
  await page.getByRole('heading', { name: 'First selected house', exact: true }).waitFor()
  assert.ok(await page.locator('a[href$="/work/hmw-house"]').count() >= 4)
  assert.equal(await page.locator('a[href$="/work/new-house"]').count(), 0)
  pass('draft slug changes leave live Our Work and admin project selections intact')
  await pause(); await api('POST', `/api/projects/${ids[0]}/publish`)
  await page.goto(servers.web + '/work?lang=en')
  await page.locator('#residential .work-flow a[href="/work/new-house"]').first().waitFor()
  await page.goto(servers.web + '/articles/article-fixture?lang=en')
  await page.locator('.art-side a[href="/work/new-house"]').first().waitFor()
  pass('publishing a new slug updates live selections and the article related-project card')

  await page.goto(`${servers.admin}/articles/${aid}`)
  await page.locator('.rt--article[lang="id"]').waitFor()
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.locator('.article-canvas-title').fill('Tablet saved title')
  await page.getByRole('tab', { name: /English/ }).click()
  await page.locator('.article-canvas-title').fill('Tablet saved title EN')
  await page.getByRole('tab', { name: /Bahasa Indonesia/ }).click()
  await page.getByRole('button', { name: 'Publikasi', exact: true }).click()
  let panel = page.getByRole('dialog', { name: 'Publikasi', exact: true })
  await panel.waitFor()
  const saved = page.waitForResponse(response => response.url().endsWith(`/api/articles/${aid}`) && response.request().method() === 'PUT')
  await panel.getByRole('button', { name: 'Simpan', exact: true }).click()
  assert.equal((await saved).status(), 200)
  const published = page.waitForResponse(response => response.url().endsWith(`/api/articles/${aid}/publish`))
  await panel.getByRole('button', { name: 'Tayangkan perubahan', exact: true }).click()
  assert.equal((await published).status(), 200)
  assert.equal((await api('GET', '/api/public/content')).articles.find(item => item.slug === a.slug).title.id, 'Tablet saved title')
  await panel.getByRole('button', { name: 'Preview', exact: true }).click()
  const preview = page.frameLocator('iframe[title="Preview"]')
  await preview.locator('.art-head__title').waitFor()
  assert.ok((await preview.locator('.art-head__title').textContent()).replace(/\s/g, '').includes('Tabletsavedtitle'))
  await page.getByRole('dialog', { name: 'Preview', exact: true }).getByRole('button', { name: 'Tutup', exact: true }).click()
  await page.screenshot({ path: join(tmpdir(), 'kadang-fixed-publication-tablet.png') })
  await page.getByRole('button', { name: 'Tutup panel publikasi', exact: true }).click()
  pass('tablet editor saves, publishes, and previews through the same publication panel/API')

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto(`${servers.admin}/projects/${ids[0]}`)
    await page.locator('main input').first().fill(`Phone project ${width}`)
    await page.getByRole('button', { name: 'Publikasi', exact: true }).click()
    panel = page.getByRole('dialog', { name: 'Publikasi', exact: true })
    await panel.waitFor()
    assert.ok(await panel.getByRole('button', { name: 'Simpan', exact: true }).isVisible())
    assert.ok(await panel.getByRole('button', { name: 'Preview', exact: true }).isVisible())
    const savedProject = page.waitForResponse(response => response.url().endsWith(`/api/projects/${ids[0]}`) && response.request().method() === 'PUT')
    await panel.getByRole('button', { name: 'Simpan', exact: true }).click()
    assert.equal((await savedProject).status(), 200)
    const publishedProject = page.waitForResponse(response => response.url().endsWith(`/api/projects/${ids[0]}/publish`))
    await panel.getByRole('button', { name: 'Tayangkan perubahan', exact: true }).click()
    assert.equal((await publishedProject).status(), 200)
    assert.equal((await api('GET', '/api/public/content')).projects.find(item => item.slug === 'new-house').title, `Phone project ${width}`)

    const box = await panel.boundingBox()
    assert.ok(box.x >= 0 && box.x + box.width <= width)
    await page.keyboard.press('Escape')
    await panel.waitFor({ state: 'hidden' })
  }
  await page.goto(servers.admin + '/articles/new')
  await page.locator('.article-canvas-title').fill('New mobile draft')
  await page.getByRole('button', { name: 'Publikasi', exact: true }).click()
  panel = page.getByRole('dialog', { name: 'Publikasi', exact: true })
  const created = page.waitForResponse(response => response.url().endsWith('/api/articles') && response.request().method() === 'POST')
  await panel.getByRole('button', { name: 'Simpan', exact: true }).click()
  const response = await created
  assert.equal(response.status(), 201)
  const mobileDraft = await response.json()
  await page.waitForURL(`**/articles/${mobileDraft.id}`)
  assert.equal((await api('GET', `/api/articles/${mobileDraft.id}`)).draft.title.id, 'New mobile draft')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Simpan', exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: 'Simpan', exact: true }).count(), 1)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('dialog', { name: 'Publikasi', exact: true }).waitFor({ state: 'hidden' })
  pass('phone editors expose controls, create/save a draft, and handle viewport changes without duplicate panels')

  // Remove the last curated hero while retaining other CMS projects, then test one and zero projects too.
  await pause(); await api('POST', `/api/projects/${ids[0]}/takedown`)
  await page.goto(servers.web + '/?lang=en')
  await page.locator('.hero__slide img').first().waitFor()
  assert.equal(await page.locator('.hero__slide img').count() > 0, true)
  assert.ok(!(await page.locator('.hero__slide img').first().getAttribute('alt')).includes('First selected house'))
  await pause(); await api('POST', `/api/projects/${ids[1]}/takedown`)
  await page.reload()
  await page.locator('.hero__slide img').waitFor()
  assert.equal(await page.locator('.hero-capsule').count(), 0)
  await pause(); await api('POST', `/api/projects/${ids[2]}/takedown`)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.reload()
  await page.locator('#main').waitFor()
  await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 20000 })
  assert.equal(await page.locator('.hero__slide').count(), 0)
  assert.equal(await page.locator('.hero-capsule').count(), 0)
  assert.ok((await page.locator('#main').innerText()).trim().length > 0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const path of ['/articles/article-fixture', '/work', '/work/residential', '/contact']) {
    await page.goto(servers.web + path + '?lang=en')
    await page.locator('#main').waitFor()
    assert.ok((await page.locator('#main').textContent()).trim().length > 0)
  }
  pass('website handles non-curated, single, and zero live projects, including the animated intro')
  assert.deepEqual(errors, [])
  console.log(`All ${passed} browser regression groups passed`)
} finally {
  await browser?.close()
  await servers.close()
}
