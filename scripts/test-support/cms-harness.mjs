/** Execute the real Worker handlers against disposable SQLite databases and in-memory buckets. */
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { build } from 'esbuild'
import { existsSync } from 'node:fs'
import { readFile, writeFile, readdir, mkdtemp } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

export const root = fileURLToPath(new URL('../../', import.meta.url))
const directory = await mkdtemp(join(tmpdir(), 'kadang-cms-tests-'))
const compiled = await build({
  stdin: {
    resolveDir: root,
    contents: `
      export { default as worker } from './admin/worker/index.ts';
      export { handlePublic } from './shared/public-api.ts';
      export { publishIssues } from './admin/worker/content.ts';
      export { cleanupMedia } from './admin/worker/media.ts';
    `,
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
})
const modulePath = join(directory, 'worker.mjs')
await writeFile(modulePath, compiled.outputFiles[0].contents)
export const { worker, handlePublic, publishIssues, cleanupMedia } = await import(pathToFileURL(modulePath).href)

class TestD1 {
  constructor() {
    this.db = new DatabaseSync(':memory:')
    this.failOnSql = null
  }

  prepare(sql) {
    const make = values => ({
      bind: (...next) => make(next),
      first: async column => {
        const row = this.db.prepare(sql).get(...values) ?? null
        return row && column ? row[column] : row
      },
      all: async () => ({ results: this.db.prepare(sql).all(...values), success: true, meta: {} }),
      run: async () => {
        if (this.failOnSql && sql.includes(this.failOnSql)) throw new Error('Injected transaction failure')
        const statement = this.db.prepare(sql)
        if (statement.columns().length) return { results: statement.all(...values), success: true, meta: { size_after: 0 } }
        const result = statement.run(...values)
        return { results: [], success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid), size_after: 0 } }
      },
    })
    return make([])
  }

  // D1 batches are atomic. Preserve that contract so rollback assertions are meaningful.
  async batch(statements) {
    this.db.exec('BEGIN')
    try {
      const results = []
      for (const statement of statements) results.push(await statement.run())
      this.db.exec('COMMIT')
      return results
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
}

class TestBucket {
  constructor() { this.objects = new Map() }
  async put(key, value, options) {
    this.objects.set(key, { bytes: new Uint8Array(await new Response(value).arrayBuffer()), options })
  }
  async get(key) {
    const item = this.objects.get(key)
    return item ? { body: item.bytes, httpEtag: '"fixture"' } : null
  }
  async delete(keys) {
    for (const key of Array.isArray(keys) ? keys : [keys]) this.objects.delete(key)
  }
}

export async function makeEnv() {
  const env = {
    AUTH_DB: new TestD1(), CONTENT_DB: new TestD1(), MEDIA_DB: new TestD1(),
    MEDIA: new TestBucket(), ORIGINALS: new TestBucket(),
    PUBLIC_SITE_URL: 'http://127.0.0.1:5299',
    ASSETS: { fetch: async () => new Response('asset', { status: 404 }) },
  }
  for (const [binding, subdirectory] of [['AUTH_DB', 'auth'], ['CONTENT_DB', 'content'], ['MEDIA_DB', 'media']]) {
    const path = resolve(root, 'admin/migrations', subdirectory)
    for (const file of (await readdir(path)).filter(name => name.endsWith('.sql')).sort()) {
      env[binding].db.exec(await readFile(resolve(path, file), 'utf8'))
    }
  }
  // an optional add-on keeps its tables next to its code (admin/articleflow); absent once the add-on is removed
  const addon = resolve(root, 'admin/articleflow/migrations/0001_articleflow.sql')
  if (existsSync(addon)) env.CONTENT_DB.db.exec(await readFile(addon, 'utf8'))
  return env
}

export function setupCache() {
  const entries = new Map()
  const key = request => typeof request === 'string' ? request : request.url
  globalThis.caches = { default: {
    match: async request => entries.get(key(request))?.clone(),
    put: async (request, response) => { entries.set(key(request), response.clone()); await response.arrayBuffer() },
    delete: async request => entries.delete(key(request)),
  } }
  return entries
}

export function client(env) {
  let cookie = ''
  const pending = []
  const ctx = { waitUntil: promise => pending.push(promise), passThroughOnException() {} }
  return {
    ctx, env,
    get cookie() { return cookie },
    async request(method, path, body, { auth = true } = {}) {
      const headers = { 'x-requested-with': 'kadanglabo-admin', ...(auth && cookie ? { cookie } : {}) }
      if (body !== undefined && !(body instanceof FormData)) headers['content-type'] = 'application/json'
      const request = new Request('http://localhost' + path, {
        method, headers, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      })
      const response = await worker.fetch(request, env, ctx)
      const replacement = response.headers.get('set-cookie')
      if (replacement && auth) cookie = replacement.split(';')[0]
      let data
      try { data = await response.clone().json() } catch { data = await response.clone().text() }
      await Promise.allSettled(pending.splice(0))
      return { status: response.status, data, res: response }
    },
    async login(username = 'custompedia', password = '12345') {
      return this.request('POST', '/api/auth/login', { username, password })
    },
  }
}

export const tx = text => ({ id: text, en: text })
export const rich = text => Object.fromEntries(['id', 'en'].map(lang => [lang, { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }]))
export const project = (slug = 'hmw-house', title = 'Project fixture') => ({
  slug, title, category: 'residential', archiveOnly: false, typology: tx('House'),
  location: 'Yogyakarta', region: 'Sleman', year: 2026, status: 'built', scope: [],
  color: '#1B2238', accent: '#EC6434', tagline: tx('Tagline'), summary: rich('Opening'),
  story: [], hero: 'image-fixture', cover: 'image-fixture', gallery: [],
})
export const article = (slug = 'article-fixture') => ({
  slug, type: 'news', tag: tx('Talk'), title: tx('Article fixture'), date: '',
  excerpt: tx('Excerpt'), cover: 'image-fixture', body: rich('Article copy'),
})
export const pause = () => new Promise(resolve => setTimeout(resolve, 5))
