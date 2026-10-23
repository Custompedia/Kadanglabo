import type { ImgKey } from '../components/Img'
import { locale, tr, type Tx } from '../lib/i18n'

/*
 * CONTOH KONTEN — struktur News & Events sesuai brief (Konteks · Isi utama · Visual · Informasi lanjutan).
 * Judul, tanggal, dan terutama agenda Events di bawah ini adalah placeholder:
 * ganti dengan berita/acara asli dari Kadanglabo sebelum website dipublikasikan.
 * Semua teks dua bahasa ({ en, id }), dibaca lewat t() saat render (lib/i18n.ts).
 */

export type NewsType = 'news' | 'event'

export interface NewsItem {
  slug: string
  type: NewsType
  /** topic; `tag.en` doubles as the stable key (the ?tag= filter in the URL) */
  tag: Tx
  title: Tx
  date: string
  excerpt: Tx
  cover: ImgKey
  context: Tx
  body: Tx[]
  gallery: ImgKey[]
  info: { label: Tx; value: Tx; href?: 'whatsapp' | 'mailto' }[]
  project?: string
}

/** "News" / "Event" for one article (pills). */
export const typeName = (type: NewsType) => (type === 'event' ? tr('Event', 'Acara') : tr('News', 'Berita'))
/** "News" / "Events" for a category (filters, headings). */
export const typePlural = (type: NewsType) => (type === 'event' ? tr('Events', 'Acara') : tr('News', 'Berita'))

const confirmWa: Tx = { en: 'Confirm via WhatsApp', id: 'Konfirmasi via WhatsApp' }

