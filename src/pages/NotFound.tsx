import { useRef } from 'react'
import { Page } from '../components/Page'
import { PageHero } from '../components/PageHero'
import { Img } from '../components/Img'
import { usePageAnimations } from '../lib/anim'
import { gsap } from '../lib/gsap'
import { TLink } from '../lib/transition'

export default function NotFound() {
  const root = useRef<HTMLDivElement>(null)
  // "not built yet": the studio's exploded house drawing is drawn in from the top, then settles
  usePageAnimations(root, () => {
    gsap.fromTo('.nf-art', { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, delay: 0.15, ease: 'power3.inOut' })
  })
  return (
    <Page title="404">
      <div ref={root}>
        <PageHero className="page-hero--full nf-hero" title="404" sub="Halaman yang Anda cari belum terbangun, atau sudah pindah alamat.">
          <div className="nf-art" aria-hidden="true">
            <Img id="draw-exploded" sizes="220px" priority style={{ backgroundColor: 'transparent' }} />
          </div>
          <TLink to="/" className="btn-pill btn-pill--dark btn-pill--lg mt-10" data-fade="now" data-delay="0.6">
            Kembali ke beranda
          </TLink>
        </PageHero>
      </div>
    </Page>
  )
}
