import { useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'

export default function NotFound() {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root)
  return (
    <Page title="404">
      <div ref={root}>
        <PageHero title="404" sub="Halaman yang Anda cari belum terbangun, atau sudah pindah alamat.">
          <TLink to="/" className="btn-pill btn-pill--dark btn-pill--lg mt-10" data-fade="now" data-delay="0.6">
            Kembali ke beranda
          </TLink>
        </PageHero>
      </div>
    </Page>
  )
}