export const news: NewsItem[] = [
  {
    slug: 'open-studio-kadanglabo',
    type: 'event',
    tag: { en: 'Open Studio', id: 'Open Studio' },
    title: {
      en: 'Open Studio: talk architecture with the Kadanglabo team',
      id: 'Open Studio: ngobrol arsitektur bersama tim Kadanglabo',
    },
    date: '2026-11-14',
    excerpt: {
      en: 'Join us for a day at our studio on Jl. Kaliurang. Bring a floor plan, site photos or questions about your home or business.',
      id: 'Sehari untuk ngobrol di studio kami, Jl. Kaliurang. Bawa denah, foto lahan, atau pertanyaan seputar rumah atau usaha Anda.',
    },
    cover: 'balecatur-lobby',
    context: {
      en: 'Many prospective clients ask: where do I start? At Open Studio, we talk it through in a relaxed, face-to-face conversation, without jargon.',
      id: 'Banyak calon klien bertanya: harus mulai dari mana? Di Open Studio, kita membahasnya langsung, santai, dan tanpa jargon.',
    },
    body: [
      {
        en: 'Our architects, drafters and site supervisor will be at the studio to discuss your new build, renovation or land development.',
        id: 'Arsitek, drafter, dan pengawas lapangan kami hadir di studio untuk membahas rencana bangunan baru, renovasi, atau pengembangan lahan Anda.',
      },
      {
        en: 'See how we work, from sketches and 3D models to construction drawings, alongside documentation of completed projects.',
        id: 'Lihat langsung proses kerja kami, dari sketsa, model 3D, hingga gambar kerja, serta dokumentasi proyek yang sudah terbangun.',
      },
    ],
    gallery: ['hmw-kitchen', 'draw-exploded', 'labarka-path'],
    project: 'la-barka-resort',
    info: [
      { label: { en: 'Date', id: 'Tanggal' }, value: { en: 'Saturday, 14 November 2026', id: 'Sabtu, 14 November 2026' } },
      { label: { en: 'Time', id: 'Waktu' }, value: { en: '10.00 - 15.00 WIB', id: '10.00 - 15.00 WIB' } },
      {
        label: { en: 'Venue', id: 'Tempat' },
        value: { en: 'Kadanglabo Studio, Jl. Kaliurang KM.9 No.11 (Ruko 3)', id: 'Studio Kadanglabo, Jl. Kaliurang KM.9 No.11 (Ruko 3)' },
      },
      { label: { en: 'Registration', id: 'Pendaftaran' }, value: confirmWa, href: 'whatsapp' },
    ],
  },
  {
    slug: 'company-profile-2026',
    type: 'news',
    tag: { en: 'Publication', id: 'Publikasi' },
    title: { en: 'Kadanglabo Company Profile 2026 is out', id: 'Company Profile Kadanglabo 2026 resmi dirilis' },
    date: '2026-10-06',
    excerpt: {
      en: 'Our story, services and selected work, from La Barka Resort to Klinik UII, now in a single document.',
      id: 'Perjalanan, layanan, dan karya terpilih kami, dari La Barka Resort hingga Klinik UII, kini dalam satu dokumen.',
    },
    cover: 'draw-model',
    context: {
      en: 'The 2026 Company Profile sets out who we are, how we work and the projects we have designed in cities across Indonesia.',
      id: 'Company Profile 2026 merangkum siapa kami, cara kami bekerja, dan proyek-proyek yang telah kami rancang di berbagai kota di Indonesia.',
    },
    body: [
      {
        en: 'Inside: our studio, vision and mission, form follows function philosophy, in-house team, planning and building care services, and highlights from Commercial and Residential projects.',
        id: 'Isinya mencakup profil studio, visi dan misi, filosofi form follows function, tim in-house, layanan perencanaan dan perawatan bangunan, serta karya pilihan dari proyek Commercial dan Residential.',
      },
      {
        en: 'It closes with a list of more than sixty projects, most of them in and around the Special Region of Yogyakarta.',
        id: 'Bagian akhir memuat daftar lebih dari enam puluh proyek kami, sebagian besar di D.I. Yogyakarta dan sekitarnya.',
      },
    ],
    gallery: ['draw-exploded', 'draw-interior', 'draw-plan'],
    project: 'klinik-uii',
    info: [
      { label: { en: 'Format', id: 'Format' }, value: { en: 'PDF · 51 pages', id: 'PDF · 51 halaman' } },
      {
        label: { en: 'Request a copy', id: 'Minta dokumen' },
        value: { en: 'kadanglabo@gmail.com', id: 'kadanglabo@gmail.com' },
        href: 'mailto',
      },
    ],
  },
  {
    slug: 'enam-tahun-kadanglabo',
    type: 'news',
    tag: { en: 'Studio', id: 'Studio' },
    title: { en: 'Six years of Kadanglabo: architecture for everyone', id: 'Enam tahun Kadanglabo: arsitektur untuk semua' },
    date: '2026-09-30',
    excerpt: {
      en: 'Founded in late September 2020, Kadanglabo has grown into a community-based architecture consultancy in Yogyakarta.',
      id: 'Berdiri pada akhir September 2020, Kadanglabo tumbuh menjadi konsultan arsitektur berbasis komunitas di Yogyakarta.',
    },
    cover: 'labarka-garden',
    context: {
      en: 'Raditya Alvin founded Kadanglabo with one vision: Architecture for Everyone.',
      id: 'Raditya Alvin mendirikan Kadanglabo dengan satu visi: Arsitektur untuk semua.',
    },
    body: [
      {
        en: 'Since day one, we have brought clients, planners and builders together around a shared goal. Our two measures of success remain the same: Contextual Design and Effective Workflow.',
        id: 'Sejak awal, kami mempertemukan klien, perencana, dan pelaksana untuk mencapai tujuan bersama. Dua parameter keberhasilan kami tetap sama: Desain Kontekstual dan Efektivitas Workflow.',
      },
      {
        en: 'Six years on, these principles shape our work, from a resort on the Progo River to a campus clinic and housing estates. Thank you to every client and partner who has worked with us.',
        id: 'Enam tahun berlalu, prinsip ini tetap memandu karya kami, dari resort di tepi Kali Progo hingga klinik kampus dan kawasan perumahan. Terima kasih kepada semua klien dan mitra yang telah berkarya bersama kami.',
      },
    ],
    gallery: ['labarka-koi', 'balecatur-pool2', 'hmw-dining'],
    project: 'la-barka-resort',
    info: [
      { label: { en: 'Founded', id: 'Didirikan' }, value: { en: 'Late September 2020', id: 'Akhir September 2020' } },
      { label: { en: 'In-house team', id: 'Tim in-house' }, value: { en: '9 people', id: '9 orang' } },
    ],
  },
  {
    slug: 'secondary-skin-klinik-uii',
    type: 'news',
    tag: { en: 'Project', id: 'Proyek' },
    title: { en: 'Klinik UII: a secondary skin as the face of an institution', id: 'Klinik UII: secondary skin sebagai wajah institusi' },
    date: '2026-08-20',
    excerpt: {
      en: 'Vertical fins wrap the upper floor, filtering daylight, reducing heat gain and protecting privacy.',
      id: 'Kisi-kisi vertikal menyelimuti lantai atas untuk menyaring cahaya, meredam panas, dan menjaga privasi.',
    },
    cover: 'klinik-plaza',
    context: {
      en: 'Universitas Islam Indonesia needed a modern clinic with a strong identity that felt at home on its campus.',
      id: 'Universitas Islam Indonesia membutuhkan klinik modern dengan identitas kuat yang menyatu dengan lingkungan kampus.',
    },
    body: [
      {
        en: 'We designed a secondary skin of vertical fins around the upper floor, giving the clinic a bold, elegant character.',
        id: 'Kami merancang secondary skin berupa kisi-kisi vertikal di sekeliling lantai atas, sehingga klinik memiliki karakter yang tegas dan elegan.',
      },
      {
        en: 'The fins control sunlight, reduce excess heat and protect privacy in the clinical rooms.',
        id: 'Kisi-kisi ini mengatur masuknya cahaya matahari, mengurangi panas berlebih, dan menjaga privasi ruang klinis.',
      },
    ],
    gallery: ['klinik-front', 'klinik-corridor', 'klinik-waiting'],
    info: [{ label: { en: 'Project', id: 'Proyek' }, value: { en: 'Klinik UII', id: 'Klinik UII' } }],
    project: 'klinik-uii',
  },

  {
    slug: 'talk-desain-kontekstual',
    type: 'event',
    tag: { en: 'Talk', id: 'Talk' },
    title: { en: 'Talk: Contextual Design in a tropical climate', id: 'Talk: Desain Kontekstual di iklim tropis' },
    date: '2026-12-05',
    excerpt: {
      en: 'Lessons from designing La Barka Resort: understanding the contours, water flow and sun path on the bank of the Progo River.',
      id: 'Pengalaman merancang La Barka Resort: memahami kontur, aliran air, dan lintasan matahari di tepi Kali Progo.',
    },
    cover: 'labarka-river',
    context: {
      en: 'Contextual Design is one of Kadanglabo’s two measures of project success. This session explores how it works through a project case study.',
      id: 'Desain Kontekstual adalah satu dari dua parameter keberhasilan proyek Kadanglabo. Di sesi ini, kami membahas penerapannya lewat studi kasus.',
    },
    body: [
      {
        en: 'We explore how the riverside site shaped every design decision: building placement, open spaces, and materials and openings that keep spaces naturally cool.',
        id: 'Kami membahas pengaruh tapak tepi sungai pada setiap keputusan desain: penataan bangunan, ruang terbuka, serta material dan bukaan yang menjaga ruang tetap sejuk secara alami.',
      },
      {
        en: 'Open to students, practitioners and anyone curious about tropical architecture.',
        id: 'Terbuka untuk mahasiswa, praktisi, dan siapa pun yang tertarik pada arsitektur tropis.',
      },
    ],
    gallery: ['labarka-gables', 'labarka-bath', 'labarka-pond'],
    info: [
      { label: { en: 'Date', id: 'Tanggal' }, value: { en: 'Saturday, 5 December 2026', id: 'Sabtu, 5 Desember 2026' } },
      { label: { en: 'Time', id: 'Waktu' }, value: { en: '13.00 - 15.00 WIB', id: '13.00 - 15.00 WIB' } },
      { label: { en: 'Venue', id: 'Tempat' }, value: { en: 'Kadanglabo Studio, Sleman', id: 'Studio Kadanglabo, Sleman' } },
      { label: { en: 'Registration', id: 'Pendaftaran' }, value: confirmWa, href: 'whatsapp' },
    ],
    project: 'la-barka-resort',
  },
]

export const sortedNews = [...news].sort((a, b) => b.date.localeCompare(a.date))

export const getNews = (slug: string) => news.find((n) => n.slug === slug)

/** "14 November 2026" / "14 November 2026", in the visitor's language. */
export const formatDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })

/** Short month for the event badge ("Nov" / "Des"). */
export const formatMonth = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(locale(), { month: 'short' })
