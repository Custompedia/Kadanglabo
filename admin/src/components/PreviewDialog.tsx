import { useState } from 'react'
import { Dialog } from '@cloudflare/kumo'
import { ArrowSquareOut, DesktopTower, DeviceMobile, X } from '@phosphor-icons/react'

/*
 * Preview inside the dashboard: the website page, drawn by the website itself, but with this draft in place of the
 * live version. It works for drafts that were never published too; the link is private and expires after an hour.
 */
export function PreviewDialog({ url, onClose }: { url: string | null; onClose: () => void }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const tab = (d: typeof device, Icon: typeof DesktopTower, label: string) => (
    <button
      type="button"
      onClick={() => setDevice(d)}
      aria-pressed={device === d}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition ${device === d ? 'bg-kumo-base font-medium text-kumo-strong shadow-sm ring-1 ring-kumo-line' : 'text-kumo-subtle hover:text-kumo-strong'}`}
    >
      <Icon size={15} /> {label}
    </button>
  )

  return (
    <Dialog.Root open={!!url} onOpenChange={(o) => !o && onClose()}>
      <Dialog size="xl" className="flex h-[90dvh] max-h-[90dvh] w-[96vw] max-w-none flex-col overflow-hidden p-0 sm:max-h-[90dvh] sm:w-[min(1400px,96vw)]">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-kumo-line px-4 py-2.5">
          <Dialog.Title className="text-[15px] font-semibold text-kumo-strong">Preview</Dialog.Title>
          <span className="hidden text-xs text-kumo-subtle sm:inline">Versi draft, hanya terlihat di sini</span>
          <span className="flex-1" />
          <span className="flex gap-1 rounded-lg bg-kumo-recessed p-0.5 ring-1 ring-kumo-hairline">
            {tab('desktop', DesktopTower, 'Desktop')}
            {tab('mobile', DeviceMobile, 'HP')}
          </span>
          {url && (
            <a href={url} target="_blank" rel="noreferrer" title="Buka di tab baru" aria-label="Buka di tab baru" className="grid size-8 place-items-center rounded-lg text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-strong">
              <ArrowSquareOut size={16} />
            </a>
          )}
          <button type="button" onClick={onClose} aria-label="Tutup" className="grid size-8 place-items-center rounded-lg text-kumo-subtle transition hover:bg-kumo-tint hover:text-kumo-strong">
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 !shrink bg-kumo-recessed">
          {url && (
            <iframe
              key={url}
              src={url}
              title="Preview"
              className={`mx-auto block h-full bg-white transition-[width] ${device === 'mobile' ? 'w-[390px] max-w-full border-x border-kumo-line' : 'w-full'}`}
            />
          )}
        </div>
      </Dialog>
    </Dialog.Root>
  )
}
