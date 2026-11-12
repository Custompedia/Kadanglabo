// Passwords: PBKDF2-SHA256 with a random salt (100k rounds, the most Workers' WebCrypto allows).
const ITER = 100_000
const enc = new TextEncoder()

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array, iter: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256)
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { hash: b64(await derive(password, salt, ITER)), salt: b64(salt), iter: ITER }
}

export async function verifyPassword(password: string, hash: string, salt: string, iter: number) {
  const got = new Uint8Array(await derive(password, unb64(salt), iter))
  const want = unb64(hash)
  if (got.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i] // constant time
  return diff === 0
}

/** A random token for a session cookie (the database keeps only its hash). */
export const newToken = () => b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!)

export async function sha256(s: string) {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(s)))
}

/** Same cost as a real check, so an unknown username answers as slowly as a known one. */
export const DUMMY = { hash: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', salt: 'AAAAAAAAAAAAAAAAAAAAAA==', iter: ITER }
