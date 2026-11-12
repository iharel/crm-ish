/** authorize — role-based authorization. */
import type { NextFunction, Request, Response } from 'express'
import { forbidden, unauthorized } from './errors.ts'
import type { Role } from '../types/index.ts'

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized())
    if (roles.length && !roles.includes(req.user.role)) return next(forbidden('Insufficient role'))
    next()
  }
}
export const requireUser = (req: Request) => {
  if (!req.user) throw unauthorized()
  return req.user
}
