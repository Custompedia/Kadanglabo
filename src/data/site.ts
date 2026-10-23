import type { ImgKey } from '../components/Img'
import { t, type Tx } from '../lib/i18n'

/* Sumber: Company Profile Kadanglabo 2026 + brief Canva "Referensi Website Arsitektur".
 * Semua copy dua bahasa ({ en, id }); dibaca lewat t() saat render (lib/i18n.ts). */

export const company = {
  name: 'Kadanglabo',
  tagline: 'A Collaborative Architectural Solution',
  vision: { en: 'Architecture for everyone', id: 'Arsitektur untuk semua' } as Tx,
  founder: 'Raditya Alvin',
  founded: 2020,
  address: ['Jl. Kaliurang KM.9 No.11 (Ruko 3)', 'Dayu Sinduharjo, Ngaglik', 'Sleman, Yogyakarta'],
  phone: '0821-3106-9311',
  phoneIntl: '6282131069311',
  email: 'kadanglabo@gmail.com',
  instagram: 'https://www.instagram.com/kadanglabo/',
}

const mapsQuery = 'Jl. Kaliurang KM.9 No.11, Dayu, Sinduharjo, Ngaglik, Sleman, Yogyakarta'
export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
export const mapsEmbed = `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`

/** The default WhatsApp opener, in the visitor's language. */
export const waHello = () =>
  t({ en: 'Hello Kadanglabo, I’d like to discuss a project.', id: 'Halo Kadanglabo, saya ingin konsultasi proyek.' })
export const waLink = (text?: string) =>
  `https://wa.me/${company.phoneIntl}${text ? `?text=${encodeURIComponent(text)}` : ''}`
export const mailLink = (subject?: string, body?: string) =>
  `mailto:${company.email}?subject=${encodeURIComponent(subject ?? t({ en: 'Project consultation', id: 'Konsultasi Proyek' }))}${body ? `&body=${encodeURIComponent(body)}` : ''}`

export const nav: { to: string; label: Tx; img: ImgKey }[] = [
  { to: '/', label: { en: 'Home', id: 'Beranda' }, img: 'balecatur-front' },
  { to: '/about', label: { en: 'About', id: 'Tentang' }, img: 'labarka-garden' },
  { to: '/services', label: { en: 'Services', id: 'Layanan' }, img: 'klinik-plaza' },
  { to: '/work', label: { en: 'Our Work', id: 'Proyek' }, img: 'labarka-bird' },
  { to: '/news', label: { en: 'Articles', id: 'Artikel' }, img: 'labarka-pond' },
  { to: '/contact', label: { en: 'Contact', id: 'Kontak' }, img: 'hmw-facade' },
]

/**
 * Home (01) About x Kadanglabo spirit: the brief's About copy told in four short chapters, held in the middle of a
 * field of drifting project photos (the Project archive scene from Our Work); each stretch of scroll brings the next.
 */
export const spiritChapters: { title: Tx; body: Tx }[] = [
  {
    title: { en: 'Architecture for everyone.', id: 'Arsitektur untuk semua.' },
    body: {
      en: 'Kadanglabo is a community-based architecture consultancy in Yogyakarta, founded in 2020. We believe good design should be within everyone’s reach.',
      id: 'Kadanglabo adalah konsultan arsitektur berbasis komunitas di Yogyakarta, berdiri sejak 2020. Kami percaya desain yang baik seharusnya bisa dijangkau semua orang.',
    },
  },
  {
    title: { en: 'Client, planner, builder. One table.', id: 'Klien, perencana, pelaksana. Satu meja.' },
    body: {
      en: 'Everyone shaping the building works together from day one, so every decision is clear, realistic and ready to implement on site.',
      id: 'Semua pihak yang membentuk bangunan bekerja sama sejak hari pertama, sehingga setiap keputusan jelas, realistis, dan siap diterapkan di lapangan.',
    },
  },
  {
    title: { en: 'Design that reads the site.', id: 'Desain yang membaca tapak.' },
    body: {
      en: 'Contours, sunlight, water, local culture and the market guide every line, so each building feels at home where it stands.',
      id: 'Kontur, cahaya matahari, air, budaya setempat, dan pasar menuntun setiap garis, agar bangunan terasa menyatu dengan tempatnya.',
    },
  },
  {
    title: { en: 'Designed to be built.', id: 'Didesain untuk terbangun.' },
    body: {
      en: 'Planning and construction under one roof keep time, cost and quality in check until the building stands.',
      id: 'Perencanaan dan pelaksanaan lewat satu pintu menjaga waktu, biaya, dan kualitas hingga bangunan berdiri.',
    },
  },
]

