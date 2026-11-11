// Home (02): the sketch that becomes a building. Three renders of one model from the same camera (ground floor
// only, upper floor without roof, finished house) give:
//   build-full    the finished house, cut out
//   build-sketch  the same house as a line drawing (ink on transparent), drawn from the render's own edges
//   build-parts   the finished house cut into its parts along the drawing's own lines (window panes, wall panels,
//                 floor slabs, steps, canopy, roof planes ...), packed into one sheet
//   src/data/model-parts.json   where each part sits and in which order it goes up (storey by storey, each piece
//                 next to ones already placed, like a puzzle), and the sketch as pencil strokes: the lines traced into
//                 paths, so the page can draw them the way a hand would.
// On the page the sketch is drawn stroke by stroke, then the parts fly onto it (src/components/ServiceSketch.tsx).
// Run:   node scripts/build-model-parts.mjs
// Other renders (same size, same camera, transparent background):
//        node scripts/build-model-parts.mjs <ground.png> <upper.png> <finished.png>
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public/img')
const manifestPath = path.join(root, 'src/data/images.json')
const partsPath = path.join(root, 'src/data/model-parts.json')
const defaults = ['house-1-ground.png', 'house-2-upper.png', 'house-3-roof.png'].map((f) => path.join(root, 'assets/model', f))
const files = process.argv.length >= 5 ? process.argv.slice(2, 5) : defaults

const PAD = 6 // empty paper kept around the model
const COLOURS = 12 // the render is reduced to this many colours to find its parts
const WALL = 0.45 // a sketch line at least this strong parts two pieces
const CORE = 1 // a part needs a patch this many pixels clear of any line or other colour to count ...
const MIN_AREA = Number(process.env.MIN_AREA || 0.00006) // ... and this share of the picture (smaller bits join their neighbour)
const STROKE_MIN = 5 // px: shorter traces are left to the sketch image itself
const OVERLAP = 2 // parts reach this far into their neighbours, so no seam shows where two meet
const GAP = 2 // clear pixels between parts on the sheet
const INK = [38, 40, 48] // the sketch line

const renders = await Promise.all(
  files.map((f) => sharp(f, { limitInputPixels: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })),
)
const { width: FW, height: FH } = renders[0].info
if (renders.some((r) => r.info.width !== FW || r.info.height !== FH)) {
  console.error('The three renders must have the same size (same camera, same canvas).')
  process.exit(1)
}

// ---- crop: everything any of the renders draws -----------------------------------------------------------------
let x0 = FW, y0 = FH, x1 = 0, y1 = 0
for (let i = 0, p = 3; i < FW * FH; i++, p += 4) {
  if (!(renders[0].data[p] | renders[1].data[p] | renders[2].data[p])) continue
  const x = i % FW, y = (i / FW) | 0
  if (x < x0) x0 = x
  if (x > x1) x1 = x
  if (y < y0) y0 = y
  if (y > y1) y1 = y
}
x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD)
x1 = Math.min(FW - 1, x1 + PAD); y1 = Math.min(FH - 1, y1 + PAD)
const W = x1 - x0 + 1, H = y1 - y0 + 1, N = W * H
const crop = (data) => {
  const out = Buffer.alloc(N * 4)
  for (let y = 0; y < H; y++) data.copy(out, y * W * 4, ((y + y0) * FW + x0) * 4, ((y + y0) * FW + x0 + W) * 4)
  return out
}
const [ground, upper, full] = renders.map((r) => crop(r.data))
const raw = { raw: { width: W, height: H, channels: 4 } }

