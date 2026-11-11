// Home (02): the house that builds itself. Three renders of one model from the same camera (ground floor only,
// upper floor without roof, finished house) become three stacked cut-outs: the ground floor whole, then only what
// each next render adds on top of the one before. Stacked they are the finished render again, so each layer
// can settle into place on its own (src/components/ServiceSketch.tsx).
// Run:   node scripts/build-model-layers.mjs
// Other renders (same size, same camera, transparent background):
//        node scripts/build-model-layers.mjs <ground.png> <upper.png> <finished.png>
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public/img')
const manifestPath = path.join(root, 'src/data/images.json')
const keys = ['build-ground', 'build-upper', 'build-roof']
const defaults = ['house-1-ground.png', 'house-2-upper.png', 'house-3-roof.png'].map((f) => path.join(root, 'assets/model', f))
const files = process.argv.length >= 5 ? process.argv.slice(2, 5) : defaults

const PAD = 6 // empty paper kept around the model
const GROW = 2 // a layer reaches this far into pixels both renders share, so its soft edge never shows a seam

const renders = await Promise.all(
  files.map((f) => sharp(f, { limitInputPixels: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })),
)
const { width: W, height: H } = renders[0].info
if (renders.some((r) => r.info.width !== W || r.info.height !== H)) {
  console.error('The three renders must have the same size (same camera, same canvas).')
  process.exit(1)
}
const px = renders.map((r) => r.data)

// crop: everything any of the renders draws
let x0 = W, y0 = H, x1 = 0, y1 = 0
for (let i = 0, p = 3; i < W * H; i++, p += 4) {
  if (!(px[0][p] | px[1][p] | px[2][p])) continue
  const x = i % W, y = (i / W) | 0
  if (x < x0) x0 = x
  if (x > x1) x1 = x
  if (y < y0) y0 = y
  if (y > y1) y1 = y
}
x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD)
x1 = Math.min(W - 1, x1 + PAD); y1 = Math.min(H - 1, y1 + PAD)
const cw = x1 - x0 + 1, ch = y1 - y0 + 1

/** Pixels where `top` differs from `below`, grown a little and with enclosed gaps closed: one solid piece. */
function added(top, below) {
  let mask = new Uint8Array(W * H)
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    if (!top[p + 3] && !below[p + 3]) continue
    if (Math.abs(top[p] - below[p]) > 3 || Math.abs(top[p + 1] - below[p + 1]) > 3 ||
        Math.abs(top[p + 2] - below[p + 2]) > 3 || Math.abs(top[p + 3] - below[p + 3]) > 3) mask[i] = 1
  }
  for (let n = 0; n < GROW; n++) {
    const next = new Uint8Array(mask)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        if (mask[i]) continue
        if ((x > 0 && mask[i - 1]) || (x < W - 1 && mask[i + 1]) || (y > 0 && mask[i - W]) || (y < H - 1 && mask[i + W])) next[i] = 1
      }
    mask = next
  }
  // gaps the flood from the canvas edge cannot reach are inside the piece: they travel with it
  const outside = new Uint8Array(W * H)
  const stack = []
  const visit = (i) => { if (!mask[i] && !outside[i]) { outside[i] = 1; stack.push(i) } }
  for (let x = 0; x < W; x++) { visit(x); visit((H - 1) * W + x) }
  for (let y = 0; y < H; y++) { visit(y * W); visit(y * W + W - 1) }
  while (stack.length) {
    const i = stack.pop(), x = i % W
    if (x > 0) visit(i - 1)
    if (x < W - 1) visit(i + 1)
    if (i >= W) visit(i - W)
    if (i < W * (H - 1)) visit(i + W)
  }
  const out = Buffer.alloc(W * H * 4)
  for (let i = 0, p = 0; i < W * H; i++, p += 4) {
    if (outside[i]) continue
    if (!top[p + 3] && below[p + 3]) console.warn('! a layer would have to erase the one below at', i % W, (i / W) | 0)
    top.copy(out, p, p, p + 4)
  }
  return out
}

const layers = [px[0], added(px[1], px[0]), added(px[2], px[1])]
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
// the renders are small: the larger file is a Lanczos upscale, cleaner on dense screens than the browser's own
const sizes = [cw, cw * 2]

for (const [n, key] of keys.entries()) {
  const cut = await sharp(layers[n], { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: cw, height: ch })
    .png()
    .toBuffer()
  for (const w of sizes) {
    await sharp(cut)
      .resize({ width: w, kernel: 'lanczos3' })
      .webp({ quality: 84, alphaQuality: 100, effort: 6 })
      .toFile(path.join(outDir, `${key}-${w}.webp`))
  }
  manifest[key] = { w: cw * 2, h: ch * 2, c: 'transparent', s: sizes }
  console.log(`✓ ${key}: ${sizes.join('/')}px`)
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n')
