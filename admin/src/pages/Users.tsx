import { useState } from 'react'
import { useToasts } from '../components/Toaster'
import { Badge, Button, Dialog, DropdownMenu, LayerCard, Select } from '@cloudflare/kumo'
import { Avatar } from '../layout/Shell'
import { DotsThree, Key, LockKeyOpen, PencilSimple, Plus, Prohibit, Trash, UserPlus, CheckCircle } from '@phosphor-icons/react'
import { Page } from '../layout/Page'
import { api, ApiError } from '../lib/api'
import { useFetch } from '../lib/useFetch'
import { useSession } from '../lib/session'
import { ago } from '../lib/format'
import { useConfirm } from '../components/Confirm'
import { FieldShell, TextField } from '../components/Fields'

interface Account {
  id: number
  username: string
  name: string
  role: 'admin' | 'editor'
  failed_attempts: number
  locked_at: string | null
  disabled: number
  last_login_at: string | null
  created_at: string
}

/* Accounts (admins only): add, edit, reset a password, unlock after five wrong passwords, disable, delete. */
export default function Users() {
  const { user: me } = useSession()
  const { data, reload } = useFetch<{ users: Account[] }>('/users')
  const toasts = useToasts()
  const { confirm, dialog } = useConfirm()
  const [form, setForm] = useState<{ mode: 'new' } | { mode: 'edit'; user: Account } | { mode: 'reset'; user: Account } | null>(null)

  async function run(path: string, init: { method?: string; body?: unknown }, ok: string) {
    try {
      await api(path, init)
      toasts.add({ title: ok, variant: 'success' })
      void reload()
      return true
    } catch (e) {
      toasts.add({ title: 'Gagal', description: (e as ApiError).message, variant: 'error' })
      return false
    }
  }

  return (
    <Page
      title="Pengguna"
      aside={false}
      description="Semua akun dibuat di sini; tidak ada pendaftaran publik. Admin bisa mengelola pengguna, editor hanya mengelola konten."
      actions={
        <Button variant="primary" icon={UserPlus} onClick={() => setForm({ mode: 'new' })}>
          Tambah pengguna
        </Button>
      }
    >
      <LayerCard className="p-0">
        <LayerCard.Secondary className="flex items-center justify-between">
          <span>Semua akun</span>
          <span className="text-xs font-normal text-kumo-subtle">{data ? `${data.users.length} pengguna` : ''}</span>
        </LayerCard.Secondary>
        <LayerCard.Primary className="p-0">
          <ul className="divide-y divide-kumo-hairline">
            {(data?.users ?? []).map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-kumo-tint">
                <Avatar size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-kumo-strong">
                    {u.name} {u.id === me?.id && <span className="font-normal text-kumo-subtle">(kamu)</span>}
                  </span>
                  <span className="block truncate text-xs text-kumo-subtle">
                    @{u.username} · {u.role === 'admin' ? 'Admin' : 'Editor'} · {u.last_login_at ? `masuk ${ago(u.last_login_at)}` : 'belum pernah masuk'}
                  </span>
                </span>
                {u.disabled ? (
                  <Badge variant="neutral" appearance="dot">Nonaktif</Badge>
                ) : u.locked_at ? (
                  <Badge variant="warning" appearance="dot">Terkunci</Badge>
                ) : (
                  <Badge variant="success" appearance="dot">
                    Aktif{u.failed_attempts ? ` · ${u.failed_attempts}× salah` : ''}
                  </Badge>
                )}
                  <DropdownMenu>
                    <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" shape="square" aria-label="Pilihan" icon={<DotsThree weight="bold" size={18} />} />} />
                    <DropdownMenu.Content align="end" className="min-w-52">
                      <DropdownMenu.Item icon={PencilSimple} onClick={() => setForm({ mode: 'edit', user: u })}>
                        Ubah nama & peran
                      </DropdownMenu.Item>
                      <DropdownMenu.Item icon={Key} onClick={() => setForm({ mode: 'reset', user: u })}>
                        Reset password
                      </DropdownMenu.Item>
                      {u.locked_at && (
                        <DropdownMenu.Item icon={LockKeyOpen} onClick={() => void run(`/users/${u.id}/unlock`, { method: 'POST' }, `Akun @${u.username} dibuka`)}>
                          Buka kunci
                        </DropdownMenu.Item>
                      )}
                      {u.id !== me?.id && (
                        <>
                          <DropdownMenu.Separator />
                          {u.disabled ? (
                            <DropdownMenu.Item icon={CheckCircle} onClick={() => void run(`/users/${u.id}`, { method: 'PATCH', body: { disabled: false } }, `@${u.username} diaktifkan`)}>
                              Aktifkan
                            </DropdownMenu.Item>
                          ) : (
                            <DropdownMenu.Item
                              icon={Prohibit}
                              onClick={async () =>
                                (await confirm({ title: `Nonaktifkan @${u.username}?`, body: 'Akun tidak bisa masuk sampai diaktifkan lagi. Sesi yang sedang berjalan langsung berakhir.', action: 'Nonaktifkan' })) &&
                                run(`/users/${u.id}`, { method: 'PATCH', body: { disabled: true } }, `@${u.username} dinonaktifkan`)
                              }
                            >
                              Nonaktifkan
                            </DropdownMenu.Item>
                          )}
                          <DropdownMenu.Item
                            icon={Trash}
                            variant="danger"
                            onClick={async () =>
                              (await confirm({ title: `Hapus @${u.username}?`, body: 'Akun dihapus permanen. Konten yang pernah dibuatnya tetap ada.', action: 'Hapus akun', danger: true })) &&
                              run(`/users/${u.id}`, { method: 'DELETE' }, `@${u.username} dihapus`)
                            }
                          >
                            Hapus akun
                          </DropdownMenu.Item>
                        </>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu>
              </li>
            ))}
            {!data && <li className="px-5 py-10 text-center text-sm text-kumo-subtle">Memuat…</li>}
          </ul>
        </LayerCard.Primary>
      </LayerCard>
      <p className="mt-4 text-sm text-kumo-subtle">Akun terkunci otomatis setelah 5 kali salah password. Buka kunci atau reset passwordnya dari menu ⋯.</p>

      <UserForm state={form} onClose={() => setForm(null)} run={run} />
      {dialog}
    </Page>
  )
}

