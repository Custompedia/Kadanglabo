import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { SmoothScroll, scrollToElement, scrollToTop } from './lib/smooth'
import { TransitionProvider } from './lib/transition'
import { whenGateOpen } from './lib/gate'
import { Header } from './components/Header'
import { Menu } from './components/Menu'
import { Footer, type FooterCtaProps } from './components/Footer'
import { Preloader } from './components/Preloader'
import { Cursor } from './components/Cursor'
import { nextProject, projects } from './data/projects'

const pages = {
  home: () => import('./pages/Home'),
  about: () => import('./pages/About'),
  services: () => import('./pages/Services'),
  work: () => import('./pages/Work'),
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
const ProjectDetail = lazy(pages.project)
const News = lazy(pages.news)
const NewsDetail = lazy(pages.article)
const Contact = lazy(pages.contact)
const NotFound = lazy(pages.notFound)

const workThumbs = projects.slice(0, 8).map((p) => p.cover)

function footerCta(pathname: string): FooterCtaProps {
  if (pathname.startsWith('/work/')) {
    const next = nextProject(pathname.split('/')[2] ?? '')
    return { words: 'Next up', to: `/work/${next.slug}`, imgs: [next.cover], kicker: `Proyek berikutnya — ${next.title}` }
  }
  if (pathname === '/work') {
    return { words: 'Start a project', to: '/contact#start', imgs: ['labarka-path', 'hmw-dining', 'cantrik-lounge', 'klinik-waiting'] }
  }
  return { words: 'See work', to: '/work', imgs: workThumbs }
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
        Langsung ke konten
      </a>
      <Header menuOpen={menuOpen} onToggleMenu={toggleMenu} />
      <Menu open={menuOpen} onClose={closeMenu} />
      <Suspense fallback={<div className="page-fallback" />}>
        <Routes location={location} key={`page:${location.pathname}`}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/studio" element={<Navigate to="/about" replace />} />
          <Route path="/services" element={<Services />} />
          <Route path="/work" element={<Work />} />
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