export const vision: Tx = {
  en: 'Comprehensive, affordable property management.',
  id: 'Pengelolaan properti yang menyeluruh dan terjangkau.',
}

export const mission: Tx[] = [
  {
    en: 'Improve places through Contextual Design, guided by sustainability.',
    id: 'Memperbaiki lingkungan lewat Desain Kontekstual dengan prinsip keberlanjutan.',
  },
  {
    en: 'Bring planning and construction management under one roof.',
    id: 'Mengelola perencanaan dan pelaksanaan melalui satu pintu.',
  },
  { en: 'Provide comprehensive, responsive support.', id: 'Memberi layanan menyeluruh dan responsif.' },
]

export const goals: Tx[] = [
  {
    en: 'Contextual Design for every community, with people actively shaping places that meet their needs.',
    id: 'Desain Kontekstual bagi tiap komunitas, dengan warga berperan aktif membentuk lingkungan sesuai kebutuhan mereka.',
  },
  {
    en: 'Effective workflow and budgeting, from planning through construction, for buildings that work as intended.',
    id: 'Workflow dan penganggaran yang efektif dari perencanaan hingga pelaksanaan, agar bangunan tepat guna.',
  },
]

export const parametersDetail: { title: Tx; body: Tx; img: ImgKey; imgAlt: Tx }[] = [
  {
    title: { en: 'Contextual Design', id: 'Desain Kontekstual' },
    img: 'labarka-bird',
    imgAlt: { en: 'La Barka Resort - aerial view by the Progo River', id: 'La Barka Resort - tampak udara di tepi Kali Progo' },
    body: {
      en: 'Every site has a story: contours, sun path, water flow, culture and the market. Our designs grow from reading that story honestly.',
      id: 'Setiap tapak punya cerita: kontur, lintasan matahari, aliran air, budaya, hingga kondisi pasar. Desain kami lahir dari membaca cerita itu dengan jujur.',
    },
  },
  {
    title: { en: 'Effective Workflow', id: 'Efektivitas Workflow' },
    img: 'draw-model',
    imgAlt: { en: 'Site and massing model study', id: 'Studi model tapak dan massa bangunan' },
    body: {
      en: 'One coordinated workflow connects planning and construction, helping manage time, cost and quality through to completion.',
      id: 'Satu workflow terpadu menyatukan perencanaan dan pelaksanaan, membantu mengelola waktu, biaya, dan kualitas hingga bangunan selesai.',
    },
  },
]

export const team: { name: string; role: Tx; img: ImgKey }[] = [
  { name: 'Raditya Alvin Dea R', role: { en: 'Managing Director', id: 'Direktur Utama' }, img: 'team-raditya' },
  { name: 'Gian Sefentyas', role: { en: 'Senior Architect', id: 'Arsitek Senior' }, img: 'team-gian' },
  { name: 'Angeline Putri', role: { en: 'Architect', id: 'Arsitek' }, img: 'team-angeline' },
  { name: 'Sri Rachma W', role: { en: 'Drafter', id: 'Drafter' }, img: 'team-sri' },
  { name: 'Abdillah', role: { en: 'Site Supervisor', id: 'Pengawas Lapangan' }, img: 'team-abdillah' },
  { name: 'Nando Brilian C', role: { en: 'Digital Content', id: 'Konten Digital' }, img: 'team-nando' },
  { name: 'Luthfiana Dea', role: { en: 'Digital Marketing', id: 'Pemasaran Digital' }, img: 'team-luthfiana' },
  { name: 'Anfasa Risda', role: { en: 'General Administration', id: 'Administrasi Umum' }, img: 'team-anfasa' },
  { name: 'Gunawan David', role: { en: 'Project Logistics', id: 'Logistik Proyek' }, img: 'team-gunawan' },
]

