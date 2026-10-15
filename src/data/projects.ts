import type { ImgKey } from '../components/Img'

/*
 * Data proyek. Sumber: Company Profile 2026, brief Canva, dan folder Drive "Asset Website Kadanglabo"
 * (klasifikasi Commercial / Hospitality / Residential mengikuti folder Drive dari klien).
 *
 * Catatan untuk dilengkapi klien:
 * - `year` dan sebagian besar `status` belum ada di materi → masih null. Filter Tahun/Status di halaman
 *   Our Work otomatis memakai nilai yang tersedia (filter Tahun muncul begitu ada data tahun).
 * - Lokasi bertanda "dari nama proyek" disimpulkan dari nama, mohon dikonfirmasi.
 */

export type Category = 'commercial' | 'hospitality' | 'residential'
export type Status = 'Terbangun' | 'Konstruksi' | 'Desain'
export type StoryKey = 'context' | 'challenge' | 'concept' | 'development' | 'outcome'

export const categoryLabel: Record<Category, string> = {
  commercial: 'Commercial',
  hospitality: 'Hospitality',
  residential: 'Residential',
}

export const storyLabel: Record<StoryKey, string> = {
  context: 'Context',
  challenge: 'Challenge',
  concept: 'Concept',
  development: 'Development',
  outcome: 'Outcome',
}

export type Block =
  | { t: 'full'; img: ImgKey; caption?: string }
  | { t: 'pair'; imgs: [ImgKey, ImgKey]; caption?: string }
  | { t: 'offset'; img: ImgKey; side?: 'left' | 'right'; caption?: string }
  | { t: 'text'; label: string; body: string }
  | { t: 'quote'; text: string; cite?: string }

export interface Project {
  slug: string
  title: string
  category: Category
  typology: string
  location: string | null
  region: string | null
  year: number | null
  status: Status | null
  scope: string[]
  landArea?: string
  buildingArea?: string
  delivery?: string
  client?: string
  /** warna latar & judul hero di halaman detail — hanya dari palet logo (navy / navy gelap / oranye) */
  color: string
  accent: string
  tagline: string
  summary: string
  story?: { key: StoryKey; text: string; img: ImgKey }[]
  hero: ImgKey
  cover: ImgKey
  gallery: Block[]
}

