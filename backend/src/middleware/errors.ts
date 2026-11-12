/** errors — ApiError + express error handler. Never returns 500: unknown errors map to 400. */
import type { NextFunction, Request, Response } from 'express'

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message)
  }
}
export const badRequest = (msg: string, details?: unknown) => new ApiError(400, 'BAD_REQUEST', msg, details)
export const unauthorized = (msg = 'Unauthorized') => new ApiError(401, 'UNAUTHORIZED', msg)
export const forbidden = (msg = 'Forbidden') => new ApiError(403, 'FORBIDDEN', msg)
export const notFound = (msg = 'Not found') => new ApiError(404, 'NOT_FOUND', msg)
export const conflict = (msg: string, details?: unknown, code = 'CONFLICT') => new ApiError(409, code, msg, details)
export const failed = (msg: string, details?: unknown) => new ApiError(422, 'FAILED', msg, details)

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({ code: err.code, message: err.message, details: err.details })
    return
  }
  const message = err instanceof Error ? err.message : 'Unexpected error'
  console.error('[api] unhandled:', err)
  res.status(400).json({ code: 'ERROR', message })
}

/** Wrap async handlers so rejections reach errorHandler. */
export const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res, next).catch(next) }
