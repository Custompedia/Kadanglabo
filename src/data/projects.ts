import type { ImgKey } from '../components/Img'
import { getLang, type Tx } from '../lib/i18n'

/*
 * Data proyek. Sumber: Company Profile 2026, brief Canva, dan folder Drive "Asset Website Kadanglabo"
 * (klasifikasi Commercial / Hospitality / Residential mengikuti folder Drive dari klien).
 * Semua copy dua bahasa ({ en, id }); komponen membacanya lewat t() saat render (lib/i18n.ts).
 *
 * Catatan untuk dilengkapi klien:
 * - `year` dan sebagian besar `status` belum ada di materi → masih null. Filter Tahun/Status di halaman
 *   Our Work otomatis memakai nilai yang tersedia (filter Tahun muncul begitu ada data tahun).
 * - Lokasi bertanda "dari nama proyek" disimpulkan dari nama, mohon dikonfirmasi.
 */

export type Category = 'commercial' | 'hospitality' | 'residential'
/** Status key; the visible text comes from statusLabel. */
export type Status = 'built' | 'construction' | 'design'
export type StoryKey = 'context' | 'challenge' | 'concept' | 'development' | 'outcome'

/** Sector names are brand names, the same in both languages. */
export const categoryLabel: Record<Category, string> = {
  commercial: 'Commercial',
  hospitality: 'Hospitality',
  residential: 'Residential',
}

/** Nama kategori persis seperti brief ("Category Project" — skema Our Work). */
export const categoryTitle: Record<Category, string> = {
  commercial: 'Commercial Design',
  hospitality: 'Hospitality Design',
  residential: 'Selected Residential Design',
}

export const categoryOrder: Category[] = ['commercial', 'hospitality', 'residential']

export const storyLabel: Record<StoryKey, Tx> = {
  context: { en: 'Context', id: 'Konteks' },
  challenge: { en: 'Challenge', id: 'Tantangan' },
  concept: { en: 'Concept', id: 'Konsep' },
  development: { en: 'Development', id: 'Pengembangan' },
  outcome: { en: 'Outcome', id: 'Hasil' },
}

export const statusLabel: Record<Status, Tx> = {
  built: { en: 'Built', id: 'Terbangun' },
  construction: { en: 'Under construction', id: 'Konstruksi' },
  design: { en: 'In design', id: 'Desain' },
}

export type Block =
  | { t: 'full'; img: ImgKey; caption?: Tx }
  | { t: 'pair'; imgs: [ImgKey, ImgKey]; caption?: Tx }
  | { t: 'offset'; img: ImgKey; side?: 'left' | 'right'; caption?: Tx }
  | { t: 'text'; label: Tx; body: Tx }
  | { t: 'quote'; text: Tx; cite?: Tx }

export interface Project {
  slug: string
  title: string
  category: Category
  typology: Tx
  location: string | null
  region: string | null
  year: number | null
  status: Status | null
  scope: Tx[]
  landArea?: string
  buildingArea?: string
  delivery?: Tx
  client?: string
  /** warna latar & judul hero di halaman detail — hanya dari palet logo (navy / navy gelap / oranye) */
  color: string
  accent: string
  tagline: Tx
  summary: Tx
  story?: { key: StoryKey; text: Tx; img: ImgKey }[]
  hero: ImgKey
  cover: ImgKey
  gallery: Block[]
}

/* Scope items shared by several projects */
const ARCH: Tx = { en: 'Architecture', id: 'Arsitektur' }
const LAND: Tx = { en: 'Landscape', id: 'Lanskap' }
const INT: Tx = { en: 'Interior Design', id: 'Desain Interior' }
const SITE: Tx = { en: 'Site Planning', id: 'Tata Tapak' }
const HOUSE: Tx = { en: 'Private House', id: 'Rumah Tinggal' }

