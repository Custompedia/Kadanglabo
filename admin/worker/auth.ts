import { Hono, type MiddlewareHandler } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { z } from 'zod'
import { DUMMY, hashPassword, newToken, sha256, verifyPassword } from './crypto'
import { now, type AppEnv, type Env, type SessionUser } from './env'
import { password, firstError, username } from './validate'

/*
 * Sign-in with username and password. Five wrong passwords lock the account until an admin unlocks it.
 * Sessions live 14 days in an HttpOnly, Secure, SameSite=Strict cookie; changes also need the X-Requested-With
 * header the dashboard sends (a form on another site cannot set it).
 */

export const COOKIE = 'kl_session'
export const MAX_ATTEMPTS = 5
const SESSION_DAYS = 14
const IP_WINDOW_MIN = 15
const IP_MAX_FAILURES = 30

type UserRow = SessionUser & { pw_hash: string; pw_salt: string; pw_iter: number; failed_attempts: number; locked_at: string | null; disabled: number }

/** The first account, made the first time anyone signs in to an empty database. */
async function bootstrap(env: Env) {
  const row = await env.AUTH_DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>()
  if (row && row.n > 0) return
  const pw = await hashPassword('12345')
  await env.AUTH_DB.prepare(
    `INSERT OR IGNORE INTO users (username, name, role, pw_hash, pw_salt, pw_iter) VALUES ('custompedia', 'Custompedia', 'admin', ?, ?, ?)`,
  ).bind(pw.hash, pw.salt, pw.iter).run()
}

export async function startSession(c: Parameters<MiddlewareHandler<AppEnv>>[0], userId: number) {
  const token = newToken()
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString()
  await c.env.AUTH_DB.prepare('INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256(token), userId, expires, c.req.header('cf-connecting-ip') ?? null, c.req.header('user-agent')?.slice(0, 300) ?? null)
    .run()
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Strict', path: '/', maxAge: SESSION_DAYS * 86400 })
}

/* ---- guards ---------------------------------------------------------------------------------------------------- */

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, COOKIE)
  if (!token) return c.json({ error: 'unauthorized', message: 'Silakan masuk.' }, 401)
  const user = await c.env.AUTH_DB.prepare(
    `SELECT u.id, u.username, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.expires_at > ? AND u.disabled = 0 AND u.locked_at IS NULL`,
  ).bind(await sha256(token), now()).first<SessionUser>()
  if (!user) {
    deleteCookie(c, COOKIE, { path: '/' })
    return c.json({ error: 'unauthorized', message: 'Sesi berakhir. Silakan masuk lagi.' }, 401)
  }
  c.set('user', user)
  await next()
}

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.get('user')?.role !== 'admin') return c.json({ error: 'forbidden', message: 'Hanya admin yang bisa melakukan ini.' }, 403)
  await next()
}

/** Changes must come from the dashboard itself. */
export const sameOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.header('x-requested-with') !== 'kadanglabo-admin')
    return c.json({ error: 'forbidden', message: 'Permintaan ditolak.' }, 403)
  await next()
}

/* ---- routes ---------------------------------------------------------------------------------------------------- */

export const auth = new Hono<AppEnv>()

auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const parsed = z.object({ username: z.string().trim().toLowerCase().min(1).max(64), password: z.string().min(1).max(200) }).safeParse(body)
  if (!parsed.success) return c.json({ error: 'invalid', message: 'Isi username dan password.' }, 400)
  const { username, password: pw } = parsed.data
  const ip = c.req.header('cf-connecting-ip') ?? 'local'
  const db = c.env.AUTH_DB

  const since = new Date(Date.now() - IP_WINDOW_MIN * 60e3).toISOString()
  const fromIp = await db.prepare('SELECT COUNT(*) AS n FROM login_failures WHERE ip = ? AND at > ?').bind(ip, since).first<{ n: number }>()
  if ((fromIp?.n ?? 0) >= IP_MAX_FAILURES)
    return c.json({ error: 'throttled', message: 'Terlalu banyak percobaan dari jaringan ini. Coba lagi dalam beberapa menit.' }, 429)

  await bootstrap(c.env)
  const user = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<UserRow>()
  const fail = () => db.prepare('INSERT INTO login_failures (ip) VALUES (?)').bind(ip).run()

  if (!user) {
    await verifyPassword(pw, DUMMY.hash, DUMMY.salt, DUMMY.iter)
    await fail()
    return c.json({ error: 'invalid', message: 'Username atau password salah.' }, 401)
  }
  if (user.disabled) return c.json({ error: 'disabled', message: 'Akun ini dinonaktifkan. Hubungi admin.' }, 403)
  if (user.locked_at)
    return c.json({ error: 'locked', message: 'Akun terkunci setelah 5 kali salah password. Hubungi admin untuk membukanya.' }, 423)

  if (!(await verifyPassword(pw, user.pw_hash, user.pw_salt, user.pw_iter))) {
    const attempts = user.failed_attempts + 1
    const locked = attempts >= MAX_ATTEMPTS
    await db.prepare('UPDATE users SET failed_attempts = ?, locked_at = ?, updated_at = ? WHERE id = ?')
      .bind(attempts, locked ? now() : null, now(), user.id).run()
    await fail()
    if (locked) {
      return c.json({ error: 'locked', message: 'Akun terkunci setelah 5 kali salah password. Hubungi admin untuk membukanya.' }, 423)
    }
    return c.json({ error: 'invalid', message: 'Username atau password salah.', remaining: MAX_ATTEMPTS - attempts }, 401)
  }

  await db.prepare('UPDATE users SET failed_attempts = 0, last_login_at = ?, updated_at = ? WHERE id = ?').bind(now(), now(), user.id).run()
  await startSession(c, user.id)
  return c.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } })
})

auth.post('/logout', async (c) => {
  const token = getCookie(c, COOKIE)
  if (token) await c.env.AUTH_DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run()
  deleteCookie(c, COOKIE, { path: '/' })
  return c.json({ ok: true })
})

/** Who is signed in (401 if nobody). */
auth.get('/me', requireUser, (c) => c.json({ user: c.get('user') }))

auth.post('/password', requireUser, async (c) => {
  const parsed = z.object({ current: z.string().min(1), next: password }).safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const me = c.get('user')
  const row = await c.env.AUTH_DB.prepare('SELECT pw_hash, pw_salt, pw_iter FROM users WHERE id = ?').bind(me.id).first<UserRow>()
  if (!row || !(await verifyPassword(parsed.data.current, row.pw_hash, row.pw_salt, row.pw_iter)))
    return c.json({ error: 'invalid', message: 'Password saat ini salah.' }, 400)
  const pw = await hashPassword(parsed.data.next)
  await c.env.AUTH_DB.batch([
    c.env.AUTH_DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, updated_at = ? WHERE id = ?').bind(pw.hash, pw.salt, pw.iter, now(), me.id),
    c.env.AUTH_DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(me.id), // sign out everywhere else
  ])
  await startSession(c, me.id)
  return c.json({ ok: true })
})

auth.patch('/profile', requireUser, async (c) => {
  const parsed = z
    .object({ name: z.string().trim().min(1, 'Nama wajib diisi').max(80).optional(), username: username.optional() })
    .safeParse(await c.req.json().catch(() => ({})))
  if (!parsed.success) return c.json({ error: 'invalid', message: firstError(parsed.error) }, 400)
  const me = c.get('user')
  const next = { ...me, ...Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)) }
  if (next.username !== me.username) {
    const taken = await c.env.AUTH_DB.prepare('SELECT 1 FROM users WHERE username = ? AND id != ?').bind(next.username, me.id).first()
    if (taken) return c.json({ error: 'taken', message: `Username "${next.username}" sudah dipakai.` }, 409)
  }
  await c.env.AUTH_DB.prepare('UPDATE users SET name = ?, username = ?, updated_at = ? WHERE id = ?').bind(next.name, next.username, now(), me.id).run()
  return c.json({ user: next })
})
