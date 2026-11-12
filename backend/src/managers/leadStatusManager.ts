/** leadStatusManager — pipeline stage configuration. */
import { badRequest, notFound } from '../middleware/errors.ts'
import { leadStatusRepository } from '../repositories/leadStatusRepository.ts'
import { socketService } from '../services/socketService.ts'
import type { LeadStatusRow } from '../types/index.ts'

export interface StatusDto { id: string; name: string; color: string; sortOrder: number; isWon: boolean; isLost: boolean; isDefault: boolean; leadCount?: number }

export const leadStatusManager = {
  toDto(s: LeadStatusRow): StatusDto { return { id: s.id, name: s.name, color: s.color, sortOrder: s.sort_order, isWon: !!s.is_won, isLost: !!s.is_lost, isDefault: !!s.is_default } },
  list() { return leadStatusRepository.list().map((s) => ({ ...this.toDto(s), leadCount: leadStatusRepository.countLeads(s.id) })) },
  create(d: { name: string; color: string; isWon?: boolean; isLost?: boolean; isDefault?: boolean }) {
    const s = leadStatusRepository.create(d); socketService.toAll('lead:updated', { type: 'statuses' }); return this.toDto(s)
  },
  update(id: string, d: { name?: string; color?: string; isWon?: boolean; isLost?: boolean; isDefault?: boolean }) {
    if (!leadStatusRepository.byId(id)) throw notFound('Status not found')
    const s = leadStatusRepository.update(id, d); socketService.toAll('lead:updated', { type: 'statuses' }); return this.toDto(s)
  },
  reorder(ids: string[]) { leadStatusRepository.reorder(ids); socketService.toAll('lead:updated', { type: 'statuses' }); return this.list() },
  delete(id: string, moveTo: string | null) {
    if (!leadStatusRepository.byId(id)) throw notFound('Status not found')
    if (leadStatusRepository.list().length <= 1) throw badRequest('At least one status is required')
    if (moveTo && !leadStatusRepository.byId(moveTo)) throw badRequest('Target status not found')
    leadStatusRepository.delete(id, moveTo); socketService.toAll('lead:updated', { type: 'statuses' })
  },
  ensureDefaults() {
    if (leadStatusRepository.list().length) return
    const defaults = [
      { name: 'New', color: '#64748b', isDefault: true }, { name: 'Contacted', color: '#2563eb' }, { name: 'Qualified', color: '#7c3aed' },
      { name: 'Proposal', color: '#d97706' }, { name: 'Won', color: '#059669', isWon: true }, { name: 'Lost', color: '#dc2626', isLost: true },
    ]
    defaults.forEach((d) => leadStatusRepository.create(d))
  },
}
