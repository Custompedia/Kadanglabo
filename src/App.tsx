import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { SmoothScroll, scrollToElement, scrollToTop } from './lib/smooth'
import { TransitionProvider } from './lib/transition'
import { whenGateOpen } from './lib/gate'
import { tr } from './lib/i18n'
import { Header } from './components/Header'
import { Menu } from './components/Menu'
import { Footer, type FooterCtaProps } from './components/Footer'
import { Preloader } from './components/Preloader'
import { Cursor } from './components/Cursor'
import { categoryOrder, nextProject, projects, type Category } from './data/projects'
import { sectors } from './data/site'

const pages = {
  home: () => import('./pages/Home'),
  about: () => import('./pages/About'),
  services: () => import('./pages/Services'),
  work: () => import('./pages/Work'),
  category: () => import('./pages/Category'),
  project: () => import('./pages/ProjectDetail'),
  news: () => import('./pages/News'),
  article: () => import('./pages/NewsDetail'),
  contact: () => import('./pages/Contact'),
  notFound: () => import('./pages/NotFound'),
}

const Home = lazy(pages.home)
const About = lazy(pages.about)
const Services = lazy(pages.services)
const Work = lazy(pages.work)
const CategoryPage = lazy(pages.category)
const ProjectDetail = lazy(pages.project)
const News = lazy(pages.news)
const NewsDetail = lazy(pages.article)
const Contact = lazy(pages.contact)
const NotFound = lazy(pages.notFound)

const workThumbs = projects.slice(0, 8).map((p) => p.cover)

function footerCta(pathname: string): FooterCtaProps {
  const start: FooterCtaProps = {
    words: tr('Start a project', 'Mulai proyek'),
    to: '/contact#start',
    imgs: ['labarka-path', 'hmw-dining', 'balecatur-lobby', 'klinik-waiting'],
  }
  // a category landing page ends on its own form; the footer leads on to the next category
  const ci = categoryOrder.indexOf(pathname.split('/')[2] as Category)
  if (pathname.startsWith('/work/') && ci >= 0) {
    const next = sectors.find((x) => x.key === categoryOrder[(ci + 1) % categoryOrder.length])!
    return { words: tr('Next up', 'Berikutnya'), to: `/work/${next.key}`, imgs: [next.img, ...next.gallery.slice(0, 3)], kicker: next.label }
  }
  if (pathname.startsWith('/work/')) {
    const next = nextProject(pathname.split('/')[2] ?? '')
    return {
      words: tr('Next up', 'Berikutnya'),
      to: `/work/${next.slug}`,
      imgs: [next.cover],
      kicker: `${tr('Next project', 'Proyek berikutnya')}: ${next.title}`,
    }
  }
  if (pathname === '/work') return start
  return { words: tr('See work', 'Lihat proyek'), to: '/work', imgs: workThumbs }
}

function Layout() {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const toggleMenu = useCallback(() => setMenuOpen((o) => !o), [])

  // Every new page starts at the top (covers back/forward navigation too).
  useLayoutEffect(() => {
    scrollToTop()
  }, [location.pathname])

  // Anchor links such as /contact#start: scroll once the page has been revealed.
  useEffect(() => {
    if (!location.hash) return
    let timer = 0
    const off = whenGateOpen(() => {
      timer = window.setTimeout(() => scrollToElement(location.hash), 950)
    })
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [location.key, location.hash])

  // Warm up the other route chunks once the first page is idle, so transitions never wait on the network.
  useEffect(() => {
    const id = window.setTimeout(() => Object.values(pages).forEach((load) => load()), 3500)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <>
      <a href="#main" className="skip-link">
        {tr('Skip to content', 'Langsung ke konten')}
      </a>
      <Header menuOpen={menuOpen} onToggleMenu={toggleMenu} />
      <Menu open={menuOpen} onClose={closeMenu} />
      <Suspense fallback={<div className="page-fallback" />}>
        <Routes location={location} key={`page:${location.pathname}`}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/studio" element={<Navigate to="/about" replace />} />
          <Route path="/services" element={<Services />} />
          {sectors.map((s) => (
            // the per-category service pages became the category landing pages under /work (old links still land there)
            <Route key={s.key} path={`/services/${s.key}`} element={<Navigate to={`/work/${s.key}`} replace />} />
          ))}
          <Route path="/work" element={<Work />} />
          {categoryOrder.map((c) => (
            <Route key={c} path={`/work/${c}`} element={<CategoryPage cat={c} />} />
          ))}
          <Route path="/work/:slug" element={<ProjectDetail />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:slug" element={<NewsDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer key={`footer:${location.pathname}`} cta={footerCta(location.pathname)} />
      </Suspense>
      <Cursor />
      <Preloader />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SmoothScroll>
        <TransitionProvider>
          <Layout />
        </TransitionProvider>
      </SmoothScroll>
    </BrowserRouter>
  )
}
