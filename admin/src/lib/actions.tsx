import { api, ApiError } from './api'
import { useToasts } from '../components/Toaster'
import { mutate } from './useFetch'
import type { Kind } from './types'
import { useConfirm } from '../components/Confirm'
import { PreviewDialog } from '../components/PreviewDialog'
import { useState } from 'react'

/*
 * What can be done to a project or article, from its list row or from its editor, with the confirmations and
 * toasts that go with it. Each returns true when it went through.
 */
export function useContentActions(kind: Kind) {
  const toasts = useToasts()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const dialog = (
    <>
      {confirmDialog}
      <PreviewDialog url={previewUrl} onClose={() => setPreviewUrl(null)} />
    </>
  )
  const base = kind === 'project' ? '/projects' : '/articles'
  const noun = kind === 'project' ? 'Projek' : 'Artikel'

  const refresh = () => {
    mutate(base)
    mutate('/storage')
  }
  const fail = (e: unknown) => toasts.add({ title: 'Gagal', description: (e as ApiError).message, variant: 'error' })

  async function run(path: string, method: string, ok: { title: string; description?: string }) {
    try {
      const r = await api<Record<string, unknown>>(path, { method })
      toasts.add({ ...ok, variant: 'success' })
      refresh()
      return r
    } catch (e) {
      fail(e)
      return null
    }
  }

  return {
    dialog,
    publish: (id: number, title: string) => run(`${base}/${id}/publish`, 'POST', { title: `${noun} tayang`, description: `“${title}” sudah tampil di website.` }),

    takedown: async (id: number, title: string) =>
      (await confirm({ title: `Turunkan “${title}”?`, body: `${noun} ini akan hilang dari website, tapi tetap tersimpan di sini dan bisa ditayangkan lagi kapan saja.`, action: 'Turunkan' })) &&
      run(`${base}/${id}/takedown`, 'POST', { title: `${noun} diturunkan`, description: `“${title}” tidak lagi tampil di website.` }),

    trash: async (id: number, title: string, live: boolean) =>
      (await confirm({
        title: `Pindahkan “${title}” ke Trash?`,
        body: live ? `${noun} ini sedang tayang dan akan langsung hilang dari website. Dari Trash masih bisa dipulihkan.` : 'Dari Trash masih bisa dipulihkan.',
        action: 'Pindahkan ke Trash',
        danger: live,
      })) && run(`${base}/${id}/trash`, 'POST', { title: 'Dipindahkan ke Trash', description: `“${title}”` }),

    restore: (id: number, title: string) => run(`${base}/${id}/restore`, 'POST', { title: 'Dipulihkan', description: `“${title}” kembali sebagai draft.` }),

    remove: async (id: number, title: string) =>
      (await confirm({ title: `Hapus permanen “${title}”?`, body: 'Ini tidak bisa dibatalkan. Foto-fotonya tetap ada di Media.', action: 'Hapus permanen', danger: true })) &&
      run(`${base}/${id}`, 'DELETE', { title: 'Dihapus permanen', description: `“${title}”` }),

    duplicate: async (id: number) => {
      const r = await run(`${base}/${id}/duplicate`, 'POST', { title: 'Disalin', description: 'Salinan dibuat sebagai draft.' })
      return (r?.id as number | undefined) ?? null
    },

    /** Opens the draft in a window over the dashboard (the website page, showing this draft). */
    preview: async (id: number) => {
      try {
        const r = await api<{ url: string }>(`${base}/${id}/preview`, { method: 'POST' })
        setPreviewUrl(r.url)
      } catch (e) {
        fail(e)
      }
    },
  }
}