// ---- small tools on W x H maps ---------------------------------------------------------------------------------
const near = (i, fn) => {
  const x = i % W
  if (x > 0) fn(i - 1)
  if (x < W - 1) fn(i + 1)
  if (i >= W) fn(i - W)
  if (i < N - W) fn(i + W)
}
function grow(mask, times) {
  for (let n = 0; n < times; n++) {
    const next = new Uint8Array(mask)
    for (let i = 0; i < N; i++) if (!mask[i]) near(i, (j) => { if (mask[j]) next[i] = 1 })
    mask = next
  }
  return mask
}
/** Where `top` differs from `below`, grown a little and with enclosed gaps closed: what that render adds. */
function added(top, below) {
  let mask = new Uint8Array(N)
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    if (!top[p + 3] && !below[p + 3]) continue
    if (Math.abs(top[p] - below[p]) > 3 || Math.abs(top[p + 1] - below[p + 1]) > 3 ||
        Math.abs(top[p + 2] - below[p + 2]) > 3 || Math.abs(top[p + 3] - below[p + 3]) > 3) mask[i] = 1
  }
  mask = grow(mask, 2)
  const outside = new Uint8Array(N)
  const stack = []
  const visit = (i) => { if (!mask[i] && !outside[i]) { outside[i] = 1; stack.push(i) } }
  for (let x = 0; x < W; x++) { visit(x); visit(N - W + x) }
  for (let y = 0; y < H; y++) { visit(y * W); visit(y * W + W - 1) }
  while (stack.length) near(stack.pop(), visit)
  return outside.map((o) => 1 - o)
}

// ---- which storey every pixel of the finished house belongs to --------------------------------------------------
const roofAdds = added(full, upper), upperAdds = added(upper, ground)
const storey = new Uint8Array(N) // 0 = paper
for (let i = 0; i < N; i++) if (full[i * 4 + 3]) storey[i] = roofAdds[i] ? 3 : upperAdds[i] ? 2 : 1

// ---- the house in a few flat colours (lines and grain smoothed away first) ---------------------------------------
const calm = await sharp(full, raw).median(5).raw().toBuffer()
let seed = 7
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
const inked = []
for (let i = 0; i < N; i++) if (storey[i]) inked.push(i)
const sample = Array.from({ length: 30000 }, () => inked[(rand() * inked.length) | 0])
const d2 = (i, c) => (calm[i * 4] - c[0]) ** 2 + (calm[i * 4 + 1] - c[1]) ** 2 + (calm[i * 4 + 2] - c[2]) ** 2
const rgb = (i) => [calm[i * 4], calm[i * 4 + 1], calm[i * 4 + 2]]
const centres = [rgb(sample[0])]
while (centres.length < COLOURS) {
  // next centre: the sampled pixel farthest from every centre so far
  let best = sample[0], far = -1
  for (const i of sample) {
    const d = Math.min(...centres.map((c) => d2(i, c)))
    if (d > far) { far = d; best = i }
  }
  centres.push(rgb(best))
}
const nearest = (i) => {
  let k = 0, best = Infinity
  for (let c = 0; c < centres.length; c++) { const d = d2(i, centres[c]); if (d < best) { best = d; k = c } }
  return k
}
for (let round = 0; round < 12; round++) {
  const sum = centres.map(() => [0, 0, 0, 0])
  for (const i of sample) { const s = sum[nearest(i)]; s[0] += calm[i * 4]; s[1] += calm[i * 4 + 1]; s[2] += calm[i * 4 + 2]; s[3]++ }
  sum.forEach((s, c) => { if (s[3]) centres[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]] })
}
const kind = new Int16Array(N).fill(-1) // storey and colour together: a part never spans two storeys
for (const i of inked) kind[i] = storey[i] * 32 + nearest(i)

