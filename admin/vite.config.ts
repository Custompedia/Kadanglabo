import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// `npm run dev` runs the dashboard and its Worker together, with local D1 and R2 (.wrangler/state).
export default defineConfig({ plugins: [react(), tailwindcss(), cloudflare()] })
