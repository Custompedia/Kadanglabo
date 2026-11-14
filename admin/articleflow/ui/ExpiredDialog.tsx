import { Button, Dialog, LinkButton } from '@cloudflare/kumo'
import { LockSimple } from '@phosphor-icons/react'
import type { FlowStatus } from '../types'
import { longDate } from './flow'

/*
 * Shown when the page opens without a running subscription. Closing it leaves the locked page; it comes back on
 * the next visit. Articles that are already live are not touched by any of this.
 */
export function ExpiredDialog({ open, onClose, status }: { open: boolean; onClose: () => void; status: FlowStatus }) {
  const sub = status.status?.subscription
  const never = !sub || sub.state === 'NONE'
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()} role="alertdialog">
      <Dialog size="base" className="w-[min(460px,92vw)] p-6 sm:p-7">
        <span className="mb-4 grid size-11 place-items-center rounded-xl bg-[#fdeee7] text-[#d34614]">
          <LockSimple size={22} />
        </span>
        <Dialog.Title className="text-lg font-semibold text-kumo-strong">{never ? 'ArticleFlow belum aktif' : 'Masa langganan ArticleFlow sudah habis'}</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm leading-relaxed text-kumo-subtle">
          {never
            ? 'Belum ada langganan ArticleFlow untuk website ini. Hubungi tim Custompedia untuk mengaktifkannya.'
            : `Langganan${sub.totalDays ? ` ${sub.totalDays} hari` : ''} berakhir${sub.endsOn ? ` pada ${longDate(sub.endsOn)}` : ''}. Untuk membuka lagi analitik dan artikel baru, perpanjang lewat tim Custompedia.`}
        </Dialog.Description>
        <dl className="mt-5 divide-y divide-kumo-hairline rounded-lg text-sm ring-1 ring-kumo-hairline">
          <div className="flex items-baseline justify-between gap-4 px-3.5 py-2.5">
            <dt className="text-kumo-subtle">Artikel yang sudah tayang</dt>
            <dd className="text-right font-medium text-kumo-strong">Tetap tayang</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-3.5 py-2.5">
            <dt className="text-kumo-subtle">Analitik dan artikel baru</dt>
            <dd className="text-right font-medium text-kumo-strong">Terkunci</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Tutup</Button>
          {status.contactUrl ? (
            <LinkButton href={status.contactUrl} variant="primary" target="_blank" rel="noreferrer" className="max-md:min-h-11">Hubungi tim Custompedia</LinkButton>
          ) : (
            <LinkButton href="/articles" variant="primary" onClick={onClose} className="max-md:min-h-11">Buka menu Artikel</LinkButton>
          )}
        </div>
      </Dialog>
    </Dialog.Root>
  )
}