export const projects: Project[] = [
  {
    slug: 'la-barka-resort',
    title: 'La Barka Resort',
    category: 'hospitality',
    typology: { en: 'Resort', id: 'Resort' },
    location: 'Nanggulan, Kulon Progo, Daerah Istimewa Yogyakarta',
    region: 'Kulon Progo',
    year: null,
    status: 'built',
    scope: [ARCH, LAND, INT],
    landArea: '2.344 m²',
    buildingArea: '718 m²',
    delivery: { en: 'Design & Build', id: 'Design & Build' },
    color: '#1B2238',
    accent: '#EC6434',
    tagline: {
      en: 'Buildings and landscape as one, beside the Progo River.',
      id: 'Bangunan dan lanskap menyatu di tepi Kali Progo.',
    },
    summary: {
      en: 'A resort shaped by its setting on the Progo River. Buildings and landscape work together, responding to the contours, water flow and natural character of the site.',
      id: 'Resort di tepi Kali Progo yang berangkat dari konteks tapak. Bangunan dan lanskap menyatu, merespons kontur, aliran air, dan karakter alam sekitar.',
    },
    story: [
      {
        key: 'context',
        text: {
          en: 'La Barka sits beside the Progo River in Nanggulan, on sloping land amid Kulon Progo’s tropical greenery.',
          id: 'La Barka menempati lahan berkontur di tepi Kali Progo, Nanggulan, dengan vegetasi tropis khas Kulon Progo.',
        },
        img: 'labarka-river',
      },
      {
        key: 'challenge',
        text: {
          en: 'The buildings needed to follow the contours, allow water to flow and preserve the natural calm that draws guests in.',
          id: 'Bangunan perlu mengikuti kontur, memberi ruang bagi aliran air, dan menjaga ketenangan alam yang menarik tamu.',
        },
        img: 'labarka-garden',
      },
      {
        key: 'concept',
        text: {
          en: 'Modern tropical architecture: gabled buildings follow the site, with landscape integral to the design.',
          id: 'Arsitektur tropis modern: bangunan beratap pelana mengikuti tapak, dengan lanskap sebagai bagian utuh dari desain.',
        },
        img: 'labarka-gables',
      },
      {
        key: 'development',
        text: {
          en: 'Open spaces, sun orientation, natural materials and wide openings make the most of the site and keep rooms naturally cool.',
          id: 'Ruang terbuka, orientasi matahari, material alami, dan bukaan lebar mengoptimalkan tapak serta menjaga kesejukan ruang.',
        },
        img: 'labarka-bath',
      },
      {
        key: 'outcome',
        text: {
          en: 'Built through design & build: 718 m² of buildings on a 2,344 m² site, in harmony with nature.',
          id: 'Dibangun melalui design & build: bangunan 718 m² di lahan 2.344 m², menyatu dengan alam.',
        },
        img: 'labarka-koi',
      },
    ],
    hero: 'labarka-bird',
    cover: 'labarka-bird',
    gallery: [
      { t: 'full', img: 'labarka-river' },
      {
        t: 'text',
        label: { en: 'Landscape', id: 'Lanskap' },
        body: {
          en: 'Gardens, ponds and footpaths lead guests from open spaces to their rooms through lush, shady planting.',
          id: 'Taman, kolam, dan jalur setapak mengantar tamu dari ruang terbuka ke kamar, melewati tanaman yang rimbun dan teduh.',
        },
      },
      { t: 'pair', imgs: ['labarka-koi', 'labarka-path'] },
      {
        t: 'offset',
        img: 'labarka-gables',
        side: 'right',
        caption: { en: 'Gabled volumes in timber and stone.', id: 'Massa beratap pelana dengan material kayu dan batu.' },
      },
      {
        t: 'quote',
        text: { en: 'Building and landscape, in harmony with nature.', id: 'Bangunan dan lanskap yang selaras dengan alam.' },
      },
      { t: 'pair', imgs: ['labarka-balcony', 'labarka-stair'] },
      {
        t: 'text',
        label: { en: 'Interior', id: 'Interior' },
        body: {
          en: 'Timber, wide openings and indoor gardens keep rooms naturally cool and connected to their surroundings.',
          id: 'Kayu, bukaan lebar, dan taman dalam ruang menjaga kamar tetap sejuk alami dan terhubung dengan lingkungan sekitar.',
        },
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
    typology: { en: 'Villa & Restaurant', id: 'Villa & Restoran' },
    location: 'Balecatur, Gamping, Sleman', // dari nama proyek — mohon konfirmasi
    region: 'Sleman',
    year: null,
    status: null,
    scope: [ARCH, INT, LAND],
    color: '#D34614',
    accent: '#FFFFFF',
    tagline: {
      en: 'Tradition meets contemporary simplicity.',
      id: 'Tradisi berpadu dengan kesederhanaan kontemporer.',
    },
    summary: {
      en: 'Tradition meets contemporary simplicity: a distinctive facade, a shared lobby and restaurant, restful rooms and a pool that feels private.',
      id: 'Tradisi berpadu dengan kesederhanaan kontemporer: fasad berkarakter, lobi dan restoran yang menyatu, kamar untuk beristirahat, serta kolam renang yang terasa privat.',
    },
    story: [
      {
        key: 'context',
        text: {
          en: 'A place to stay and dine, with the villa, lobby and restaurant welcoming guests into one compound from the street.',
          id: 'Villa, lobi, dan restoran menyatu sebagai tempat menginap dan bersantap, menyambut tamu sejak dari jalan.',
        },
        img: 'balecatur-front',
      },
      {
        key: 'challenge',
        text: {
          en: 'Traditional character, kept simple, functional and relevant for today’s guests.',
          id: 'Karakter tradisi yang tetap sederhana, fungsional, dan relevan bagi tamu masa kini.',
        },
        img: 'balecatur-sign',
      },
      {
        key: 'concept',
        text: {
          en: 'Exposed brick and a distinctive tropical roof define the facade. Inside, the lobby and restaurant form one welcoming space.',
          id: 'Bata ekspos dan atap tropis berkarakter membentuk fasad. Lobi dan restoran menyatu sebagai ruang penyambutan.',
        },
        img: 'balecatur-lobby',
      },
      {
        key: 'development',
        text: {
          en: 'Rooms designed around rest: warm materials, soft light and openings onto the garden.',
          id: 'Kamar untuk beristirahat, dengan material hangat, cahaya lembut, dan bukaan ke taman.',
        },
        img: 'balecatur-bed',
      },
      {
        key: 'outcome',
        text: {
          en: 'A pool area that feels like your own is at the heart of the stay.',
          id: 'Area kolam renang yang terasa seperti milik sendiri menjadi pusat pengalaman menginap.',
        },
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
        label: { en: 'Lobby & Restaurant', id: 'Lobi & Restoran' },
        body: {
          en: 'Lobby and restaurant share one high roof: a warm welcome in timber, brick and soft, low light.',
          id: 'Lobi dan restoran menyatu di bawah atap tinggi: sambutan hangat lewat kayu, bata, dan cahaya temaram.',
        },
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
    typology: { en: 'Healthcare Facility', id: 'Fasilitas Kesehatan' },
    location: 'Daerah Istimewa Yogyakarta',
    region: 'Yogyakarta',
    year: null,
    status: null,
    scope: [ARCH, INT],
    client: 'Universitas Islam Indonesia',
    color: '#3C4C74',
    accent: '#F3F0EA',
    tagline: {
      en: 'A modern identity for healthcare on campus.',
      id: 'Identitas modern untuk layanan kesehatan kampus.',
    },
    summary: {
      en: 'The design gives the Universitas Islam Indonesia clinic a distinct, modern identity that belongs within its campus setting.',
      id: 'Desain Klinik Universitas Islam Indonesia membangun identitas modern yang kuat sekaligus menyatu dengan lingkungan kampus.',
    },
    story: [
      {
        key: 'context',
        text: {
          en: 'Klinik UII is the healthcare facility of Universitas Islam Indonesia, set within the university campus.',
          id: 'Klinik UII adalah fasilitas pelayanan kesehatan milik Universitas Islam Indonesia yang berada di lingkungan kampus.',
        },
        img: 'klinik-front',
      },
      {
        key: 'challenge',
        text: {
          en: 'Give a modern clinic a clear, recognisable identity that still feels part of the campus around it.',
          id: 'Menghadirkan identitas klinik modern yang tegas, mudah dikenali, dan selaras dengan lingkungan kampus.',
        },
        img: 'klinik-eks6',
      },
      {
        key: 'concept',
        text: {
          en: 'Vertical fins form a secondary skin around the upper floor, giving the building a bold, elegant identity.',
          id: 'Kisi-kisi vertikal membungkus lantai atas sebagai secondary skin, membentuk karakter yang tegas dan elegan.',
        },
        img: 'klinik-hero',
      },
      {
        key: 'development',
        text: {
          en: 'The fins filter sunlight, reduce excess heat and protect privacy in clinical rooms.',
          id: 'Kisi-kisi menyaring sinar matahari, mengurangi panas berlebih, dan menjaga privasi ruang klinis.',
        },
        img: 'klinik-tree',
      },
      {
        key: 'outcome',
        text: {
          en: 'White walls and calming timber accents give corridors, waiting areas and consulting rooms a clean, warm feel.',
          id: 'Dinding putih dan aksen kayu yang menenangkan memberi koridor, ruang tunggu, dan ruang praktik kesan bersih dan hangat.',
        },
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
        label: { en: 'Secondary skin', id: 'Secondary skin' },
        body: {
          en: 'Vertical fins wrap the upper floor, filter light, reduce heat and keep clinical rooms private, defining the clinic’s identity.',
          id: 'Kisi-kisi vertikal membungkus lantai atas, menyaring cahaya, meredam panas, dan menjaga privasi ruang klinis sekaligus membentuk identitas klinik.',
        },
      },
      { t: 'full', img: 'klinik-side' },
      { t: 'pair', imgs: ['klinik-corridor', 'klinik-signage'] },
      {
        t: 'offset',
        img: 'klinik-waiting',
        side: 'right',
        caption: { en: 'A calm, easy-care waiting room.', id: 'Ruang tunggu yang tenang dan mudah dirawat.' },
      },
      { t: 'pair', imgs: ['klinik-dental', 'klinik-dental2'] },
    ],
  },
  {
    slug: 'hmw-house',
    title: 'HMW House',
    category: 'residential',
    typology: HOUSE,
    location: null,
    region: null,
    year: null,
    status: null,
    scope: [ARCH, INT, LAND],
    color: '#1B2238',
    accent: '#EC6434',
    tagline: {
      en: 'Small details are not a luxury. They are the standard.',
      id: 'Detail kecil bukan kemewahan, melainkan standar.',
    },
    summary: {
      en: 'HMW House shows that small details are not a luxury but the standard every home deserves. A dream home is not about size; it is about how precisely it is designed.',
      id: 'HMW House membuktikan bahwa detail kecil bukan kemewahan, melainkan standar yang layak dimiliki setiap hunian. Sebab rumah impian bukan soal seberapa besar, tetapi seberapa tepat ia dirancang.',
    },
    story: [
      {
        key: 'context',
        text: {
          en: 'A family home designed for everyday life: warm, calm and close to nature.',
          id: 'Rumah tinggal yang dirancang untuk keseharian keluarga: hangat, tenang, dan dekat dengan alam.',
        },
        img: 'hmw-facade-day',
      },
      {
        key: 'challenge',
        text: {
          en: 'Make every square metre count, with spaces designed around the people who live there.',
          id: 'Mengoptimalkan setiap meter persegi dengan ruang yang sesuai kebutuhan penghuninya.',
        },
        img: 'hmw-entry',
      },
      {
        key: 'concept',
        text: {
          en: 'A distinctive facade, a warm, restrained interior and outdoor spaces that bring nature into the home.',
          id: 'Fasad berkarakter, interior hangat yang bersahaja, dan ruang luar yang menjadikan alam bagian dari rumah.',
        },
        img: 'hmw-garden',
      },
      {
        key: 'development',
        text: {
          en: 'A transitional garden, a pool and wide openings connect the living, dining and kitchen areas to the landscape.',
          id: 'Taman transisi, kolam, dan bukaan lebar menghubungkan ruang keluarga, ruang makan, dan dapur dengan lanskap.',
        },
        img: 'hmw-pool',
      },
      {
        key: 'outcome',
        text: {
          en: 'Every detail, from materials to lighting, is designed as standard, not as an extra.',
          id: 'Setiap detail, dari material hingga pencahayaan, dirancang sebagai standar, bukan tambahan.',
        },
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
        label: { en: 'Interior', id: 'Interior' },
        body: {
          en: 'The kitchen and dining area open to the garden. Wide openings and screens let in light, adding warmth all day.',
          id: 'Dapur dan ruang makan terbuka ke taman. Cahaya lewat bukaan lebar dan kisi memberi suasana hangat sepanjang hari.',
        },
      },
      { t: 'full', img: 'hmw-dining' },
      { t: 'pair', imgs: ['hmw-kitchen', 'hmw-dining2'] },
      {
        t: 'offset',
        img: 'hmw-bedroom',
        side: 'left',
        caption: { en: 'A bedroom in a calm palette of materials.', id: 'Kamar tidur dengan palet material yang tenang.' },
      },
      { t: 'offset', img: 'hmw-entry', side: 'right' },
    ],
  },
  {
    slug: 'perum-firlatata',
    title: 'Perum Firlatata',
    category: 'residential',
    typology: { en: 'Housing', id: 'Perumahan' },
    location: null,
    region: null,
    year: null,
    status: null,
    scope: [SITE, ARCH, INT],
    color: '#3C4C74',
    accent: '#F3F0EA',
    tagline: { en: 'Limited land, great potential.', id: 'Lahan terbatas, potensi besar.' },
    summary: {
      en: 'A small plot with big potential, and an owner unsure where to begin. Together, we turned their vision into a strategic layout with value and character.',
      id: 'Lahan terbatas, potensi besar, dan pemilik yang belum tahu harus mulai dari mana. Bersama, kami mewujudkan visinya dalam tata ruang yang strategis, bernilai, dan berkarakter.',
    },
    story: [
      {
        key: 'context',
        text: {
          en: 'A tight plot with great potential, and an owner unsure where to begin.',
          id: 'Lahan terbatas dengan potensi besar, dan pemilik yang belum tahu harus mulai dari mana.',
        },
        img: 'firlatata-street',
      },
      {
        key: 'challenge',
        text: {
          en: 'Turn the owner’s vision into a strategic layout that adds value.',
          id: 'Menerjemahkan visi pemilik menjadi tata ruang yang strategis dan bernilai.',
        },
        img: 'firlatata-day',
      },
      {
        key: 'concept',
        text: {
          en: 'Repeated tall gables give the row of homes a distinct rhythm and the estate a recognisable identity.',
          id: 'Deretan rumah dengan atap pelana tinggi yang berulang membentuk ritme fasad dan identitas kawasan yang mudah dikenali.',
        },
        img: 'firlatata-front',
      },
      {
        key: 'development',
        text: {
          en: 'Circulation, privacy between units and the first impression on arrival were all carefully thought through.',
          id: 'Sirkulasi, privasi antarunit, hingga kesan pertama saat memasuki kawasan dipikirkan dengan matang.',
        },
        img: 'firlatata-living',
      },
      {
        key: 'outcome',
        text: {
          en: 'More than beautiful: an estate that earns residents’ trust from the first impression.',
          id: 'Bukan sekadar indah: kawasan yang membangun kepercayaan penghuni sejak kesan pertama.',
        },
        img: 'firlatata-tv',
      },
    ],
    hero: 'firlatata-front',
    cover: 'firlatata-front',
    gallery: [
      { t: 'full', img: 'firlatata-day' },
      {
        t: 'offset',
        img: 'firlatata-street',
        side: 'right',
        caption: { en: 'A residential street with a consistent facade rhythm.', id: 'Jalan lingkungan dengan ritme fasad yang konsisten.' },
      },
      {
        t: 'text',
        label: { en: 'Unit interiors', id: 'Interior unit' },
        body: {
          en: 'Living, dining and kitchen share a compact, open layout. Warm timber tones make each unit feel spacious.',
          id: 'Ruang keluarga, dapur, dan area makan tertata ringkas dan terbuka. Warna kayu hangat membuat unit terasa lapang.',
        },
      },
      { t: 'pair', imgs: ['firlatata-living', 'firlatata-tv'] },
      { t: 'full', img: 'firlatata-shelf' },
    ],
  },
  {
    slug: 'bukit-indah-ceria-giripeni',
    title: 'Bukit Indah Ceria Giripeni',
    category: 'residential',
    typology: { en: 'Housing Estate', id: 'Kawasan Perumahan' },
    location: 'Giripeni, Wates, Kulon Progo', // dari nama proyek — mohon konfirmasi
    region: 'Kulon Progo',
    year: null,
    status: null,
    scope: [SITE, ARCH, INT],
    client: 'PT. Papan Cemerlang',
    color: '#D34614',
    accent: '#FFFFFF',
    tagline: { en: 'Our first housing partnership.', id: 'Kerja sama perumahan pertama kami.' },
    summary: {
      en: 'Our first housing partnership. PT. Papan Cemerlang trusted us to develop a site that had struggled to take off during the pandemic.',
      id: 'Kerja sama perumahan pertama kami. PT. Papan Cemerlang mempercayakan pengembangan lahan yang terkendala selama pandemi.',
    },
    story: [
      {
        key: 'context',
        text: {
          en: 'PT. Papan Cemerlang trusted Kadanglabo to develop its land, marking our first housing partnership.',
          id: 'PT. Papan Cemerlang mempercayakan pengembangan lahannya kepada Kadanglabo dalam kerja sama perumahan pertama kami.',
        },
        img: 'giripeni-aerial',
      },
      {
        key: 'challenge',
        text: {
          en: 'The site was difficult to develop during the pandemic, amid a cautious property market.',
          id: 'Lahan sulit dikembangkan selama pandemi, di tengah pasar properti yang berhati-hati.',
        },
        img: 'giripeni-street',
      },
      {
        key: 'concept',
        text: {
          en: 'The estate design responds to the existing site and the property market.',
          id: 'Desain kawasan merespons kondisi tapak dan pasar properti.',
        },
        img: 'giripeni-row',
      },
      {
        key: 'development',
        text: {
          en: 'Homes of one and two storeys share an architectural language, creating a tidy, recognisable neighbourhood.',
          id: 'Bahasa arsitektur yang seragam menyatukan rumah satu dan dua lantai dalam lingkungan yang rapi dan mudah dikenali.',
        },
        img: 'giripeni-two',
      },
      {
        key: 'outcome',
        text: {
          en: 'A cohesive estate, from its gate and streets to the interior of each home.',
          id: 'Kawasan hunian terpadu, dari gerbang, jalan lingkungan, hingga interior unit.',
        },
        img: 'giripeni-living',
      },
    ],
    hero: 'giripeni-aerial',
    cover: 'giripeni-aerial',
    gallery: [
      { t: 'full', img: 'giripeni-gate' },
      { t: 'pair', imgs: ['giripeni-row', 'giripeni-street'] },
      {
        t: 'quote',
        text: {
          en: 'The design responds to the existing site and the property market.',
          id: 'Desain merespons kondisi tapak dan pasar properti.',
        },
      },
      { t: 'full', img: 'giripeni-two' },
      { t: 'pair', imgs: ['giripeni-living', 'giripeni-bed'] },
    ],
  },

  {
    slug: 'hamzah-batik-malioboro',
    title: 'Hamzah Batik Malioboro',
    category: 'hospitality',
    typology: { en: 'Retail', id: 'Ritel' },
    location: 'Malioboro, Yogyakarta',
    region: 'Yogyakarta',
    year: null,
    status: null,
    scope: [ARCH],
    color: '#D34614',
    accent: '#FFFFFF',
    tagline: {
      en: 'A warm face on Yogyakarta’s most iconic street.',
      id: 'Wajah yang hangat di koridor paling ikonik Yogyakarta.',
    },
    summary: {
      en: 'Arches, gables and rhythmic windows in a colonial style give Hamzah Batik on Malioboro a warm, dignified facade in Yogyakarta’s heritage corridor.',
      id: 'Lengkung, gevel, dan ritme jendela bergaya kolonial memberi fasad Hamzah Batik di Malioboro kesan hangat dan berwibawa di koridor bersejarah Yogyakarta.',
    },
    hero: 'hamzah-front',
    cover: 'hamzah-front',
    gallery: [{ t: 'full', img: 'hamzah-street' }],
  },
  {
    slug: 'villa-berbah',
    title: 'Villa Berbah',
    category: 'hospitality',
    typology: { en: 'Villa', id: 'Villa' },
    location: 'Berbah, Sleman', // dari nama proyek — mohon konfirmasi
    region: 'Sleman',
    year: null,
    status: null,
    scope: [ARCH, LAND],
    color: '#3C4C74',
    accent: '#F3F0EA',
    tagline: { en: 'Wide roofs, natural stone and a shady garden.', id: 'Atap lebar, batu alam, dan halaman yang teduh.' },
    summary: {
      en: 'A villa with a broad gabled roof and natural stone walls: a simple, warm form that blends into the green garden around it.',
      id: 'Villa beratap pelana lebar dengan dinding batu alam, tampil sederhana, hangat, dan menyatu dengan halaman hijau sekitarnya.',
    },
    hero: 'berbah-front',
    cover: 'berbah-front',
    gallery: [],
  },
  {
    slug: 'muji-rukost',
    title: 'Muji Rukost',
    category: 'hospitality',
    typology: { en: 'Shophouse & Boarding House', id: 'Ruko & Rumah Kos' },
    location: null,
    region: null,
    year: null,
    status: null,
    scope: [ARCH],
    color: '#1B2238',
    accent: '#EC6434',
    tagline: {
      en: 'Shophouse and boarding house in one compact building.',
      id: 'Ruko dan kos dalam satu bangunan ringkas.',
    },
    summary: {
      en: 'A rukost combines a shophouse and boarding house in a crisp white cube: efficient spaces and a tidy street frontage.',
      id: 'Rukost memadukan ruko dan rumah kos dalam kubus putih yang bersih dan tegas: ruang efisien, fasad rapi menghadap jalan.',
    },
    hero: 'muji-front',
    cover: 'muji-front',
    gallery: [],
  },
  {
    slug: 'ivanna-house',
    title: 'Ivanna House',
    category: 'residential',
    typology: HOUSE,
    location: null,
    region: null,
    year: null,
    status: null,
    scope: [ARCH],
    color: '#3C4C74',
    accent: '#F3F0EA',
    tagline: { en: 'A calm, practical single-storey home.', id: 'Rumah satu lantai yang tenang dan fungsional.' },
    summary: {
      en: 'A single-storey house with a dark gabled roof, white walls and a carport built into the facade.',
      id: 'Rumah tinggal satu lantai dengan atap pelana gelap, dinding putih, dan carport yang menyatu dengan fasad.',
    },
    hero: 'ivanna-front',
    cover: 'ivanna-front',
    gallery: [],
  },
  {
    slug: 'tiara-house-kalasan',
    title: 'Tiara House Kalasan',
    category: 'residential',
    typology: HOUSE,
    location: 'Kalasan, Sleman',
    region: 'Sleman',
    year: null,
    status: null,
    scope: [ARCH],
    color: '#D34614',
    accent: '#FFFFFF',
    tagline: { en: 'Closed to the street, open to the light.', id: 'Tertutup di muka, terbuka pada cahaya.' },
    summary: {
      en: 'A long rooflight along the gable ridge brings daylight into the house, while the facade protects privacy.',
      id: 'Bukaan cahaya memanjang di puncak atap pelana menerangi rumah, sementara fasad menjaga privasi penghuninya.',
    },
    hero: 'tiara-front',
    cover: 'tiara-front',
    gallery: [],
  },
  {
    slug: 'kavling-bangunjiwo',
    title: 'Kavling Bangunjiwo',
    category: 'residential',
    typology: { en: 'Residential Plots', id: 'Kaveling Hunian' },
    location: 'Bangunjiwo, Bantul',
    region: 'Bantul',
    year: null,
    status: null,
    scope: [ARCH],
    color: '#1B2238',
    accent: '#EC6434',
    tagline: { en: 'Compact units that make the most of the land.', id: 'Unit ringkas yang memaksimalkan lahan.' },
    summary: {
      en: 'Two-storey homes with twin carports: compact designs that maximise the land and preserve character.',
      id: 'Rumah dua lantai dengan carport kembar: desain ringkas yang memaksimalkan lahan dan menjaga karakter.',
    },
    hero: 'bangunjiwo-front',
    cover: 'bangunjiwo-front',
    gallery: [],
  },
]

/** Areas are stored the Indonesian way ('2.344 m²'); English readers get a thousands comma ('2,344 m²'). */
export const fmtArea = (v: string) => (getLang() === 'en' ? v.replace(/(\d)\.(\d{3})/g, '$1,$2') : v)

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

/* ---------- Area (filter Lokasi di arsip) ---------- */

export interface Area {
  key: string
  label: string
  /** wilayah (kabupaten/kota) yang masuk area ini */
  regions: string[]
}

export const areas: Area[] = [
  { key: 'diy', label: 'D.I. Yogyakarta', regions: ['Yogyakarta', 'Sleman', 'Bantul', 'Kulon Progo'] },
  { key: 'klaten', label: 'Klaten', regions: ['Klaten'] },
  { key: 'jepara', label: 'Jepara', regions: ['Jepara'] },
  { key: 'surabaya', label: 'Surabaya', regions: ['Surabaya'] },
  { key: 'bali', label: 'Bali', regions: ['Bali'] },
  { key: 'palembang', label: 'Palembang', regions: ['Palembang'] },
]

export const areaOf = (region: string | null) => (region ? (areas.find((a) => a.regions.includes(region))?.key ?? null) : null)

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

/** Areas that have at least one archived project, with how many (archive filter, About "in numbers") */
export const areaStats = areas
  .map((a) => ({ ...a, count: archive.filter((e) => areaOf(e.region) === a.key).length }))
  .filter((a) => a.count > 0)
