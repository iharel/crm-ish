/** attachmentController — serves email attachment bytes through signed urls (no bearer token: <img> tags cannot send one). */
import type { Request, Response } from 'express'
import { attachmentManager } from '../managers/attachmentManager.ts'
import { emailManager } from '../managers/emailManager.ts'

export const attachmentController = {
  async serve(req: Request, res: Response) {
    const q = req.query as { exp?: string; sig?: string; u?: string }
    await attachmentManager.serve(res, req.params.id as string, q, (userId) => emailManager.accountIdsFor(userId, 'member'))
  },
}