export const projects: Project[] = [
  {
    slug: 'la-barka-resort',
    title: 'La Barka Resort',
    category: 'hospitality',
    typology: 'Resort',
    location: 'Nanggulan, Kulon Progo, D.I. Yogyakarta',
    region: 'Kulon Progo',
    year: null,
    status: 'Terbangun',
    scope: ['Arsitektur', 'Landscape', 'Desain Interior'],
    landArea: '2.344 m²',
    buildingArea: '718 m²',
    delivery: 'Desain & Build',
    color: '#1B2238',
    accent: '#EC6434',
    tagline: 'Bangunan dan lanskap yang menyatu di tepi Kali Progo.',
    summary:
      'Perencanaan arsitektur Resort La Barka merupakan hasil eksplorasi desain kontekstual yang memadukan bangunan dan lanskap dalam harmoni yang menyatu dengan alam.',
    story: [
      {
        key: 'context',
        text: 'Terletak di tepi Kali Progo, Nanggulan, tapak La Barka berada di antara kontur, aliran sungai, dan vegetasi tropis yang menjadi karakter khas kawasan Kulon Progo.',
        img: 'labarka-river',
      },
      {
        key: 'challenge',
        text: 'Proyek ini menuntut sensitivitas tinggi terhadap kondisi kontur, arah aliran air, serta suasana alam yang khas dari kawasan tersebut.',
        img: 'labarka-garden',
      },
      {
        key: 'concept',
        text: 'Pendekatan tropis modern: massa beratap pelana disusun mengikuti tapak, sementara lanskap diperlakukan sebagai bagian dari arsitektur — bukan sekadar pelengkap.',
        img: 'labarka-gables',
      },
      {
        key: 'development',
        text: 'Potensi tapak dimaksimalkan melalui pengolahan ruang terbuka, orientasi matahari, serta pemanfaatan material dan bukaan yang mendukung kenyamanan termal alami.',
        img: 'labarka-bath',
      },
      {
        key: 'outcome',
        text: 'Dikerjakan dengan skema desain & build — 718 m² bangunan di atas lahan 2.344 m² yang hadir sebagai resort yang menyatu dengan alam.',
        img: 'labarka-koi',
      },
    ],
    hero: 'labarka-bird',
    cover: 'labarka-bird',
    gallery: [
      { t: 'full', img: 'labarka-river' },
      {
        t: 'text',
        label: 'Lanskap',
        body: 'Taman, kolam, dan jalur setapak dirancang sebagai ruang transisi — tamu bergerak dari ruang terbuka menuju kamar melalui vegetasi yang rapat dan teduh.',
      },
      { t: 'pair', imgs: ['labarka-koi', 'labarka-path'] },
      { t: 'offset', img: 'labarka-gables', side: 'right', caption: 'Massa beratap pelana dengan material kayu dan batu.' },
      { t: 'quote', text: 'Bangunan dan lanskap dalam harmoni yang menyatu dengan alam.' },
      { t: 'pair', imgs: ['labarka-balcony', 'labarka-stair'] },
      {
        t: 'text',
        label: 'Interior',
        body: 'Material kayu, bukaan lebar, dan taman di dalam ruang menjaga kamar tetap sejuk secara alami sekaligus dekat dengan suasana sekitarnya.',
      },
      { t: 'pair', imgs: ['labarka-room', 'labarka-bed'] },
      { t: 'pair', imgs: ['labarka-washbasin', 'labarka-pond'] },
      { t: 'full', img: 'labarka-bath' },
    ],
  },
  {
    slug: 'bale-catur-villa-resto',
    title: 'Bale Catur Villa & Resto',
    category: 'hospitality',
    typology: 'Villa & Restoran',
    location: 'Balecatur, Gamping, Sleman', // dari nama proyek — mohon konfirmasi
    region: 'Sleman',
    year: null,
    status: null,
    scope: ['Arsitektur', 'Desain Interior', 'Landscape'],
    color: '#EC6434',
    accent: '#1B2238',
    tagline: 'Percakapan antara tradisi dan kesederhanaan kontemporer.',
    summary:
      'Bale Catur Villa & Resto adalah percakapan antara tradisi dan kesederhanaan kontemporer — dari fasad yang berkarakter, lobby dan restoran yang terintegrasi, kamar yang merespons cara orang beristirahat, hingga area pool yang terasa seperti milik sendiri.',
    story: [
      {
        key: 'context',
        text: 'Sebuah destinasi menginap dan bersantap: villa, lobby, dan restoran berada dalam satu kawasan yang menyambut tamu sejak dari muka jalan.',
        img: 'balecatur-front',
      },
      {
        key: 'challenge',
        text: 'Menghadirkan rasa tradisi tanpa terjebak romantisme — tetap sederhana, fungsional, dan relevan bagi tamu masa kini.',
        img: 'balecatur-sign',
      },
      {
        key: 'concept',
        text: 'Fasad bata ekspos dan atap tropis yang berkarakter menjadi wajah kawasan, sementara lobby dan restoran dirancang terintegrasi sebagai satu ruang sambut.',
        img: 'balecatur-lobby',
      },
      {
        key: 'development',
        text: 'Kamar dirancang merespons cara orang beristirahat: material hangat, cahaya lembut, dan bukaan yang terhubung ke taman.',
        img: 'balecatur-bed',
      },
      {
        key: 'outcome',
        text: 'Area pool yang terasa privat — seperti milik sendiri — menjadi pusat pengalaman menginap.',
        img: 'balecatur-pool',
      },
    ],
    hero: 'balecatur-front',
    cover: 'balecatur-pool',
    gallery: [
      { t: 'full', img: 'balecatur-pool' },
      { t: 'pair', imgs: ['balecatur-sign', 'balecatur-pool2'] },
      {
        t: 'text',
        label: 'Lobby & Restoran',
        body: 'Lobby dan restoran menyatu di bawah atap yang tinggi — ruang sambut yang hangat dengan material kayu, bata, dan cahaya temaram.',
      },
      { t: 'offset', img: 'balecatur-lobby', side: 'left' },
      { t: 'pair', imgs: ['balecatur-bed', 'balecatur-bed2'] },
      { t: 'full', img: 'balecatur-twin' },
    ],
  },
  {
    slug: 'klinik-uii',
    title: 'Klinik UII',
    category: 'commercial',
    typology: 'Fasilitas Kesehatan',
    location: 'D.I. Yogyakarta',
    region: 'Yogyakarta',
    year: null,
    status: null,
    scope: ['Arsitektur', 'Desain Interior'],
    client: 'Universitas Islam Indonesia',
    color: '#3C4C74',
    accent: '#F3F0EA',
    tagline: 'Identitas modern bagi layanan kesehatan di lingkungan kampus.',
    summary:
      'Pada proyek Klinik Universitas Islam Indonesia, pendekatan desain diarahkan untuk membangun identitas yang kuat sebagai institusi pelayanan kesehatan modern, sekaligus tetap menyatu dengan lingkungan kampus.',
    story: [
      {
        key: 'context',
        text: 'Klinik UII adalah fasilitas pelayanan kesehatan milik Universitas Islam Indonesia yang hadir dalam konteks lingkungan kampus.',
        img: 'klinik-front',
      },
      {
        key: 'challenge',
        text: 'Membangun identitas institusi kesehatan modern yang tegas dan mudah dikenali, tanpa terasa asing dari lingkungan kampus di sekitarnya.',
        img: 'klinik-eks6',
      },
      {
        key: 'concept',
        text: 'Fasad didominasi secondary skin berupa kisi-kisi vertikal yang membungkus massa lantai atas — membentuk karakter visual yang tegas dan elegan.',
        img: 'klinik-hero',
      },
      {
        key: 'development',
        text: 'Kisi-kisi juga berfungsi sebagai pengendali intensitas cahaya matahari, mengurangi panas berlebih, serta menjaga privasi ruang-ruang klinis di dalam bangunan.',
        img: 'klinik-tree',
      },
      {
        key: 'outcome',
        text: 'Di dalam, koridor, ruang tunggu, dan ruang praktik dirancang bersih dan hangat — dinding putih berpadu aksen kayu yang menenangkan.',
        img: 'klinik-corridor',
      },
    ],
    hero: 'klinik-hero',
    cover: 'klinik-plaza',
    gallery: [
      { t: 'full', img: 'klinik-plaza' },
      { t: 'pair', imgs: ['klinik-front', 'klinik-tree'] },
      {
        t: 'text',
        label: 'Secondary skin',
        body: 'Kisi-kisi vertikal membungkus massa lantai atas: menyaring cahaya, meredam panas, dan menjaga privasi ruang klinis — sekaligus menjadi wajah institusi.',
      },
      { t: 'full', img: 'klinik-side' },
      { t: 'pair', imgs: ['klinik-corridor', 'klinik-signage'] },
      { t: 'offset', img: 'klinik-waiting', side: 'right', caption: 'Ruang tunggu dengan material yang tenang dan mudah dirawat.' },
      { t: 'pair', imgs: ['klinik-dental', 'klinik-dental2'] },
    ],
  },
  {
    slug: 'hmw-house',
    title: 'HMW House',
    category: 'residential',
    typology: 'Rumah Tinggal',
    location: null,
    region: null,
    year: null,
    status: null,
    scope: ['Arsitektur', 'Desain Interior', 'Landscape'],
    color: '#1B2238',
    accent: '#EC6434',
    tagline: 'Detail kecil bukan kemewahan — melainkan standar.',
    summary:
      'HMW House adalah bukti bahwa detail-detail kecil itu bukan kemewahan; mereka adalah standar yang seharusnya dimiliki setiap hunian. Karena hunian impian bukan soal seberapa besar, tapi seberapa tepat ia dirancang.',
    story: [
      {
        key: 'context',
        text: 'Sebuah rumah tinggal yang dirancang untuk keseharian keluarga — hangat, tenang, dan dekat dengan alam.',
        img: 'hmw-facade-day',
      },
      {
        key: 'challenge',
        text: 'Menghadirkan kualitas ruang yang tepat tanpa harus berlebihan: setiap meter persegi bekerja untuk penghuninya.',
        img: 'hmw-entry',
      },
      {
        key: 'concept',
        text: 'Fasad yang punya karakter, interior yang hangat tanpa berlebihan, dan ruang luar yang membuat alam terasa seperti bagian dari rumah.',
        img: 'hmw-garden',
      },
      {
        key: 'development',
        text: 'Taman transisi, kolam, dan bukaan lebar menghubungkan ruang keluarga, ruang makan, dan dapur dengan lanskap.',
        img: 'hmw-pool',
      },
      {
        key: 'outcome',
        text: 'Setiap detail — dari material hingga pencahayaan — dirancang sebagai standar, bukan tambahan.',
        img: 'hmw-dining',
      },
    ],
    hero: 'hmw-facade',
    cover: 'hmw-facade',
    gallery: [
      { t: 'full', img: 'hmw-facade-day' },
      { t: 'pair', imgs: ['hmw-garden', 'hmw-pool'] },
      {
        t: 'text',
        label: 'Ruang dalam',
        body: 'Ruang makan dan dapur dibuka ke taman. Cahaya masuk lewat bukaan lebar dan kisi, menjadikan interior hangat sepanjang hari.',
      },
      { t: 'full', img: 'hmw-dining' },
      { t: 'pair', imgs: ['hmw-kitchen', 'hmw-dining2'] },
      { t: 'offset', img: 'hmw-bedroom', side: 'left', caption: 'Kamar tidur dengan palet material yang tenang.' },
      { t: 'offset', img: 'hmw-entry', side: 'right' },
    ],
  },
  {
    slug: 'perum-firlatata',
    title: 'Perum Firlatata',
    category: 'residential',
    typology: 'Perumahan',
    location: null,
    region: null,
    year: null,
    status: null,
    scope: ['Tata Kawasan', 'Arsitektur', 'Desain Interior'],
    color: '#3C4C74',
    accent: '#F3F0EA',
    tagline: 'Lahan terbatas, potensi besar.',
    summary:
      'Dari kebutuhan nyata — lahan terbatas, potensi besar, dan pemilik yang belum tahu harus mulai dari mana — kami hadir bukan hanya sebagai perancang, tapi sebagai mitra yang menerjemahkan visi menjadi tata ruang yang strategis, bernilai, dan berkarakter.',
    story: [
      {
        key: 'context',
        text: 'Lahan terbatas dengan potensi besar, dan pemilik yang belum tahu harus mulai dari mana.',
        img: 'firlatata-street',
      },
      {
        key: 'challenge',
        text: 'Menerjemahkan visi pemilik menjadi tata ruang yang strategis dan bernilai — bukan sekadar membagi kavling.',
        img: 'firlatata-day',
      },
      {
        key: 'concept',
        text: 'Deretan unit dirancang dengan karakter visual yang kuat — atap pelana tinggi yang berulang — sehingga menciptakan identitas kawasan yang mudah dikenali.',
        img: 'firlatata-front',
      },
      {
        key: 'development',
        text: 'Dipikirkan matang dari sirkulasi, privasi antar unit, hingga kesan pertama saat memasuki kawasan.',
        img: 'firlatata-living',
      },
      {
        key: 'outcome',
        text: 'Bukan sekadar indah: kawasan yang membangun kepercayaan penghuni sejak kesan pertama.',
        img: 'firlatata-tv',
      },
    ],
    hero: 'firlatata-front',
    cover: 'firlatata-front',
    gallery: [
      { t: 'full', img: 'firlatata-day' },
      { t: 'offset', img: 'firlatata-street', side: 'right', caption: 'Jalan lingkungan dengan ritme fasad yang konsisten.' },
      {
        t: 'text',
        label: 'Interior unit',
        body: 'Ruang keluarga, dapur, dan area makan disusun ringkas dan terbuka — palet kayu hangat membuat unit terasa lapang.',
      },
      { t: 'pair', imgs: ['firlatata-living', 'firlatata-tv'] },
      { t: 'full', img: 'firlatata-shelf' },
    ],
  },
  {
    slug: 'bukit-indah-ceria-giripeni',
    title: 'Bukit Indah Ceria Giripeni',
    category: 'residential',
    typology: 'Kawasan Perumahan',
    location: 'Giripeni, Wates, Kulon Progo', // dari nama proyek — mohon konfirmasi
    region: 'Kulon Progo',
    year: null,
    status: null,
    scope: ['Tata Kawasan', 'Arsitektur', 'Desain Interior'],
    client: 'PT. Papan Cemerlang',
    color: '#EC6434',
    accent: '#1B2238',
    tagline: 'Kerja sama pertama kami di bidang perumahan.',
    summary:
      'Merupakan kerja sama pertama bagi kami dalam bidang perumahan. PT. Papan Cemerlang mempercayakan kami untuk mengembangkan lahannya yang sulit berkembang pada masa pandemi.',
    story: [
      {
        key: 'context',
        text: 'PT. Papan Cemerlang mempercayakan pengembangan lahannya kepada Kadanglabo — kerja sama pertama kami di bidang perumahan.',
        img: 'giripeni-aerial',
      },
      {
        key: 'challenge',
        text: 'Lahan yang sulit berkembang di tengah masa pandemi, ketika pasar properti bergerak sangat hati-hati.',
        img: 'giripeni-street',
      },
      {
        key: 'concept',
        text: 'Adaptasi terhadap kondisi eksisting dan pasar menjadi pendekatan utama dalam perancangan kawasan.',
        img: 'giripeni-row',
      },
      {
        key: 'development',
        text: 'Tipe unit satu dan dua lantai dengan bahasa arsitektur yang seragam membentuk lingkungan yang rapi dan mudah dikenali.',
        img: 'giripeni-two',
      },
      {
        key: 'outcome',
        text: 'Sebuah kawasan hunian yang utuh — dari gerbang, jalan lingkungan, hingga interior unit.',
        img: 'giripeni-living',
      },
    ],
    hero: 'giripeni-aerial',
    cover: 'giripeni-aerial',
    gallery: [
      { t: 'full', img: 'giripeni-gate' },
      { t: 'pair', imgs: ['giripeni-row', 'giripeni-street'] },
      { t: 'quote', text: 'Adaptasi terhadap kondisi eksisting dan pasar adalah pendekatan utama.' },
      { t: 'full', img: 'giripeni-two' },
      { t: 'pair', imgs: ['giripeni-living', 'giripeni-bed'] },
    ],
  },
  {
    slug: 'omah-cantrik',
    title: 'Omah Cantrik',
    category: 'hospitality',
    typology: 'Homestay & Taman',
    location: null,
    region: null,
    year: null,
    status: 'Terbangun',
    scope: ['Arsitektur', 'Landscape'],
    color: '#1B2238',
    accent: '#EC6434',
    tagline: 'Dari gambar menjadi ruang yang hidup.',
    summary:
      'Omah Cantrik tumbuh bertahap — bangunan utama, homestay, hingga tamannya. Rangka kayu, dinding roster, dan halaman kerikil dibiarkan jujur dan menyatu dengan vegetasi tropis.',
    story: [
      {
        key: 'context',
        text: 'Proyek yang berkembang dalam beberapa tahap: Omah Cantrik, Homestay Omah Cantrik, dan Taman Omah Cantrik.',
        img: 'cantrik-sign',
      },
      {
        key: 'concept',
        text: 'Material yang jujur dan mudah dirawat — rangka kayu, dinding roster, dan lantai kerikil — membiarkan cahaya dan udara mengalir.',
        img: 'cantrik-pergola',
      },
      {
        key: 'development',
        text: 'Ruang-ruang semi-terbuka disusun di antara taman sehingga batas dalam dan luar terasa cair.',
        img: 'cantrik-walkway',
      },
      {
        key: 'outcome',
        text: 'Telah terbangun dan digunakan — bukti etos kami bahwa setiap desain harus terbangun.',
        img: 'cantrik-hall',
      },
    ],
    hero: 'cantrik-sign',
    cover: 'cantrik-lounge',
    gallery: [
      { t: 'pair', imgs: ['cantrik-pergola', 'cantrik-lounge'] },
      {
        t: 'text',
        label: 'Terbangun',
        body: 'Foto-foto di halaman ini adalah kondisi terbangun — bukan render. Ruang berkumpul, bar, tangga, dan taman yang kini hidup sehari-hari.',
      },
      { t: 'pair', imgs: ['cantrik-hall', 'cantrik-garden'] },
      { t: 'pair', imgs: ['cantrik-entrance', 'cantrik-breeze'] },
      { t: 'quote', text: 'Setiap proyek yang kami desain harus terbangun.', cite: 'Etos Kadanglabo' },
      { t: 'pair', imgs: ['cantrik-bar', 'cantrik-stairs'] },
      { t: 'offset', img: 'cantrik-night', side: 'right' },
    ],
  },
  {
    slug: 'hamzah-batik-malioboro',
    title: 'Hamzah Batik Malioboro',
    category: 'hospitality',
    typology: 'Retail',
    location: 'Malioboro, Yogyakarta',
    region: 'Yogyakarta',
    year: null,
    status: null,
    scope: ['Arsitektur'],
    color: '#EC6434',
    accent: '#1B2238',
    tagline: 'Wajah yang hangat di koridor paling ikonik Yogyakarta.',
    summary:
      'Rancangan fasad Hamzah Batik di kawasan Malioboro — lengkung, gevel, dan ritme jendela bergaya kolonial yang menghadirkan wajah bangunan yang hangat dan berwibawa di koridor heritage Yogyakarta.',
    hero: 'hamzah-front',
    cover: 'hamzah-front',
    gallery: [{ t: 'full', img: 'hamzah-street' }],
  },
  {
    slug: 'villa-berbah',
    title: 'Villa Berbah',
    category: 'hospitality',
    typology: 'Villa',
    location: 'Berbah, Sleman', // dari nama proyek — mohon konfirmasi
    region: 'Sleman',
    year: null,
    status: null,
    scope: ['Arsitektur', 'Landscape'],
    color: '#3C4C74',
    accent: '#F3F0EA',
    tagline: 'Atap lebar, batu alam, dan halaman yang teduh.',
    summary:
      'Villa dengan atap pelana lebar dan dinding batu alam — massa sederhana yang hangat dan menyatu dengan halaman hijau di sekitarnya.',
    hero: 'berbah-front',
    cover: 'berbah-front',
    gallery: [],
  },
  {
    slug: 'muji-rukost',
    title: 'Muji Rukost',
    category: 'hospitality',
    typology: 'Ruko & Rumah Kos',
    location: null,
    region: null,
    year: null,
    status: null,
    scope: ['Arsitektur'],
    color: '#1B2238',
    accent: '#EC6434',
    tagline: 'Ruko dan kos dalam satu massa yang ringkas.',
    summary:
      'Rukost — perpaduan ruko dan rumah kos — dengan massa kubus putih yang bersih dan tegas: efisien secara ruang, rapi di muka jalan.',
    hero: 'muji-front',
    cover: 'muji-front',
    gallery: [],
  },
  {
    slug: 'ivanna-house',
    title: 'Ivanna House',
    category: 'residential',
    typology: 'Rumah Tinggal',
    location: null,
    region: null,
    year: null,
    status: null,
    scope: ['Arsitektur'],
    color: '#3C4C74',
    accent: '#F3F0EA',
    tagline: 'Rumah satu lantai yang tenang dan fungsional.',
    summary:
      'Rumah tinggal satu lantai dengan atap pelana gelap, dinding putih, dan carport yang menyatu dengan fasad.',
    hero: 'ivanna-front',
    cover: 'ivanna-front',
    gallery: [],
  },
  {
    slug: 'tiara-house-kalasan',
    title: 'Tiara House Kalasan',
    category: 'residential',
    typology: 'Rumah Tinggal',
    location: 'Kalasan, Sleman',
    region: 'Sleman',
    year: null,
    status: null,
    scope: ['Arsitektur'],
    color: '#EC6434',
    accent: '#1B2238',
    tagline: 'Tertutup di muka, terbuka pada cahaya.',
    summary:
      'Rumah tinggal dengan atap pelana dan bukaan cahaya memanjang di puncaknya — fasad yang menjaga privasi namun tetap terbuka pada cahaya alami.',
    hero: 'tiara-front',
    cover: 'tiara-front',
    gallery: [],
  },
  {
    slug: 'kavling-bangunjiwo',
    title: 'Kavling Bangunjiwo',
    category: 'residential',
    typology: 'Kavling Hunian',
    location: 'Bangunjiwo, Bantul',
    region: 'Bantul',
    year: null,
    status: null,
    scope: ['Arsitektur'],
    color: '#1B2238',
    accent: '#EC6434',
    tagline: 'Unit ringkas yang memaksimalkan lahan.',
    summary:
      'Unit kavling dua lantai dengan carport kembar — desain ringkas yang memaksimalkan lahan tanpa kehilangan karakter.',
    hero: 'bangunjiwo-front',
    cover: 'bangunjiwo-front',
    gallery: [],
  },
]

