import { useState, type FormEvent } from 'react'
import { Button, Dialog, Select } from '@cloudflare/kumo'
import { Check, PencilSimple, Plus, Trash, X } from '@phosphor-icons/react'
import type { Tx } from '../../../shared/content'
import { api, type ApiError } from '../lib/api'
import { useFetch, mutate } from '../lib/useFetch'
import { useToasts } from './Toaster'
import { FieldShell } from './Fields'

/*
 * An article's topic, picked from one shared list (so nobody types "Proyek" in one article and "Projek" in the next).
 * The last options open a small window where topics are added, renamed (every article using it follows) or removed.
 */

type Topic = Tx & { usedBy: string[] }
const NONE = '__none__'
const ADD = '__add__'
const MANAGE = '__manage__'
const label = (t: Tx) => (t.en && t.en !== t.id ? `${t.id} · ${t.en}` : t.id || t.en)

export function TopicSelect({ value, onChange }: { value: Tx; onChange: (t: Tx) => void }) {
  const { data, reload } = useFetch<{ topics: Topic[] }>('/topics')
  const [open, setOpen] = useState<null | 'add' | 'manage'>(null)
  const topics = data?.topics ?? []
  const current = topics.find((t) => t.en.toLowerCase() === value.en.toLowerCase())
  const items: Record<string, string> = { [NONE]: 'Pilih topik' }
  for (const t of topics) items[t.en] = label(t)
  if (value.en && !current) items[value.en] = label(value)
  items[ADD] = '+ Tambah topik baru…'
  items[MANAGE] = 'Kelola topik…'

  return (
    <FieldShell
      label="Topik"
      hint="Dipakai untuk filter di halaman Artikel."
      right={
        <button type="button" onClick={() => setOpen('manage')} className="text-xs font-medium text-kumo-link hover:underline">
          Kelola
        </button>
      }
    >
      <Select
        aria-label="Topik"
        className="w-full"
        value={value.en || NONE}
        onValueChange={(v) => {
          if (v === ADD || v === MANAGE) return setOpen(v === ADD ? 'add' : 'manage')
          const t = topics.find((x) => x.en === v)
          if (t) onChange({ en: t.en, id: t.id })
        }}
        items={items}
      />
      <TopicDialog
        mode={open}
        topics={topics}
        onClose={() => setOpen(null)}
        onChanged={async (picked, renamed) => {
          await reload()
          mutate('/articles')
          if (picked) onChange(picked)
          else if (renamed && renamed.from.toLowerCase() === value.en.toLowerCase()) onChange(renamed.to)
        }}
      />
    </FieldShell>
  )
}

