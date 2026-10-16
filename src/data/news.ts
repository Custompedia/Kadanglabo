import type { ImgKey } from '../components/Img'

/*
 * CONTOH KONTEN — struktur News & Events sesuai brief (Konteks · Isi utama · Visual · Informasi lanjutan).
 * Judul, tanggal, dan terutama agenda Events di bawah ini adalah placeholder:
 * ganti dengan berita/acara asli dari Kadanglabo sebelum website dipublikasikan.
 */

export type NewsType = 'news' | 'event'

export interface NewsItem {
  slug: string
  type: NewsType
  tag: string
  title: string
  date: string
  excerpt: string
  cover: ImgKey
  context: string
  body: string[]
  gallery: ImgKey[]
  info: { label: string; value: string; href?: string }[]
  project?: string
}

export const news: NewsItem[] = [
  {
    slug: 'open-studio-kadanglabo',
    type: 'event',
    tag: 'Open Studio',
    title: 'Open Studio: ngobrol arsitektur bersama tim Kadanglabo',
    date: '2026-11-14',
    excerpt:
      'Sehari membuka pintu studio di Jl. Kaliurang. Bawa denah, foto lahan, atau sekadar pertanyaan tentang rumah dan usaha Anda.',
    cover: 'balecatur-lobby',
    context:
      'Banyak calon klien datang dengan pertanyaan yang sama: harus mulai dari mana? Open Studio adalah cara kami menjawabnya secara langsung: santai, tatap muka, dan tanpa jargon.',
    body: [
      'Tim arsitek, drafter, dan pengawas lapangan Kadanglabo akan hadir di studio untuk berdiskusi tentang rencana pembangunan, renovasi, maupun pengembangan lahan.',
      'Pengunjung dapat melihat proses kerja kami, dari sketsa, model 3D, hingga gambar kerja, serta dokumentasi proyek yang telah terbangun.',
    ],
    gallery: ['hmw-kitchen', 'draw-exploded', 'labarka-path'],
    project: 'la-barka-resort',
    info: [
      { label: 'Tanggal', value: 'Sabtu, 14 November 2026' },
      { label: 'Waktu', value: '10.00 - 15.00 WIB' },
      { label: 'Tempat', value: 'Studio Kadanglabo, Jl. Kaliurang KM.9 No.11 (Ruko 3)' },
      { label: 'Pendaftaran', value: 'Konfirmasi via WhatsApp', href: 'whatsapp' },
    ],
  },
  {
    slug: 'company-profile-2026',
    type: 'news',
    tag: 'Publikasi',
    title: 'Company Profile Kadanglabo 2026 resmi dirilis',
    date: '2026-10-06',
    excerpt:
      'Ringkasan perjalanan, layanan, dan karya terpilih kami, dari La Barka Resort hingga Klinik UII, kini tersedia dalam satu dokumen.',
    cover: 'draw-model',
    context:
      'Company Profile 2026 merangkum siapa kami, cara kami bekerja, dan proyek-proyek yang telah kami rancang di berbagai kota di Indonesia.',
    body: [
      'Dokumen ini memuat overview studio, visi dan misi, filosofi desain form follows function, tim in-house, layanan perencanaan dan perawatan, serta performance highlights proyek komersial dan residensial.',
      'Di bagian akhir, kami menyertakan daftar lebih dari enam puluh proyek yang telah kami kerjakan, sebagian besar di D.I. Yogyakarta dan sekitarnya.',
    ],
    gallery: ['draw-exploded', 'draw-interior', 'draw-plan'],
    project: 'klinik-uii',
    info: [
      { label: 'Format', value: 'PDF · 51 halaman' },
      { label: 'Permintaan dokumen', value: 'kadanglabo@gmail.com', href: 'mailto' },
    ],
  },
  {
    slug: 'enam-tahun-kadanglabo',
    type: 'news',
    tag: 'Studio',
    title: 'Enam tahun Kadanglabo: arsitektur untuk semua',
    date: '2026-09-30',
    excerpt:
      'Berdiri pada akhir September 2020, Kadanglabo tumbuh sebagai konsultan arsitektur berbasis komunitas di Yogyakarta.',
    cover: 'labarka-garden',
    context:
      'Kadanglabo didirikan oleh Raditya Alvin dengan visi sederhana namun besar: Arsitektur Untuk Semua.',
    body: [
      'Sejak awal, kami percaya proyek yang baik lahir dari kolaborasi: klien, perencana, dan pelaksana yang bekerja dalam satu arah. Dua parameter keberhasilan kami tetap sama: Desain Kontekstual dan Efektifitas Workflow.',
      'Enam tahun kemudian, prinsip itu terbawa ke resort di tepi Kali Progo, klinik di lingkungan kampus, hingga kawasan perumahan. Terima kasih untuk setiap klien dan mitra yang telah berjalan bersama kami.',
    ],
    gallery: ['labarka-koi', 'balecatur-pool2', 'hmw-dining'],
    project: 'la-barka-resort',
    info: [
      { label: 'Didirikan', value: 'Akhir September 2020' },
      { label: 'Tim in-house', value: '9 orang' },
    ],
  },
  {
    slug: 'secondary-skin-klinik-uii',
    type: 'news',
    tag: 'Proyek',
    title: 'Klinik UII: secondary skin sebagai wajah institusi',
    date: '2026-08-20',
    excerpt:
      'Kisi-kisi vertikal yang membungkus lantai atas bukan hanya soal tampilan. Ia menyaring cahaya, meredam panas, dan menjaga privasi.',
    cover: 'klinik-plaza',
    context:
      'Universitas Islam Indonesia membutuhkan klinik dengan identitas yang kuat sebagai institusi kesehatan modern, namun tetap menyatu dengan lingkungan kampus.',
    body: [
      'Jawaban kami adalah secondary skin: kisi-kisi vertikal yang membungkus massa lantai atas. Elemen ini membentuk karakter visual yang tegas dan elegan.',
      'Secara fungsional, kisi-kisi mengendalikan intensitas cahaya matahari, mengurangi panas berlebih, dan menjaga privasi ruang-ruang klinis di dalam bangunan.',
    ],
    gallery: ['klinik-front', 'klinik-corridor', 'klinik-waiting'],
    info: [{ label: 'Proyek', value: 'Klinik UII' }],
    project: 'klinik-uii',
  },

  {
    slug: 'talk-desain-kontekstual',
    type: 'event',
    tag: 'Talk',
    title: 'Talk: desain kontekstual di iklim tropis',
    date: '2026-12-05',
    excerpt:
      'Berbagi pengalaman merancang La Barka Resort: membaca kontur, arah aliran air, dan orientasi matahari di tepi Kali Progo.',
    cover: 'labarka-river',
    context:
      'Desain kontekstual adalah salah satu dari dua parameter keberhasilan proyek bagi Kadanglabo. Dalam sesi ini kami membedah prosesnya lewat studi kasus.',
    body: [
      'Kami akan menelusuri bagaimana tapak di tepi sungai membentuk keputusan desain: penataan massa, pengolahan ruang terbuka, hingga material dan bukaan untuk kenyamanan termal alami.',
      'Sesi terbuka untuk mahasiswa, praktisi, dan siapa pun yang tertarik pada arsitektur tropis.',
    ],
    gallery: ['labarka-gables', 'labarka-bath', 'labarka-pond'],
    info: [
      { label: 'Tanggal', value: 'Sabtu, 5 Desember 2026' },
      { label: 'Waktu', value: '13.00 - 15.00 WIB' },
      { label: 'Tempat', value: 'Studio Kadanglabo, Sleman' },
      { label: 'Pendaftaran', value: 'Konfirmasi via WhatsApp', href: 'whatsapp' },
    ],
    project: 'la-barka-resort',
  },
]

export const sortedNews = [...news].sort((a, b) => b.date.localeCompare(a.date))

export const getNews = (slug: string) => news.find((n) => n.slug === slug)

export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