export const getProject = (slug: string) => projects.find((p) => p.slug === slug)

/** Proyek berikutnya untuk footer "Next up". */
export const nextProject = (slug: string) => {
  const i = projects.findIndex((p) => p.slug === slug)
  return projects[(i + 1) % projects.length]
}

export const relatedProjects = (p: Project, n = 3) => {
  const same = projects.filter((x) => x.slug !== p.slug && x.category === p.category)
  const others = projects.filter((x) => x.slug !== p.slug && x.category !== p.category)
  return [...same, ...others].slice(0, n)
}

/* ---------- Arsip (Project Archive / Index) ---------- */

export interface ArchiveEntry {
  title: string
  category: Category
  region: string | null
  year: number | null
  status: Status | null
  slug?: string
}

/* Daftar proyek dari "KADANGLABO PROJECT LIST" (Company Profile 2026).
 * Kategori & wilayah disimpulkan dari nama proyek — mohon dikoreksi bila perlu. */
const listOnly: [string, Category, string | null][] = [
  ['Homestay Omah Cantrik', 'hospitality', null],
  ['Taman Omah Cantrik', 'hospitality', null],
  ['AK Ruko Klaten', 'commercial', 'Klaten'],
  ['AH House', 'residential', null],
  ['IBAIA Coffee Point', 'commercial', null],
  ['Kopi Danu', 'commercial', null],
  ['Pemakaman UGM', 'commercial', 'Sleman'],
  ['Yayasan Bali Putra Sedana', 'commercial', null],
  ['MN House Jepara', 'residential', 'Jepara'],
  ['Mr Jhon House', 'residential', null],
  ['Outdoor Area Amurwa', 'commercial', null],
  ['Pocha Praja', 'commercial', null],
  ['Resto Pakem', 'commercial', 'Sleman'],
  ['Resto Taman Mataram', 'commercial', null],
  ['Telkom KCP', 'commercial', null],
  ['Villa Pak Bambang', 'hospitality', null],
  ['Ruko Rendi', 'commercial', null],
  ['AP House Jepara', 'residential', 'Jepara'],
  ['Hotel Grand Inna Bali', 'hospitality', 'Bali'],
  ['Desi House Bantul', 'residential', 'Bantul'],
  ['Kost Jetisharjo', 'hospitality', 'Yogyakarta'],
  ['Guest House Omah Jayan', 'hospitality', null],
  ['H House Purwomartani', 'residential', 'Sleman'],
  ['Kantor Redaksi Anggajaya', 'commercial', null],
  ['Kantor Weebz Mandiri Surabaya', 'commercial', 'Surabaya'],
  ['Meduzza Point', 'commercial', null],
  ['Office Senja Godean', 'commercial', 'Sleman'],
  ['R House Madukismo', 'residential', 'Bantul'],
  ['KBM Karaoke', 'commercial', null],
  ['Studio Musik Mustofa', 'commercial', null],
  ['Cafe Red Soldadu', 'commercial', null],
  ['Kavling Type 80 Palembang', 'residential', 'Palembang'],
  ['Kavling Type 54 Palembang', 'residential', 'Palembang'],
  ['Kavling Type 45 Palembang', 'residential', 'Palembang'],
  ['Happy Cafe', 'commercial', null],
  ['Modelling Flight Simulator', 'commercial', null],
  ['RS Hermina', 'commercial', null],
  ['T House Pakem', 'residential', 'Sleman'],
  ['Muji House Klaten', 'residential', 'Klaten'],
  ['Rey Project', 'residential', null],
  ['Ibu Nisa Pajangan', 'residential', 'Bantul'],
  ['Kost Chandra Palagan', 'hospitality', 'Sleman'],
  ['Taman Lavana', 'commercial', null],
  ['Wira House Pleret', 'residential', 'Bantul'],
  ['Rukost ER', 'hospitality', null],
  ['Kavling KIS', 'residential', null],
  ['SR House', 'residential', null],
  ['Kavling Berbah Sleman', 'residential', 'Sleman'],
  ['Los Kridosono', 'commercial', 'Yogyakarta'],
  ['Ruko Moses', 'commercial', null],
  ['Nightwok Demangan Baru', 'commercial', 'Sleman'],
]

export const archive: ArchiveEntry[] = [
  ...projects.map((p) => ({
    title: p.title,
    category: p.category,
    region: p.region,
    year: p.year,
    status: p.status,
    slug: p.slug,
  })),
  ...listOnly.map(([title, category, region]) => ({ title, category, region, year: null, status: null })),
]
