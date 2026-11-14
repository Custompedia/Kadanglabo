/** Responsive checks against real handlers and disposable data. Run after building admin. */
import assert from 'node:assert/strict'
import { chromium, firefox, webkit } from 'playwright-core'
import { existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { makeEnv, setupCache, client, project, article } from './test-support/cms-harness.mjs'
import { startServers } from './test-support/cms-servers.mjs'

setupCache()
const env = await makeEnv(), c = client(env)
// ArticleFlow (optional add-on): its page is checked with sample data from its stand-in for Custompedia Tech
const fakeTechPath = new URL('../admin/articleflow/dev/fake-tech.mjs', import.meta.url)
const fakeTech = existsSync(fakeTechPath) ? await (await import(fakeTechPath.href)).createFakeTech() : null
if (fakeTech) Object.assign(env, { TECH_API_URL: fakeTech.url, TECH_SITE_ID: fakeTech.site, TECH_PARTNER_KEY: fakeTech.key })
await c.login()
const api = async (method, path, body, expected = 200) => {
  const r = await c.request(method, path, body)
  assert.equal(r.status, expected, `${method} ${path}: ${JSON.stringify(r.data)}`)
  return r.data
}
const form = new FormData()
const png = await sharp({ create: { width: 32, height: 20, channels: 3, background: '#627c77' } }).png().toBuffer()
form.append('meta', JSON.stringify({ filename: 'responsive-fixture.png', w: 32, h: 20, color: '#627c77', sizes: [32] }))
form.append('w32', new Blob([await sharp(png).webp().toBuffer()], { type: 'image/webp' }), '32.webp')
form.append('original', new Blob([png], { type: 'image/png' }), 'fixture.png')
const media = await api('POST', '/api/media', form, 201)
const content = { ...project(), cover: media.id, hero: media.id }
const { id: pid } = await api('POST', '/api/projects', { content }, 201)
await api('POST', `/api/projects/${pid}/publish`)
const { id: aid } = await api('POST', '/api/articles', { content: { ...article(), cover: media.id } }, 201)
await api('POST', `/api/articles/${aid}/publish`)
await api('POST', '/api/locations/areas', { label: 'Daerah Istimewa Yogyakarta' }, 201)
const { areas } = await api('GET', '/api/locations')
await api('POST', '/api/locations/cities', { name: 'Kabupaten Sleman', area_id: areas[0].id }, 201)
await api('PUT', '/api/pages', { pages: { categories: Object.fromEntries(['commercial', 'hospitality', 'residential'].map(cat => [cat, { highlight: cat === 'residential' ? [content.slug] : [], selected: cat === 'residential' ? [content.slug] : [], hero: media.id }])) } })
// HTTPS exercises the production Secure session cookie in WebKit as well as Chrome/Firefox.
const tlsDir = mkdtempSync(join(tmpdir(), 'kadang-test-tls-'))
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(tlsDir, 'key.pem'), '-out', join(tlsDir, 'cert.pem'), '-days', '1', '-subj', '/CN=127.0.0.1'], { stdio: 'ignore' })
const servers = await startServers(env, { tls: { key: readFileSync(join(tlsDir, 'key.pem')), cert: readFileSync(join(tlsDir, 'cert.pem')) } })
const screenshotDir = join(tmpdir(), 'kadang-admin-responsive')
mkdirSync(screenshotDir, { recursive: true })
const names = (process.env.BROWSERS || 'chromium').split(',')
let browser, currentPage, checks = 0
const errors = []
try {
  for (const name of names) {
    const type = { chromium, firefox, webkit }[name]
    assert.ok(type, `Unknown browser ${name}`)
    const executablePath = name === 'chromium' ? [process.env.CHROME_BIN, '/usr/bin/google-chrome', chromium.executablePath()].find(p => p && existsSync(p)) : process.env[`${name.toUpperCase()}_BIN`]
    browser = await type.launch({ executablePath, headless: true, ...(name === 'chromium' ? { args: ['--no-sandbox'] } : {}) })
    const context = await browser.newContext({ ignoreHTTPSErrors: true, reducedMotion: 'reduce', viewport: { width: 390, height: 844 }, hasTouch: true })
    const page = await context.newPage()
    currentPage = page
    page.setDefaultTimeout(15000)
    let loggedIn = false
    page.on('pageerror', e => errors.push(`${name}: ${e.message}`))
    page.on('dialog', d => d.accept())
    const check = async label => {
      await page.evaluate(() => document.fonts.ready)
      const problems = await page.evaluate(() => {
        const width = innerWidth, issues = []
        const shown = e => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden' && !e.closest('[aria-hidden="true"], [hidden]') }
        for (const e of document.querySelectorAll('.admin-scroll, main, [role="dialog"], [role="alertdialog"]')) {
          if (!shown(e)) continue
          const r = e.getBoundingClientRect()
          if (r.left < -1 || r.right > width + 1 || (e.scrollWidth > e.clientWidth + 2 && !['hidden', 'clip'].includes(getComputedStyle(e).overflowX))) issues.push(`${e.tagName}.${e.className}: bounds ${r.left}..${r.right}, scroll ${e.scrollWidth}/${e.clientWidth}`)
        }
        for (const e of document.querySelectorAll('input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]')) {
          if (shown(e) && parseFloat(getComputedStyle(e).fontSize) < 16) issues.push(`Small input ${e.getAttribute('aria-label') || e.placeholder}: ${getComputedStyle(e).fontSize}`)
        }
        return issues
      })
      if (problems.length) {
        console.log(await page.locator('main *').evaluateAll(elements => elements.filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 2 }).map(e => ({ tag: e.tagName, cls: e.className, text: e.textContent?.slice(0, 80), width: e.getBoundingClientRect().width }))))
        await page.screenshot({ path: join(screenshotDir, `${name}-failure.png`) })
      }
      assert.deepEqual(problems, [], `${name}: ${label}`)
      checks++
    }
    for (const width of (process.env.WIDTHS || '320,390,640,768,1024,1280,1440,1920').split(',').map(Number)) {
      await page.setViewportSize({ width, height: width === 640 ? 360 : 900 })
      if (!loggedIn) {
        await page.goto(servers.admin)
        await page.getByPlaceholder('nama pengguna').waitFor()
        await check('login')
        await page.getByPlaceholder('nama pengguna').fill('custompedia')
        await page.getByPlaceholder('••••••••').fill('12345')
        await page.getByRole('button', { name: 'Tampilkan password' }).click()
        assert.equal(await page.getByPlaceholder('••••••••').getAttribute('type'), 'text')
        await page.getByRole('button', { name: 'Masuk', exact: true }).click()
        await page.getByRole('heading', { name: 'Halo, Custompedia', exact: true }).waitFor()
        loggedIn = true
      }
      for (const path of ['/', '/projects', '/articles', `/projects/${pid}`, '/projects/new', `/articles/${aid}`, '/articles/new', '/media', '/pages/work', '/pages/commercial', '/pages/hospitality', '/pages/residential', '/locations', '/users', '/monitoring', '/profile', '/articleflow']) {
        await page.goto(servers.admin + path)
        await page.locator('.admin-page main h1').waitFor()
        await check(`${width}px ${path}`)
      }
      if (width < 768) {
        await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click()
        const nav = page.locator('[data-sidebar="sidebar"][data-mobile="true"]')
        await nav.locator('a', { hasText: 'Projek' }).first().click()
        await page.waitForURL('**/projects')
        await page.waitForFunction(() => document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]')?.getAttribute('aria-hidden') === 'true')
        await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click()
        await page.getByRole('button', { name: 'Tutup navigasi', exact: true }).click()
        await page.waitForFunction(() => document.querySelector('[data-sidebar="sidebar"][data-mobile="true"]')?.getAttribute('aria-hidden') === 'true')
      }
      if (fakeTech) {
        await page.goto(servers.admin + '/articleflow')
        await page.getByText('Klik dari Google', { exact: true }).waitFor()
        await check(`${width}px ArticleFlow with data`)
        // approving on a phone: every control of the page is a comfortable touch target
        if (width < 768) {
          const small = await page.locator('.admin-page main').locator('button, a[href]').evaluateAll(els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && r.height < 43.5 }).map(e => `${e.textContent?.trim().slice(0, 30)} ${Math.round(e.getBoundingClientRect().height)}px`))
          assert.deepEqual(small, [], `${name} ${width}px: ArticleFlow touch targets`)
        }
        for (const tab of ['Disetujui', 'Minta revisi', 'Tayang', 'Menunggu']) {
          await page.getByRole('navigation', { name: 'Status artikel' }).getByRole('button', { name: new RegExp(`^${tab}`) }).click()
          await check(`${width}px ArticleFlow tab ${tab}`)
        }
        await page.getByRole('button', { name: 'Pratinjau', exact: true }).first().click()
        await page.locator('iframe[title="Pratinjau artikel"]').waitFor({ timeout: 60000 })
        await check(`${width}px ArticleFlow preview`)
        // below the desktop breakpoint the page and the "Kenapa artikel ini" panel are stacked, never side by side,
        // and Publish stays inside the dialog's visible area
        const boxes = await page.evaluate(() => { const b = s => document.querySelector(s).getBoundingClientRect(); const d = b('[role="dialog"]'), f = b('iframe[title="Pratinjau artikel"]'), a = b('[role="dialog"] aside'); const p = [...document.querySelectorAll('[role="dialog"] button')].find(e => e.textContent.includes('Publish')).getBoundingClientRect(); return { stacked: a.top >= f.bottom - 1, beside: a.left >= f.right - 1, publishInView: p.top >= d.top && p.bottom <= d.bottom + 1 && p.bottom <= innerHeight, publishHeight: p.height } })
        assert.equal(width < 1024 ? boxes.stacked : boxes.beside, true, `${name} ${width}px: preview layout ${JSON.stringify(boxes)}`)
        assert.equal(boxes.publishInView, true, `${name} ${width}px: Publish reachable ${JSON.stringify(boxes)}`)
        if (width < 768) assert.ok(boxes.publishHeight >= 44, `${name} ${width}px: Publish height ${boxes.publishHeight}`)
        await page.getByRole('button', { name: 'Minta revisi', exact: true }).click()
        await page.getByLabel('Alasan revisi').waitFor()
        await check(`${width}px ArticleFlow reason`)
        await page.getByRole('button', { name: 'Batal', exact: true }).click()
        await page.getByRole('button', { name: 'Tutup', exact: true }).click()
        // the subscription has ended: the popup, then the locked page
        fakeTech.state.mode = 'expired'
        await page.goto(servers.admin + '/articleflow')
        await page.getByRole('alertdialog').waitFor()
        await check(`${width}px ArticleFlow expired popup`)
        await page.getByRole('alertdialog').getByRole('button', { name: 'Tutup', exact: true }).click()
        await page.getByRole('button', { name: 'Lihat keterangan', exact: true }).waitFor()
        await check(`${width}px ArticleFlow locked`)
        fakeTech.state.mode = 'active'
      }
      await page.goto(`${servers.admin}/projects/${pid}`)
      await page.getByRole('button', { name: 'Ganti foto', exact: true }).first().click()
      await page.getByRole('dialog', { name: 'Pilih foto', exact: true }).waitFor()
      await check(`${width}px media picker`)
      await page.keyboard.press('Escape')
      await page.goto(servers.admin + '/pages/residential')
      await page.getByRole('button', { name: 'Tambah projek', exact: true }).click()
      await page.getByRole('dialog', { name: 'Tambah projek', exact: true }).waitFor()
      await check(`${width}px project picker`)
      await page.keyboard.press('Escape')
      if (width < 768) await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click()
      await page.getByRole('button', { name: /Cari cepat/ }).click()
      await page.getByRole('dialog', { name: 'Cari cepat', exact: true }).waitFor()
      await page.getByPlaceholder('Cari projek, artikel, dan halaman…').fill('Profil')
      await check(`${width}px quick search`)
      await page.getByPlaceholder('Cari projek, artikel, dan halaman…').press('Enter')
      await page.waitForURL('**/profile')
      await page.getByRole('heading', { name: 'Profil', exact: true }).waitFor()
      await page.waitForLoadState('load')
      await page.goto(servers.admin + '/users')
      await page.getByRole('button', { name: 'Tambah pengguna', exact: true }).click()
      await page.getByRole('dialog').waitFor()
      await check(`${width}px user dialog`)
      await page.keyboard.press('Escape')
      await page.goto(servers.admin + '/locations')
      await page.getByRole('button', { name: 'Tambah area', exact: true }).click()
      await page.getByRole('dialog').waitFor()
      await check(`${width}px location dialog`)
      await page.keyboard.press('Escape')
      await page.goto(servers.admin + '/media')
      await page.locator('main li button').first().click()
      await page.getByRole('dialog').waitFor()
      await check(`${width}px media details`)
      await page.keyboard.press('Escape')
      await page.goto(`${servers.admin}/articles/${aid}`)
      await page.locator('.article-canvas-title').fill(`Judul ${name} ${width}: artikel panjang untuk memastikan seluruh judul terlihat dan tidak terpotong ketika layar diperkecil atau bahasa diganti`)
      assert.ok(await page.locator('.article-canvas-title').evaluate(e => e.clientHeight >= e.scrollHeight - 2))
      if (width < 1280) await page.getByRole('button', { name: 'Publikasi', exact: true }).click()
      await page.getByRole('button', { name: 'Simpan', exact: true }).waitFor()
      await check(`${width}px publication panel`)
      const saved = page.waitForResponse(r => r.url().endsWith(`/api/articles/${aid}`) && r.request().method() === 'PUT')
      await page.getByRole('button', { name: 'Simpan', exact: true }).click()
      assert.equal((await saved).status(), 200)
      if (width === 320 || width === 1280) await page.screenshot({ path: join(screenshotDir, `${name}-${width}-publication.png`) })
      if (width < 1280) await page.keyboard.press('Escape')
      console.log(`PASS ${name} ${width}px: all admin routes, navigation, dialogs, article save`)
    }
    await context.close()
    await browser.close()
    browser = null
  }
  assert.deepEqual(errors, [])
  console.log(`All ${checks} responsive checks passed. Screenshots: ${screenshotDir}`)
} catch (error) {
  if (currentPage && !currentPage.isClosed()) {
    console.log(await currentPage.evaluate(() => ({ width: innerWidth, mobile: matchMedia('(max-width:767px)').matches, buttons: [...document.querySelectorAll('button')].map(e => e.getAttribute('aria-label') || e.textContent).slice(0, 20) })))
    await currentPage.screenshot({ path: join(screenshotDir, 'last-failure.png') })
  }
  throw error
} finally {
  await browser?.close()
  await servers.close()
  await fakeTech?.close()
}
