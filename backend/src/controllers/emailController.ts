/** emailController — threads, messages, send, sync, link. */
import type { Request, Response } from 'express'
import { emailManager } from '../managers/emailManager.ts'
import { requireUser } from '../middleware/authorize.ts'

export const emailController = {
  async threads(req: Request, res: Response) {
    const q = req.query as Record<string, string | undefined>
    // Tabs: inbox (default: has inbound mail, by arrival time, not archived) · threads (all conversations, by latest message either way, not archived) · sent (has outbound, any archive state) · unread · unlinked · archived · all (both).
    const f = q.filter ?? 'inbox'
    res.json(emailManager.listThreads(requireUser(req), { q: q.q, unread: f === 'unread', unlinked: f === 'unlinked', sent: f === 'sent', inbound: f === 'inbox', sort: f === 'inbox' ? 'in' : f === 'sent' ? 'out' : f === 'threads' ? 'any' : undefined, archived: f === 'archived' ? true : f === 'all' || f === 'sent' ? 'all' : false, leadId: q.leadId, companyId: q.companyId, before: q.before || undefined, limit: Math.min(100, Math.max(1, Number(q.limit) || 40)) }))
  },
  async thread(req: Request, res: Response) { res.json(await emailManager.getThread(requireUser(req), req.params.id as string)) },
  async messageHtml(req: Request, res: Response) { res.json(emailManager.messageHtml(requireUser(req), req.params.id as string)) },
  async markRead(req: Request, res: Response) { res.json(emailManager.markRead(requireUser(req), req.params.id as string)) },
  async unread(req: Request, res: Response) { res.json({ unread: emailManager.unreadCount(requireUser(req)) }) },
  async send(req: Request, res: Response) { res.json(await emailManager.send(requireUser(req).id, req.body)) },
  async reply(req: Request, res: Response) { res.json(await emailManager.send(requireUser(req).id, { ...req.body, threadId: req.params.id as string })) },
  async link(req: Request, res: Response) {
    const b = req.body as { leadId?: string | null; companyId?: string; companyName?: string }
    if (b.companyId || b.companyName) res.json(emailManager.linkThreadToCompany(requireUser(req), req.params.id as string, { companyId: b.companyId, companyName: b.companyName }))
    else res.json(emailManager.linkThread(req.params.id as string, b.leadId ?? null, requireUser(req).id))
  },
  /** Mark the thread's peer as a supplier contact (flags or creates the company). */
  async setSupplier(req: Request, res: Response) { res.json(emailManager.setSupplier(requireUser(req), req.params.id as string, req.body as { companyId?: string; companyName?: string })) },
  async remove(req: Request, res: Response) { await emailManager.deleteThread(requireUser(req), req.params.id as string); res.json({ ok: true }) },
  async convert(req: Request, res: Response) { res.json(emailManager.convertToLead(requireUser(req), req.params.id as string)) },
  async archive(req: Request, res: Response) { res.json(await emailManager.setArchived(requireUser(req), req.params.id as string, (req.body as { archived: boolean }).archived)) },
  async sync(req: Request, res: Response) { res.json(await emailManager.syncUser(requireUser(req).id)) },
  async syncOlder(req: Request, res: Response) { res.json(await emailManager.syncOlder(requireUser(req).id)) },
}
