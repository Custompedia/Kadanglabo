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

Deploy: folder ini siap untuk Vercel (`vercel.json` sudah berisi rewrite SPA + cache gambar). Set *Root Directory* ke `website`.

## Halaman (mengikuti brief Canva)

| Route | Isi |
| --- | --- |
| `/` | Hero "KADANGLABO", Introduction, angka studio, Core services & sectors, Selected work (ring 3D), filosofi, Latest updates |
| `/studio` | About: overview, kolaborasi klien–perencana–pelaksana, 2 parameter keberhasilan, visi/misi/goals, filosofi, Tim in-house |
| `/services` | Overview layanan, kategori (Commercial / Hospitality / Residential), Service detail (Pain points → Analisa → Proses kreatif → Deliverables), perencanaan & perawatan, **Start a project** |
| `/work` | Introduction & selected projects + **Project archive** (filter Kategori · Lokasi · Tahun · Status, tampilan Featured / Index) |
| `/work/:slug` | Halaman proyek: hero warna, header image, info, Context → Challenge → Concept → Development → Outcome, galeri, related projects, Next up |
| `/news`, `/news/:slug` | News & Events, detail: Konteks · Isi utama · Visual · Informasi lanjutan · Explore more |
| `/contact` | Alamat, kontak, peta ilustrasi (Google Maps dimuat saat diklik), form inquiry → WhatsApp |

## Mengubah konten

Semua teks ada di `src/data/`:

- `site.ts` — profil, alamat/kontak, visi-misi, tim, sektor, proses layanan.
- `projects.ts` — proyek unggulan (`projects`) dan daftar arsip (`listOnly`, dari *Project List* company profile).
- `news.ts` — berita & event.

Menambah/mengganti gambar:

```bash
npm run img -- <key> "<path/ke/gambar.png>"
```

Skrip membuat WebP 640/1280/1920 di `public/img/` dan mendaftarkan `key` di `src/data/images.json`. Pakai key tersebut di `projects.ts` (mis. `hero`, `cover`, `gallery`) atau `<Img id="key" />`.

## Yang perlu dilengkapi sebelum publish

1. **Ejaan copy dari brief dipakai apa adanya**: teks About (Home + halaman Studio) dan skema Services
   persis seperti brief, termasuk "memilki", "di desain", dan "Efektifitas Workflow" (istilah ini diseragamkan
   di seluruh website). Konfirmasi ke klien apakah mau dibakukan (memiliki, didesain, Efektivitas) — cukup ubah
   `about` di `src/data/site.ts`.
1. **News & Events masih contoh** (`src/data/news.ts`) — terutama agenda *Open Studio* dan *Talk*: ganti dengan berita/acara asli.
2. **Tahun & status proyek** belum ada di materi → `year: null` / sebagian `status: null`. Filter *Tahun* di Our Work otomatis muncul begitu data tahun diisi.
3. **Lokasi yang disimpulkan dari nama proyek** (ditandai komentar di `projects.ts`, mis. Bale Catur, Giripeni, Villa Berbah) dan kategori di daftar arsip — mohon dikonfirmasi.
4. Deskripsi singkat proyek dengan satu gambar (Hamzah Batik, Muji Rukost, Villa Berbah, Ivanna, Tiara, Kavling Bangunjiwo) ditulis dari render — sebaiknya direview klien.
5. Gambar **HMW House (interior)** dan **Wira House** di Google Drive dikunci owner ("only owner and editors can download"). HMW memakai gambar dari company profile; Wira House baru tampil di Index. Setelah akses dibuka, tambahkan dengan `npm run img`.
6. Akun media sosial (Instagram dsb.) belum dicantumkan karena tidak ditemukan sumber resminya.

## Struktur singkat

```
src/
  App.tsx              router, layout, footer CTA per halaman
  lib/                 gsap, smooth scroll, transisi halaman (curtain), helper animasi
  components/          Header, Menu, Footer, Preloader, ProjectRing (3D), SectorShowcase, InquiryForm, StudioMap, …
  pages/               Home, Studio, Services, Work, ProjectDetail, News, NewsDetail, Contact
  data/                konten + images.json (manifest gambar)
public/
  img/                 gambar WebP hasil optimasi
  brand/               logo SVG (hasil vektorisasi logo resmi)
```

Animasi menghormati pengaturan *reduce motion* di perangkat pengguna.
