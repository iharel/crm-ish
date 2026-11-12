/** knowledgeController — sources, upload, websites, search. */
import type { Request, Response } from 'express'
import { badRequest } from '../middleware/errors.ts'
import { knowledgeManager } from '../managers/knowledgeManager.ts'
import { requireUser } from '../middleware/authorize.ts'

export const knowledgeController = {
  async list(_req: Request, res: Response) { res.json({ sources: knowledgeManager.list(), stats: knowledgeManager.stats() }) },
  async upload(req: Request, res: Response) {
    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    if (!files.length) throw badRequest('No files uploaded')
    res.json(files.map((f) => knowledgeManager.addDocument(f, requireUser(req).id)))
  },
  async website(req: Request, res: Response) { const b = req.body as { url: string; crawl?: boolean; depth?: number }; res.json(knowledgeManager.addWebsite(b.url, { crawl: b.crawl ?? true, depth: b.depth ?? 2 }, requireUser(req).id)) },
  async reindex(req: Request, res: Response) { res.json(knowledgeManager.reindex(req.params.id as string)) },
  async remove(req: Request, res: Response) { await knowledgeManager.delete(req.params.id as string); res.json({ ok: true }) },
  async search(req: Request, res: Response) { res.json(await knowledgeManager.search((req.body as { query: string }).query)) },
}
