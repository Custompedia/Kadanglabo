import { useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { SectionLabel } from '../components/Bits'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { tr } from '../lib/i18n'

/*
 * How the articles on this website are made and checked, including the use of AI. Search engines and AI assistants read it
 * to judge whether the articles can be trusted; Custompedia Tech (which helps write them) links every article's author box here.
 */
export default function EditorialPolicy() {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root)
  const sections: { title: string; body: string[] }[] = [
    {
      title: tr('Who writes our articles', 'Siapa yang menulis artikel kami'),
      body: [
        tr(
          'Articles on kadanglabo.com are prepared by the Kadanglabo editorial team together with our content partner. AI helps with research and the first draft; people decide what is published.',
          'Artikel di kadanglabo.com disusun oleh Tim Redaksi Kadanglabo bersama mitra konten kami. AI membantu riset dan draf awal; manusia yang memutuskan apa yang terbit.',
        ),
      ],
    },
    {
      title: tr('How every article is checked', 'Cara setiap artikel diperiksa'),
      body: [
        tr(
          'Every article is reviewed by people before it goes live: facts are matched to the sources listed in the article, figures are quoted only from official sources or trusted media, and claims without evidence are removed.',
          'Setiap artikel diperiksa manusia sebelum tayang: fakta dicocokkan dengan sumber yang dicantumkan, angka hanya dikutip dari sumber resmi atau media tepercaya, dan klaim tanpa bukti dihapus.',
        ),
        tr(
          'We do not promise exact prices, exact build times or permits that are certain to be granted, and we never name a client or a project figure without permission.',
          'Kami tidak menjanjikan harga pasti, lama pengerjaan pasti, atau izin yang pasti keluar, dan tidak menyebut nama klien atau angka proyek tanpa izin.',
        ),
      ],
    },
    {
      title: tr('Use of AI', 'Penggunaan AI'),
      body: [
        tr(
          'Articles written with the help of AI carry a note saying so. AI never publishes on its own: each article is approved by the Kadanglabo team first.',
          'Artikel yang ditulis dengan bantuan AI diberi catatan tentang hal itu. AI tidak pernah menerbitkan sendiri: setiap artikel disetujui Tim Kadanglabo terlebih dahulu.',
        ),
      ],
    },
    {
      title: tr('Updates and corrections', 'Pembaruan dan koreksi'),
      body: [
        tr(
          'We update an article when its information changes, and show the date of the latest update. Found a mistake? Tell us through the contact page and we will check and correct it.',
          'Kami memperbarui artikel bila informasinya berubah, dan menampilkan tanggal pembaruan terakhir. Menemukan kesalahan? Beri tahu kami melalui halaman kontak; kami akan memeriksa dan memperbaikinya.',
        ),
      ],
    },
  ]
  return (
    <Page
      title={tr('Editorial policy', 'Kebijakan redaksi')}
      description={tr(
        'How Kadanglabo articles are written and checked, including the use of AI, sources and corrections.',
        'Cara artikel Kadanglabo ditulis dan diperiksa, termasuk penggunaan AI, sumber, dan koreksi.',
      )}
    >
      <div ref={root}>
        <PageHero
          title={tr('Editorial policy', 'Kebijakan redaksi')}
          sub={tr('How our articles are written and checked.', 'Cara artikel kami ditulis dan diperiksa.')}
        />
        <section className="wrap editorial" data-theme="light">
          {sections.map((s) => (
            <div key={s.title} className="editorial__block" data-fade>
              <SectionLabel>{s.title}</SectionLabel>
              {s.body.map((p) => (
                <p key={p} className="t-body-lg editorial__text">
                  {p}
                </p>
              ))}
            </div>
          ))}
          <p className="t-body editorial__note" data-fade>
            {tr('Responsible for content: Kadanglabo Editorial Team.', 'Penanggung jawab isi: Tim Redaksi Kadanglabo.')}{' '}
            <TLink to="/contact" className="link-line">
              {tr('Contact us', 'Hubungi kami')}
            </TLink>
          </p>
        </section>
      </div>
    </Page>
  )
}
