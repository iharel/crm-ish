/** rateLimit — small in-memory fixed-window limiter (single process; no extra dependency). */
import type { NextFunction, Request, Response } from 'express'
import { ApiError } from './errors.ts'

interface Bucket { count: number; resetAt: number }

/**
 * Limit requests per key within a window. `keys` returns every bucket a request counts against (e.g. ip and
 * ip+email), each with its own cap. Answers 429 with Retry-After once any bucket is full.
 */
export function rateLimit(opts: { windowMs: number; keys: (req: Request) => { key: string; max: number }[] }) {
  const buckets = new Map<string, Bucket>()
  const sweep = setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k) }, opts.windowMs)
  sweep.unref()
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now()
    let retryAfter = 0
    for (const { key, max } of opts.keys(req)) {
      let b = buckets.get(key)
      if (!b || b.resetAt <= now) { b = { count: 0, resetAt: now + opts.windowMs }; buckets.set(key, b) }
      b.count += 1
      if (b.count > max) retryAfter = Math.max(retryAfter, Math.ceil((b.resetAt - now) / 1000))
    }
    if (retryAfter) { res.setHeader('Retry-After', String(retryAfter)); next(new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Try again in a few minutes.')); return }
    next()
  }
}
