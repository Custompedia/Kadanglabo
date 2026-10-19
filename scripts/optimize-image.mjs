// Tambah / ganti gambar: membuat WebP responsif (640/1280/1920) + mendaftarkannya di src/data/images.json.
// Pemakaian:  npm run img -- <key> <path-gambar>
// Contoh:     npm run img -- wira-living "~/Downloads/Interior ruang keluarga 1.png"
// Setelah itu gunakan <Img id="wira-living" /> atau isi key-nya di src/data/projects.ts.
// Gambar transparan (PNG potongan tanpa latar): tambahkan --alpha agar transparansinya tetap ada.
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const keepAlpha = args.includes('--alpha')
const [key, src] = args.filter((a) => a !== '--alpha')

if (!key || !src || !/^[a-z0-9-]+$/.test(key)) {
  console.error('Pemakaian: npm run img -- <key-huruf-kecil-dan-strip> <path-gambar>')
  process.exit(1)
}

const outDir = path.join(root, 'public/img')
const manifestPath = path.join(root, 'src/data/images.json')

let pipeline = sharp(src, { limitInputPixels: false })
  .rotate()
  .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
if (!keepAlpha) pipeline = pipeline.removeAlpha()
const master = await pipeline.png().toBuffer({ resolveWithObject: true })

const { width, height } = master.info
const sizes = [...new Set([640, 1280, 1920].filter((w) => w < width).concat(width))]

for (const w of sizes) {
  await sharp(master.data)
    .resize({ width: w })
    .webp({ quality: keepAlpha ? 80 : 70, alphaQuality: 90, effort: 5 })
    .toFile(path.join(outDir, `${key}-${w}.webp`))
}

const { dominant } = await sharp(master.data).stats()
// transparent cut-outs get no placeholder colour: the page shows through while they load
const color = keepAlpha ? 'transparent' : '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('')

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
manifest[key] = { w: width, h: height, c: color, s: sizes }
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n')

console.log(`✓ ${key}: ${width}×${height}, ukuran ${sizes.join('/')}px`)
