/** dealController — a company's deals: split, edit, assign leads, delete. */
import type { Request, Response } from 'express'
import { dealManager, type DealInput } from '../managers/dealManager.ts'
import { logoFor } from '../managers/companyManager.ts'
import { requireUser } from '../middleware/authorize.ts'

export const dealController = {
  /** GET /deals — the deals view (deals that have leads). Query: q, statusId, ownerId, archived=true. */
  async list(req: Request, res: Response) {
    requireUser(req)
    const q = req.query as Record<string, string | undefined>
    res.json(dealManager.listAll({ q: q.q, statusId: q.statusId, ownerId: q.ownerId, archived: q.archived === 'true' }).map((d) => ({ ...d, companyLogoUrl: d.companyLogoUrl ?? logoFor(d.companyDomain) })))
  },
  /** POST /companies/:id/deals — add another deal to the company (split). */
  async create(req: Request, res: Response) { res.json(dealManager.create(req.params.id as string, req.body as DealInput & { name: string; leadIds?: string[] }, requireUser(req).id)) },
  async update(req: Request, res: Response) { res.json(dealManager.update(req.params.id as string, req.body as DealInput, requireUser(req).id)) },
  async setLeads(req: Request, res: Response) { requireUser(req); res.json(dealManager.setLeads(req.params.id as string, (req.body as { leadIds: string[] }).leadIds)) },
  async remove(req: Request, res: Response) { requireUser(req); dealManager.delete(req.params.id as string); res.json({ ok: true }) },
}
