import { Suspense, useEffect } from 'react'
import { lazyPage } from './lib/lazy'
import { Navigate, Route, Routes } from 'react-router'
import { Loader } from '@cloudflare/kumo'
import { useSession } from './lib/session'
import { Login } from './pages/Login'
import { Shell } from './layout/Shell'
import { Overview } from './pages/Overview'
import { ContentList } from './pages/ContentList'

// the editors carry Tiptap and drag-and-drop: loaded when first opened
const pages = {
  project: () => import('./pages/ProjectEditor'),
  article: () => import('./pages/ArticleEditor'),
  media: () => import('./pages/Media'),
  users: () => import('./pages/Users'),
  profile: () => import('./pages/Profile'),
  pages: () => import('./pages/WorkSettings'),
  locations: () => import('./pages/Locations'),
}
const ProjectEditor = lazyPage(pages.project)
const ArticleEditor = lazyPage(pages.article)
const Media = lazyPage(pages.media)
const Users = lazyPage(pages.users)
const Profile = lazyPage(pages.profile)
const WorkSettings = lazyPage(pages.pages)
const Locations = lazyPage(pages.locations)

/** Once signed in, fetch the other pages while the browser has nothing else to do, so opening them is instant. */
function usePrefetchPages(on: boolean) {
  useEffect(() => {
    if (!on) return
    const run = () => Object.values(pages).forEach((load) => void load().catch(() => {}))
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1))
    const id = setTimeout(() => idle(run, { timeout: 4000 }), 800)
    return () => clearTimeout(id)
  }, [on])
}

export function App() {
  const { user } = useSession()
  usePrefetchPages(!!user)
  if (user === undefined) return <Splash />
  if (user === null) return <Login />
  return (
    <Shell>
      <Suspense fallback={<Splash inline />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/projects" element={<ContentList kind="project" />} />
          <Route path="/projects/:id" element={<ProjectEditor />} />
          <Route path="/articles" element={<ContentList kind="article" />} />
          <Route path="/articles/:id" element={<ArticleEditor />} />
          <Route path="/media" element={<Media />} />
          <Route path="/pages" element={<Navigate to="/pages/work" replace />} />
          <Route path="/pages/:view" element={<WorkSettings />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/users" element={user.role === 'admin' ? <Users /> : <Navigate to="/" replace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}

function Splash({ inline }: { inline?: boolean }) {
  return (
    <div className={`grid place-items-center ${inline ? 'py-32' : 'h-full'}`}>
      <Loader size="lg" />
    </div>
  )
}
