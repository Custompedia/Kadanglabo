/** A failed API call, carrying the server's own message (already in Indonesian, ready for a toast). */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public data: Record<string, unknown> = {},
  ) {
    super(message)
  }
}

/** Called when the session has ended, so the app can go back to the sign-in page. */
let onUnauthorized: () => void = () => {}
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn)

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const headers: Record<string, string> = { 'x-requested-with': 'kadanglabo-admin' }
  let body: BodyInit | undefined
  if (init.form) body = init.form
  else if (init.body !== undefined) {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(init.body)
  }
  let res: Response
  try {
    res = await fetch(`/api${path}`, { method: init.method ?? (body ? 'POST' : 'GET'), headers, body, credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, 'network', 'Tidak bisa terhubung ke server. Periksa koneksi internet.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) onUnauthorized()
    throw new ApiError(res.status, data.error ?? 'error', data.message ?? 'Terjadi kesalahan.', data)
  }
  return data as T
}

/** Upload with progress (fetch cannot report it yet). */
export function upload<T>(path: string, form: FormData, onProgress: (share: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api${path}`)
    xhr.setRequestHeader('x-requested-with', 'kadanglabo-admin')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
    xhr.onerror = () => reject(new ApiError(0, 'network', 'Upload terputus. Periksa koneksi internet.'))
    xhr.onload = () => {
      let data: Record<string, unknown> = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        /* not JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T)
      else {
        if (xhr.status === 401) onUnauthorized()
        reject(new ApiError(xhr.status, String(data.error ?? 'error'), String(data.message ?? 'Upload gagal.'), data))
      }
    }
    xhr.send(form)
  })
}
