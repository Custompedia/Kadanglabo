import { useState } from 'react'
import { Button, Dialog } from '@cloudflare/kumo'
import type { Blocker } from 'react-router'

type Editor = {
  blocker: Blocker
  isNew: boolean
  meta: { state: string } | null
  save: (opts?: { quiet?: boolean }) => Promise<boolean>
  publish: () => Promise<boolean>
}

/**
 * Leaving an editor with unsaved changes: stay, discard them, save them as a draft, or save and put them live.
 * A new, never-saved item can only be kept by staying (its Save button creates it).
 */
export function LeaveDialog({ editor }: { editor: Editor }) {
  const { blocker, isNew, meta } = editor
  const [busy, setBusy] = useState<'draft' | 'live' | null>(null)
  const open = blocker.state === 'blocked'
  const stay = () => blocker.state === 'blocked' && blocker.reset()
  const leave = () => blocker.state === 'blocked' && blocker.proceed()
  const run = async (kind: 'draft' | 'live') => {
    setBusy(kind)
    const ok = kind === 'draft' ? await editor.save() : await editor.publish()
    setBusy(null)
    if (ok) leave()
    else stay()
  }
  const live = meta?.state === 'published'

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && stay()} role="alertdialog">
      <Dialog size="xl" className="w-[min(600px,94vw)] max-w-none p-6">
        <Dialog.Title className="text-lg font-semibold text-kumo-strong">Ada perubahan yang belum disimpan</Dialog.Title>
        <Dialog.Description className="mt-1.5 text-sm text-kumo-subtle">
          {isNew ? 'Item baru ini belum pernah disimpan.' : live ? 'Website masih menampilkan versi sebelumnya.' : 'Simpan dulu atau buang perubahannya.'}
        </Dialog.Description>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={stay}>
            Tetap di sini
          </Button>
          <Button variant="secondary-destructive" onClick={leave}>
            Buang perubahan
          </Button>
          <span className="flex-1" />
          {!isNew && (
            <>
              <Button variant="secondary" loading={busy === 'draft'} disabled={!!busy} onClick={() => void run('draft')}>
                Simpan draft
              </Button>
              <Button variant="primary" loading={busy === 'live'} disabled={!!busy} onClick={() => void run('live')}>
                {live ? 'Simpan & perbarui website' : 'Simpan & tayangkan'}
              </Button>
            </>
          )}
        </div>
      </Dialog>
    </Dialog.Root>
  )
}
