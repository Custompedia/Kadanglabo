import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/mona-sans/wdth.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/newsreader'
import '@fontsource/tenor-sans/latin-400.css' // the logo's letterforms: the home hero name
import 'lenis/dist/lenis.css'
import './styles.css'
import { loadContent } from './lib/content'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

// the CMS content first (falls back to the bundled data within a few seconds), then the app, so every module that
// reads the content sees the published version
await loadContent()
const { default: App } = await import('./App')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
