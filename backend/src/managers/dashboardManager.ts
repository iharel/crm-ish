/** dashboardManager — KPIs and recent activity. */
import { draftRepository } from '../repositories/draftRepository.ts'
import { emailRepository } from '../repositories/emailRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { dealRepository } from '../repositories/dealRepository.ts'
import { leadStatusRepository } from '../repositories/leadStatusRepository.ts'
import { emailManager } from './emailManager.ts'
import { leadManager } from './leadManager.ts'

export const dashboardManager = {
  overview(user: { id: string; role: string }) {
    const statuses = leadStatusRepository.list()
    // The pipeline counts deals (a company with three leads counts once) plus leads without a company.
    const counts = dealRepository.countByStatus()
    const byStatus = statuses.map((s) => ({ id: s.id, name: s.name, color: s.color, isWon: !!s.is_won, isLost: !!s.is_lost, count: counts.find((c) => c.status_id === s.id)?.n ?? 0 }))
    const won = byStatus.filter((s) => s.isWon).reduce((a, s) => a + s.count, 0)
    const lost = byStatus.filter((s) => s.isLost).reduce((a, s) => a + s.count, 0)
    const open = byStatus.filter((s) => !s.isWon && !s.isLost).reduce((a, s) => a + s.count, 0)
    const since = new Date(Date.now() - 30 * 86400000).toISOString()
    const ids = emailManager.accountIdsFor(user.id, user.role)
    const unreadThreads = emailRepository.threads({ accountIds: ids, unread: true, limit: 8 }).map((t) => emailManager.threadDto(t))
    const drafts = draftRepository.stats(user.id, since)
    const leads = leadRepository.list({ hideSupplierOnly: true }).slice(0, 200)
    const hottest = [...leads].sort((a, b) => b.score - a.score).slice(0, 5).map((l) => leadManager.toDto(l))
    const newThisWeek = leads.filter((l) => l.created_at >= new Date(Date.now() - 7 * 86400000).toISOString()).length
    return {
      kpis: { openLeads: open, newThisWeek, winRate: won + lost ? Math.round((won / (won + lost)) * 100) : 0, awaitingReply: unreadThreads.length, draftsReady: unreadThreads.filter((t) => t.hasDraft).length, draftAcceptance: drafts.total ? Math.round(((drafts.sent ?? 0) / drafts.total) * 100) : 0 },
      byStatus, unreadThreads, hottest,
      activity: leadRepository.recentActivities(12).map((a) => ({ ...leadManager.activityDto(a), leadName: a.lead_name })),
    }
  },
}
