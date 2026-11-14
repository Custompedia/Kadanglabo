import type { Env } from '../../worker/env'

/*
 * The only place that talks to Custompedia Tech (Partner API, cms-partner/v1). The key stays in the Worker: the
 * dashboard never sees it. Every call has a deadline and never throws; the caller gets a plain result to act on.
 */

export type FlowBindings = Env & { TECH_API_URL?: string; TECH_SITE_ID?: string; TECH_PARTNER_KEY?: string; ARTICLEFLOW_CONTACT_URL?: string }

const TIMEOUT = 8000
const MEDIA_TIMEOUT = 20000

export const configured = (env: FlowBindings) => !!(env.TECH_API_URL?.trim() && env.TECH_SITE_ID?.trim() && env.TECH_PARTNER_KEY?.trim())

const base = (env: FlowBindings) => `${env.TECH_API_URL!.trim().replace(/\/+$/, '')}/v2/sites/${encodeURIComponent(env.TECH_SITE_ID!.trim())}/partner`

export type TechFailure = {
  ok: false
  /** null = no answer at all (network, timeout): the outcome of a write is unknown */
  status: number | null
  code: string
  reasons?: string[]
}
export type TechResult<T> = { ok: true; status: number; data: T } | TechFailure

export async function tech<T>(env: FlowBindings, path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<TechResult<T>> {
  if (!configured(env)) return { ok: false, status: null, code: 'NOT_CONFIGURED' }
  let res: Response
  try {
    res = await fetch(base(env) + path, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: { 'x-cms-partner-key': env.TECH_PARTNER_KEY!.trim(), accept: 'application/json', ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT),
    })
  } catch {
    return { ok: false, status: null, code: 'UNREACHABLE' }
  }
  if (res.status === 204) return { ok: true, status: 204, data: null as T }
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    /* not JSON */
  }
  if (res.ok) {
    if (data === null || typeof data !== 'object') return { ok: false, status: res.status, code: 'BAD_RESPONSE' }
    return { ok: true, status: res.status, data: data as T }
  }
  const body = (data ?? {}) as { error?: unknown; reasons?: unknown }
  return {
    ok: false,
    status: res.status,
    code: typeof body.error === 'string' && body.error ? body.error : `HTTP_${res.status}`,
    ...(Array.isArray(body.reasons) ? { reasons: body.reasons.filter((r): r is string => typeof r === 'string').slice(0, 10) } : {}),
  }
}

/** One draft image from Tech (the largest rendition), or null when it cannot be read. */
export async function techMedia(env: FlowBindings, groupId: string, assetId: string): Promise<Response | null> {
  if (!configured(env)) return null
  try {
    const res = await fetch(`${base(env)}/articles/${encodeURIComponent(groupId)}/media/${encodeURIComponent(assetId)}`, {
      headers: { 'x-cms-partner-key': env.TECH_PARTNER_KEY!.trim() },
      signal: AbortSignal.timeout(MEDIA_TIMEOUT),
    })
    const type = res.headers.get('content-type') ?? ''
    return res.ok && /^image\/(webp|jpeg|png)/.test(type) ? res : null
  } catch {
    return null
  }
}

/** A failure in the words the dashboard shows. */
export function failureMessage(f: TechFailure): string {
  switch (f.code) {
    case 'NOT_CONFIGURED':
      return 'ArticleFlow belum terhubung ke Custompedia Tech.'
    case 'UNREACHABLE':
      return 'Custompedia Tech tidak bisa dihubungi. Coba lagi sebentar lagi.'
    case 'UNAUTHORIZED':
      return 'Kunci ArticleFlow ditolak. Hubungi tim Custompedia.'
    case 'SUBSCRIPTION_EXPIRED':
      return 'Masa langganan ArticleFlow sudah habis.'
    case 'NOT_FOUND':
      return 'Artikel ini sudah tidak ada di Custompedia Tech.'
    case 'CHANGED':
      return 'Artikel ini baru saja diperbarui tim Tech. Muat ulang lalu periksa lagi.'
    case 'PUBLISH_REFUSED':
      return publishRefused(f.reasons ?? [])
    case 'RATE_LIMITED':
      return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.'
    case 'INVALID_INPUT':
      return 'Permintaan ditolak Tech. Muat ulang halaman lalu coba lagi.'
    default:
      return 'Custompedia Tech sedang bermasalah. Coba lagi sebentar lagi.'
  }
}

const REASONS: Record<string, string> = {
  HERO_REQUIRED: 'foto banner belum ada',
  CLIENT_APPROVAL_REQUIRED: 'persetujuan belum tercatat',
  SITE_PAUSED: 'penerbitan sedang dijeda tim Tech',
  CHECKS_FAILED: 'pemeriksaan kualitas belum lolos',
}
const reasonLabel = (r: string) => REASONS[r] ?? r.toLowerCase().replaceAll('_', ' ')
/** Tech answers with whole Indonesian sentences (cms-partner/v1); a bare code from an older Tech is put into words here. */
function publishRefused(reasons: string[]): string {
  const sentences = reasons.filter((r) => /\s/.test(r.trim())).map((r) => r.trim())
  if (sentences.length) return `Artikel belum bisa tayang. ${sentences.join(' ')}`
  return `Tech belum mengizinkan artikel ini tayang${reasons.length ? `: ${reasons.map(reasonLabel).join(', ')}` : ''}.`
}
