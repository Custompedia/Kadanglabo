import { useRouteError } from 'react-router'
import { WarningCircle } from '@phosphor-icons/react'
import { isStaleChunk, reloadOnce } from '../lib/lazy'

/* Shown instead of the developer error screen when something breaks: a calm message and a way back. */
export function ErrorPage() {
  const error = useRouteError() as Error | undefined
  // an old copy of the app after a new version: reload into the new one instead of showing this page. While the
  // code is being changed in development, a page can trip over half-updated code the same way; reload then too.
  if ((isStaleChunk(error) || import.meta.env.DEV) && reloadOnce()) return null
  if (error) console.error(error)
  return (
    <main className="grid min-h-full place-items-center bg-kumo-canvas p-6">
      <div className="max-w-md rounded-2xl bg-kumo-base p-8 text-center ring-1 ring-kumo-line">
        <WarningCircle size={36} className="mx-auto text-kumo-subtle" />
        <h1 className="mt-3 text-lg font-semibold text-kumo-strong">Ada yang tidak beres</h1>
        <p className="mt-1.5 text-sm text-kumo-subtle">Halaman ini gagal dimuat. Perubahan yang sudah tersimpan tetap aman. Coba muat ulang halaman.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => location.reload()} className="rounded-lg bg-kumo-contrast px-4 py-2 text-sm font-medium text-kumo-inverse">
            Muat ulang
          </button>
          <a href="/" className="rounded-lg px-4 py-2 text-sm font-medium ring-1 ring-kumo-line hover:bg-kumo-tint">
            Ke Ringkasan
          </a>
        </div>
      </div>
    </main>
  )
}
