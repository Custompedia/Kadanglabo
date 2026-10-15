import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/mona-sans/wdth.css'
import '@fontsource-variable/inter'
import '@fontsource-variable/newsreader'
import 'lenis/dist/lenis.css'
import './styles.css'
import App from './App'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
