import { useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { usePageAnimations } from '../lib/anim'
import { TLink } from '../lib/transition'
import { tr } from '../lib/i18n'

export default function NotFound() {
  const root = useRef<HTMLDivElement>(null)
  usePageAnimations(root)
  return (
    <Page title={tr('Page not found', 'Halaman tidak ditemukan')}>
      <div ref={root}>
        <PageHero
          className="page-hero--full nf-hero"
          title="404"
          sub={tr('This page has not been built yet, or it has moved.', 'Halaman yang Anda cari belum terbangun, atau sudah pindah alamat.')}
        >
          <TLink to="/" className="btn-pill btn-pill--dark btn-pill--lg mt-10" data-fade="now" data-delay="0.6">
            {tr('Back to home', 'Kembali ke beranda')}
          </TLink>
        </PageHero>
      </div>
    </Page>
  )
}
