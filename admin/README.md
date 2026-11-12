# Kadanglabo CMS (admin.kadanglabo.com)

Dashboard untuk mengelola **Projek (Our Work)** dan **Artikel (News & Events)** website Kadanglabo.
Konten disimpan di Cloudflare **D1**, foto di **R2**. Website membaca konten yang sudah *Tayang* lewat
`/api/public/content`, jadi tombol **Publish** langsung tampil di website (tanpa deploy ulang).

## Arsitektur

| Bagian | Isi |
| --- | --- |
| Worker `kadanglabo-admin` (folder ini) | Dashboard (React + Kumo UI) + API `/api/*` (login, konten, upload) |
| Worker `kadanglabo-website` (root repo) | Website + `/api/public/*` dan `/media/*` (hanya membaca) |
| D1 `kadanglabo-auth` | Akun dan sesi login (tidak pernah dibaca website) |
| D1 `kadanglabo-content` | Projek, entri arsip, artikel (draft + versi tayang) |
| D1 `kadanglabo-media` | Data foto (ukuran, warna, alt text) |
| R2 `kadanglabo-media` | Foto dalam ukuran WebP 640 / 1280 / 1920 (`media/{id}-{lebar}.webp`) |
| R2 `kadanglabo-originals` | File asli upload (privat) |

Database dipisah per fungsi supaya tidak ada satu database yang menanggung semuanya, dan data login terpisah dari
konten. Foto diperkecil di browser sebelum diunggah, jadi tidak perlu Cloudflare Images berbayar.

## Menjalankan di laptop

```sh
cd admin
npm install
npm run db:migrate:local        # sekali: buat tabel di D1 lokal
node scripts/seed.mjs           # sekali: pindahkan 12 projek, 49 arsip, 5 artikel, dan fotonya ke CMS lokal
npm run dev                     # dashboard di http://localhost:5180
```

Lalu di root repo `npm run dev` (website di http://localhost:5173). Website dev otomatis mengambil konten dari
dashboard dev (`/api/public` dan `/media` di-proxy ke port 5180). Kalau dashboard tidak jalan, website tetap tampil
memakai data bawaan di `src/data`.

Login pertama: **custompedia** / **12345** (akun ini dibuat otomatis saat database masih kosong). Ganti password
lewat menu Profil kapan saja.

`db:migrate:local` / `db:migrate:remote` menjalankan `wrangler d1 migrations apply` untuk ketiga database.

## Deploy pertama ke Cloudflare

Butuh login: `npx wrangler login`.

1. **Buat database dan bucket** (sekali):
   ```sh
   npx wrangler d1 create kadanglabo-auth
   npx wrangler d1 create kadanglabo-content
   npx wrangler d1 create kadanglabo-media
   npx wrangler r2 bucket create kadanglabo-media
   npx wrangler r2 bucket create kadanglabo-originals
   ```
2. **Isi `database_id`** yang dicetak perintah di atas ke `admin/wrangler.jsonc` (ketiganya) **dan**
   `wrangler.jsonc` di root (content dan media). Id-nya harus sama di kedua file.
3. **Buat tabel dan pindahkan konten**:
   ```sh
   cd admin
   npm run db:migrate:remote
   node scripts/seed.mjs --remote
   ```
4. **Deploy dashboard**: `npm run deploy` (di folder `admin`).
5. **Deploy website** seperti biasa (push ke `main`; Workers Builds menjalankan `npm run build` dan `npm run deploy`).
6. **Domain**: di Cloudflare → Workers → `kadanglabo-admin` → Settings → Domains & Routes → Custom Domain
   `admin.kadanglabo.com` (setelah zona `kadanglabo.com` ada di Cloudflare). Sampai saat itu dashboard bisa dibuka
   di alamat `*.workers.dev`-nya.
7. Login dengan `custompedia` / `12345`, lalu buat akun tim di menu **Pengguna**.

## Menu

| Menu | Untuk |
| --- | --- |
| Projek / Artikel | Isi halaman projek dan artikel (draft, publish, preview, turunkan, trash) |
| Media | Melihat semua foto per kategori dan projek. Tanpa upload: foto masuk otomatis saat diunggah di projek atau artikel. Foto yang 7 hari tidak dipakai dihapus otomatis tiap Senin |
| Our Work | Per kategori: projek di bagian kategori pada Our Work (maks. 5), foto hero dan projek pilihan halaman kategori (maks. 6) |
| Lokasi | Area (bagian "Project locations" dan filter lokasi) beserta kota/kabupatennya. Ganti nama ikut mengubah semua projek; yang masih dipakai tidak bisa dihapus |
| Pengguna | Khusus admin |

Database lama yang sudah berisi konten cukup ditambah pengaturan halamannya:
`npm run db:migrate:local` lalu `node scripts/seed.mjs --pages-only` (atau `--remote` untuk Cloudflare).

## Aturan login

- Masuk dengan username dan password; tidak ada pendaftaran, semua akun dibuat admin.
- **5 kali salah password → akun terkunci.** Admin membuka kunci atau mereset password dari menu ⋯ di halaman
  Pengguna. Reset password juga mengeluarkan akun itu dari semua perangkat.
- Peran **Admin**: konten + kelola pengguna. **Editor**: konten saja.
- Password disimpan sebagai hash PBKDF2-SHA256; sesi berlaku 14 hari (cookie HttpOnly, Secure, SameSite=Strict).

## Alur konten

```
Draft ──Publish──► Tayang ──Turunkan──► Diturunkan ──Publish──► Tayang
  └────────── Pindahkan ke Trash ──► Trash ──► Pulihkan / Hapus permanen
```

- Editor menyimpan otomatis 2 detik setelah berhenti mengetik. Mengedit projek yang sedang tayang **tidak** mengubah
  website sampai *Publish perubahan* ditekan.
- **Preview** membuka draft di website lewat link yang berlaku 1 jam (ada penanda "Pratinjau draft").
- Sebelum publish, panel kanan menampilkan field yang masih kosong (teks wajib harus terisi EN dan ID).
- Foto yang masih dipakai projek/artikel tidak bisa dihapus dari Media.
