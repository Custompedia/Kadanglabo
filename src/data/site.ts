import type { ImgKey } from '../components/Img'

/* Sumber: Company Profile Kadanglabo 2026 + brief Canva "Referensi Website Arsitektur". */

export const company = {
  name: 'Kadanglabo',
  tagline: 'A Collaborative Architectural Solution',
  vision: 'Arsitektur Untuk Semua',
  founder: 'Raditya Alvin',
  founded: 2020,
  address: ['Jl. Kaliurang KM.9 No.11 (Ruko 3)', 'Dayu Sinduharjo, Ngaglik', 'Sleman, Yogyakarta'],
  phone: '0821-3106-9311',
  phoneIntl: '6282131069311',
  email: 'kadanglabo@gmail.com',
}

const mapsQuery = 'Jl. Kaliurang KM.9 No.11, Dayu, Sinduharjo, Ngaglik, Sleman, Yogyakarta'
export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
export const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`
export const waLink = (text?: string) =>
  `https://wa.me/${company.phoneIntl}${text ? `?text=${encodeURIComponent(text)}` : ''}`
export const mailLink = (subject?: string, body?: string) =>
  `mailto:${company.email}?subject=${encodeURIComponent(subject ?? 'Konsultasi Proyek')}${body ? `&body=${encodeURIComponent(body)}` : ''}`

export const nav: { to: string; label: string; img: ImgKey }[] = [
  { to: '/', label: 'Home', img: 'balecatur-front' },
  { to: '/about', label: 'About', img: 'labarka-garden' },
  { to: '/about#team', label: 'Team', img: 'team-raditya' },
  { to: '/services', label: 'Services', img: 'klinik-plaza' },
  { to: '/work', label: 'Our Work', img: 'labarka-bird' },
  { to: '/news', label: 'News & Events', img: 'labarka-pond' },
  { to: '/contact', label: 'Contact', img: 'hmw-facade' },
]

/* Copy About PERSIS dari brief Canva (slide 04 "About — Isinya"), termasuk ejaannya.
 * Paragraf kedua juga dipakai brief sebagai "skema" section Services. */
export const about = {
  lead:
    'Kadanglabo menjadi Konsultan Arsitektur berbasis komunitas dengan konsen utama solusi arsitektural secara kolaboratif. Tujuan tersebut dapat dicapai dengan kerja sama antara klien, perencana dan pelaksana dengan baik. Dua parameter keberhasilan proyek bagi Kadanglabo adalah Desain Kontekstual dan Efektifitas Workflow.',
  ethos:
    'Kadanglabo memilki target pada setiap proyek yang di desain harus terbangun karena merupakan etos kami untuk menyelesaikan bangunan yang sudah di desain dengan tuntas. Dari etos inilah dua parameter keberhasilan proyek kami dapat tercapai.',
  philosophy:
    'Kadanglabo berpegang pada prinsip problem solving dalam pendekatan desain, yang menghasilkan pendekatan form follows function. Langgam (style) bangunan adalah pendekatan kedua — setelah masalah terselesaikan dan fungsi tercapai.',
  focus:
    'Kami berfokus pada desain kontekstual yang dicapai melalui perencanaan induk, perencanaan bangunan, lanskap, interior, dan pencahayaan.',
}

export const vision = 'Manajemen properti komprehensif yang terjangkau.'

export const mission = [
  'Improvisasi kontekstualitas lingkungan dengan acuan sustainable goals.',
  'Integrasi manajemen perencanaan dan pelaksanaan dalam satu pintu.',
  'Pelayanan yang bersifat komprehensif dan responsif.',
]

export const goals = [
  'Keberlangsungan arsitektur kontekstual yang merata dan respons improvisasi dari masyarakat, sehingga menghasilkan lingkungan yang responsif.',
  'Alur kerja dan pembiayaan yang efektif dalam perencanaan dan pelaksanaan, sehingga bangunan tepat guna.',
]

export const parametersDetail = [
  {
    title: 'Desain Kontekstual',
    body: 'Setiap tapak punya cerita: kontur, arah matahari, aliran air, budaya, hingga kondisi pasar. Desain kami lahir dari membaca konteks itu dengan jujur.',
  },
  {
    title: 'Efektifitas Workflow',
    body: 'Perencanaan dan pelaksanaan dikelola dalam satu alur yang jelas — supaya waktu, biaya, dan kualitas tetap terkendali sampai bangunan berdiri.',
  },
]

