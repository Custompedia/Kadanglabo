import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In development the CMS content and images come from the dashboard's dev server (cd admin && npm run dev), which
// serves the same /api/public and /media routes the site's Worker serves in production. Without it running, the
// site falls back to the content bundled in src/data.
const cms = process.env.CMS_DEV_URL ?? 'http://localhost:5180'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/public': { target: cms, changeOrigin: true },
      '/media': { target: cms, changeOrigin: true },
    },
  },
})
