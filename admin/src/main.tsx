import { forwardRef, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Link, RouterProvider } from 'react-router'
import { LinkProvider, type LinkComponentProps } from '@cloudflare/kumo'
import { Toaster } from './components/Toaster'
import '@fontsource-variable/inter'
import './styles.css'
import { App } from './App'
import { SessionProvider } from './lib/session'
import { ErrorPage } from './pages/ErrorPage'

// Kumo's links (sidebar, link buttons) go through the router instead of reloading the page
const AppLink = forwardRef<HTMLAnchorElement, LinkComponentProps>(({ href, to, ...rest }, ref) =>
  (href ?? to ?? '').startsWith('http') ? <a ref={ref} href={href ?? to} {...rest} /> : <Link ref={ref} to={href ?? to ?? ''} {...rest} />,
)

// a data router, so editors can hold the user on the page while unsaved changes are written (useBlocker)
const router = createBrowserRouter([
  {
    path: '*',
    errorElement: <ErrorPage />,
    element: (
      <LinkProvider component={AppLink}>
        <Toaster>
          <SessionProvider>
            <App />
          </SessionProvider>
        </Toaster>
      </LinkProvider>
    ),
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
