import { useState, type FormEvent } from 'react'
import { useToasts } from '../components/Toaster'
import { Button, LayerCard } from '@cloudflare/kumo'
import { Page } from '../layout/Page'
import { api, ApiError } from '../lib/api'
import { useSession, type User } from '../lib/session'
import { TextField } from '../components/Fields'

/* Your own name, username and password. */
export default function Profile() {
  const { user, setUser, logout } = useSession()
  const toasts = useToasts()
  const [name, setName] = useState(user?.name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [pw, setPw] = useState({ current: '', next: '', again: '' })
  const [busy, setBusy] = useState<'name' | 'pw' | null>(null)
  const [pwError, setPwError] = useState('')

  async function saveName(e: FormEvent) {
    e.preventDefault()
    setBusy('name')
    try {
      const r = await api<{ user: User }>('/auth/profile', { method: 'PATCH', body: { name, username } })
      setUser(r.user)
      toasts.add({
        title: 'Akun disimpan',
        description: r.user.username !== user?.username ? `Mulai sekarang masuk dengan username “${r.user.username}”.` : undefined,
        variant: 'success',
      })
    } catch (err) {
      toasts.add({ title: 'Gagal', description: (err as ApiError).message, variant: 'error' })
    } finally {
      setBusy(null)
    }
  }

  async function savePw(e: FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pw.next !== pw.again) return setPwError('Password baru dan ulangannya tidak sama.')
    if (pw.next.length < 5) return setPwError('Password baru minimal 5 karakter.')
    setBusy('pw')
    try {
      await api('/auth/password', { body: { current: pw.current, next: pw.next } })
      setPw({ current: '', next: '', again: '' })
      toasts.add({ title: 'Password diganti', description: 'Perangkat lain yang memakai akun ini sudah dikeluarkan.', variant: 'success' })
    } catch (err) {
      setPwError((err as ApiError).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Page title="Profil" aside={false} description={`Masuk sebagai @${user?.username} · ${user?.role === 'admin' ? 'Admin' : 'Editor'}`} actions={<Button onClick={() => void logout()}>Keluar</Button>}>
      <div className="grid max-w-xl gap-6">
        <LayerCard className="p-0">
          <LayerCard.Secondary>Akun</LayerCard.Secondary>
          <LayerCard.Primary>
            <form onSubmit={saveName} className="grid gap-4">
              <TextField label="Nama tampilan" value={name} onChange={setName} hint="Nama yang tampil di dashboard." />
              <TextField
                label="Username"
                prefix="@"
                value={username}
                onChange={(v) => setUsername(v.toLowerCase().replace(/\s/g, ''))}
                hint="Dipakai untuk masuk. 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung."
              />
              <Button type="submit" variant="primary" className="justify-self-start" loading={busy === 'name'} disabled={!name.trim() || username.length < 3 || (name === user?.name && username === user?.username)}>
                Simpan
              </Button>
            </form>
          </LayerCard.Primary>
        </LayerCard>

        <LayerCard className="p-0">
          <LayerCard.Secondary>Ganti password</LayerCard.Secondary>
          <LayerCard.Primary>
            <form onSubmit={savePw} className="grid gap-4">
              <TextField label="Password saat ini" type="password" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} />
              <TextField label="Password baru" type="password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} hint="Minimal 5 karakter. Lebih panjang lebih aman." />
              <TextField label="Ulangi password baru" type="password" value={pw.again} onChange={(v) => setPw({ ...pw, again: v })} />
              {pwError && (
                <p role="alert" className="rounded-lg bg-kumo-danger-tint px-3 py-2 text-sm text-kumo-default">
                  {pwError}
                </p>
              )}
              <Button type="submit" variant="primary" className="justify-self-start" loading={busy === 'pw'} disabled={!pw.current || !pw.next}>
                Ganti password
              </Button>
            </form>
          </LayerCard.Primary>
        </LayerCard>
      </div>
    </Page>
  )
}
