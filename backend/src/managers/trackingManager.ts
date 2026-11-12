/** trackingManager — pixel opens, link clicks, stats. */
import { emailRepository } from '../repositories/emailRepository.ts'
import { googleRepository } from '../repositories/googleRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { notificationService } from '../services/notificationService.ts'
import { socketService } from '../services/socketService.ts'
import { emailManager } from './emailManager.ts'

const rank: Record<string, number> = { sent: 0, delivered: 1, opened: 2, clicked: 3, bounced: 9 }

export const trackingManager = {
  /** True when `url` is a click-tracked link of the outbound message behind `token` (see emailManager.send). */
  isTrackedLink(token: string, url: string): boolean {
    const msg = emailRepository.messageByToken(token)
    return !!msg?.body_html && msg.body_html.includes(`/t/c/${token}?u=${encodeURIComponent(url)}"`)
  },
  record(token: string, type: 'open' | 'click', meta: { ip?: string; userAgent?: string; url?: string }) {
    const msg = emailRepository.messageByToken(token); if (!msg) return
    const ev = emailRepository.addEvent(msg.id, type, meta)
    const next = type === 'open' ? 'opened' : 'clicked'
    if ((rank[msg.status] ?? 0) < rank[next]) emailRepository.updateMessage(msg.id, { status: next })
    const thread = emailRepository.threadById(msg.thread_id); if (!thread) return
    const account = googleRepository.accountById(thread.google_account_id); if (!account) return
    const lead = thread.lead_id ? leadRepository.byId(thread.lead_id) : undefined
    const who = lead ? `${lead.first_name} ${lead.last_name}`.trim() : (msg.to_json ? (JSON.parse(msg.to_json) as string[])[0] : 'Recipient')
    socketService.toUser(account.user_id, 'email:event', { messageId: msg.id, threadId: thread.id, type, createdAt: ev.created_at, url: meta.url ?? null, who })
    const firstOfType = emailRepository.events(msg.id).filter((e) => e.type === type).length === 1
    if (firstOfType) notificationService.notify(account.user_id, { type: 'tracking', title: type === 'open' ? `${who} opened your email` : `${who} clicked a link`, body: msg.subject ?? '', link: `/inbox/${thread.id}` })
  },
  overview(user: { id: string; role: string }, days = 30) {
    const ids = emailManager.accountIdsFor(user.id, user.role)
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const stats = emailRepository.outboundStats(ids, since)
    const messages = emailRepository.outboundMessages(ids, 50).map((m) => {
      const lead = m.lead_id ? leadRepository.byId(m.lead_id) : undefined
      return { id: m.id, threadId: m.thread_id, to: m.to_json ? (JSON.parse(m.to_json) as string[]) : [], leadId: m.lead_id, leadName: lead ? `${lead.first_name} ${lead.last_name}`.trim() : null, subject: m.subject, sentAt: m.sent_at, status: m.status, opens: m.opens, clicks: m.clicks }
    })
    const events = emailRepository.recentEvents(ids, 30).map((e) => {
      const lead = e.lead_id ? leadRepository.byId(e.lead_id) : undefined
      return { id: e.id, type: e.type, createdAt: e.created_at, url: e.url, userAgent: e.user_agent, subject: e.subject, who: lead ? `${lead.first_name} ${lead.last_name}`.trim() : (e.to_json ? (JSON.parse(e.to_json) as string[])[0] : null) }
    })
    return { stats, messages, events }
  },
}
