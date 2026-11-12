import type { ArticleContent, Block, Doc, Inline, Lang, List, Paragraph } from '../../shared/content'

/*
 * The articles bundled with the site (shown when the CMS cannot be reached, and used to fill the CMS the first time).
 * Each body is written in a small plain-text format and turned into the editor's document:
 *   ## Subheading        ### Smaller subheading
 *   - bullet             1. numbered
 *   > quote              ![photo-id] caption
 *   **bold** inside a line; a blank line starts a new paragraph.
 * Events and figures are placeholders until Kadanglabo confirms them.
 */

function inline(text: string): Inline[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) => (part.startsWith('**') ? { type: 'text', text: part.slice(2, -2), marks: [{ type: 'bold' }] } : { type: 'text', text: part }))
}

function doc(src: string): Doc {
  const out: Block[] = []
  const para = (t: string): Paragraph => ({ type: 'paragraph', content: inline(t) })
  for (const chunk of src.trim().split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim())
    const first = lines[0]
    if (first.startsWith('### ')) out.push({ type: 'heading', attrs: { level: 3 }, content: inline(first.slice(4)) })
    else if (first.startsWith('## ')) out.push({ type: 'heading', attrs: { level: 2 }, content: inline(first.slice(3)) })
    else if (first.startsWith('> ')) out.push({ type: 'blockquote', content: [para(lines.map((l) => l.replace(/^> /, '')).join(' '))] })
    else if (first.startsWith('![')) {
      const m = first.match(/^!\[([a-z0-9-]+)\]\s*(.*)$/)!
      out.push({ type: 'image', attrs: { id: m[1], caption: m[2] } })
    } else if (/^(- |\d+\. )/.test(first)) {
      const ordered = /^\d+\. /.test(first)
      const list: List = { type: ordered ? 'orderedList' : 'bulletList', content: lines.map((l) => ({ type: 'listItem', content: [para(l.replace(/^(- |\d+\. )/, ''))] })) }
      out.push(list)
    } else out.push(para(lines.join(' ')))
  }
  return { type: 'doc', content: out }
}

type Source = Omit<ArticleContent, 'body'> & { body: Record<Lang, string> }
const article = (a: Source): ArticleContent => ({ ...a, body: { en: doc(a.body.en), id: doc(a.body.id) } })