function UserForm({
  state,
  onClose,
  run,
}: {
  state: { mode: 'new' } | { mode: 'edit'; user: Account } | { mode: 'reset'; user: Account } | null
  onClose: () => void
  run: (path: string, init: { method?: string; body?: unknown }, ok: string) => Promise<boolean>
}) {
  const [v, setV] = useState({ username: '', name: '', role: 'editor', password: '' })
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState('')
  const k = state ? (state.mode === 'new' ? 'new' : `${state.mode}${state.user.id}`) : ''
  if (k !== key) {
    setKey(k)
    if (state) setV(state.mode === 'new' ? { username: '', name: '', role: 'editor', password: '' } : { username: state.user.username, name: state.user.name, role: state.user.role, password: '' })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!state) return
    setBusy(true)
    const ok =
      state.mode === 'new'
        ? await run('/users', { body: v }, `Akun @${v.username} dibuat`)
        : state.mode === 'edit'
          ? await run(`/users/${state.user.id}`, { method: 'PATCH', body: { name: v.name, role: v.role } }, 'Perubahan disimpan')
          : await run(`/users/${state.user.id}/reset-password`, { body: { password: v.password } }, `Password @${state.user.username} direset`)
    setBusy(false)
    if (ok) onClose()
  }

  const title = state?.mode === 'new' ? 'Tambah pengguna' : state?.mode === 'edit' ? `Ubah @${state.user.username}` : state ? `Reset password @${state.user.username}` : ''
  return (
    <Dialog.Root open={!!state} onOpenChange={(o) => !o && onClose()}>
      <Dialog size="xl" className="w-[min(640px,94vw)] max-w-none p-7">
        <Dialog.Title className="text-lg font-semibold text-kumo-strong">{title}</Dialog.Title>
        {state?.mode === 'reset' && <Dialog.Description className="mt-1 text-sm text-kumo-subtle">Akun juga dibuka kuncinya dan keluar dari semua perangkat. Sampaikan password baru ke pemiliknya.</Dialog.Description>}
        <form onSubmit={submit} className="mt-5 grid gap-5">
          {state?.mode !== 'reset' && (
            <div className="grid items-start gap-4 sm:grid-cols-2">
              {state?.mode === 'new' && <TextField label="Username" required prefix="@" value={v.username} placeholder="hadalabo" onChange={(x) => setV({ ...v, username: x.toLowerCase().replace(/\s/g, '') })} hint="Dipakai untuk masuk." />}
              <TextField label="Nama" required value={v.name} placeholder="Nama tampilan" onChange={(x) => setV({ ...v, name: x })} hint={state?.mode === 'new' ? 'Tampil di dashboard.' : undefined} />
              <FieldShell label="Peran" hint="Admin juga bisa mengelola pengguna.">
                <Select aria-label="Peran" className="w-full" value={v.role} onValueChange={(x) => setV({ ...v, role: String(x) })} items={{ editor: 'Editor', admin: 'Admin' }} />
              </FieldShell>
              {state?.mode === 'new' && <TextField label="Password awal" required value={v.password} onChange={(x) => setV({ ...v, password: x })} hint="Minimal 5 karakter." />}
            </div>
          )}
          {state?.mode === 'reset' && <TextField label="Password baru" required value={v.password} onChange={(x) => setV({ ...v, password: x })} hint="Minimal 5 karakter. Pemiliknya bisa mengganti lagi di Kelola akun." />}
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={busy} icon={state?.mode === 'new' ? Plus : undefined}>
              {state?.mode === 'new' ? 'Buat akun' : state?.mode === 'edit' ? 'Simpan' : 'Reset password'}
            </Button>
          </div>
        </form>
      </Dialog>
    </Dialog.Root>
  )
}
