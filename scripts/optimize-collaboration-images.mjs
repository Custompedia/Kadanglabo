// Preserve the generated cutouts' transparency when exporting responsive WebP.
// Run: node scripts/optimize-collaboration-images.mjs
// Service illustrations: node scripts/optimize-collaboration-images.mjs services-process
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(root, 'src/data/images.json')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const collections = {
  collaboration: ['collab-client', 'collab-planner', 'collab-builder', 'collab-together'],
  'services-process': ['process-brief', 'process-analysis', 'process-creative', 'process-deliverables'],
}
const collection = process.argv[2] ?? 'collaboration'
const keys = collections[collection]
if (!keys) throw new Error(`Unknown illustration collection: ${collection}`)

for (const key of keys) {
  const source = path.join(root, 'assets', collection, `${key}.png`)
  const metadata = await sharp(source).metadata()
  if (!metadata.hasAlpha) throw new Error(`${key}: expected a transparent generated cutout`)
  const size = Math.min(metadata.width, metadata.height, 1536)
  const contentSize = Math.round(size * 0.88)
  const padding = Math.floor((size - contentSize) / 2)
  const master = await sharp(source)
    .trim()
    .resize({ width: contentSize, height: contentSize, fit: 'contain', background: '#00000000' })
    .extend({ top: padding, left: padding, bottom: size - contentSize - padding, right: size - contentSize - padding, background: '#00000000' })
    .png()
    .toBuffer()
  const sizes = [...new Set([384, 768, size].filter(w => w <= size))].sort((a, b) => a - b)

  for (const width of sizes) {
    await sharp(master).resize({ width }).webp({ quality: 90, alphaQuality: 100, effort: 4 })
      .toFile(path.join(root, 'public/img', `${key}-${width}.webp`))
  }
  manifest[key] = { w: size, h: size, c: '#f3f0ea', s: sizes }
  console.log(`${key}: ${size}×${size}, transparent; ${sizes.join('/')}px`)
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 1) + '\n')
