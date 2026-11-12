/** leadManager — lead CRUD, status moves, activities, auto-create from inbound mail. */
import { badRequest, notFound } from '../middleware/errors.ts'
import { companyRepository } from '../repositories/companyRepository.ts'
import { leadRepository, type LeadFilter, type LeadPatch } from '../repositories/leadRepository.ts'
import { leadStatusRepository } from '../repositories/leadStatusRepository.ts'
import { userRepository } from '../repositories/userRepository.ts'
import { socketService } from '../services/socketService.ts'
import type { ActivityRow, LeadRow } from '../types/index.ts'
import { companyManager, type CompanySuggestion } from './companyManager.ts'
import { dealManager, type LeadDealDto, type PipelineIndex } from './dealManager.ts'
import type { SheetRow } from '../services/spreadsheetService.ts'

/** Column aliases accepted by the spreadsheet import (normalized snake_case headers). */
const IMPORT_COLUMNS: Record<string, string[]> = {
  firstName: ['first_name', 'firstname', 'first', 'given_name'],
  lastName: ['last_name', 'lastname', 'last', 'surname', 'family_name'],
  name: ['name', 'full_name', 'fullname', 'contact', 'contact_name', 'lead', 'lead_name'],
  email: ['email', 'e_mail', 'email_address', 'mail'],
  phone: ['phone', 'phone_number', 'mobile', 'tel', 'telephone'],
  title: ['title', 'job_title', 'position', 'role'],
  company: ['company', 'company_name', 'organization', 'organisation', 'account', 'employer'],
  website: ['website', 'company_website', 'domain', 'url'],
  source: ['source', 'lead_source', 'channel'],
  notes: ['notes', 'note', 'comments', 'comment', 'description'],
  linkedinUrl: ['linkedin', 'linkedin_url', 'linkedin_profile'],
  status: ['status', 'stage', 'pipeline_stage'],
}
export interface ImportMapping { [field: string]: string | null }
export interface ImportPreviewRow { row: number; firstName: string; lastName: string; email: string | null; company: string | null; title: string | null; action: 'create' | 'skip' | 'error'; reason?: string }
export interface ImportResult { mapping: ImportMapping; total: number; toCreate: number; toSkip: number; errors: number; preview: ImportPreviewRow[]; created?: number }

export interface LeadDto { id: string; firstName: string; lastName: string; name: string; email: string | null; phone: string | null; title: string | null; companyId: string | null; companyName: string | null; /** Pipeline status: the status of the lead's (first) deal, or its own when it has no company. */ statusId: string | null; /** The lead's deals in its company, default first; empty without a company. */ deals: LeadDealDto[]; /** Its company was split into more than one deal. */ multiDeal: boolean; /** Its company is a supplier. With no deals it is a supplier contact outside the pipeline. */ supplier: boolean; ownerId: string | null; ownerName: string | null; source: string | null; score: number; linkedinUrl: string | null; notes: string | null; enrichment: unknown; enrichedAt: string | null; lastActivityAt: string | null; archivedAt: string | null; createdAt: string; updatedAt: string; /** Company matching the lead's email domain when no company is linked. */ suggestedCompany: CompanySuggestion | null }
export interface LeadInput { /** With a company this moves the lead's deal; ignored when the company changes in the same call. */ statusId?: string | null; firstName?: string; lastName?: string; email?: string | null; phone?: string | null; title?: string | null; companyId?: string | null; ownerId?: string | null; source?: string | null; score?: number; linkedinUrl?: string | null; notes?: string | null }

