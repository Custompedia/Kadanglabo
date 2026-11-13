import { readdir, stat, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import type { Plugin } from 'vite'
import { BUILD_INFO_FILE, type BuildInfo } from './build-info.ts'

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])))
  return nested.flat()
}

/**
 * Writes build-info.json into the browser build's output once everything (public files included) is written: when
 * it was built, how many files go up as static assets and how large they are, and the largest one (Workers serves at
 * most 25 MiB per file). Only the client build: the Worker bundle is not a static asset.
 */
export function buildInfo(): Plugin {
  let outDir = ''
  return {
    name: 'kadanglabo-build-info',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const env = (this as { environment?: { name: string; config: { root: string; build: { outDir: string } } } }).environment
      if (env && env.name !== 'client') return
      const dir = env ? resolve(env.config.root, env.config.build.outDir) : outDir
      const files = (await walk(dir)).filter((f) => !f.endsWith(BUILD_INFO_FILE))
      const sizes = await Promise.all(files.map(async (f) => ({ path: relative(dir, f), bytes: (await stat(f)).size })))
      const largest = sizes.reduce((a, b) => (b.bytes > a.bytes ? b : a), { path: '', bytes: 0 })
      const info: BuildInfo = { builtAt: new Date().toISOString(), files: sizes.length, bytes: sizes.reduce((n, f) => n + f.bytes, 0), largest }
      await writeFile(join(dir, BUILD_INFO_FILE), JSON.stringify(info))
    },
  }
}
