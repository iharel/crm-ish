/** apiError — API-layer error (wraps HttpError and non-HTTP failures). */
import { HttpError } from '../http/httpClient'

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown
  constructor(message: string, code = 'API_ERROR', status = 0, details?: unknown) { super(message); this.code = code; this.status = status; this.details = details }
}
/** Run an API call and normalize errors to ApiError. */
export async function call<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn() } catch (e) {
    if (e instanceof HttpError) throw new ApiError(e.message, e.code, e.status, e.details)
    if (e instanceof ApiError) throw e
    throw new ApiError(e instanceof Error ? e.message : 'Network error', 'NETWORK')
  }
}
export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')
