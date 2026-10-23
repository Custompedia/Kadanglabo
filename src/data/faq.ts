import type { Tx } from '../lib/i18n'

/* FAQ halaman Contact: jawaban disusun dari data di site.ts (disiplin, layanan, proses) dan lokasi proyek di arsip (projects.ts).
 * Dua bahasa ({ en, id }), dibaca lewat t() saat render. */
export const faq: { q: Tx; a: Tx }[] = [
  {
    q: { en: 'What services does Kadanglabo offer?', id: 'Apa saja layanan Kadanglabo?' },
    a: {
      en: 'We design at every scale: master planning, building design, landscape architecture, interior design, lighting design and 3D visualisation. We also offer project, development and programme management, rehabilitation and restoration for Commercial, Hospitality and Residential projects.',
      id: 'Dari skala kawasan hingga detail: master planning, desain bangunan, arsitektur lanskap, desain interior, desain pencahayaan, dan visualisasi 3D. Kami juga melayani manajemen proyek, pengembangan, dan program, serta rehabilitasi dan restorasi untuk proyek Commercial, Hospitality, dan Residential.',
    },
  },
  {
    q: {
      en: 'Do you also support us through construction?',
      id: 'Apakah Kadanglabo juga mendampingi hingga bangunan selesai?',
    },
    a: {
      en: 'Yes, through to completion. Every design must be built, so planning and construction sit under one roof: construction drawings (DED), a cost estimate (RAB), and site support and supervision.',
      id: 'Ya, hingga bangunan selesai. Setiap desain harus terbangun. Kami menyatukan perencanaan dan pelaksanaan melalui satu pintu: gambar kerja (DED), rencana anggaran biaya (RAB), serta pendampingan dan pengawasan di lapangan.',
    },
  },
  {
    q: { en: 'How does the process work, from start to finish?', id: 'Seperti apa alur kerjanya dari awal sampai selesai?' },
    a: {
      en: 'Four stages. Needs and goals: consultation, brief, budget and schedule. Analysis: site survey, regulations, needs and market research. Creative process: concept, design development and 3D visualisation with you. Deliverables: construction drawings (DED), a cost estimate (RAB), and site support and supervision.',
      id: 'Empat tahap. Kebutuhan dan tujuan: konsultasi, brief, anggaran, dan jadwal. Analisis: survei tapak, kajian regulasi, kebutuhan, dan pasar. Proses kreatif: konsep, pengembangan desain, dan visualisasi 3D bersama Anda. Deliverables: gambar kerja (DED), RAB, serta pendampingan dan pengawasan di lapangan.',
    },
  },
  {
    q: { en: 'What should I prepare before the first consultation?', id: 'Apa yang perlu saya siapkan sebelum konsultasi pertama?' },
    a: {
      en: 'Bring what you have: the plot’s location and size, the spaces you need, a budget range and a target date. Photos of the site or existing building and examples of spaces you like also help. Still working out the details? We can discuss them at the first meeting.',
      id: 'Cukup siapkan lokasi dan luas lahan, kebutuhan ruang, kisaran anggaran, dan target waktu. Foto lahan atau bangunan lama serta referensi ruang yang Anda sukai juga membantu. Belum lengkap? Kita bahas bersama saat pertemuan pertama.',
    },
  },
  {
    q: { en: 'How much do your design services cost?', id: 'Berapa biaya jasa desainnya?' },
    a: {
      en: 'Fees depend on building type, floor area, scope and location. After the first consultation, we prepare a proposal for your needs, from design alone to support through construction. A cost estimate (RAB) helps you plan your construction budget.',
      id: 'Biaya mengikuti jenis bangunan, luas bangunan, lingkup pekerjaan, dan lokasi. Setelah konsultasi awal, kami menyusun penawaran sesuai kebutuhan Anda, dari desain saja hingga pendampingan konstruksi. RAB membantu Anda merencanakan anggaran pembangunan.',
    },
  },
  {
    q: { en: 'Do you take on renovations, or only new builds?', id: 'Bisa untuk renovasi, atau hanya bangunan baru?' },
    a: {
      en: 'Both. We handle new builds, renovations and land development across all three sectors. We also rehabilitate and restore existing buildings to preserve their function and value.',
      id: 'Bisa keduanya. Kami menangani bangunan baru, renovasi, dan pengembangan lahan di ketiga sektor. Kami juga merehabilitasi dan merestorasi bangunan yang sudah ada untuk menjaga fungsi dan nilainya.',
    },
  },
  {
    q: { en: 'Do you work outside Yogyakarta?', id: 'Apakah Kadanglabo menerima proyek di luar Yogyakarta?' },
    a: {
      en: 'Yes. Our studio is in Sleman, Yogyakarta, and most of our projects are nearby, but we have also worked in Klaten, Jepara, Surabaya, Bali and Palembang.',
      id: 'Ya. Studio kami ada di Sleman, D.I. Yogyakarta, dan sebagian besar proyek berada di sekitarnya, tetapi kami juga sudah mengerjakan proyek di Klaten, Jepara, Surabaya, Bali, hingga Palembang.',
    },
  },
  {
    q: { en: 'What happens after I send the form?', id: 'Apa yang terjadi setelah saya mengirim formulir?' },
    a: {
      en: 'The form opens a WhatsApp chat with your message ready to send. Once you send it, our team contacts you to discuss your needs and arrange a consultation. Visiting the studio? Let us know first so the right team members can meet you.',
      id: 'Formulir membuka chat WhatsApp berisi pesan Anda. Tekan kirim, lalu tim kami akan menghubungi Anda untuk membahas kebutuhan dan menjadwalkan konsultasi. Ingin ke studio? Kabari lebih dulu agar tim yang tepat bisa menemui Anda.',
    },
  },
]