// ---- the sketch: the render's own edges as an ink line ----------------------------------------------------------
const grey = Buffer.alloc(N)
for (let i = 0, p = 0; i < N; i++, p += 4) {
  const a = full[p + 3] / 255 // over white paper
  grey[i] = Math.round((0.299 * full[p] + 0.587 * full[p + 1] + 0.114 * full[p + 2]) * a + 255 * (1 - a))
}
const one = { raw: { width: W, height: H, channels: 1 } }
const soft = await sharp(grey, one).blur(1.6).extractChannel(0).raw().toBuffer()
if (soft.length !== N) throw new Error('blurred sketch base has the wrong size')
const sketch = Buffer.alloc(N * 4)
const wall = new Uint8Array(N) // lines strong enough to part two pieces
for (let i = 0, p = 0; i < N; i++, p += 4) {
  // darker than its surroundings = a line (the classic dodge); flat areas, however dark, stay paper
  const dodge = Math.min(255, ((grey[i] + 10) * 255) / (soft[i] + 10))
  const line = Math.min(1, Math.max(0, (238 - dodge) / 90))
  sketch[p] = INK[0]; sketch[p + 1] = INK[1]; sketch[p + 2] = INK[2]
  sketch[p + 3] = Math.round(255 * line ** 0.8)
  if (line > WALL) wall[i] = 1
}


// ---- the sketch as pencil strokes: thin every line to its centre, then follow it as far as it runs straight -----
const skel = Uint8Array.from(wall)
for (let x = 0; x < W; x++) skel[x] = skel[N - W + x] = 0
for (let y = 0; y < H; y++) skel[y * W] = skel[y * W + W - 1] = 0
for (let changed = true; changed; ) {
  changed = false
  for (const step of [0, 1]) {
    const gone = []
    for (let i = W + 1; i < N - W - 1; i++) {
      if (!skel[i]) continue
      const p2 = skel[i - W], p3 = skel[i - W + 1], p4 = skel[i + 1], p5 = skel[i + W + 1]
      const p6 = skel[i + W], p7 = skel[i + W - 1], p8 = skel[i - 1], p9 = skel[i - W - 1]
      const around = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9
      if (around < 2 || around > 6) continue
      const turns = (!p2 && p3) + (!p3 && p4) + (!p4 && p5) + (!p5 && p6) + (!p6 && p7) + (!p7 && p8) + (!p8 && p9) + (!p9 && p2)
      if (turns !== 1) continue
      if (step === 0 ? !(p2 && p4 && p6) && !(p4 && p6 && p8) : !(p2 && p4 && p8) && !(p2 && p6 && p8)) gone.push(i)
    }
    if (gone.length) changed = true
    for (const i of gone) skel[i] = 0
  }
}
const around = [1, W + 1, W, W - 1, -1, -W - 1, -W, -W + 1]
const drawn = new Uint8Array(N)
/** Follow the line from the end of `pts` while it keeps its direction; a corner ends the stroke. */
function follow(pts) {
  for (;;) {
    const cur = pts[pts.length - 1], back = pts[Math.max(0, pts.length - 7)]
    const dx = (cur % W) - (back % W), dy = ((cur / W) | 0) - ((back / W) | 0), len = Math.hypot(dx, dy)
    let best = -1, straight = -Infinity
    for (const o of around) {
      const j = cur + o
      if (!skel[j] || drawn[j]) continue
      const ox = (j % W) - (cur % W), oy = ((j / W) | 0) - ((cur / W) | 0)
      const s = len ? (ox * dx + oy * dy) / (len * Math.hypot(ox, oy)) : 0
      if (s > straight) { straight = s; best = j }
    }
    if (best < 0 || (pts.length >= 5 && straight < 0.7)) return pts
    drawn[best] = 1
    pts.push(best)
  }
}
const ends = (i) => around.reduce((n, o) => n + skel[i + o], 0) === 1
const traces = []
for (const endsOnly of [true, false])
  for (let i = 0; i < N; i++) {
    if (!skel[i] || drawn[i] || (endsOnly && !ends(i))) continue
    drawn[i] = 1
    const pts = follow(follow([i]).reverse()) // both ways from where we happened to land on the line
    if (pts.length >= STROKE_MIN) traces.push(pts.map((j) => [j % W, (j / W) | 0]))
  }