export type SectorKey = 'commercial' | 'hospitality' | 'residential'

/**
 * The three service categories. Each one has its landing page at /work/<key> (Category.tsx, with `workLanding`
 * below): the benefits, what is included, answers to the usual questions.
 */
export const sectors: {
  key: SectorKey
  title: string
  label: string
  img: ImgKey
  imgAlt: Tx
  desc: Tx
  typologies: Tx[]
  benefits: { title: Tx; body: Tx }[]
  /** services from serviceGroups that this category mostly uses (by their English name) */
  scope: string[]
  gallery: ImgKey[]
  faq: { q: Tx; a: Tx }[]
}[] = [
  {
    key: 'commercial',
    title: 'Commercial',
    label: 'Commercial Design',
    img: 'klinik-hero',
    imgAlt: { en: 'Klinik UII - secondary-skin facade', id: 'Klinik UII - fasad secondary skin' },
    desc: {
      en: 'New builds, renovations and expansions for businesses and institutions, from coffee shops to healthcare facilities.',
      id: 'Bangunan baru, renovasi, dan pengembangan untuk usaha dan institusi, dari coffee shop hingga fasilitas kesehatan.',
    },
    typologies: [
      { en: 'Restaurants & Coffee Shops', id: 'Restoran & Coffee Shop' },
      { en: 'Shophouses & Offices', id: 'Ruko & Kantor' },
      { en: 'Healthcare Facilities', id: 'Fasilitas Kesehatan' },
      { en: 'Landscape Design', id: 'Tata Lanskap' },
    ],
    benefits: [
      {
        title: { en: 'First impressions that sell', id: 'Kesan pertama yang menjual' },
        body: {
          en: 'Facades, signage and entrances designed to be seen from the street and remembered by your customers.',
          id: 'Fasad, signage, dan pintu masuk kami rancang agar terlihat dari jalan dan diingat pelanggan.',
        },
      },
      {
        title: { en: 'Layouts ready for business', id: 'Layout siap operasional' },
        body: {
          en: 'Visitor flow, staff routes, storage and services planned together to support smooth daily operations.',
          id: 'Kami menata alur pengunjung, jalur staf, gudang, dan utilitas secara terpadu agar operasional harian lancar.',
        },
      },
      {
        title: { en: 'Costs kept in check', id: 'Biaya tetap terkendali' },
        body: {
          en: 'Detailed drawings and a clear cost estimate help you plan your investment before construction starts.',
          id: 'Gambar kerja detail dan RAB yang jelas membantu Anda merencanakan investasi sebelum mulai membangun.',
        },
      },
    ],
    scope: ['Building Design', 'Interior Design', 'Landscape Architecture', 'Lighting Design', '3D Visualisation', 'Project Management'],
    gallery: ['klinik-plaza', 'klinik-corridor', 'klinik-waiting', 'klinik-tree', 'klinik-dental'],
    faq: [
      {
        q: { en: 'Can you renovate an existing building?', id: 'Bisakah merenovasi bangunan yang sudah ada?' },
        a: {
          en: 'Yes. We survey the existing building, then plan renovations or expansions around the parts worth keeping.',
          id: 'Bisa. Kami menyurvei bangunan terlebih dahulu, lalu merancang renovasi atau pengembangan dengan mempertahankan bagian yang masih layak.',
        },
      },
      {
        q: { en: 'Do you consider building regulations?', id: 'Apakah regulasi bangunan juga dikaji?' },
        a: {
          en: 'From the start. We study local building regulations during analysis to inform the design and drawings for your permit process.',
          id: 'Sejak awal. Kami mempelajari regulasi bangunan setempat saat analisis untuk menyiapkan desain dan gambar bagi proses perizinan Anda.',
        },
      },
      {
        q: { en: 'Can you also oversee construction?', id: 'Apakah bisa sekalian mengawal pembangunan?' },
        a: {
          en: 'Yes. Planning and construction sit under one roof, with site supervision through to handover.',
          id: 'Bisa. Perencanaan dan pelaksanaan melalui satu pintu, dengan pengawasan lapangan hingga serah terima.',
        },
      },
    ],
  },
  {
    key: 'hospitality',
    title: 'Hospitality',
    label: 'Hospitality Design',
    img: 'labarka-bird',
    imgAlt: { en: 'La Barka Resort - aerial view by the Progo River', id: 'La Barka Resort - tampak udara di tepi Kali Progo' },
    desc: {
      en: 'Resorts, villas, homestays and boarding houses designed around their setting and the people who stay.',
      id: 'Resort, villa, homestay, dan rumah kos yang selaras dengan tapak dan kebutuhan tamu.',
    },
    typologies: [
      { en: 'Resorts & Villas', id: 'Resort & Villa' },
      { en: 'Homestays & Guest Houses', id: 'Homestay & Guest House' },
      { en: 'Hotels', id: 'Hotel' },
      { en: 'Boarding Houses', id: 'Rumah Kos' },
    ],
    benefits: [
      {
        title: { en: 'Rooted in the landscape', id: 'Menyatu dengan lanskap' },
        body: {
          en: 'We work with contours, views, water and greenery, so nature becomes your main attraction.',
          id: 'Kami menyelaraskan desain dengan kontur, pemandangan, air, dan vegetasi agar alam menjadi daya tarik utama Anda.',
        },
      },
      {
        title: { en: 'Designed around the guest', id: 'Dirancang dari sudut pandang tamu' },
        body: {
          en: 'From arrival to the room, we plan each transition to feel calm, private and memorable.',
          id: 'Dari area kedatangan hingga kamar, kami menata alur ruang yang tenang, privat, dan berkesan.',
        },
      },
      {
        title: { en: 'Comfort that costs less to run', id: 'Nyaman dan hemat operasional' },
        body: {
          en: 'Natural ventilation, daylight and suitable materials help keep rooms cool and running costs down.',
          id: 'Ventilasi alami, cahaya alami, dan material yang tepat membantu menyejukkan kamar dan menekan biaya operasional.',
        },
      },
    ],
    scope: ['Master Planning', 'Building Design', 'Landscape Architecture', 'Interior Design', 'Lighting Design', '3D Visualisation'],
    gallery: ['labarka-river', 'labarka-gables', 'balecatur-pool', 'labarka-room', 'balecatur-lobby'],
    faq: [
      {
        q: { en: 'Can you design on a sloping or riverside site?', id: 'Bisakah mendesain di lahan miring atau tepi sungai?' },
        a: {
          en: 'Yes. La Barka Resort sits on the bank of the Progo River; its buildings and gardens follow the contours and the flow of the water.',
          id: 'Bisa. La Barka Resort berdiri di tepi Kali Progo; bangunan dan tamannya mengikuti kontur serta aliran air.',
        },
      },
      {
        q: { en: 'Do you design the interior and landscape too?', id: 'Apakah interior dan lanskap ikut didesain?' },
        a: {
          en: 'Yes. We plan architecture, interiors, landscape and lighting together for a consistent guest experience.',
          id: 'Ya. Kami memadukan arsitektur, interior, lanskap, dan pencahayaan agar pengalaman menginap terasa utuh.',
        },
      },
      {
        q: { en: 'Can the project be built in phases?', id: 'Apakah proyek bisa dibangun bertahap?' },
        a: {
          en: 'Yes. We create a master plan for phased construction, in step with your business growth.',
          id: 'Bisa. Kami menyusun rencana induk untuk pembangunan bertahap, mengikuti pertumbuhan bisnis Anda.',
        },
      },
    ],
  },
  {
    key: 'residential',
    title: 'Residential',
    label: 'Selected Residential Design',
    img: 'hmw-facade',
    imgAlt: { en: 'HMW House - family home facade', id: 'HMW House - fasad rumah tinggal' },
    desc: {
      en: 'Homes and housing estates: new builds, renovations and land development that fit their purpose.',
      id: 'Rumah tinggal dan kawasan perumahan: bangunan baru, renovasi, maupun pengembangan lahan yang tepat guna.',
    },
    typologies: [
      { en: 'Private Houses', id: 'Rumah Tinggal' },
      { en: 'Housing & Plots', id: 'Perumahan & Kaveling' },
      { en: 'Residential Interiors', id: 'Interior Hunian' },
    ],
    benefits: [
      {
        title: { en: 'Made for your routine', id: 'Sesuai rutinitas Anda' },
        body: {
          en: 'Rooms, daylight and circulation shaped around your family’s daily life and changing needs.',
          id: 'Ruang, cahaya alami, dan sirkulasi kami rancang sesuai keseharian keluarga Anda dan kebutuhan yang berkembang.',
        },
      },
      {
        title: { en: 'Comfortable in the tropics', id: 'Nyaman di iklim tropis' },
        body: {
          en: 'Cross ventilation, shading and daylight help keep your home cool and bright.',
          id: 'Ventilasi silang, peneduh, dan cahaya alami membantu menjaga rumah tetap sejuk dan terang.',
        },
      },
      {
        title: { en: 'From one house to a whole estate', id: 'Dari satu rumah hingga satu kawasan' },
        body: {
          en: 'Site plans, plot layouts and efficient house types help developers create quality housing.',
          id: 'Rencana tapak, pembagian kaveling, dan tipe rumah efisien membantu pengembang membangun perumahan berkualitas.',
        },
      },
    ],
    scope: ['Master Planning', 'Building Design', 'Interior Design', 'Landscape Architecture', '3D Visualisation', 'Development Management'],
    gallery: ['hmw-facade-day', 'hmw-dining', 'firlatata-living', 'hmw-pool', 'giripeni-aerial'],
    faq: [
      {
        q: { en: 'I only have a plot of land. Where do we start?', id: 'Saya baru punya lahan. Mulai dari mana?' },
        a: {
          en: 'We start with a conversation about your needs, budget and timeline, then study the site before designing.',
          id: 'Kita bicarakan kebutuhan, anggaran, dan jadwal Anda. Lalu, kami pelajari tapaknya sebelum mulai merancang.',
        },
      },
      {
        q: { en: 'Can you renovate my existing home?', id: 'Bisakah rumah saya direnovasi?' },
        a: {
          en: 'Yes. We survey your home, keep what works and adapt the rest to your family’s needs.',
          id: 'Bisa. Kami menyurvei rumah Anda, mempertahankan bagian yang masih sesuai, dan menata ulang sisanya untuk kebutuhan keluarga.',
        },
      },
      {
        q: { en: 'Do you work with housing developers?', id: 'Apakah melayani pengembang perumahan?' },
        a: {
          en: 'Yes. We plan estates such as Bukit Indah Ceria Giripeni, from the site plan down to each house type.',
          id: 'Ya. Kami merencanakan kawasan seperti Bukit Indah Ceria Giripeni, dari rencana tapak sampai setiap tipe rumahnya.',
        },
      },
    ],
  },
]

