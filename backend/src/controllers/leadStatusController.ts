/** leadStatusController — pipeline stage config (admin writes, all read). */
import type { Request, Response } from 'express'
import { leadStatusManager } from '../managers/leadStatusManager.ts'

export const leadStatusController = {
  async list(_req: Request, res: Response) { res.json(leadStatusManager.list()) },
  async create(req: Request, res: Response) { res.json(leadStatusManager.create(req.body)) },
  async update(req: Request, res: Response) { res.json(leadStatusManager.update(req.params.id as string, req.body)) },
  async reorder(req: Request, res: Response) { res.json(leadStatusManager.reorder((req.body as { ids: string[] }).ids)) },
  async remove(req: Request, res: Response) { leadStatusManager.delete(req.params.id as string, (req.query.moveTo as string) || null); res.json({ ok: true }) },
}