export const leadManager = {
  toDto(l: LeadRow, index?: PipelineIndex): LeadDto {
    const pipeline = dealManager.pipelineOf(l, index)
    const c = l.company_id ? companyRepository.byId(l.company_id) : undefined
    const o = l.owner_id ? userRepository.byId(l.owner_id) : undefined
    return { id: l.id, firstName: l.first_name, lastName: l.last_name, name: `${l.first_name} ${l.last_name}`.trim(), email: l.email, phone: l.phone, title: l.title, companyId: l.company_id, companyName: c?.name ?? null, statusId: pipeline.statusId, deals: pipeline.deals, multiDeal: pipeline.multiDeal, supplier: !!c?.is_supplier, ownerId: l.owner_id, ownerName: o?.name ?? null, source: l.source, score: l.score, linkedinUrl: l.linkedin_url, notes: l.notes, enrichment: l.enrichment_json ? JSON.parse(l.enrichment_json) : null, enrichedAt: l.enriched_at, lastActivityAt: l.last_activity_at, archivedAt: l.archived_at ?? null, createdAt: l.created_at, updatedAt: l.updated_at, suggestedCompany: l.company_id ? null : companyManager.suggestForEmail(l.email) }
  },
  activityDto(a: ActivityRow) { const u = a.user_id ? userRepository.byId(a.user_id) : undefined; return { id: a.id, leadId: a.lead_id, userId: a.user_id, userName: u?.name ?? null, type: a.type, payload: a.payload_json ? JSON.parse(a.payload_json) : {}, createdAt: a.created_at } },
  /** `statusId` filters on the pipeline status: any of the lead's deals, or its own status without a company. */
  list(f: LeadFilter) {
    const index = dealManager.pipelineIndex()
    const dtos = leadRepository.list({ ...f, statusId: undefined }).map((l) => this.toDto(l, index))
    return f.statusId ? dtos.filter((l) => (l.deals.length ? l.deals.some((d) => d.statusId === f.statusId) : l.statusId === f.statusId)) : dtos
  },
  get(id: string) { const l = leadRepository.byId(id); if (!l) throw notFound('Lead not found'); return this.toDto(l) },
  toPatch(d: LeadInput): LeadPatch {
    const p: LeadPatch = {}
    if (d.firstName !== undefined) p.first_name = d.firstName
    if (d.lastName !== undefined) p.last_name = d.lastName
    if (d.email !== undefined) p.email = d.email ? d.email.toLowerCase() : null
    if (d.phone !== undefined) p.phone = d.phone
    if (d.title !== undefined) p.title = d.title
    if (d.companyId !== undefined) p.company_id = d.companyId
    if (d.statusId !== undefined) p.status_id = d.statusId
    if (d.ownerId !== undefined) p.owner_id = d.ownerId
    if (d.source !== undefined) p.source = d.source
    if (d.score !== undefined) p.score = d.score
    if (d.linkedinUrl !== undefined) p.linkedin_url = d.linkedinUrl
    if (d.notes !== undefined) p.notes = d.notes
    return p
  },
  create(d: LeadInput & { firstName: string }, actorId: string) {
    const p = this.toPatch(d)
    if (p.status_id && !leadStatusRepository.byId(p.status_id)) throw badRequest('Unknown status')
    if (!p.status_id) p.status_id = leadStatusRepository.default()?.id ?? null
    if (!p.owner_id) p.owner_id = actorId
    if (!p.company_id && p.email) p.company_id = companyManager.findOrCreateByEmail(p.email, actorId)?.id ?? null
    const l = leadRepository.create({ ...p, first_name: d.firstName })
    dealManager.syncLead(l)
    leadRepository.addActivity(l.id, actorId, 'system', { text: 'Lead created' })
    const dto = this.toDto(l); socketService.toAll('lead:updated', { type: 'created', lead: dto }); return dto
  },
  update(id: string, d: LeadInput, actorId: string, dealId?: string | null) {
    const existing = leadRepository.byId(id); if (!existing) throw notFound('Lead not found')
    const p = this.toPatch(d)
    const companyChanged = p.company_id !== undefined && p.company_id !== existing.company_id
    if (p.company_id && companyChanged && !companyRepository.byId(p.company_id)) throw badRequest('Company not found')
    // The status belongs to the deal once the lead has a company; a company change never carries a status with it.
    const statusId = companyChanged ? null : p.status_id ?? null
    delete p.status_id
    if (statusId && !leadStatusRepository.byId(statusId)) throw badRequest('Unknown status')
    let updated = leadRepository.update(id, p)
    if (companyChanged) { dealManager.syncLead(updated, existing); updated = leadRepository.byId(id)! }
    if (statusId && statusId !== dealManager.pipelineOf(updated).statusId) {
      if (!dealManager.moveLead(updated, statusId, actorId, dealId)) {
        const from = updated.status_id ? leadStatusRepository.byId(updated.status_id)?.name : null
        leadRepository.addActivity(id, actorId, 'status_change', { from, to: leadStatusRepository.byId(statusId)!.name })
        updated = leadRepository.update(id, { status_id: statusId })
      }
    }
    const dto = this.toDto(leadRepository.byId(id)!); socketService.toAll('lead:updated', { type: 'updated', lead: dto }); return dto
  },
  /** Move in the pipeline. `dealId` picks which of the lead's deals moves when its company has several. */
  move(id: string, statusId: string, actorId: string, dealId?: string | null) { return this.update(id, { statusId }, actorId, dealId) },
  setArchived(id: string, archived: boolean, actorId: string) {
    if (!leadRepository.byId(id)) throw notFound('Lead not found')
    const l = leadRepository.setArchived(id, archived)
    leadRepository.addActivity(id, actorId, 'system', { text: archived ? 'Lead archived' : 'Lead unarchived' })
    const dto = this.toDto(l); socketService.toAll('lead:updated', { type: archived ? 'archived' : 'unarchived', lead: dto }); return dto
  },
  delete(id: string) { if (!leadRepository.byId(id)) throw notFound('Lead not found'); leadRepository.delete(id); socketService.toAll('lead:updated', { type: 'deleted', id }) },
  activities(id: string) { if (!leadRepository.byId(id)) throw notFound('Lead not found'); return leadRepository.activities(id).map((a) => this.activityDto(a)) },
  addNote(id: string, actorId: string, text: string) { if (!leadRepository.byId(id)) throw notFound('Lead not found'); const a = leadRepository.addActivity(id, actorId, 'note', { text }); socketService.toAll('lead:updated', { type: 'activity', leadId: id }); return this.activityDto(a) },
  logActivity(id: string, actorId: string | null, type: string, payload: unknown) { const a = leadRepository.addActivity(id, actorId, type, payload); socketService.toAll('lead:updated', { type: 'activity', leadId: id }); return a },
  /** Map sheet headers to lead fields using the alias table. */
  importMapping(headers: string[]): ImportMapping {
    const m: ImportMapping = {}
    for (const [field, aliases] of Object.entries(IMPORT_COLUMNS)) m[field] = headers.find((h) => aliases.includes(h)) ?? null
    return m
  },
  /**
   * Import leads from spreadsheet rows. `dryRun` only classifies rows (create / skip duplicate email / error) and returns a preview.
   * Companies are matched by name (case-insensitive), then by website/email domain, and created when missing.
   */
  importRows(headers: string[], rows: SheetRow[], actorId: string, dryRun: boolean, source = 'Import'): ImportResult {
    const mapping = this.importMapping(headers)
    const col = (r: SheetRow, f: string) => { const h = mapping[f]; return h ? (r[h] ?? '').trim() : '' }
    if (!mapping.email && !mapping.name && !mapping.firstName) throw badRequest('Could not find a name or email column. Expected headers like "First name", "Last name", "Email", "Company".')
    const seenEmails = new Set<string>()
    const defaultStatus = leadStatusRepository.default()?.id ?? null
    const statuses = leadStatusRepository.list()
    const preview: ImportPreviewRow[] = []
    let created = 0
    rows.forEach((r, i) => {
      let first = col(r, 'firstName'); let last = col(r, 'lastName')
      if (!first && !last) { const [a, ...rest] = col(r, 'name').split(/\s+/).filter(Boolean); first = a ?? ''; last = rest.join(' ') }
      const email = col(r, 'email').toLowerCase() || null
      const companyName = col(r, 'company') || null
      const title = col(r, 'title') || null
      const base = { row: i + 2, firstName: first, lastName: last, email, company: companyName, title }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { preview.push({ ...base, action: 'error', reason: 'Invalid email' }); return }
      if (!first && !email) { preview.push({ ...base, action: 'error', reason: 'No name and no email' }); return }
      if (email && (seenEmails.has(email) || leadRepository.byEmail(email))) { preview.push({ ...base, action: 'skip', reason: seenEmails.has(email) ? 'Duplicate in file' : 'Already exists' }); return }
      if (email) seenEmails.add(email)
      if (!first) first = email!.split('@')[0]
      preview.push({ ...base, firstName: first, action: 'create' })
      if (dryRun) return
      let companyId: string | null = null
      if (companyName) {
        const existing = companyRepository.byName(companyName)
        if (existing) companyId = existing.id
        else {
          const site = col(r, 'website'); const domain = site ? site.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase() : null
          const owner = domain ? companyManager.ownerOfDomain(domain) : null
          companyId = owner ? owner.id : companyManager.create({ name: companyName, domains: domain ? [domain] : [], website: domain ? `https://${domain}` : null, ownerId: actorId }, actorId).id
        }
      } else if (email) companyId = companyManager.findOrCreateByEmail(email, actorId)?.id ?? null
      const statusName = col(r, 'status'); const status = statusName ? statuses.find((s) => s.name.toLowerCase() === statusName.toLowerCase()) : undefined
      const l = leadRepository.create({ first_name: first, last_name: last, email, phone: col(r, 'phone') || null, title, company_id: companyId, status_id: status?.id ?? defaultStatus, owner_id: actorId, source: col(r, 'source') || source, notes: col(r, 'notes') || null, linkedin_url: col(r, 'linkedinUrl') || null })
      dealManager.syncLead(l)
      leadRepository.addActivity(l.id, actorId, 'system', { text: 'Imported from spreadsheet' })
      created++
    })
    if (!dryRun && created) socketService.toAll('lead:updated', { type: 'imported', count: created })
    return { mapping, total: rows.length, toCreate: preview.filter((p) => p.action === 'create').length, toSkip: preview.filter((p) => p.action === 'skip').length, errors: preview.filter((p) => p.action === 'error').length, preview: preview.slice(0, 200), created: dryRun ? undefined : created }
  },
  /**
   * Find a lead by email, or create one when `autoCreate` is set. A new lead goes to `companyId` when given;
   * otherwise to the company owning its email domain, which is created when missing.
   */
  findOrCreateByEmail(email: string, name: string, ownerId: string, autoCreate: boolean, companyId?: string): LeadRow | null {
    const existing = leadRepository.byEmail(email)
    if (existing) return existing
    if (!autoCreate) return null
    const [first, ...rest] = (name || email.split('@')[0]).split(/\s+/)
    const targetCompanyId = companyId ?? companyManager.findOrCreateByEmail(email, ownerId)?.id ?? null
    const l = leadRepository.create({ first_name: first, last_name: rest.join(' '), email, company_id: targetCompanyId, status_id: leadStatusRepository.default()?.id ?? null, owner_id: ownerId, source: 'Inbound email' })
    dealManager.syncLead(l)
    leadRepository.addActivity(l.id, null, 'system', { text: 'Auto-created from inbound email' })
    socketService.toAll('lead:updated', { type: 'created', lead: this.toDto(l) })
    return l
  },
}