/** Fewer points, same line (Ramer-Douglas-Peucker). */
function simplify(pts, eps = 0.8) {
  const [a, b] = [pts[0], pts[pts.length - 1]]
  let far = 0, at = -1
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  for (let n = 1; n < pts.length - 1; n++) {
    const d = Math.abs((b[0] - a[0]) * (a[1] - pts[n][1]) - (a[0] - pts[n][0]) * (b[1] - a[1])) / len
    if (d > far) { far = d; at = n }
  }
  return far > eps ? [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)] : [a, b]
}
const strokes = traces.map((t) => {
  const pts = simplify(t)
  // a hand draws left to right, and plumb lines top to bottom
  const dx = pts[pts.length - 1][0] - pts[0][0], dy = pts[pts.length - 1][1] - pts[0][1]
  if (Math.abs(dx) > Math.abs(dy) * 0.3 ? dx < 0 : dy < 0) pts.reverse()
  return pts.flat()
})

// ---- parts: patches of one kind that no sketch line crosses, then every loose pixel joins the part it touches --------------------------------
const part = new Int32Array(N).fill(-1)
const sizes = []
for (const start of inked) {
  if (part[start] !== -1) continue
  const isCore = (i) => {
    const x = i % W, y = (i / W) | 0
    if (x < CORE || y < CORE || x >= W - CORE || y >= H - CORE) return false
    for (let dy = -CORE; dy <= CORE; dy++)
      for (let dx = -CORE; dx <= CORE; dx++) {
        const j = i + dy * W + dx
        if (wall[j] || kind[j] !== kind[i]) return false
      }
    return true
  }
  if (!isCore(start)) continue
  const id = sizes.length, members = [start]
  part[start] = id
  for (let n = 0; n < members.length; n++)
    near(members[n], (j) => { if (part[j] === -1 && kind[j] === kind[start] && isCore(j)) { part[j] = id; members.push(j) } })
  sizes.push(members.length)
  if (members.length < MIN_AREA * N) { for (const j of members) part[j] = -2; sizes[id] = 0 } // too small: loose again
}
for (let i = 0; i < N; i++) if (part[i] === -2) part[i] = -1
// loose pixels join a touching part, first only within their own storey, then anywhere
for (const sameStorey of [true, false]) {
  let front = []
  for (const i of inked) if (part[i] >= 0) front.push(i)
  while (front.length) {
    const next = []
    for (const i of front)
      near(i, (j) => {
        if (part[j] !== -1 || !storey[j] || (sameStorey && storey[j] !== storey[i])) return
        part[j] = part[i]
        next.push(j)
      })
    front = next
  }
}

// ---- order: like a puzzle. Storey by storey, each spreading from where the one before ended, so every piece
// lands next to pieces already in place ----------------------------------------------------------------------------
const info = new Map()
for (const i of inked) {
  const id = part[i]
  if (id < 0) continue
  let f = info.get(id)
  if (!f) info.set(id, (f = { id, storey: storey[i], n: 0, sx: 0, sy: 0 }))
  f.n++; f.sx += i % W; f.sy += (i / W) | 0
}
const order = []
let from = [0, H * 0.62] // the first storey starts at the left corner of the plot
for (const s of [1, 2, 3]) {
  const pieces = [...info.values()].filter((f) => f.storey === s)
  const far = (f) => Math.hypot(f.sx / f.n - from[0], f.sy / f.n - from[1])
  pieces.sort((a, b) => far(a) - far(b))
  order.push(...pieces)
  const last = pieces[pieces.length - 1]
  if (last) from = [last.sx / last.n, last.sy / last.n]
}

