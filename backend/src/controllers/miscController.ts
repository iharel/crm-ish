/** miscController — dashboard, notifications, tracking, settings, webhooks. */
import type { Request, Response } from 'express'
import { dashboardManager } from '../managers/dashboardManager.ts'
import { emailManager } from '../managers/emailManager.ts'
import { settingsManager } from '../managers/settingsManager.ts'
import { trackingManager } from '../managers/trackingManager.ts'
import { notificationRepository } from '../repositories/notificationRepository.ts'
import { googleRepository } from '../repositories/googleRepository.ts'
import { requireUser } from '../middleware/authorize.ts'
import { buildInfoService } from '../services/buildInfoService.ts'
import { CONSTANTS } from '../constants.ts'
import { cryptoService } from '../services/cryptoService.ts'
import { unauthorized } from '../middleware/errors.ts'

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export const miscController = {
  async version(req: Request, res: Response) { requireUser(req); res.json(buildInfoService.get()) },
  async dashboard(req: Request, res: Response) { res.json(dashboardManager.overview(requireUser(req))) },
  async notifications(req: Request, res: Response) { const u = requireUser(req); res.json({ items: notificationRepository.list(u.id), unread: notificationRepository.unreadCount(u.id) }) },
  async markRead(req: Request, res: Response) { notificationRepository.markRead(requireUser(req).id, req.params.id as string); res.json({ ok: true }) },
  async markAllRead(req: Request, res: Response) { notificationRepository.markAllRead(requireUser(req).id); res.json({ ok: true }) },
  async trackingOverview(req: Request, res: Response) { res.json(trackingManager.overview(requireUser(req), Number(req.query.days ?? 30))) },
  async pixel(req: Request, res: Response) {
    trackingManager.record(req.params.token as string, 'open', { ip: req.ip, userAgent: req.headers['user-agent'] })
    res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate, private', Pragma: 'no-cache', Expires: '0' }).send(GIF)
  },
  async click(req: Request, res: Response) {
    const url = typeof req.query.u === 'string' ? req.query.u : ''
    // Never an open redirect: the token must be a sent message and the target one of the links that message carries.
    if (!/^https?:\/\//.test(url) || !trackingManager.isTrackedLink(req.params.token as string, url)) { res.redirect(302, CONSTANTS.FRONTEND_URL); return }
    trackingManager.record(req.params.token as string, 'click', { ip: req.ip, userAgent: req.headers['user-agent'], url })
    res.redirect(302, url.replace(/&amp;/g, '&'))
  },
  async aiSettings(_req: Request, res: Response) { res.json(settingsManager.getAi()) },
  async saveAiSettings(req: Request, res: Response) { res.json(settingsManager.saveAi(req.body)) },
  async workspaceSettings(_req: Request, res: Response) { res.json(settingsManager.getWorkspace()) },
  async saveWorkspaceSettings(req: Request, res: Response) { res.json(settingsManager.saveWorkspace(req.body)) },
  async gmailWebhook(req: Request, res: Response) {
    // Pub/Sub push: { message: { data: base64 JSON { emailAddress, historyId } } }
    if (CONSTANTS.GMAIL_WEBHOOK_TOKEN && !cryptoService.safeEqual(String(req.query.token ?? ''), CONSTANTS.GMAIL_WEBHOOK_TOKEN)) throw unauthorized('Invalid webhook token')
    try {
      const data = req.body?.message?.data ? JSON.parse(Buffer.from(req.body.message.data, 'base64').toString('utf8')) as { emailAddress?: string } : null
      const acc = data?.emailAddress ? googleRepository.accountByEmail(data.emailAddress) : undefined
      if (acc) emailManager.syncAccount(acc).catch(() => undefined)
    } catch { /* ignore malformed */ }
    res.status(200).json({ ok: true })
  },
}