function TopicDialog({
  mode,
  topics,
  onClose,
  onChanged,
}: {
  mode: null | 'add' | 'manage'
  topics: Topic[]
  onClose: () => void
  onChanged: (picked?: Tx, renamed?: { from: string; to: Tx }) => Promise<void>
}) {
  const toasts = useToasts()
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Tx>({ en: '', id: '' })
  const [add, setAdd] = useState<Tx>({ en: '', id: '' })
  const [busy, setBusy] = useState(false)
  const fail = (e: unknown) => toasts.add({ title: 'Gagal', description: (e as ApiError).message, variant: 'error' })

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const t = { id: add.id.trim(), en: add.en.trim() || add.id.trim() }
      await api('/topics', { body: t })
      setAdd({ en: '', id: '' })
      toasts.add({ title: 'Topik ditambahkan', description: t.id, variant: 'success' })
      await onChanged(mode === 'add' ? t : undefined)
      if (mode === 'add') onClose()
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  async function rename(from: Topic) {
    setBusy(true)
    try {
      const to = { id: form.id.trim(), en: form.en.trim() || form.id.trim() }
      await api('/topics', { method: 'PATCH', body: { from: from.en, ...to } })
      setEditing(null)
      toasts.add({ title: 'Topik diubah', description: from.usedBy.length ? `${from.usedBy.length} artikel ikut memakai nama baru.` : undefined, variant: 'success' })
      await onChanged(undefined, { from: from.en, to })
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  async function remove(t: Topic) {
    setBusy(true)
    try {
      await api(`/topics?en=${encodeURIComponent(t.en)}`, { method: 'DELETE' })
      toasts.add({ title: 'Topik dihapus', description: t.id, variant: 'success' })
      await onChanged()
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const input = 'h-9 w-full min-w-0 rounded-lg bg-kumo-base px-3 text-sm ring-1 ring-kumo-line outline-none focus:ring-[1.5px] focus:ring-kumo-focus/60'

  return (
    <Dialog.Root open={!!mode} onOpenChange={(o) => !o && (setEditing(null), onClose())}>
      <Dialog size="lg" className="w-[min(560px,94vw)] max-w-none p-6">
        <Dialog.Title className="text-lg font-semibold text-kumo-strong">{mode === 'add' ? 'Topik baru' : 'Kelola topik'}</Dialog.Title>
        <Dialog.Description className="mt-1 text-sm text-kumo-subtle">Ubah nama topik, dan semua artikel yang memakainya ikut berubah.</Dialog.Description>

        {mode === 'manage' && (
          <ul className="mt-5 max-h-[50vh] divide-y divide-kumo-hairline overflow-y-auto rounded-xl ring-1 ring-kumo-line !shrink">
            {topics.length === 0 && <li className="px-4 py-6 text-center text-sm text-kumo-subtle">Belum ada topik.</li>}
            {topics.map((t) =>
              editing === t.en ? (
                <li key={t.en} className="grid gap-2 px-4 py-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className={input} value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="Nama (ID)" aria-label="Nama topik (ID)" autoFocus />
                    <input className={input} value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} placeholder="Nama (EN)" aria-label="Nama topik (EN)" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" icon={X} onClick={() => setEditing(null)}>
                      Batal
                    </Button>
                    <Button size="sm" variant="primary" icon={Check} loading={busy} disabled={form.id.trim().length < 2} onClick={() => void rename(t)}>
                      Simpan
                    </Button>
                  </div>
                </li>
              ) : (
                <li key={t.en} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-kumo-strong">{t.id}</span>
                    <span className="block truncate text-xs text-kumo-subtle">
                      EN: {t.en} · {t.usedBy.length ? `dipakai ${t.usedBy.length} artikel` : 'belum dipakai'}
                    </span>
                  </span>
                  <Button size="sm" variant="ghost" shape="square" aria-label={`Ubah ${t.id}`} title="Ubah" icon={<PencilSimple size={15} />} onClick={() => (setEditing(t.en), setForm({ en: t.en, id: t.id }))} />
                  <Button
                    size="sm"
                    variant="ghost"
                    shape="square"
                    aria-label={`Hapus ${t.id}`}
                    title={t.usedBy.length ? 'Masih dipakai artikel, tidak bisa dihapus' : 'Hapus'}
                    disabled={busy || t.usedBy.length > 0}
                    icon={<Trash size={15} />}
                    onClick={() => void remove(t)}
                  />
                </li>
              ),
            )}
          </ul>
        )}

        <form onSubmit={create} className={`grid gap-2 ${mode === 'manage' ? 'mt-5 border-t border-kumo-hairline pt-5' : 'mt-5'}`}>
          <p className="text-sm font-medium text-kumo-default">{mode === 'manage' ? 'Tambah topik' : 'Nama topik'}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={input} value={add.id} onChange={(e) => setAdd({ ...add, id: e.target.value })} placeholder="Bahasa Indonesia, mis. Proyek" aria-label="Nama topik baru (ID)" autoFocus={mode === 'add'} />
            <input className={input} value={add.en} onChange={(e) => setAdd({ ...add, en: e.target.value })} placeholder="English, mis. Project" aria-label="Nama topik baru (EN)" />
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {mode === 'add' ? 'Batal' : 'Selesai'}
            </Button>
            <Button type="submit" variant="primary" icon={Plus} loading={busy && !editing} disabled={add.id.trim().length < 2}>
              Tambah
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  )
}
