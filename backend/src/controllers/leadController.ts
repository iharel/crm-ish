/** leadController — leads, activities, enrichment. */
import type { Request, Response } from 'express'
import { enrichmentManager } from '../managers/enrichmentManager.ts'
import { leadManager } from '../managers/leadManager.ts'
import { draftManager } from '../managers/draftManager.ts'
import { calendarManager } from '../managers/calendarManager.ts'
import { emailManager } from '../managers/emailManager.ts'
import { requireUser } from '../middleware/authorize.ts'
import { badRequest } from '../middleware/errors.ts'
import { spreadsheetService } from '../services/spreadsheetService.ts'
import fs from 'node:fs/promises'

export const leadController = {
  async list(req: Request, res: Response) { const q = req.query as Record<string, string | undefined>; res.json(leadManager.list({ q: q.q, statusId: q.statusId, ownerId: q.ownerId, companyId: q.companyId, /* Supplier contacts in no deal are not in the pipeline; a company's own list shows them. */ hideSupplierOnly: !q.companyId, archived: q.archived === 'all' ? 'all' : q.archived === 'true' })) },
  async get(req: Request, res: Response) {
    const id = req.params.id as string; const user = requireUser(req)
    res.json({ lead: leadManager.get(id), activities: leadManager.activities(id), threads: emailManager.listThreads(user, { leadId: id }), drafts: draftManager.list(user.id, { leadId: id }), meetings: calendarManager.meetingsForLead(id) })
  },
  async create(req: Request, res: Response) { res.json(leadManager.create(req.body, requireUser(req).id)) },
  async update(req: Request, res: Response) { res.json(leadManager.update(req.params.id as string, req.body, requireUser(req).id)) },
  async move(req: Request, res: Response) { res.json(leadManager.move(req.params.id as string, (req.body as { statusId: string }).statusId, requireUser(req).id, (req.body as { dealId?: string }).dealId)) },
  async archive(req: Request, res: Response) { res.json(leadManager.setArchived(req.params.id as string, (req.body as { archived: boolean }).archived, requireUser(req).id)) },
  async remove(req: Request, res: Response) { leadManager.delete(req.params.id as string); res.json({ ok: true }) },
  async activities(req: Request, res: Response) { res.json(leadManager.activities(req.params.id as string)) },
  async addNote(req: Request, res: Response) { res.json(leadManager.addNote(req.params.id as string, requireUser(req).id, (req.body as { text: string }).text)) },
  /** POST /leads/import — multipart `file` (csv/tsv/xlsx). `?dryRun=true` previews without writing. */
  async importFile(req: Request, res: Response) {
    const file = req.file; if (!file) throw badRequest('No file uploaded')
    const dryRun = String(req.query.dryRun ?? '') === 'true'
    try {
      const { headers, rows } = await spreadsheetService.rowsFromFile(file.path, file.originalname)
      if (!rows.length) throw badRequest('The file has no data rows')
      if (rows.length > 5000) throw badRequest('Import at most 5000 rows per file')
      res.json(leadManager.importRows(headers, rows, requireUser(req).id, dryRun))
    } finally { await fs.unlink(file.path).catch(() => undefined) }
  },
  async enrich(req: Request, res: Response) { res.json(await enrichmentManager.enrichLead(req.params.id as string, requireUser(req).id)) },
}
