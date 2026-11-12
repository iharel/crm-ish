/** validate — zod request validation for body/query/params. */
import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { badRequest } from './errors.ts'

export function validate(schemas: { body?: ZodType; query?: ZodType; params?: ZodType }) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const key of ['body', 'query', 'params'] as const) {
      const schema = schemas[key]
      if (!schema) continue
      const result = schema.safeParse(req[key])
      if (!result.success) {
        next(badRequest(`Invalid ${key}`, result.error.flatten()))
        return
      }
      if (key === 'body') req.body = result.data
      else Object.assign(req[key] as object, result.data as object)
    }
    next()
  }
}