export const getSector = (key: string) => sectors.find((s) => s.key === key)

/**
 * The project landing pages (/work/<sector>), built to be the page an ad points to: a cinematic hero with the promise
 * and two ways to act, one statement with photos set inline ([[img-key]] marks where a photo sits in the line),
 * the selected projects, what we design (one photo per typology, same order as `typologies`), why us, and the form.
 */
export const workLanding: Record<
  SectorKey,
  { headline: Tx; sub: Tx; statement: Tx; projectsIntro: Tx; typologyImgs: ImgKey[] }
> = {
  commercial: {
    headline: { en: 'Buildings that put your business on the map.', id: 'Bangunan yang membuat bisnis Anda dilirik.' },
    sub: {
      en: 'Clinics, shophouses, offices and coffee shops, designed to welcome customers and to work hard every single day.',
      id: 'Klinik, ruko, kantor, hingga coffee shop yang dirancang untuk menyambut pelanggan dan bekerja keras setiap hari.',
    },
    statement: {
      en: 'A good commercial building [[klinik-front]] sells before anyone walks in, makes [[klinik-waiting]] every visit easy, and gives your business [[klinik-plaza]] room to grow.',
      id: 'Bangunan komersial yang baik [[klinik-front]] sudah menjual sebelum orang masuk, memudahkan [[klinik-waiting]] setiap kunjungan, dan memberi bisnis Anda [[klinik-plaza]] ruang untuk tumbuh.',
    },
    projectsIntro: {
      en: 'From a campus clinic to a row of shophouses, each one designed around how the business really runs.',
      id: 'Dari klinik kampus hingga deretan ruko, semuanya dirancang mengikuti cara bisnis itu benar-benar berjalan.',
    },
    typologyImgs: ['labarka-teppanyaki', 'hamzah-street', 'klinik-front', 'klinik-tree'],
  },
  hospitality: {
    headline: { en: 'Places to stay that feel born from their landscape.', id: 'Tempat menginap yang terasa lahir dari alamnya.' },
    sub: {
      en: 'Resorts, villas, homestays and boarding houses that turn the character of a site into the reason guests book and come back.',
      id: 'Resort, villa, homestay, hingga rumah kos yang menjadikan karakter tapak sebagai alasan tamu memesan kamar, lalu datang kembali.',
    },
    statement: {
      en: 'From a riverside resort [[labarka-river]] to a villa and restaurant [[balecatur-pool]] built around its pool, we design places to stay where every arrival [[labarka-path]] feels like a welcome.',
      id: 'Dari resort di tepi sungai [[labarka-river]] hingga villa dan restoran [[balecatur-pool]] yang berpusat pada kolamnya, kami merancang tempat menginap yang menyambut tamu [[labarka-path]] sejak langkah pertama.',
    },
    projectsIntro: {
      en: 'Resorts, villas and guest houses where architecture, landscape and interior are planned as one.',
      id: 'Resort, villa, dan guest house dengan arsitektur, lanskap, dan interior yang direncanakan sebagai satu kesatuan.',
    },
    typologyImgs: ['labarka-bird', 'balecatur-front', 'hamzah-front', 'muji-front'],
  },
  residential: {
    headline: { en: 'Homes shaped around the people who live in them.', id: 'Rumah yang dibentuk oleh cara penghuninya hidup.' },
    sub: {
      en: 'Family houses, renovations and housing estates that are comfortable, efficient to build and ready to grow with you.',
      id: 'Rumah keluarga, renovasi, hingga kawasan perumahan yang nyaman, efisien dibangun, dan siap tumbuh bersama Anda.',
    },
    statement: {
      en: 'A home starts with [[hmw-dining]] the way you gather, rest [[hmw-bedroom]] and welcome guests, then becomes a house [[hmw-facade-day]] that feels like yours from day one.',
      id: 'Rumah dimulai dari [[hmw-dining]] cara Anda berkumpul, beristirahat [[hmw-bedroom]] dan menyambut tamu, lalu menjadi hunian [[hmw-facade-day]] yang terasa milik Anda sejak hari pertama.',
    },
    projectsIntro: {
      en: 'Private houses and estates in and around Yogyakarta, each planned for light, air and everyday life.',
      id: 'Rumah tinggal dan kawasan hunian di Yogyakarta dan sekitarnya, dirancang dengan memperhatikan cahaya, udara, dan keseharian penghuninya.',
    },
    typologyImgs: ['hmw-facade-day', 'giripeni-aerial', 'hmw-kitchen'],
  },
}

