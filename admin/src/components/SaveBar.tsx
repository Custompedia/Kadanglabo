import { Button } from '@cloudflare/kumo'
import { CheckCircle, FloppyDisk, WarningCircle } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

/*
 * The save bar at the foot of a settings page: always in view while scrolling, it says whether there is anything to
 * save and holds Undo and Save, so the button is never hunted for at the top of a long page.
 */
export function SaveBar({ dirty, saving, onSave, onUndo, saved, action = 'Simpan & tayangkan' }: { dirty: boolean; saving: boolean; onSave: () => void; onUndo: () => void; saved?: ReactNode; action?: string }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-kumo-line bg-kumo-base/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      <div className="flex max-w-[960px] flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm" aria-live="polite">
          {dirty ? (
            <>
              <WarningCircle size={17} weight="fill" className="text-kumo-warning" />
              <span className="text-kumo-default">Ada perubahan yang belum disimpan</span>
            </>
          ) : (
            <>
              <CheckCircle size={17} className="text-kumo-success" />
              <span className="text-kumo-subtle">{saved ?? 'Semua perubahan sudah tersimpan'}</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={!dirty || saving} onClick={onUndo}>
            Batalkan
          </Button>
          <Button variant="primary" icon={FloppyDisk} loading={saving} disabled={!dirty} onClick={onSave}>
            {action}
          </Button>
        </div>
      </div>
    </div>
  )
}