export const articles: ArticleContent[] = [
  article({
    slug: 'open-studio-kadanglabo',
    type: 'event',
    tag: { en: 'Open Studio', id: 'Open Studio' },
    title: {
      en: 'Open Studio Kadanglabo: free architecture consultation in Yogyakarta',
      id: 'Open Studio Kadanglabo: konsultasi arsitek gratis di Yogyakarta',
    },
    date: '2026-11-14',
    excerpt: {
      en: 'Planning to build or renovate in Yogyakarta? Bring your floor plan or site photos and talk it through with our architects, free of charge.',
      id: 'Berencana membangun atau renovasi di Yogyakarta? Bawa denah atau foto lahan, lalu diskusikan langsung dengan arsitek kami, gratis.',
    },
    cover: 'balecatur-lobby',
    summary: {
      en: 'On Saturday, 14 November 2026, the Kadanglabo studio on Jl. Kaliurang opens for one day. Architects, drafters and our site supervisor will answer questions about new homes, renovations and small businesses, from budget and permits to how a design and build project runs.',
      id: 'Sabtu, 14 November 2026, studio Kadanglabo di Jl. Kaliurang dibuka seharian. Arsitek, drafter, dan pengawas lapangan kami siap menjawab pertanyaan seputar rumah baru, renovasi, dan bangunan usaha, mulai dari anggaran dan perizinan sampai alur design and build.',
    },
    body: {
      id: `
Banyak orang menunda rencana membangun karena tidak tahu harus mulai dari mana. Berapa anggaran yang realistis? Apakah lahan saya cukup untuk rumah dua lantai? Izin apa saja yang perlu diurus, dan berapa lama prosesnya? Pertanyaan seperti ini wajar, tapi jarang ada tempat untuk menanyakannya tanpa merasa harus langsung menandatangani kontrak.

Open Studio kami adakan untuk mengisi celah itu. Selama satu hari, studio Kadanglabo dibuka untuk siapa saja yang punya rencana membangun atau merenovasi. Anda bisa datang, duduk bersama arsitek kami, dan membicarakan rencana Anda dengan bahasa sehari-hari, tanpa istilah teknis yang membingungkan dan tanpa kewajiban apa pun.

## Apa saja yang bisa dikonsultasikan

Untuk **rumah tinggal baru**, kami biasanya mulai dari kebiasaan sehari-hari penghuninya: siapa saja yang tinggal, ruang mana yang paling sering dipakai, dan bagaimana rumah perlu berkembang beberapa tahun ke depan. Dari situ baru kita bicara ukuran lahan, jumlah lantai, dan gaya arsitektur yang cocok dengan lingkungan sekitar.

Untuk **renovasi dan penambahan lantai**, pertanyaan pertamanya hampir selalu soal struktur. Apakah fondasi dan kolom lama sanggup menahan lantai baru? Bagian mana yang sebaiknya dipertahankan, dan mana yang lebih hemat jika dibongkar? Dengan foto dan denah yang Anda bawa, kami bisa memberi gambaran awal sebelum Anda mengeluarkan biaya survei.

Kami juga terbiasa menangani **bangunan usaha** seperti kafe, ruko, kos, dan villa, serta **pengembangan lahan** untuk kavling atau perumahan kecil. Di proyek seperti ini, desain tidak hanya soal tampilan, tetapi juga soal alur pengunjung, efisiensi ruang yang bisa disewakan, dan perkiraan biaya yang masuk akal untuk kembali modal.

## Lihat langsung cara kami bekerja

Selain konsultasi, Open Studio juga kesempatan untuk melihat dapur kerja kami. Anda bisa melihat bagaimana sebuah proyek berjalan dari sketsa tangan pertama, lalu menjadi model 3D yang bisa diputar dan dilihat dari segala sisi, sampai akhirnya menjadi gambar kerja yang dipegang tukang di lapangan.

Kami akan menyiapkan dokumentasi beberapa proyek yang sudah terbangun, seperti La Barka Resort di Kulon Progo dan Bale Catur Villa & Resto di Sleman. Melihat gambar rencana dan foto hasil akhirnya berdampingan biasanya membantu calon klien membayangkan apa yang mungkin dicapai di lahan mereka sendiri.

## Supaya konsultasi lebih bermanfaat

Konsultasi akan jauh lebih bermanfaat kalau Anda membawa bahan yang sudah ada, walaupun sederhana. Denah lama, sertifikat tanah, atau sekadar foto lahan dari beberapa sudut sudah sangat membantu kami memahami kondisi tapak. Kisaran anggaran, walaupun masih kasar, juga penting, karena dari situ kami bisa menyarankan pilihan yang realistis sejak awal.

Terakhir, coba tuliskan apa yang paling penting bagi Anda. Ada yang mengutamakan dapur yang luas, ada yang ingin rumah terasa sejuk tanpa banyak pendingin udara, ada pula yang butuh ruang kerja terpisah. Daftar sederhana seperti ini sering menjadi titik awal desain yang paling berharga.

## Waktu dan tempat

Open Studio berlangsung pada **Sabtu, 14 November 2026, pukul 10.00 sampai 15.00 WIB**, di Studio Kadanglabo, Jl. Kaliurang KM.9 No.11 (Ruko 3), Sleman, D.I. Yogyakarta. Acara ini gratis. Kami sarankan mengonfirmasi kedatangan lewat WhatsApp terlebih dahulu, supaya kami bisa menyiapkan waktu khusus dan arsitek yang paling sesuai dengan kebutuhan Anda.
`,
      en: `
Many people put off building because they do not know where to start. What budget is realistic? Is my plot big enough for a two-storey house? Which permits do I need, and how long will they take? These are fair questions, but there are few places to ask them without feeling you have to sign a contract on the spot.

Open Studio is our way of filling that gap. For one day, the Kadanglabo studio is open to anyone planning to build or renovate. You can drop in, sit down with our architects and talk through your plans in everyday language, without confusing jargon and without any obligation.

## What you can ask us about

For a **new home**, we usually start with the daily life of the people who will live there: who lives in the house, which rooms get used the most, and how the home may need to grow over the next few years. Only then do we talk about plot size, the number of floors and an architectural style that suits the surroundings.

For **renovations and extra floors**, the first question is almost always about the structure. Can the existing foundations and columns carry a new floor? Which parts are worth keeping, and which are cheaper to rebuild? With the photos and plans you bring, we can give you a first impression before you spend anything on a survey.

We also regularly work on **business buildings** such as cafés, shophouses, boarding houses and villas, and on **land development** for plots or small housing estates. In projects like these, design is not only about looks but also about how visitors move through the space, how much lettable area you get and whether the budget makes sense for your return on investment.

## See how we work

Besides the consultations, Open Studio is a chance to look behind the scenes. You can follow how a project develops from the first hand sketch into a 3D model you can turn and view from every side, and finally into the construction drawings the builders use on site.

We will have documentation of completed projects ready, such as La Barka Resort in Kulon Progo and Bale Catur Villa & Resto in Sleman. Seeing the drawings and the finished building side by side usually helps future clients picture what is possible on their own land.

## Get the most from your visit

Your consultation will be far more useful if you bring whatever you already have, however simple. An old floor plan, a land certificate or just a few photos of the site from different angles helps us understand the conditions. A rough budget range matters too, because it lets us suggest realistic options from the start.

Finally, try writing down what matters most to you. Some people want a generous kitchen, some want a house that stays cool without much air conditioning, others need a separate place to work. A simple list like this is often the most valuable starting point for a design.

## Date and venue

Open Studio takes place on **Saturday, 14 November 2026, from 10.00 to 15.00 WIB**, at the Kadanglabo Studio, Jl. Kaliurang KM.9 No.11 (Ruko 3), Sleman, Yogyakarta. Entry is free. We recommend confirming on WhatsApp beforehand, so we can set time aside and match you with the architect best suited to your plans.
`,
    },
    project: 'la-barka-resort',
  }),

  article({
    slug: 'company-profile-2026',
    type: 'news',
    tag: { en: 'Publication', id: 'Publikasi' },
    title: {
      en: 'Kadanglabo Company Profile 2026: our services and selected projects',
      id: 'Company Profile Kadanglabo 2026: layanan dan proyek pilihan',
    },
    date: '2026-10-06',
    excerpt: {
      en: 'The 2026 company profile of Kadanglabo, an architecture consultancy in Yogyakarta: who we are, how we work and more than sixty projects.',
      id: 'Company profile 2026 Kadanglabo, konsultan arsitektur di Yogyakarta: siapa kami, cara kami bekerja, dan lebih dari enam puluh proyek.',
    },
    cover: 'draw-model',
    summary: {
      en: 'The Kadanglabo Company Profile 2026 brings our studio, services and selected work into one document, from La Barka Resort to Klinik UII. It is the quickest way to get to know us before a first meeting.',
      id: 'Company Profile Kadanglabo 2026 merangkum studio, layanan, dan karya pilihan kami dalam satu dokumen, dari La Barka Resort hingga Klinik UII. Cara tercepat mengenal kami sebelum pertemuan pertama.',
    },
    body: {
      id: `
Setiap proyek arsitektur dimulai dari rasa percaya. Sebelum menyerahkan rencana rumah atau usahanya, calon klien wajar ingin tahu siapa yang akan mereka ajak bekerja sama, bagaimana cara kerjanya, dan apa saja yang sudah pernah dibangun. Karena itu kami menyusun Company Profile Kadanglabo 2026: satu dokumen yang menjawab pertanyaan-pertanyaan tersebut secara lengkap.

Dokumen ini kami tulis bukan sekadar sebagai katalog, tetapi sebagai perkenalan. Harapannya, setelah membacanya Anda sudah punya gambaran yang jelas tentang cara kami berpikir, sehingga pertemuan pertama bisa langsung membahas rencana Anda.

## Siapa kami dan apa yang kami pegang

Bagian awal company profile menceritakan studio Kadanglabo, visi kami tentang **arsitektur untuk semua**, dan misi yang menurunkan visi itu ke pekerjaan sehari-hari. Kami percaya arsitektur yang baik tidak harus mahal atau eksklusif. Yang dibutuhkan adalah proses yang jujur, desain yang menjawab kebutuhan nyata, dan komunikasi yang terbuka antara klien, perencana, dan pelaksana.

Di bagian filosofi desain, kami menjelaskan tiga hal yang selalu kami bawa ke setiap proyek. *Form follows function* berarti bentuk bangunan lahir dari cara ruang itu dipakai. Desain kontekstual berarti bangunan harus menjawab tapak, iklim, dan lingkungan sekitarnya. Sementara workflow yang efektif memastikan waktu dan anggaran klien terjaga dari brief sampai serah terima.

## Layanan dan tim

Kadanglabo menangani arsitektur, desain interior, lanskap, dan tata tapak, serta layanan design and build bagi klien yang ingin satu pintu dari perencanaan sampai bangunan selesai. Company profile menjelaskan bagaimana setiap layanan berjalan, apa yang Anda terima di tiap tahap, dan bagaimana tim in-house kami membagi peran antara arsitek, drafter, dan pengawas lapangan.

Bagian ini penting karena banyak klien baru pertama kali membangun. Dengan mengetahui alurnya sejak awal, Anda bisa merencanakan waktu, menyiapkan keputusan yang perlu diambil, dan tidak kaget dengan tahapan yang memang perlu dilalui.

## Proyek yang ditampilkan

Sebagian besar halaman berisi proyek pilihan di tiga sektor: Commercial, Hospitality, dan Residential. Di dalamnya ada La Barka Resort di tepi Kali Progo yang bangunan dan lanskapnya dirancang menyatu dengan kontur tapak, Klinik UII dengan secondary skin yang meredam panas sekaligus menjadi identitas fasadnya, Bale Catur Villa & Resto di Sleman, sampai rumah tinggal seperti HMW House.

Setiap proyek dilengkapi cerita singkat tentang tantangan dan cara kami menjawabnya, bukan hanya foto. Di bagian akhir, Anda juga akan menemukan daftar lebih dari enam puluh proyek yang pernah kami tangani, sebagian besar di D.I. Yogyakarta dan sekitarnya.

## Cara mendapatkan dokumen

Company profile tersedia dalam format PDF setebal 51 halaman. Kirimkan permintaan ke **kadanglabo@gmail.com** atau hubungi kami lewat WhatsApp, dan kami akan mengirimkannya kepada Anda. Jika setelah membaca ada proyek yang mirip dengan rencana Anda, sebutkan saja saat menghubungi kami, supaya diskusi bisa langsung dimulai dari sana.
`,
      en: `
Every architecture project starts with trust. Before handing over plans for a home or a business, future clients naturally want to know who they will be working with, how that team works and what it has already built. That is why we put together the Kadanglabo Company Profile 2026: one document that answers those questions in full.

We wrote it not just as a catalogue but as an introduction. The hope is that after reading it you will have a clear picture of how we think, so our first meeting can go straight to your plans.

## Who we are and what we stand for

The opening section tells the story of the Kadanglabo studio, our vision of **architecture for everyone**, and the mission that turns that vision into daily work. We believe good architecture does not have to be expensive or exclusive. What it needs is an honest process, design that answers real needs and open communication between client, designer and builder.

The design philosophy section explains three ideas we bring to every project. *Form follows function* means a building's shape comes from how its spaces are used. Contextual design means a building has to respond to its site, climate and surroundings. And an effective workflow keeps our clients' time and budget in check from brief to handover.

## Services and team

Kadanglabo works on architecture, interior design, landscape and site planning, and offers design and build for clients who want one team from the first drawing to the finished building. The company profile explains how each service runs, what you receive at each stage and how our in-house team divides the work between architects, drafters and site supervisors.

This matters because many of our clients are building for the first time. Knowing the process from the start helps you plan your time, prepare the decisions you will need to make and avoid surprises along the way.

## Projects featured

Most of the pages are given to selected projects in three sectors: Commercial, Hospitality and Residential. They include La Barka Resort on the Progo River, where the buildings and landscape were shaped around the contours of the site; Klinik UII, whose secondary skin cuts heat gain and gives the façade its identity; Bale Catur Villa & Resto in Sleman; and homes such as HMW House.

Each project comes with a short story about the challenge and how we answered it, not only photographs. At the end you will also find a list of more than sixty projects we have worked on, most of them in and around the Special Region of Yogyakarta.

## How to get a copy

The company profile is a 51-page PDF. Email **kadanglabo@gmail.com** or message us on WhatsApp and we will send it to you. If one of the projects resembles what you have in mind, mention it when you get in touch, so we can start the conversation from there.
`,
    },
    project: 'klinik-uii',
  }),

  article({
    slug: 'enam-tahun-kadanglabo',
    type: 'news',
    tag: { en: 'Studio', id: 'Studio' },
    title: {
      en: 'Six years of Kadanglabo: architecture for everyone, from Yogyakarta',
      id: 'Enam tahun Kadanglabo: arsitektur untuk semua dari Yogyakarta',
    },
    date: '2026-09-30',
    excerpt: {
      en: 'Since September 2020, Kadanglabo has grown into a community-based architecture consultancy in Yogyakarta. A look back, and what comes next.',
      id: 'Sejak September 2020, Kadanglabo tumbuh menjadi konsultan arsitektur berbasis komunitas di Yogyakarta. Kilas balik dan langkah selanjutnya.',
    },
    cover: 'labarka-garden',
    summary: {
      en: 'Kadanglabo was founded in late September 2020 by Raditya Alvin with one vision: architecture for everyone. Six years and more than sixty projects later, two principles still guide every design: contextual design and an effective workflow.',
      id: 'Kadanglabo didirikan Raditya Alvin pada akhir September 2020 dengan satu visi: arsitektur untuk semua. Enam tahun dan lebih dari enam puluh proyek kemudian, dua prinsip tetap memandu setiap desain: desain kontekstual dan workflow yang efektif.',
    },
    body: {
      id: `
Kadanglabo lahir dari keyakinan sederhana: arsitektur yang baik seharusnya bisa dinikmati siapa saja, bukan hanya segelintir orang yang punya akses ke biro besar. Ketika Raditya Alvin mendirikan studio ini pada akhir September 2020, banyak orang di sekitar kami ingin membangun rumah atau usaha, tetapi merasa jasa arsitek terlalu jauh dari jangkauan, terlalu rumit, atau tidak benar-benar mendengarkan kebutuhan mereka.

Dari situ kami memilih cara kerja yang berbasis komunitas. Sejak hari pertama, kami berusaha mempertemukan klien, perencana, dan pelaksana di satu meja untuk tujuan yang sama. Klien tidak hanya menerima gambar jadi, tetapi ikut memahami setiap keputusan desain dan alasannya.

## Dua ukuran keberhasilan

Sejak 2020, setiap proyek kami ukur dengan dua hal yang sama. Yang pertama adalah **desain kontekstual**. Bangunan yang baik harus menjawab tapaknya: arah matahari dan angin, kontur tanah, aliran air, budaya setempat, dan tentu saja kebiasaan orang yang akan memakainya. Rumah di lereng tidak dirancang seperti rumah di tengah kota, dan klinik di kampus punya kebutuhan yang berbeda dengan kafe di pinggir jalan.

Yang kedua adalah **workflow yang efektif**. Desain sebagus apa pun tidak ada artinya jika prosesnya berlarut-larut atau anggarannya membengkak tanpa kendali. Karena itu kami menyusun alur yang jelas dari brief, konsep, pengembangan desain, gambar kerja, sampai pengawasan dan serah terima. Klien tahu apa yang sedang dikerjakan, apa yang perlu diputuskan, dan kapan.

## Dari kavling sampai resort

Dalam enam tahun, studio kecil ini sudah merancang lebih dari enam puluh proyek. Ada rumah tinggal dan perumahan, kafe dan ruko, klinik kampus, sampai resort di tepi Kali Progo. Setiap jenis proyek mengajarkan hal yang berbeda, dari cara memaksimalkan lahan sempit di tengah kota sampai cara menata bangunan agar mengikuti kontur sungai.

Sebagian besar karya kami berada di D.I. Yogyakarta, tempat studio ini tumbuh. Namun kepercayaan klien juga membawa kami bekerja di Klaten, Jepara, Surabaya, Bali, dan Palembang. Bagi kami, bekerja di daerah baru selalu berarti belajar ulang tentang iklim, material, dan cara membangun yang dikenal tukang setempat.

> Arsitektur yang baik dimulai dari mendengarkan, lalu bekerja bersama.

## Langkah selanjutnya

Memasuki tahun ketujuh, kami ingin semakin terbuka. Kegiatan seperti Open Studio dan talk desain kontekstual adalah cara kami berbagi apa yang sudah kami pelajari, sekaligus mendengar langsung kebutuhan orang-orang yang ingin membangun. Kami juga terus merapikan proses kerja agar setiap klien, besar maupun kecil, mendapat pengalaman yang sama jelasnya.

Terima kasih kepada setiap klien, mitra, dan tukang yang sudah berkarya bersama kami selama enam tahun ini. Tahun ketujuh kami mulai dengan semangat yang sama seperti hari pertama: membuat arsitektur yang dekat dengan semua orang.
`,
      en: `
Kadanglabo began with a simple belief: good architecture should be within reach of everyone, not only the few with access to a large practice. When Raditya Alvin founded the studio in late September 2020, many people around us wanted to build a home or a business but felt architects were out of reach, too complicated or not really listening to what they needed.

So we chose a community-based way of working. From day one we have tried to bring clients, designers and builders to the same table, working towards the same goal. Clients do not just receive finished drawings; they understand every design decision and the reason behind it.

## Two measures of success

Since 2020 we have judged every project by the same two things. The first is **contextual design**. A good building answers its site: the path of the sun and wind, the slope of the land, the flow of water, local culture and, of course, the daily habits of the people who will use it. A house on a hillside is not designed like a house in the city, and a campus clinic needs something quite different from a roadside café.

The second is **an effective workflow**. Even the best design means little if the process drags on or the budget runs out of control. That is why we follow a clear sequence from brief, concept and design development to construction drawings, site supervision and handover. Clients always know what is being worked on, what needs deciding and when.

## From housing plots to a resort

In six years this small studio has designed more than sixty projects: homes and housing estates, cafés and shophouses, a campus clinic and a resort on the Progo River. Each type of project has taught us something different, from making the most of a tight city plot to arranging buildings along the contours of a river.

Most of our work is in the Special Region of Yogyakarta, where the studio grew up. Our clients' trust has also taken us to Klaten, Jepara, Surabaya, Bali and Palembang. For us, working somewhere new always means learning again about the climate, the materials and the building methods local craftsmen know best.

> Good architecture starts with listening, then working together.

## What comes next

As we enter our seventh year, we want to be more open still. Events such as Open Studio and our talk on contextual design are ways of sharing what we have learned, and of hearing directly from people who want to build. We are also refining our process so that every client, large or small, has an equally clear experience.

Thank you to every client, partner and craftsman who has worked with us over these six years. We start our seventh year in the same spirit as the first day: making architecture that is close to everyone.
`,
    },
    project: 'la-barka-resort',
  }),

  article({
    slug: 'secondary-skin-klinik-uii',
    type: 'news',
    tag: { en: 'Project', id: 'Proyek' },
    title: {
      en: 'Klinik UII: how a secondary skin cools a clinic in a tropical climate',
      id: 'Klinik UII: secondary skin untuk fasad klinik yang sejuk dan berkarakter',
    },
    date: '2026-08-20',
    excerpt: {
      en: 'Vertical fins wrap the upper floor of Klinik UII in Yogyakarta, filtering daylight, reducing heat gain and giving the clinic a clear identity.',
      id: 'Kisi-kisi vertikal menyelimuti lantai atas Klinik UII di Yogyakarta: menyaring cahaya, meredam panas, dan memberi klinik identitas yang kuat.',
    },
    cover: 'klinik-plaza',
    summary: {
      en: 'For Universitas Islam Indonesia, Kadanglabo designed a clinic whose upper floor is wrapped in a secondary skin of vertical fins. The fins control sunlight and heat, protect patient privacy and give the building a calm, recognisable face on campus.',
      id: 'Untuk Universitas Islam Indonesia, Kadanglabo merancang klinik dengan lantai atas yang dibalut secondary skin berupa kisi-kisi vertikal. Kisi-kisi ini mengatur cahaya dan panas, menjaga privasi pasien, dan memberi bangunan wajah yang tenang serta mudah dikenali di kampus.',
    },
    body: {
      id: `
Klinik di lingkungan kampus punya dua tuntutan sekaligus. Di satu sisi, ia harus nyaman, higienis, dan menenangkan bagi pasien yang datang dalam keadaan kurang sehat. Di sisi lain, ia juga menjadi bagian dari wajah institusi, sehingga harus mencerminkan identitas kampusnya. Universitas Islam Indonesia meminta klinik yang modern, terasa menyatu dengan lingkungan kampus, dan mudah dikenali dari kejauhan.

Tantangan terbesarnya justru datang dari iklim. Di Yogyakarta, matahari bersinar hampir sepanjang tahun dengan panas yang menyengat di siang hari. Bangunan dengan banyak kaca akan terang, tetapi juga cepat panas dan silau. Sebaliknya, bangunan yang tertutup rapat akan sejuk, tetapi terasa gelap dan kurang ramah. Kami perlu jalan tengah.

## Apa itu secondary skin?

Jawaban kami adalah **secondary skin**, yaitu lapisan kedua yang dipasang di luar dinding utama bangunan. Di Klinik UII, lapisan ini berupa deretan kisi-kisi vertikal yang membungkus seluruh lantai atas. Di antara dinding dan kisi terdapat jarak yang berfungsi sebagai ruang udara.

Cara kerjanya sederhana. Sinar matahari tidak langsung mengenai dinding dan kaca, tetapi lebih dulu tertahan dan terpecah oleh kisi. Panas yang terkumpul di ruang udara bisa terbawa angin sebelum masuk ke dalam ruangan. Hasilnya, dinding tetap lebih dingin dan ruang di baliknya lebih nyaman.

## Manfaatnya di iklim tropis

Manfaat pertama terasa pada cahaya. Ruang periksa dan ruang kerja tetap mendapat cahaya alami yang cukup, tetapi tanpa silau yang melelahkan mata. Ini penting bagi tenaga kesehatan yang bekerja seharian, sekaligus bagi pasien yang ingin merasa tenang.

Manfaat kedua adalah suhu. Karena panas diredam sebelum mencapai dinding, ruang dalam tidak cepat memanas di siang hari. Beban pendingin udara pun berkurang, yang dalam jangka panjang berarti biaya operasional klinik yang lebih hemat.

Manfaat ketiga sering tidak disadari, yaitu privasi. Kisi-kisi menghalangi pandangan dari luar ke dalam ruang periksa, sehingga jendela tidak perlu selalu ditutup tirai. Pasien tetap terlindungi, sementara ruangan tetap terang dan terhubung dengan suasana luar.

Terakhir, kisi-kisi itu menjadi **identitas**. Ritme garis vertikal yang berulang memberi klinik wajah yang tegas, elegan, dan mudah diingat. Dari jalan kampus, bangunan ini langsung dikenali tanpa perlu ornamen tambahan.

## Dari konsep ke bangunan

Kisi-kisi tidak kami pasang dengan jarak yang sama di semua sisi. Kami mempelajari lintasan matahari di tapak, lalu menyesuaikan kerapatan dan orientasinya. Sisi yang menerima panas paling kuat mendapat perlindungan paling rapat, sementara sisi yang lebih teduh dibuat lebih renggang agar cahaya tetap masuk.

Di lantai dasar, pendekatannya berbeda. Area tunggu dibuat terbuka dan terang agar pasien merasa diterima sejak pertama masuk. Selasar dalam mendapat cahaya alami yang lembut, sehingga suasana klinik tidak terasa seperti rumah sakit yang dingin dan kaku.

Klinik UII menunjukkan bahwa satu elemen fasad bisa bekerja ganda. Secondary skin di sini bukan sekadar hiasan, tetapi alat untuk membuat bangunan lebih nyaman, lebih hemat energi, dan sekaligus lebih berkarakter.
`,
      en: `
A campus clinic has two jobs at once. On one hand it must be comfortable, hygienic and calming for patients who arrive feeling unwell. On the other, it is part of the institution's public face and has to reflect the identity of the campus. Universitas Islam Indonesia asked for a clinic that felt modern, at home among the campus buildings and recognisable from a distance.

The biggest challenge came from the climate. In Yogyakarta the sun shines almost all year round, with fierce heat in the middle of the day. A building with lots of glass is bright but quickly becomes hot and glaring. A closed-up building stays cool but feels dark and unwelcoming. We needed a middle way.

## What is a secondary skin?

Our answer was a **secondary skin**: a second layer installed outside the building's main walls. At Klinik UII it is a row of vertical fins wrapping the whole upper floor, with a gap between the wall and the fins that works as an air space.

The principle is simple. Sunlight does not hit the walls and glass directly; it is first caught and broken up by the fins. Heat that builds up in the air space can be carried away by the breeze before it reaches the rooms. The result is cooler walls and more comfortable spaces behind them.

## Why it works in a tropical climate

The first benefit is in the light. Examination rooms and offices still receive plenty of daylight, but without the glare that tires the eyes. That matters for medical staff who work there all day, and for patients who want to feel at ease.

The second benefit is temperature. Because heat is reduced before it reaches the wall, the rooms do not warm up quickly during the day. The air conditioning has less work to do, which over time means lower running costs for the clinic.

The third benefit is one people often overlook: privacy. The fins block views from outside into the examination rooms, so the windows do not need to be curtained all the time. Patients stay protected while the rooms stay bright and connected to the outdoors.

Finally, the fins give the building its **identity**. The repeated rhythm of vertical lines gives the clinic a clear, elegant and memorable face. From the campus road it is recognisable at once, without any added ornament.

## From concept to building

We did not space the fins evenly on every side. We studied the sun's path across the site and adjusted their density and orientation to match. The sides that take the strongest heat get the densest shading, while the shadier sides are more open so light can still come in.

On the ground floor the approach is different. The waiting area is open and bright so patients feel welcome from the moment they arrive, and the inner corridor receives soft natural light, so the clinic never feels like a cold, rigid hospital.

Klinik UII shows that a single façade element can do two jobs. The secondary skin here is not decoration; it is a tool that makes the building more comfortable, more energy-efficient and, at the same time, full of character.
`,
    },
    project: 'klinik-uii',
  }),

  article({
    slug: 'talk-desain-kontekstual',
    type: 'event',
    tag: { en: 'Talk', id: 'Talk' },
    title: {
      en: 'Talk: contextual design for tropical buildings, a La Barka Resort case study',
      id: 'Talk: desain kontekstual bangunan tropis, studi kasus La Barka Resort',
    },
    date: '2026-12-05',
    excerpt: {
      en: 'How the contours, water flow and sun path of a riverside site shaped La Barka Resort. A free talk at the Kadanglabo studio in Sleman.',
      id: 'Bagaimana kontur, aliran air, dan arah matahari di tepi Kali Progo membentuk La Barka Resort. Talk gratis di studio Kadanglabo, Sleman.',
    },
    cover: 'labarka-river',
    summary: {
      en: 'Contextual design is one of Kadanglabo’s two measures of success. In this talk on Saturday, 5 December 2026, we show how it works on a real project, La Barka Resort on the Progo River, from reading the site to the last material choice.',
      id: 'Desain kontekstual adalah salah satu dari dua ukuran keberhasilan Kadanglabo. Di talk Sabtu, 5 Desember 2026 ini, kami menunjukkan penerapannya di proyek nyata, La Barka Resort di tepi Kali Progo, dari membaca tapak sampai memilih material.',
    },
    body: {
      id: `
Bangunan tropis yang nyaman tidak selalu membutuhkan teknologi mahal. Sering kali jawabannya sudah tersedia di tapak itu sendiri: dari mana angin bertiup, bagaimana matahari bergerak sepanjang hari, ke mana air mengalir saat hujan, dan seperti apa kontur tanahnya. Membaca semua itu dengan teliti, lalu menjadikannya dasar desain, adalah yang kami sebut desain kontekstual.

Desain kontekstual adalah salah satu dari dua ukuran keberhasilan yang kami pegang sejak Kadanglabo berdiri. Di talk ini, kami ingin menunjukkan bahwa prinsip tersebut bukan sekadar teori, dengan membedah satu proyek nyata dari awal sampai akhir: La Barka Resort di tepi Kali Progo, Kulon Progo.

## Membaca tapak di tepi sungai

Lahan La Barka berada di tepi sungai dengan kontur yang menurun dan aliran air yang harus dihormati. Bagian pertama talk akan membahas bagaimana kami memetakan kondisi tersebut sebelum menggambar satu bangunan pun. Kami akan menunjukkan bagaimana kemiringan tanah, arah aliran sungai, dan pohon-pohon yang sudah ada menentukan di mana setiap massa bangunan diletakkan.

Hasilnya adalah tata letak yang mengikuti tapak, bukan melawannya. Bangunan beratap pelana disusun bertingkat mengikuti kontur, sehingga setiap unit mendapat pemandangan ke sungai tanpa perlu meratakan lahan secara besar-besaran. Pendekatan ini menghemat biaya pekerjaan tanah sekaligus menjaga karakter alami lokasi.

## Lanskap sebagai bagian dari desain

Di banyak proyek, lanskap baru dipikirkan setelah bangunan selesai. Di La Barka, kami merancangnya bersamaan. Taman, kolam, dan jalur setapak bukan hiasan tambahan, tetapi penghubung antarbangunan yang membentuk pengalaman tamu dari area terbuka sampai ke kamar.

Bagian ini akan membahas bagaimana ruang terbuka bisa membantu menurunkan suhu sekitar bangunan, mengarahkan pergerakan orang, dan menciptakan suasana yang membuat tamu ingin berlama-lama di luar ruangan.

## Material dan bukaan yang bekerja dengan iklim

Bagian terakhir membahas detail yang lebih teknis namun tetap mudah dipahami: pemilihan material, ukuran dan posisi bukaan, serta cara atap dan teritisan melindungi bangunan dari panas dan hujan. Semuanya bertujuan agar ruang tetap sejuk secara alami, sehingga ketergantungan pada pendingin udara bisa dikurangi.

Kami juga akan menyisakan waktu untuk tanya jawab. Banyak peserta biasanya bertanya bagaimana prinsip yang sama diterapkan pada skala yang lebih kecil, misalnya rumah tinggal di perkotaan. Jawabannya akan kami bahas dengan contoh-contoh sederhana yang bisa langsung Anda bayangkan di rumah sendiri.

## Untuk siapa talk ini

Talk ini terbuka untuk mahasiswa arsitektur yang ingin melihat proses desain di proyek nyata, praktisi yang ingin bertukar pengalaman, pemilik lahan yang sedang merencanakan bangunan, dan siapa pun yang tertarik pada arsitektur tropis yang hemat energi. Tidak perlu latar belakang teknis untuk mengikutinya.

## Waktu dan tempat

Talk berlangsung pada **Sabtu, 5 Desember 2026, pukul 13.00 sampai 15.00 WIB**, di Studio Kadanglabo, Jl. Kaliurang KM.9 No.11 (Ruko 3), Sleman. Acara ini gratis dengan tempat terbatas, jadi kami sarankan mengonfirmasi kehadiran lebih dulu lewat WhatsApp.
`,
      en: `
A comfortable tropical building does not always need expensive technology. Often the answer is already on the site: where the wind comes from, how the sun moves through the day, where rainwater flows and how the land rises and falls. Reading all of that carefully and making it the basis of the design is what we call contextual design.

Contextual design is one of the two measures of success we have held since Kadanglabo was founded. In this talk we want to show that it is more than theory, by taking apart one real project from start to finish: La Barka Resort on the Progo River in Kulon Progo.

## Reading a riverside site

The La Barka site sits on a riverbank, with sloping ground and a flow of water that has to be respected. The first part of the talk covers how we mapped these conditions before drawing a single building. We will show how the slope, the direction of the river and the existing trees decided where each building would sit.

The result is a layout that works with the site rather than against it. Gabled buildings step down the slope following the contours, so every unit looks out over the river without large-scale levelling of the land. This saved on earthworks and kept the natural character of the place.

## Landscape as part of the design

On many projects the landscape is only considered once the buildings are finished. At La Barka we designed both together. The gardens, ponds and footpaths are not extras; they connect the buildings and shape the guest's experience from the open areas all the way to their room.

This part of the talk looks at how open space can lower the temperature around buildings, guide how people move and create an atmosphere that makes guests want to spend time outdoors.

## Materials and openings that work with the climate

The final part goes into more technical detail, while staying easy to follow: the choice of materials, the size and position of openings, and how roofs and overhangs protect the buildings from heat and rain. All of it aims to keep rooms naturally cool and reduce reliance on air conditioning.

We will leave time for questions. Participants often ask how the same principles apply at a smaller scale, such as a family home in the city, and we will answer with simple examples you can picture in your own house.

## Who it is for

The talk is open to architecture students who want to see a design process on a real project, practitioners who want to share experience, landowners planning to build, and anyone interested in energy-efficient tropical architecture. No technical background is needed.

## Date and venue

The talk takes place on **Saturday, 5 December 2026, from 13.00 to 15.00 WIB**, at the Kadanglabo Studio, Jl. Kaliurang KM.9 No.11 (Ruko 3), Sleman. It is free with limited places, so please confirm your attendance on WhatsApp beforehand.
`,
    },
    project: 'la-barka-resort',
  }),
]