// ---- cut every part (with its overlap) and pack the sheet --------------------------------------------------------
const cuts = order.map((f) => {
  let mask = new Uint8Array(N)
  for (const i of inked) if (part[i] === f.id) mask[i] = 1
  mask = grow(mask, OVERLAP)
  let l = W, t = H, r = 0, b = 0
  for (let i = 0; i < N; i++) {
    if (!mask[i] || !full[i * 4 + 3]) { mask[i] = 0; continue }
    const x = i % W, y = (i / W) | 0
    if (x < l) l = x
    if (x > r) r = x
    if (y < t) t = y
    if (y > b) b = y
  }
  return { ...f, mask, x: l, y: t, w: r - l + 1, h: b - t + 1 }
})
const sheetW = Math.max(W, ...cuts.map((c) => c.w + GAP * 2))
let sx = GAP, sy = GAP, rowH = 0
for (const c of [...cuts].sort((a, b) => b.h - a.h)) {
  if (sx + c.w + GAP > sheetW) { sx = GAP; sy += rowH + GAP; rowH = 0 }
  c.ax = sx; c.ay = sy
  sx += c.w + GAP
  rowH = Math.max(rowH, c.h)
}
const sheetH = sy + rowH + GAP
const sheet = Buffer.alloc(sheetW * sheetH * 4)
for (const c of cuts)
  for (let y = 0; y < c.h; y++)
    for (let x = 0; x < c.w; x++) {
      const i = (c.y + y) * W + c.x + x
      if (c.mask[i]) full.copy(sheet, ((c.ay + y) * sheetW + c.ax + x) * 4, i * 4, i * 4 + 4)
    }

// ---- write -------------------------------------------------------------------------------------------------------
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
// the renders are small: the larger file is a Lanczos upscale, cleaner on dense screens than the browser's own
async function write(key, data, w, h) {
  const png = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer()
  for (const m of [1, 2])
    await sharp(png)
      .resize({ width: w * m, kernel: 'lanczos3' })
      .webp({ quality: 84, alphaQuality: 100, effort: 6 })
      .toFile(path.join(outDir, `${key}-${w * m}.webp`))
  manifest[key] = { w: w * 2, h: h * 2, c: 'transparent', s: [w, w * 2] }
  console.log(`✓ ${key}: ${w}/${w * 2}px`)
}
await write('build-full', full, W, H)
await write('build-sketch', sketch, W, H)
await write('build-parts', sheet, sheetW, sheetH)
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n')
// per part: where it is on the sheet, its size, where it stands in the picture, its storey
const parts = cuts.map((c) => [c.ax, c.ay, c.w, c.h, c.x, c.y, c.storey])
fs.writeFileSync(partsPath, JSON.stringify({ w: W, h: H, sheet: sheetW, parts, strokes }) + '\n')
console.log(`✓ ${strokes.length} pencil strokes`)
console.log(`✓ ${parts.length} parts (${[1, 2, 3].map((s) => cuts.filter((c) => c.storey === s).length).join(' + ')}), sheet ${sheetW}×${sheetH}`)

if (process.env.DEBUG_DIR) {
  // every part in its own colour, to judge the cut
  const view = Buffer.alloc(N * 4)
  const tint = order.map(() => [60 + rand() * 190, 60 + rand() * 190, 60 + rand() * 190])
  const rank = new Map(order.map((f, n) => [f.id, n]))
  for (const i of inked) {
    const n = rank.get(part[i])
    if (n === undefined) continue
    view[i * 4] = tint[n][0]; view[i * 4 + 1] = tint[n][1]; view[i * 4 + 2] = tint[n][2]; view[i * 4 + 3] = 255
  }
  await sharp(view, raw).png().toFile(path.join(process.env.DEBUG_DIR, 'parts.png'))
  await sharp(sketch, raw).flatten({ background: '#f3f0ea' }).png().toFile(path.join(process.env.DEBUG_DIR, 'sketch.png'))
  await sharp(sheet, { raw: { width: sheetW, height: sheetH, channels: 4 } }).flatten({ background: '#ec6434' }).png().toFile(path.join(process.env.DEBUG_DIR, 'sheet.png'))
}
