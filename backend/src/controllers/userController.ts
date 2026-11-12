/** userController — admin user CRUD. */
import type { Request, Response } from 'express'
import { userManager } from '../managers/userManager.ts'
import { requireUser } from '../middleware/authorize.ts'

export const userController = {
  async list(_req: Request, res: Response) { res.json(userManager.list()) },
  async create(req: Request, res: Response) { res.json(await userManager.create(req.body)) },
  async update(req: Request, res: Response) { res.json(userManager.update(requireUser(req).id, req.params.id as string, req.body)) },
  async resetPassword(req: Request, res: Response) { await userManager.resetPassword(req.params.id as string, (req.body as { password: string }).password); res.json({ ok: true }) },
  async remove(req: Request, res: Response) { userManager.delete(requireUser(req).id, req.params.id as string); res.json({ ok: true }) },
}
