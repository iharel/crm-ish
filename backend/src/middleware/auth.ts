/** auth — verifies the JWT access token and attaches req.user. */
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { CONSTANTS } from '../constants.ts'
import { unauthorized } from './errors.ts'
import type { AuthUser } from '../types/index.ts'

declare module 'express-serve-static-core' {
  interface Request { user?: AuthUser }
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = jwt.verify(token, CONSTANTS.JWT_SECRET) as AuthUser & { sub: string }
  return { id: payload.sub, email: payload.email, role: payload.role, name: payload.name }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  // Header only: a token in the query string would end up in access logs, browser history and Referer headers.
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) return next(unauthorized('Missing token'))
  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    next(unauthorized('Invalid or expired token'))
  }
}
