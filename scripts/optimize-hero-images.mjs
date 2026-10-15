// Export the GPT Image restorations as responsive, high-quality hero assets.
// Run: node scripts/optimize-hero-images.mjs
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = path.join(root, 'src/data/images.json')
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const keys = ['balecatur-front', 'labarka-bird', 'klinik-hero', 'hmw-facade', 'firlatata-front']
const sizes = [640, 1280, 1920, 2560, 3840]

for (const key of keys) {
  const original = manifest[key]
  // Keep the original aspect ratio and crop; only the raster definition changes.
  const height = Math.round(3840 * original.h / original.w)
  const master = await sharp(path.join(root, 'assets/hero', `${key}-gpt.png`))
    .rotate()
    .resize({ width: 3840, height, fit: 'fill', kernel: 'lanczos3' })
    .removeAlpha()
    .png()
    .toBuffer()

  for (const width of sizes) {
    await sharp(master)
      .resize({ width })
      .webp({ quality: 88, effort: 6 })
      .toFile(path.join(root, 'public/img', `${key}-hd-${width}.webp`))
  }

  manifest[`${key}-hd`] = { w: 3840, h: height, c: original.c, s: sizes }
  console.log(`${key}-hd: 3840×${height}; ${sizes.join('/')}px`)
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 1) + '\n')
