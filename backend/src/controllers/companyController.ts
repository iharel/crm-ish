/** companyController — companies + enrichment. */
import type { Request, Response } from 'express'
import { companyManager } from '../managers/companyManager.ts'
import { enrichmentManager } from '../managers/enrichmentManager.ts'
import { leadManager } from '../managers/leadManager.ts'
import { dealManager } from '../managers/dealManager.ts'
import { emailManager } from '../managers/emailManager.ts'
import { requireUser } from '../middleware/authorize.ts'

export const companyController = {
  /** Who owns a domain (or a parent of it): { company: { id, name, domain } | null }. */
  async checkDomain(req: Request, res: Response) { res.json({ company: companyManager.ownerOfDomain(String(req.query.domain ?? '')) }) },
  /** Leads and threads that match this company's domain but are not linked to it yet. */
  async suggestions(req: Request, res: Response) {
    const id = req.params.id as string
    companyManager.get(id)
    res.json({ leads: companyManager.suggestedLeads(id).map((l) => leadManager.toDto(l)), threads: emailManager.suggestedThreadsForCompany(requireUser(req), id) })
  },
  /** Link the given suggested leads / threads to the company. */
  async acceptSuggestions(req: Request, res: Response) {
    const id = req.params.id as string; const user = requireUser(req)
    const b = req.body as { leadIds?: string[]; threadIds?: string[] }
    companyManager.get(id)
    let linked = 0
    for (const leadId of b.leadIds ?? []) { leadManager.update(leadId, { companyId: id }, user.id); linked++ }
    for (const threadId of b.threadIds ?? []) { emailManager.linkThreadToCompany(user, threadId, id); linked++ }
    res.json({ linked })
  },
  async list(req: Request, res: Response) { const kind = req.query.kind; res.json(companyManager.list(req.query.q as string | undefined, kind === 'supplier' || kind === 'company' ? kind : 'all')) },
  async get(req: Request, res: Response) {
    const id = req.params.id as string
    const company = companyManager.get(id)
    res.json({ company, deals: dealManager.listForCompany(id), leads: leadManager.list({ companyId: id }), threads: emailManager.listThreads(requireUser(req), { companyId: id }) })
  },
  async create(req: Request, res: Response) { res.json(companyManager.create(req.body, requireUser(req).id)) },
  async update(req: Request, res: Response) { res.json(companyManager.update(req.params.id as string, req.body)) },
  async remove(req: Request, res: Response) { companyManager.delete(req.params.id as string); res.json({ ok: true }) },
  async enrich(req: Request, res: Response) { res.json(await enrichmentManager.enrichCompany(req.params.id as string, requireUser(req).id)) },
}
