/** draftController — AI drafts. */
import type { Request, Response } from 'express'
import { draftManager } from '../managers/draftManager.ts'
import { requireUser } from '../middleware/authorize.ts'

export const draftController = {
  async list(req: Request, res: Response) { const q = req.query as Record<string, string | undefined>; res.json(draftManager.list(requireUser(req).id, { threadId: q.threadId, leadId: q.leadId, status: q.status })) },
  async generate(req: Request, res: Response) { res.json(await draftManager.generate(requireUser(req).id, req.body)) },
  async update(req: Request, res: Response) { res.json(draftManager.update(requireUser(req).id, req.params.id as string, req.body)) },
  async dismiss(req: Request, res: Response) { res.json(draftManager.dismiss(requireUser(req).id, req.params.id as string)) },
  async send(req: Request, res: Response) { res.json(await draftManager.send(requireUser(req).id, req.params.id as string, req.body ?? {})) },
}
