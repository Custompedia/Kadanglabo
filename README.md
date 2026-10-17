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
| `/` | Sesuai urutan brief: Hero "KADANGLABO" (gaya shed.design) → (01) About → Kadanglabo spirit (showreel kiri, etos kanan — layout "Shed spirit") → (02) Core services & sectors → (03) Our work: mosaik foto per kategori yang bergerak saat scroll (ref. Coeval; di HP tumpukan per kategori, foto terbuka dari pojok ala Archidomo) + pita arsip (angka 61 menghitung naik, rincian per sektor) → (04) Latest updates → footer "See work" |
| `/about` (`/about#team`) | About (tanpa section biru): foto pertama terbuka dari bentuk pintu ("satu pintu", ref. ERA Residence) → Kadanglabo dalam angka (cincin 16 foto proyek berputar, angka bergulir; ref. Kononenko; angka dihitung dari data) → Satu meja: diagram klien · perencana · pelaksana yang menyatu → Etos + 2 parameter keberhasilan → Vision (foto full-bleed) → Mission & Our goals (kartu oranye, masuk sebagai kartu pasir) → tim in-house (`#team`) → CTA. `/studio` dialihkan ke sini |
| `/services` | Skema brief: (01) Our services (pernyataan + foto, lalu 11 layanan bernomor per kelompok, ref. Telha Clarke) → (02) Service categories (desktop: foto menempel + angka italic 01-03 bergulir, ref. archi-malin) → (03) Service detail: empat tahap dalam kartu oranye yang bergeser ke samping saat di-scroll (desktop) / di-swipe (mobile) → (04) Start a project (form + foto tim) |
| `/work` | Skema brief: Introduction (lokasi proyek sebagai garis rute Palembang → Bali, tiap titik memfilter arsip; ref. ERA Residence) & Selected projects per kategori (a. Commercial Design, b. Hospitality Design, c. Selected Residential Design; foto zig-zag ala Kononenko + pill melayang di bawah layar) → **Project archive**: pembuka "Arsip proyek (61)" dengan foto melayang (ref. Telha Clarke), tabel terlipat 12 baris (filter Category · Location · Year · Status) |
| `/work/:slug` | Halaman proyek: hero warna, header image, info, Context → Challenge → Concept → Development → Outcome, galeri, related projects, Next up |
| `/news`, `/news/:slug` | News & Events: kartu artikel seragam (2 kolom) + sidebar kanan (cari artikel, Kategori, Topik, Terbaru, CTA), filter tersimpan di URL (`?type=`, `?tag=`, `?q=`); detail: Konteks · Isi utama · Visual · Informasi lanjutan · Explore more |
| `/contact` | Form inquiry dengan foto tim (tombol "Kirim" membuka chat WhatsApp studio dengan pesan terisi) → How to find us (email, telepon, alamat, Instagram/WhatsApp/email/Maps, peta Google Maps) → FAQ 8 pertanyaan (`src/data/faq.ts`, plus data terstruktur FAQPage) |

## Mengubah konten

Semua teks ada di `src/data/`:

- `site.ts` — profil, alamat/kontak, visi-misi, tim, sektor, proses layanan.
- `projects.ts` — proyek unggulan (`projects`), daftar arsip (`listOnly`, dari *Project List* company profile), dan area untuk filter Lokasi (`areas`).
- `news.ts` — berita & event.

Menambah/mengganti gambar:

```bash
npm run img -- <key> "<path/ke/gambar.png>"
```

Skrip membuat WebP 640/1280/1920 di `public/img/` dan mendaftarkan `key` di `src/data/images.json`. Pakai key tersebut di `projects.ts` (mis. `hero`, `cover`, `gallery`) atau `<Img id="key" />`.

## Performa & pengujian

- **Intro logo** Kadanglabo (motion logo awal) tampil penuh setiap halaman dibuka atau di-reload; perpindahan halaman di dalam situs memakai tirai transisi, tanpa intro ulang.
- **Foto hero**: master 1672px, jadi ukuran terbesar 2560 (WebP q80, ekspor ulang: `node scripts/optimize-hero-images.mjs`). Slide kedua baru dipasang setelah intro; showreel memuat render satu langkah di depan.
- **Muatan Home pertama kali** ±1.6 MB (sebelumnya 2.7 MB di laptop, 3.5 MB di ponsel).
- **Lighthouse** (lokal, build produksi): Home desktop Performance 95 · Accessibility 95 · Best Practices 100 · SEO 100. Di simulasi ponsel lambat, skor performa dibatasi intro logo pada kunjungan pertama (LCP diukur setelah intro).
- **Audit responsif**: 24 rute × 15 ukuran layar (320-3840px), tanpa overflow horizontal, teks terpotong, atau animasi yang tertinggal tersembunyi.
- **Layar lebar (>1920px)**: isi tetap memakai tata letak 1920 dan diletakkan di tengah (`--gutter` di `styles.css`); latar section dan foto full-bleed tetap memenuhi layar.
- **Kontras WCAG 2.1 AA** (axe-core, 24 rute, HP & desktop): warna dan teks statis lolos semua. Skala oranye satu hue: `--color-orange` #EC6434 (logo, dekoratif, teks gelap di atasnya), `--color-orange-deep` #D34614 (latar dengan teks putih, teks oranye besar), `--color-orange-text` #B33B11 (teks oranye kecil).
- **Teks yang "menyala" saat scroll** (`data-scrub`) sengaja memakai animasi aslinya: kata mulai samar (14%) lalu penuh begitu paragraf melewati area baca. axe menandai kata yang belum menyala (kontras rendah saat samar); kondisi menyala penuh lolos AA.

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
7. **Video trailer belum ada** di Drive/PDF. Section "Kadanglabo spirit" di Home sementara memutar showreel dari render.
   Kalau ada video: taruh di `public/video/` dan isi `trailer` di `src/data/site.ts` — tombol bulat otomatis jadi ▶ dan
   membuka video dengan suara.
8. Akun media sosial (Instagram dsb.) belum dicantumkan karena tidak ditemukan sumber resminya.

## Struktur singkat

```
src/
  App.tsx              router, layout, footer CTA per halaman
  lib/                 gsap, smooth scroll, transisi halaman (curtain), helper animasi
  components/          Header, Menu, Footer, Preloader, HomeHero, WorkMosaic, SectorShowcase, InquiryForm, StudioMap, …
  pages/               Home, About, Services, Work, ProjectDetail, News, NewsDetail, Contact
scripts/               optimize-image.mjs (npm run img)
  data/                konten + images.json (manifest gambar)
public/
  img/                 gambar WebP hasil optimasi
  brand/               logo SVG (hasil vektorisasi logo resmi)
```

Animasi menghormati pengaturan *reduce motion* di perangkat pengguna.
