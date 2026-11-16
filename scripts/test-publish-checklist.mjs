/**
 * The project editor's "hal lagi sebelum tayang" list and the Publish popup, in a real browser against the real
 * Worker (disposable databases). Run after `cd admin && npm run build`:  node scripts/test-publish-checklist.mjs
 * Saves a screenshot of the panel to $SHOT (optional).
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'
import { makeEnv, setupCache, client, project } from './test-support/cms-harness.mjs'
import { startServers } from './test-support/cms-servers.mjs'

const executablePath = [process.env.CHROME_BIN, chromium.executablePath(), '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => p && existsSync(p))
assert.ok(executablePath, 'Install Chrome/Chromium, or set CHROME_BIN to its executable')
setupCache()
const env = await makeEnv()
const c = client(env)
await c.login()
const blank = { en: '', id: '' }
const emptyRich = { en: { type: 'doc', content: [{ type: 'paragraph' }] }, id: { type: 'doc', content: [{ type: 'paragraph' }] } }
const draft = { ...project('uji-checklist', 'Uji Checklist'), typology: blank, tagline: blank, summary: emptyRich, cover: '', hero: '', gallery: [] }
const created = await c.request('POST', '/api/projects', { content: draft })
assert.equal(created.status, 201, JSON.stringify(created.data))
const id = created.data.id

const servers = await startServers(env)
let browser
let passed = 0
const pass = (name) => console.log(`PASS ${++passed}: ${name}`)
const errors = []
try {
  browser = await chromium.launch({ executablePath, headless: true, args: process.platform === 'linux' ? ['--no-sandbox'] : [] })
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })).newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(servers.admin)
  await page.getByPlaceholder('nama pengguna').fill('custompedia')
  await page.getByPlaceholder('••••••••').fill('12345')
  await page.getByRole('button', { name: 'Masuk', exact: true }).click()
  await page.getByRole('heading', { name: 'Halo, Custompedia', exact: true }).waitFor()
  await page.goto(`${servers.admin}/projects/${id}`)
  const panel = page.locator('aside, [role=complementary]').filter({ hasText: 'Publikasi' }).first()
  const row = (text) => panel.getByRole('button', { name: text })
  await row('Tipologi: ID & EN belum diisi').waitFor()
  pass('a field empty in both languages says so')

  // fill the Indonesian typology, then move on to another field: the row follows at once, before any save
  const typology = page.locator('main').getByText(/^Tipologi\*?$/).locator('xpath=ancestor::div[contains(@class,"grid")][1]').locator('input')
  await typology.fill('Ruko')
  await page.locator('main input').first().click()
  await row('Tipologi: EN belum diisi').waitFor()
  assert.equal(await row('Tipologi: ID & EN belum diisi').count(), 0)
  pass('typing one language updates its row at once, naming the language still empty')

  // the row goes to the English field, says so, and the Indonesian text is still there
  await row('Tipologi: EN belum diisi').click()
  await page.getByText('Beralih ke English').waitFor()
  await page.waitForTimeout(200)
  assert.equal(await typology.inputValue(), '')
  assert.equal(await typology.evaluate((el) => el === document.activeElement), true)
  await typology.fill('Shophouse')
  await page.getByRole('tab', { name: /Bahasa Indonesia/ }).click()
  assert.equal(await typology.inputValue(), 'Ruko')
  await page.waitForTimeout(50)
  assert.equal(await panel.getByRole('button', { name: /^Tipologi/ }).count(), 0)
  pass('a row switches to the empty language with a notice, focuses it, and the other language keeps its text')

  // the tab in view is the empty one: no switch
  await row('Tagline: ID & EN belum diisi').click()
  await page.waitForTimeout(150)
  assert.equal(await page.getByRole('tab', { name: /Bahasa Indonesia/ }).getAttribute('aria-selected'), 'true')
  assert.equal(await page.locator('.reveal-missing').count(), 1)
  if (process.env.FIELD_SHOT) {
    const b = await page.locator('.reveal-missing').boundingBox()
    await page.screenshot({ path: process.env.FIELD_SHOT, clip: { x: b.x - 16, y: b.y - 16, width: b.width + 32, height: b.height + 32 } })
  }
  pass('when the language in view is empty, the row stays on it (and marks the field)')

  // Publish with something missing: a popup, and nothing is sent
  let published = false
  page.on('request', (r) => r.url().endsWith('/publish') && (published = true))
  await panel.getByRole('button', { name: 'Tayangkan di website' }).click()
  const popup = page.getByRole('dialog').filter({ hasText: 'Belum bisa ditayangkan' })
  await popup.waitFor()
  assert.ok((await popup.textContent()).includes('Tagline: ID & EN belum diisi'))
  await popup.getByRole('button', { name: 'Tunjukkan' }).click()
  await popup.waitFor({ state: 'hidden' })
  assert.equal(published, false)
  pass('Publish with something missing opens the popup, sends nothing, and Tunjukkan goes to the field')

  if (process.env.SHOT) await panel.screenshot({ path: process.env.SHOT })
  assert.deepEqual(errors, [])
} finally {
  await browser?.close()
  await servers.close()
}
console.log(`\nPublish checklist: ${passed} checks passed`)
