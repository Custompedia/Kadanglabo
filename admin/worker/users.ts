import { Hono } from 'hono'
import { z } from 'zod'
import { hashPassword } from './crypto'
import { now, type AppEnv } from './env'
import { firstError, password, role, username } from './validate'
import { requireAdmin } from './auth'

/* Accounts, for admins only. There is no sign-up: every account is made here. */

export const users = new Hono<AppEnv>()
users.use('*', requireAdmin)

const COLS = 'id, username, name, role, failed_attempts, locked_at, disabled, last_login_at, created_at'

users.get('/', async (c) => {
  const { results } = await c.env.AUTH_DB.prepare(`SELECT ${COLS} FROM users ORDER BY created_at`).all()
  return c.json({ users: results })
})

users.post('/', async (c) => {
  const parsed = z.object({ username, name: z.string().trim().min(1, 'Nama wajib diisi').max(80), role, password }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const d = parsed.data
  const taken = await c.env.AUTH_DB.prepare('SELECT 1 FROM users WHERE username = ?').bind(d.username).first()
  if (taken) return c.json({ error: 'taken', message: `Username "${d.username}" sudah dipakai.` }, 409)
  const pw = await hashPassword(d.password)
  await c.env.AUTH_DB.prepare('INSERT INTO users (username, name, role, pw_hash, pw_salt, pw_iter) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(d.username, d.name, d.role, pw.hash, pw.salt, pw.iter).run()
  return c.json({ ok: true }, 201)
})

/** How many admins can still sign in, so the last one is never removed, demoted or locked out. */
const activeAdmins = (c: { env: AppEnv['Bindings'] }) =>
  c.env.AUTH_DB.prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND disabled = 0`).first<{ n: number }>().then((r) => r?.n ?? 0)

users.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const parsed = z.object({ name: z.string().trim().min(1).max(80).optional(), role: role.optional(), disabled: z.boolean().optional() }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const target = await c.env.AUTH_DB.prepare('SELECT id, username, role, disabled FROM users WHERE id = ?').bind(id).first<{ id: number; username: string; role: string; disabled: number }>()
  if (!target) return c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404)
  const d = parsed.data
  const losesAdmin = target.role === 'admin' && !target.disabled && ((d.role && d.role !== 'admin') || d.disabled)
  if (losesAdmin && (await activeAdmins(c)) <= 1) return c.json({ error: 'last_admin', message: 'Minimal harus ada satu admin aktif.' }, 400)
  if (id === c.get('user').id && (d.disabled || (d.role && d.role !== 'admin')))
    return c.json({ error: 'self', message: 'Kamu tidak bisa menonaktifkan atau menurunkan akunmu sendiri.' }, 400)

  const sets: string[] = []
  const vals: unknown[] = []
  if (d.name !== undefined) (sets.push('name = ?'), vals.push(d.name))
  if (d.role !== undefined) (sets.push('role = ?'), vals.push(d.role))
  if (d.disabled !== undefined) (sets.push('disabled = ?'), vals.push(d.disabled ? 1 : 0))
  if (!sets.length) return c.json({ ok: true })
  const stmts = [c.env.AUTH_DB.prepare(`UPDATE users SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).bind(...vals, now(), id)]
  if (d.disabled) stmts.push(c.env.AUTH_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id))
  await c.env.AUTH_DB.batch(stmts)
  return c.json({ ok: true })
})

/** A new password from the admin; also unlocks the account and signs it out everywhere. */
users.post('/:id/reset-password', async (c) => {
  const id = Number(c.req.param('id'))
  const parsed = z.object({ password }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const target = await c.env.AUTH_DB.prepare('SELECT username FROM users WHERE id = ?').bind(id).first<{ username: string }>()
  if (!target) return c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404)
  const pw = await hashPassword(parsed.data.password)
  await c.env.AUTH_DB.batch([
    c.env.AUTH_DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, failed_attempts = 0, locked_at = NULL, updated_at = ? WHERE id = ?')
      .bind(pw.hash, pw.salt, pw.iter, now(), id),
    c.env.AUTH_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
  ])
  return c.json({ ok: true })
})

users.post('/:id/unlock', async (c) => {
  const id = Number(c.req.param('id'))
  const target = await c.env.AUTH_DB.prepare('SELECT username FROM users WHERE id = ?').bind(id).first<{ username: string }>()
  if (!target) return c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404)
  await c.env.AUTH_DB.prepare('UPDATE users SET failed_attempts = 0, locked_at = NULL, updated_at = ? WHERE id = ?').bind(now(), id).run()
  return c.json({ ok: true })
})

users.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (id === c.get('user').id) return c.json({ error: 'self', message: 'Kamu tidak bisa menghapus akunmu sendiri.' }, 400)
  const target = await c.env.AUTH_DB.prepare('SELECT username, role, disabled FROM users WHERE id = ?').bind(id).first<{ username: string; role: string; disabled: number }>()
  if (!target) return c.json({ error: 'not_found', message: 'Pengguna tidak ditemukan.' }, 404)
  if (target.role === 'admin' && !target.disabled && (await activeAdmins(c)) <= 1)
    return c.json({ error: 'last_admin', message: 'Minimal harus ada satu admin aktif.' }, 400)
  await c.env.AUTH_DB.batch([
    c.env.AUTH_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
    c.env.AUTH_DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
  ])
  return c.json({ ok: true })
})
