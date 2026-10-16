# Kadanglabo — Company Website

Website company profile **KADANGLABO — A Collaborative Architectural Solution**.
React + Vite + TypeScript, animasi dengan GSAP (ScrollTrigger + SplitText) dan smooth scroll Lenis, styling Tailwind CSS v4.

Intro home mengikuti shed.design: preloader flipbook → frame membesar jadi hero, judul naik per kata,
header bergaris dengan ticker, kapsul "next project" (kiri bawah) yang warnanya terisi sebagai timer, tombol SCROLL.

### Warna
Palet mengikuti logo Kadanglabo: **navy `#3C4C74`**, **oranye `#EC6434`**, navy gelap `#1B2238`, dan netral
(kertas `#F3F0EA`, krem `#E6E0D4`, hitam `#151515`). Website referensi (shed.design dll.) hanya diambil
layout & animasinya — warnanya tidak. Warna hero tiap proyek (`color`/`accent` di `projects.ts`) juga
hanya memakai kombinasi palet ini.

### Font
shed.design memakai font berlisensi (Owners, Sequel, Reckless) yang tidak boleh diambil dari situs mereka.
Website ini memakai padanan gratis (SIL OFL) yang paling mirip: **Mona Sans** (judul, pengganti Owners),
**Inter** (teks, pengganti Sequel), **Newsreader** (serif, pengganti Reckless). Kalau klien membeli lisensi
font aslinya, cukup tambahkan `@font-face` dan ganti variabel `--font-display`, `--font-sans`, `--font-serif`
di `src/styles.css`.

## Menjalankan

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + build ke dist/
npm run preview   # cek hasil build di http://localhost:4173
```

Deploy: folder ini siap untuk Vercel (`vercel.json` sudah berisi rewrite SPA + cache gambar).

## Git (lokal, belum di-push)

Folder `website/` adalah repo git lokal — belum ada remote, jadi tidak ada yang terkirim ke GitHub.

```bash
git log --oneline            # daftar titik simpan (commit)
git status                   # file yang berubah sejak commit terakhir
git restore .                # buang SEMUA perubahan yang belum di-commit
git revert <hash>            # batalkan satu commit (aman, riwayat tetap)
git reset --hard <hash>      # kembali total ke commit tertentu (riwayat sesudahnya hilang)
```

## Halaman (mengikuti brief Canva)

| Route | Isi |
| --- | --- |
| `/` | Sesuai urutan brief: Hero "KADANGLABO" (gaya shed.design) → (01) About → (02) Core services & sectors → (03) Our work: mosaik foto per kategori yang bergerak saat scroll (ref. Coeval) + tombol "Lihat detail Our Work" → (04) Latest updates → footer "See work" |
| `/about` team`) #team`) | About: copy persis dari brief, kolaborasi klien–perencana–pelaksana, 2 parameter keberhasilan, visi/misi/goals, filosofi, **Team** (menu sendiri, ref. Coeval). `/studio` dialihkan ke sini |
| `/services` | Skema brief: (01) Our services → (02) Service categories → (03) Service detail — empat tahap berilustrasi dalam grid 2×2, satu kolom di mobile, scroll vertikal → (04) Start a project |
| `/work` | Skema brief: Introduction & Selected projects per kategori (a. Commercial Design, b. Hospitality Design, c. Selected Residential Design) → **Peta proyek 3D** (ref. Sobha) → **Project archive** (filter Category · Location · Year · Status) |
| `/work/:slug` | Halaman proyek: hero warna, header image, info, Context → Challenge → Concept → Development → Outcome, galeri, related projects, Next up |
| `/news`, `/news/:slug` | News & Events, detail: Konteks · Isi utama · Visual · Informasi lanjutan · Explore more |
| `/contact` | Alamat, kontak, peta ilustrasi (Google Maps dimuat saat diklik), form inquiry → WhatsApp |

## Mengubah konten

Semua teks ada di `src/data/`:

- `site.ts` — profil, alamat/kontak, visi-misi, tim, sektor, proses layanan.
- `projects.ts` — proyek unggulan (`projects`), daftar arsip (`listOnly`, dari *Project List* company profile), dan area peta/filter lokasi (`areas`).
- `indonesiaMap.ts` — garis pantai peta proyek (dibuat oleh `scripts/build-map.mjs` dari Natural Earth, public domain).
- `news.ts` — berita & event.

Menambah/mengganti gambar:

```bash
npm run img -- <key> "<path/ke/gambar.png>"
```

Skrip membuat WebP 640/1280/1920 di `public/img/` dan mendaftarkan `key` di `src/data/images.json`. Pakai key tersebut di `projects.ts` (mis. `hero`, `cover`, `gallery`) atau `<Img id="key" />`.

Ilustrasi transparan kolaborasi dan proses layanan memiliki master PNG serta prompt GPT Image di
`assets/collaboration/` dan `assets/services-process/`. Untuk mengekspor WebP responsif sambil menjaga alpha:

```bash
node scripts/optimize-collaboration-images.mjs
node scripts/optimize-collaboration-images.mjs services-process
```

## Yang perlu dilengkapi sebelum publish

1. **Ejaan copy dari brief dipakai apa adanya**: teks About (Home + halaman About) dan skema Services
   persis seperti brief, termasuk "memilki", "di desain", dan "Efektifitas Workflow" (istilah ini diseragamkan
   di seluruh website). Konfirmasi ke klien apakah mau dibakukan (memiliki, didesain, Efektivitas) — cukup ubah
   `about` di `src/data/site.ts`.
2. **News & Events masih contoh** (`src/data/news.ts`) — terutama agenda *Open Studio* dan *Talk*: ganti dengan berita/acara asli.
3. **Tahun & status proyek** belum ada di materi → `year: null` / sebagian `status: null`. Filter *Tahun* di Our Work otomatis muncul begitu data tahun diisi.
4. **Lokasi yang disimpulkan dari nama proyek** (ditandai komentar di `projects.ts`, mis. Bale Catur, Giripeni, Villa Berbah) dan kategori di daftar arsip — mohon dikonfirmasi.
5. Deskripsi singkat proyek dengan satu gambar (Hamzah Batik, Muji Rukost, Villa Berbah, Ivanna, Tiara, Kavling Bangunjiwo) ditulis dari render — sebaiknya direview klien.
6. Gambar **HMW House (interior)** dan **Wira House** di Google Drive dikunci owner ("only owner and editors can download"). HMW memakai gambar dari company profile; Wira House baru tampil di arsip. Setelah akses dibuka, tambahkan dengan `npm run img`.
7. Akun media sosial (Instagram dsb.) belum dicantumkan karena tidak ditemukan sumber resminya.

## Struktur singkat

```
src/
  App.tsx              router, layout, footer CTA per halaman
  lib/                 gsap, smooth scroll, transisi halaman (curtain), helper animasi
  components/          Header, Menu, Footer, Preloader, HomeHero, WorkMosaic, ProjectMap (peta 3D), SectorShowcase, InquiryForm, StudioMap, …
  pages/               Home, About, Services, Work, ProjectDetail, News, NewsDetail, Contact
scripts/               optimize-image.mjs (npm run img), build-map.mjs (peta)
  data/                konten + images.json (manifest gambar)
public/
  img/                 gambar WebP hasil optimasi
  brand/               logo SVG (hasil vektorisasi logo resmi)
```

Animasi menghormati pengaturan *reduce motion* di perangkat pengguna.