/** The eleven services in three groups (Services overview + the landing pages). `en` doubles as the key. */
export const serviceGroups: { group: Tx; items: Tx[] }[] = [
  {
    group: { en: 'Design', id: 'Desain' },
    items: [
      { en: 'Master Planning', id: 'Perencanaan Induk' },
      { en: 'Building Design', id: 'Perencanaan Bangunan' },
      { en: 'Landscape Architecture', id: 'Arsitektur Lanskap' },
      { en: 'Interior Design', id: 'Desain Interior' },
      { en: 'Lighting Design', id: 'Desain Pencahayaan' },
      { en: '3D Visualisation', id: 'Visualisasi 3D' },
    ],
  },
  {
    group: { en: 'Management', id: 'Manajemen' },
    items: [
      { en: 'Project Management', id: 'Manajemen Proyek' },
      { en: 'Development Management', id: 'Manajemen Pengembangan' },
      { en: 'Programme Management', id: 'Manajemen Program' },
    ],
  },
  {
    group: { en: 'Care', id: 'Perawatan' },
    items: [
      { en: 'Rehabilitation', id: 'Rehabilitasi' },
      { en: 'Restoration', id: 'Restorasi' },
    ],
  },
]

export const serviceByKey = (en: string) => serviceGroups.flatMap((g) => g.items).find((s) => s.en === en)

