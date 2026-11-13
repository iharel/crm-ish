/**
 * httpClient — the common HTTP layer. Adds the access token, refreshes it on 401,
 * and converts failures into HttpError. API modules build on top of this.
 */
import { CONSTANTS } from '../constants'
import { storageService } from '../services/storageService'

export class HttpError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) { super(message); this.status = status; this.code = code; this.details = details }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
let refreshing: Promise<string | null> | null = null
const onUnauthorized: Array<() => void> = []

async function refreshToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = fetch(`${CONSTANTS.API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(async (r) => { if (!r.ok) return null; const j = (await r.json()) as { accessToken: string }; storageService.setAccessToken(j.accessToken); return j.accessToken })
      .catch(() => null)
      .finally(() => { setTimeout(() => { refreshing = null }, 0) })
  }
  return refreshing
}

async function request<T>(method: Method, path: string, body?: unknown, opts: { retry?: boolean; formData?: FormData; headers?: Record<string, string>; bytes?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { ...opts.headers }
  const token = storageService.getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let payload: BodyInit | undefined
  if (opts.formData) payload = opts.formData
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }
  const res = await fetch(`${CONSTANTS.API_BASE}${path}`, { method, headers, body: payload, credentials: 'include' })
  if (res.status === 401 && opts.retry !== false && !path.startsWith('/auth/login')) {
    const fresh = await refreshToken()
    if (fresh) return request<T>(method, path, body, { ...opts, retry: false })
    storageService.setAccessToken(null)
    onUnauthorized.forEach((fn) => fn())
  }
  if (!res.ok) {
    let data: { code?: string; message?: string; details?: unknown } = {}
    try { data = await res.json() } catch { /* non-json */ }
    throw new HttpError(res.status, data.code ?? 'HTTP_ERROR', data.message ?? res.statusText, data.details)
  }
  if (res.status === 204) return undefined as T
  if (opts.bytes) return (await res.arrayBuffer()) as T
  return (await res.json()) as T
}

export const http = {
  get: <T>(path: string, headers?: Record<string, string>) => request<T>('GET', path, undefined, { headers }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>('POST', path, body, { headers }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) => request<T>('PUT', path, body, { headers }),
  /** Download a file's bytes (e.g. a PDF). */
  bytes: (path: string, headers?: Record<string, string>) => request<ArrayBuffer>('GET', path, undefined, { headers, bytes: true }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, undefined, { formData: form }),
  onUnauthorized(fn: () => void) { onUnauthorized.push(fn); return () => { const i = onUnauthorized.indexOf(fn); if (i >= 0) onUnauthorized.splice(i, 1) } },
  refresh: refreshToken,
}
