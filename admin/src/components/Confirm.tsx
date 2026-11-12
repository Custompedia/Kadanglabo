import { useState, type ReactNode } from 'react'
import { Button, Dialog } from '@cloudflare/kumo'

/*
 * A confirmation for anything that cannot be undone or takes something off the site.
 * Usage:  const confirm = useConfirm();  ...  if (await confirm({ title, body, action: 'Hapus', danger: true })) ...
 */

type Ask = { title: string; body?: ReactNode; action: string; danger?: boolean }

export function useConfirm() {
  const [ask, setAsk] = useState<(Ask & { resolve: (ok: boolean) => void }) | null>(null)
  const confirm = (a: Ask) => new Promise<boolean>((resolve) => setAsk({ ...a, resolve }))
  const close = (ok: boolean) => {
    ask?.resolve(ok)
    setAsk(null)
  }
  const dialog = (
    <Dialog.Root open={!!ask} onOpenChange={(o) => !o && close(false)} role={ask?.danger ? 'alertdialog' : 'dialog'}>
      <Dialog size="base" className="p-6">
        <Dialog.Title className="text-lg font-semibold text-kumo-strong">{ask?.title}</Dialog.Title>
        {ask?.body && <Dialog.Description className="mt-2 text-sm leading-relaxed text-kumo-subtle">{ask.body}</Dialog.Description>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => close(false)}>
            Batal
          </Button>
          <Button variant={ask?.danger ? 'destructive' : 'primary'} onClick={() => close(true)} autoFocus>
            {ask?.action}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  )
  return { confirm, dialog }
}