export const team: { name: string; role: string; img: ImgKey }[] = [
  { name: 'Raditya Alvin Dea R', role: 'Direktur Utama', img: 'team-raditya' },
  { name: 'Gian Sefentyas', role: 'Senior Architect', img: 'team-gian' },
  { name: 'Angeline Putri', role: 'Architect', img: 'team-angeline' },
  { name: 'Sri Rachma W', role: 'Drafter', img: 'team-sri' },
  { name: 'Abdillah', role: 'Pengawas Lapangan', img: 'team-abdillah' },
  { name: 'Nando Brilian C', role: 'Digital Content', img: 'team-nando' },
  { name: 'Luthfiana Dea', role: 'Digital Marketing', img: 'team-luthfiana' },
  { name: 'Anfasa Risda', role: 'General Administratif', img: 'team-anfasa' },
  { name: 'Gunawan David', role: 'Logistic Project', img: 'team-gunawan' },
]

export type SectorKey = 'commercial' | 'hospitality' | 'residential'

export const sectors: {
  key: SectorKey
  title: string
  label: string
  img: ImgKey
  imgAlt: string
  desc: string
  typologies: string[]
}[] = [
  {
    key: 'commercial',
    title: 'Commercial',
    label: 'Commercial Design',
    img: 'klinik-hero',
    imgAlt: 'Klinik UII — fasad secondary skin',
    desc: 'Bangunan baru, renovasi, dan pengembangan untuk ruang usaha dan institusi — dari coffee shop hingga fasilitas kesehatan.',
    typologies: ['Restoran & Coffee Shop', 'Ruko & Kantor', 'Fasilitas Kesehatan', 'Tata Lanskap'],
  },
  {
    key: 'hospitality',
    title: 'Hospitality',
    label: 'Hospitality Design',
    img: 'labarka-bird',
    imgAlt: 'La Barka Resort — tampak udara di tepi Kali Progo',
    desc: 'Resort, villa, homestay, hingga rumah kos — ruang menginap yang dirancang menyatu dengan tapak dan pengalaman tamu.',
    typologies: ['Resort & Villa', 'Homestay & Guest House', 'Hotel', 'Rumah Kos'],
  },
  {
    key: 'residential',
    title: 'Residential',
    label: 'Selected Residential Design',
    img: 'hmw-facade',
    imgAlt: 'HMW House — fasad rumah tinggal',
    desc: 'Rumah tinggal dan kawasan perumahan — bangunan baru, renovasi, maupun pengembangan lahan yang tepat guna.',
    typologies: ['Rumah Tinggal', 'Perumahan & Kavling', 'Interior Hunian'],
  },
]

export const disciplines = [
  'Perencanaan Induk',
  'Perencanaan Bangunan',
  'Arsitektur Lanskap',
  'Desain Interior',
  'Desain Pencahayaan',
  'Visualisasi 3D',
]

export const managementServices = {
  perencanaan: ['Manajemen Proyek', 'Manajemen Pengembangan', 'Manajemen Program'],
  perawatan: ['Rehabilitasi', 'Restorasi'],
}

export const process: { title: string; lead: string; points: string[] }[] = [
  {
    title: 'Pain Points / Goals',
    lead: 'Mendengar lebih dulu. Kami memetakan kebutuhan, kendala, anggaran, dan target bersama klien sejak pertemuan pertama.',
    points: ['Konsultasi awal', 'Brief & kebutuhan ruang', 'Target anggaran & jadwal'],
  },
  {
    title: 'Analisa',
    lead: 'Membaca tapak dan konteks: kontur, orientasi matahari, aliran air, regulasi, hingga kondisi pasar.',
    points: ['Survei & analisis tapak', 'Studi regulasi bangunan', 'Studi kebutuhan & pasar'],
  },
  {
    title: 'Proses Kreatif',
    lead: 'Problem solving lebih dulu, langgam kemudian. Form follows function — diuji bersama klien di setiap tahap.',
    points: ['Konsep & skematik', 'Pengembangan desain', 'Visualisasi 3D'],
  },
  {
    title: 'Deliverables',
    lead: 'Dokumen yang siap dibangun — karena setiap desain harus terbangun, kami mendampingi sampai lapangan.',
    points: ['Gambar kerja (DED)', 'Rencana anggaran biaya', 'Pendampingan & pengawasan'],
  },
]
