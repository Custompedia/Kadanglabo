import { createServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { root, worker, handlePublic } from './cms-harness.mjs'

const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp', '.json': 'application/json' }
async function assets(request, directory) {
  const base = resolve(root, directory), pathname = new URL(request.url).pathname
  const file = resolve(base, '.' + pathname)
  if (file !== base && !file.startsWith(base + sep)) return new Response('Not found', { status: 404 })
  try {
    return new Response(await readFile(file), { headers: { 'content-type': mime[extname(file)] || 'application/octet-stream' } })
  } catch {
    return new Response(await readFile(resolve(base, 'index.html')), { headers: { 'content-type': 'text/html' } })
  }
}

export async function startServers(env, { tls } = {}) {
  const protocol = tls ? 'https' : 'http'
  const servers = []
  const start = async admin => {
    const server = (tls ? createHttpsServer.bind(null, tls) : createServer)(async (incoming, outgoing) => {
      try {
        const chunks = []
        for await (const chunk of incoming) chunks.push(chunk)
        const request = new Request(`${protocol}://127.0.0.1:${server.address().port}${incoming.url}`, {
          method: incoming.method, headers: incoming.headers, body: chunks.length ? Buffer.concat(chunks) : undefined,
        })
        const pending = [], context = { waitUntil: promise => pending.push(promise), passThroughOnException() {} }
        const response = admin
          ? await worker.fetch(request, { ...env, ASSETS: { fetch: req => assets(req, 'admin/dist/client') } }, context)
          : await handlePublic(request, env, context) ?? await assets(request, 'dist')
        outgoing.writeHead(response.status, Object.fromEntries(response.headers))
        outgoing.end(Buffer.from(await response.arrayBuffer()))
        await Promise.allSettled(pending)
      } catch (error) {
        outgoing.writeHead(500)
        outgoing.end(error.message)
      }
    })
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
    servers.push(server)
    return `${protocol}://127.0.0.1:${server.address().port}`
  }
  const admin = await start(true), web = await start(false)
  env.PUBLIC_SITE_URL = web
  return { admin, web, close: () => Promise.all(servers.map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections() }))) }
}
