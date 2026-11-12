/** taskController — tasks list/create/update/delete and AI suggestion. */
import type { Request, Response } from 'express'
import { taskManager } from '../managers/taskManager.ts'
import { requireUser } from '../middleware/authorize.ts'

export const taskController = {
  async list(req: Request, res: Response) {
    const q = req.query as Record<string, string | undefined>
    const status = q.status === 'done' || q.status === 'all' ? q.status : 'open'
    res.json(taskManager.list(requireUser(req), { status, leadId: q.leadId, companyId: q.companyId, threadId: q.threadId, dueBefore: q.dueBefore }))
  },
  async openCount(req: Request, res: Response) { const q = req.query as Record<string, string | undefined>; res.json({ open: taskManager.openCount(requireUser(req), { threadId: q.threadId, leadId: q.leadId, companyId: q.companyId }) }) },
  async create(req: Request, res: Response) { res.json(taskManager.create(requireUser(req), req.body)) },
  async update(req: Request, res: Response) { res.json(taskManager.update(requireUser(req), req.params.id as string, req.body)) },
  async remove(req: Request, res: Response) { taskManager.delete(requireUser(req), req.params.id as string); res.json({ ok: true }) },
  async suggest(req: Request, res: Response) { res.json(await taskManager.suggest(requireUser(req), (req.body as { threadId: string }).threadId)) },
}