export const process: { title: Tx; lead: Tx; points: Tx[] }[] = [
  {
    title: { en: 'Pain Points & Goals', id: 'Hambatan & Tujuan' },
    lead: {
      en: 'We listen first, then map your needs, constraints, budget and goals with you.',
      id: 'Kami mendengarkan, lalu memetakan kebutuhan, kendala, anggaran, dan tujuan bersama Anda.',
    },
    points: [
      { en: 'First consultation', id: 'Konsultasi awal' },
      { en: 'Brief & space needs', id: 'Brief & kebutuhan ruang' },
      { en: 'Budget & schedule targets', id: 'Target anggaran & jadwal' },
    ],
  },
  {
    title: { en: 'Analysis', id: 'Analisis' },
    lead: {
      en: 'We study the site and its context: contours, sun path, water flow, regulations and the market.',
      id: 'Kami mengkaji tapak dan konteksnya: kontur, lintasan matahari, aliran air, regulasi, dan pasar.',
    },
    points: [
      { en: 'Site survey & analysis', id: 'Survei & analisis tapak' },
      { en: 'Building regulation study', id: 'Studi regulasi bangunan' },
      { en: 'Needs & market study', id: 'Studi kebutuhan & pasar' },
    ],
  },
  {
    title: { en: 'Creative Process', id: 'Proses Kreatif' },
    lead: {
      en: 'Problem solving first, style second. Form follows function, tested with you at every stage.',
      id: 'Selesaikan masalahnya dulu, langgam kemudian. Form follows function, diuji bersama Anda di setiap tahap.',
    },
    points: [
      { en: 'Concept & schematics', id: 'Konsep & skematik' },
      { en: 'Design development', id: 'Pengembangan desain' },
      { en: '3D visualisation', id: 'Visualisasi 3D' },
    ],
  },
  {
    title: { en: 'Deliverables', id: 'Deliverables' },
    lead: {
      en: 'Documents ready for construction. Because every design must be built, we stay with you all the way to the site.',
      id: 'Dokumen siap untuk konstruksi. Karena setiap desain harus terbangun, kami mendampingi Anda sampai ke lapangan.',
    },
    points: [
      { en: 'Construction drawings (DED)', id: 'Gambar kerja (DED)' },
      { en: 'Cost estimate (RAB)', id: 'Rencana anggaran biaya (RAB)' },
      { en: 'Site support & supervision', id: 'Pendampingan & pengawasan' },
    ],
  },
]
