/**
 * dealManager — deals: what is won or lost with a company.
 *
 * Every company has one default deal; the user can split a company into more. The pipeline status lives on the
 * deal, so all leads of a single-deal company share one status. A lead without a company keeps its own
 * `leads.status_id`. Invariant kept here: a lead linked to a company is in at least one of that company's deals.
 *
 * Suppliers (companies.is_supplier) are the exception: no default deal, contacts join a deal only when chosen, and
 * the last deal can be deleted. A supplier contact in no deal is outside the pipeline.
 */
import { badRequest, conflict, notFound } from '../middleware/errors.ts'
import { tx } from '../db/dbAccessor.ts'
import { companyRepository } from '../repositories/companyRepository.ts'
import { dealRepository, type DealPatch } from '../repositories/dealRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { leadStatusRepository } from '../repositories/leadStatusRepository.ts'
import { userRepository } from '../repositories/userRepository.ts'
import { socketService } from '../services/socketService.ts'
import type { DealRow, LeadRow, LeadStatusRow } from '../types/index.ts'

export interface DealDto { id: string; companyId: string; name: string; statusId: string | null; ownerId: string | null; amount: number | null; expectedCloseDate: string | null; /** Chosen contact person (a lead of the deal); null = not chosen, the first lead is shown. */ contactLeadId: string | null; isDefault: boolean; leadIds: string[]; closedAt: string | null; createdAt: string; updatedAt: string }
/** A deal as shown on one of its leads. */
export interface LeadDealDto { id: string; name: string; statusId: string | null; isDefault: boolean }
/** Where a lead stands in the pipeline: `statusId` is its first deal's status (or its own when it has no company). */
export interface LeadPipeline { statusId: string | null; deals: LeadDealDto[]; /** The lead's company has more than one deal. */ multiDeal: boolean }
/** A lead as listed on a deal. */
export interface DealLeadDto { id: string; name: string; title: string | null; email: string | null; score: number; archived: boolean }
/** A deal row of the deals view: the deal, its company and its people. */
export interface DealListDto extends DealDto { companyName: string; companyDomain: string | null; companyLogoUrl: string | null; /** The company has more than one deal (show the deal name). */ multiDeal: boolean; ownerName: string | null; leads: DealLeadDto[]; /** The deal's contact person: the chosen one, else its first lead. */ contact: DealLeadDto | null; lastActivityAt: string | null }
export interface DealFilter { q?: string; statusId?: string; ownerId?: string; /** true = deals whose leads are all archived; otherwise deals with an active lead. */ archived?: boolean }
export interface DealInput { name?: string; statusId?: string | null; ownerId?: string | null; amount?: number | null; expectedCloseDate?: string | null; /** A lead of the deal, or null to clear. */ contactLeadId?: string | null }
/** Preloaded lookups for list pages (one query each instead of one per lead). */
export interface PipelineIndex { byLead: Map<string, DealRow[]>; dealCounts: Map<string, number> }

const brief = (d: DealRow): LeadDealDto => ({ id: d.id, name: d.name, statusId: d.status_id, isDefault: !!d.is_default })

export const dealManager = {
  isSupplier(companyId: string | null | undefined): boolean { return !!companyId && !!companyRepository.byId(companyId)?.is_supplier },
  toDto(d: DealRow): DealDto {
    return { id: d.id, companyId: d.company_id, name: d.name, statusId: d.status_id, ownerId: d.owner_id, amount: d.amount, expectedCloseDate: d.expected_close_date, contactLeadId: d.contact_lead_id, isDefault: !!d.is_default, leadIds: dealRepository.leadIds(d.id), closedAt: d.closed_at, createdAt: d.created_at, updatedAt: d.updated_at }
  },
  get(id: string) { const d = dealRepository.byId(id); if (!d) throw notFound('Deal not found'); return d },
  leadBrief(l: LeadRow): DealLeadDto { return { id: l.id, name: `${l.first_name} ${l.last_name}`.trim(), title: l.title, email: l.email, score: l.score, archived: !!l.archived_at } },
  /**
   * The deals view: every deal that has leads, with its company and contact person. Deals without leads are left
   * out, as in the pipeline counts. `q` matches the company, the deal name and its leads' names and emails.
   */
  listAll(f: DealFilter = {}): DealListDto[] {
    const leadsByDeal = new Map<string, LeadRow[]>()
    for (const { deal_id, ...lead } of dealRepository.allDealLeads()) { const list = leadsByDeal.get(deal_id) ?? []; list.push(lead as LeadRow); leadsByDeal.set(deal_id, list) }
    const counts = dealRepository.dealCounts()
    const q = f.q?.trim().toLowerCase()
    const out: DealListDto[] = []
    for (const d of dealRepository.allWithCompany()) {
      const leads = leadsByDeal.get(d.id) ?? []
      if (!leads.length) continue
      const active = leads.some((l) => !l.archived_at)
      if (f.archived ? active : !active) continue
      if (f.statusId && d.status_id !== f.statusId) continue
      if (f.ownerId && d.owner_id !== f.ownerId) continue
      if (q && ![d.company_name, d.name, ...leads.flatMap((l) => [l.first_name, l.last_name, l.email ?? ''])].some((v) => v.toLowerCase().includes(q))) continue
      const shown = f.archived ? leads : leads.filter((l) => !l.archived_at)
      const contact = shown.find((l) => l.id === d.contact_lead_id) ?? shown[0] ?? null
      out.push({
        id: d.id, companyId: d.company_id, name: d.name, statusId: d.status_id, ownerId: d.owner_id, amount: d.amount, expectedCloseDate: d.expected_close_date, contactLeadId: d.contact_lead_id, isDefault: !!d.is_default, leadIds: leads.map((l) => l.id), closedAt: d.closed_at, createdAt: d.created_at, updatedAt: d.updated_at,
        companyName: d.company_name, companyDomain: d.company_domain, companyLogoUrl: d.company_logo_url, multiDeal: (counts.get(d.company_id) ?? 1) > 1, ownerName: d.owner_id ? userRepository.byId(d.owner_id)?.name ?? null : null,
        leads: shown.map((l) => this.leadBrief(l)), contact: contact ? this.leadBrief(contact) : null,
        lastActivityAt: leads.reduce<string | null>((max, l) => { const t = l.last_activity_at ?? l.updated_at; return !max || t > max ? t : max }, null),
      })
    }
    return out.sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''))
  },
  /** A company's deals (default first); creates the default deal when a non-supplier company has none yet. */
  listForCompany(companyId: string): DealDto[] { if (!this.isSupplier(companyId)) this.ensureDefault(companyId); return dealRepository.byCompany(companyId).map((d) => this.toDto(d)) },

  /**
   * One status for a set of lead statuses: Won if any is Won; otherwise the furthest non-lost stage; Lost only when
   * every lead is Lost; the default stage when there is nothing to go by.
   */
  statusFromLeads(leads: LeadRow[], statuses: LeadStatusRow[] = leadStatusRepository.list()): string | null {
    const found = leads.map((l) => statuses.find((s) => s.id === l.status_id)).filter((s): s is LeadStatusRow => !!s)
    const furthest = (list: LeadStatusRow[]) => list.reduce<LeadStatusRow | undefined>((best, s) => (!best || s.sort_order > best.sort_order ? s : best), undefined)
    const pick = furthest(found.filter((s) => s.is_won)) ?? furthest(found.filter((s) => !s.is_lost)) ?? furthest(found)
    return pick?.id ?? leadStatusRepository.default()?.id ?? null
  },
  closedAtFor(statusId: string | null, previous: string | null = null): string | null {
    const s = statusId ? leadStatusRepository.byId(statusId) : undefined
    return s && (s.is_won || s.is_lost) ? previous ?? new Date().toISOString() : null
  },
  /** The company's default deal; created on first use, taking its status from the company's current leads. */
  ensureDefault(companyId: string): DealRow {
    const existing = dealRepository.defaultOf(companyId)
    if (existing) return existing
    const company = companyRepository.byId(companyId); if (!company) throw notFound('Company not found')
    const others = dealRepository.byCompany(companyId)
    if (others.length) return dealRepository.update(others[0].id, { is_default: 1 })
    const statusId = this.statusFromLeads(leadRepository.list({ companyId, archived: 'all' }))
    return dealRepository.create({ company_id: companyId, name: company.name, status_id: statusId, owner_id: company.owner_id, is_default: true, closed_at: this.closedAtFor(statusId) })
  },
  /**
   * Boot-time backfill, safe to run every start: a default deal for each company that has none (status from its
   * leads), and every company lead that is in no deal joins the default one.
   */
  backfill() {
    const missing = dealRepository.companiesWithoutDeal()
    tx(() => {
      for (const c of missing) this.ensureDefault(c.id)
      for (const l of dealRepository.leadsWithoutDeal()) dealRepository.addLead(this.ensureDefault(l.company_id).id, l.id)
    })
    if (missing.length) console.log(`[deals] created the default deal for ${missing.length} compan${missing.length === 1 ? 'y' : 'ies'}`)
  },

  pipelineIndex(): PipelineIndex {
    const byLead = new Map<string, DealRow[]>()
    for (const r of dealRepository.allLeadDeals()) { const list = byLead.get(r.lead_id) ?? []; list.push(r); byLead.set(r.lead_id, list) }
    return { byLead, dealCounts: dealRepository.dealCounts() }
  },
  /** A lead's deals inside its current company (default first). */
  dealsOfLead(l: LeadRow, index?: PipelineIndex): DealRow[] {
    if (!l.company_id) return []
    return (index ? index.byLead.get(l.id) ?? [] : dealRepository.forLead(l.id)).filter((d) => d.company_id === l.company_id)
  },
  pipelineOf(l: LeadRow, index?: PipelineIndex): LeadPipeline {
    const deals = this.dealsOfLead(l, index)
    if (!l.company_id || !deals.length) return { statusId: l.status_id, deals: [], multiDeal: false }
    const count = index ? index.dealCounts.get(l.company_id) ?? 1 : dealRepository.countByCompany(l.company_id)
    return { statusId: deals[0].status_id, deals: deals.map(brief), multiDeal: count > 1 }
  },

  /**
   * Keep deal membership in step with the lead's company. Call after the lead row is written.
   * Leaving a company: the lead keeps the status its deal had. Joining one: it joins the default deal
   * (a supplier has none, so its new contacts stay out of every deal).
   */
  syncLead(l: LeadRow, previous?: LeadRow) {
    if (previous?.company_id && previous.company_id !== l.company_id) {
      const old = dealRepository.forLead(l.id).filter((d) => d.company_id === previous.company_id)
      if (!l.company_id && old.length) leadRepository.update(l.id, { status_id: old[0].status_id })
    }
    dealRepository.removeLeadExceptCompany(l.id, l.company_id)
    if (l.company_id && !this.isSupplier(l.company_id) && !dealRepository.forLead(l.id).length) dealRepository.addLead(this.ensureDefault(l.company_id).id, l.id)
    dealRepository.clearStaleContacts()
  },
  /** Before a company is deleted: its leads keep the status their deal had. */
  releaseCompany(companyId: string) {
    for (const l of leadRepository.list({ companyId, archived: 'all' })) {
      const deals = this.dealsOfLead(l)
      if (deals.length) leadRepository.update(l.id, { status_id: deals[0].status_id })
    }
  },

  /** Change a deal's status; logs a status change on each of its leads. */
  setStatus(dealId: string, statusId: string, actorId: string | null): DealRow {
    const deal = this.get(dealId)
    if (deal.status_id === statusId) return deal
    const to = leadStatusRepository.byId(statusId); if (!to) throw badRequest('Unknown status')
    const from = deal.status_id ? leadStatusRepository.byId(deal.status_id)?.name ?? null : null
    const multi = dealRepository.countByCompany(deal.company_id) > 1
    const updated = dealRepository.update(dealId, { status_id: statusId, closed_at: this.closedAtFor(statusId) })
    for (const leadId of dealRepository.leadIds(dealId)) leadRepository.addActivity(leadId, actorId, 'status_change', { from, to: to.name, dealId, ...(multi ? { dealName: deal.name } : {}) })
    return updated
  },
  /**
   * Move a lead in the pipeline. With a company the lead's deal moves (the given one, else its first deal), so
   * every lead of that deal moves with it. Returns the moved deal, or null when the caller should move the lead itself.
   */
  moveLead(l: LeadRow, statusId: string, actorId: string | null, dealId?: string | null): DealRow | null {
    if (!l.company_id) return null
    let deals = this.dealsOfLead(l)
    if (!deals.length) { this.syncLead(l); deals = this.dealsOfLead(l) }
    if (!deals.length && !dealId) return null // supplier contact in no deal: it keeps its own status
    const deal = dealId ? deals.find((d) => d.id === dealId) : deals[0]
    if (!deal) throw badRequest('The lead is not part of that deal')
    return this.setStatus(deal.id, statusId, actorId)
  },

  /** Leads given by id that belong to the company; throws when one does not. */
  companyLeads(companyId: string, leadIds: string[]): string[] {
    const ids = [...new Set(leadIds)]
    for (const id of ids) { const l = leadRepository.byId(id); if (!l || l.company_id !== companyId) throw badRequest('A lead of another company cannot be added to this deal') }
    return ids
  },
  toPatch(d: DealInput): DealPatch {
    const p: DealPatch = {}
    if (d.name !== undefined) { const name = d.name.trim(); if (!name) throw badRequest('A deal needs a name'); p.name = name }
    if (d.ownerId !== undefined) p.owner_id = d.ownerId
    if (d.amount !== undefined) p.amount = d.amount
    if (d.expectedCloseDate !== undefined) p.expected_close_date = d.expectedCloseDate || null
    return p
  },
  /** Split: add another deal to a company with the chosen leads (they also stay in the deals they are in). */
  create(companyId: string, d: DealInput & { name: string; leadIds?: string[] }, actorId: string): DealDto {
    if (!companyRepository.byId(companyId)) throw notFound('Company not found')
    const company = companyRepository.byId(companyId)!
    const def = company.is_supplier ? null : this.ensureDefault(companyId)
    const p = this.toPatch(d)
    const statusId = d.statusId ?? leadStatusRepository.default()?.id ?? null
    if (statusId && !leadStatusRepository.byId(statusId)) throw badRequest('Unknown status')
    const leadIds = this.companyLeads(companyId, d.leadIds ?? [])
    const row = tx(() => {
      const created = dealRepository.create({ company_id: companyId, name: p.name!, status_id: statusId, owner_id: p.owner_id ?? (def ? def.owner_id : company.owner_id) ?? actorId, amount: p.amount ?? null, expected_close_date: p.expected_close_date ?? null, is_default: false, closed_at: this.closedAtFor(statusId) })
      for (const id of leadIds) dealRepository.addLead(created.id, id)
      if (d.contactLeadId) { if (!leadIds.includes(d.contactLeadId)) throw badRequest('The contact person must be a lead of the deal'); return dealRepository.update(created.id, { contact_lead_id: d.contactLeadId }) }
      return created
    })
    this.notify(companyId)
    return this.toDto(row)
  },
  update(id: string, d: DealInput, actorId: string): DealDto {
    const deal = this.get(id)
    const p = this.toPatch(d)
    if (d.contactLeadId !== undefined) {
      if (d.contactLeadId && !dealRepository.leadIds(id).includes(d.contactLeadId)) throw badRequest('The contact person must be a lead of the deal')
      p.contact_lead_id = d.contactLeadId || null
    }
    tx(() => {
      if (Object.keys(p).length) dealRepository.update(id, p)
      if (d.statusId) this.setStatus(id, d.statusId, actorId)
    })
    this.notify(deal.company_id)
    return this.toDto(dealRepository.byId(id)!)
  },
  /** Replace a deal's leads. A company lead left in no deal goes back to the default deal. */
  setLeads(id: string, leadIds: string[]): DealDto {
    const deal = this.get(id)
    const wanted = this.companyLeads(deal.company_id, leadIds)
    tx(() => {
      const current = dealRepository.leadIds(id)
      for (const leadId of current) if (!wanted.includes(leadId)) dealRepository.removeLead(id, leadId)
      for (const leadId of wanted) if (!current.includes(leadId)) dealRepository.addLead(id, leadId)
      this.rehome(deal.company_id)
      dealRepository.clearStaleContacts()
    })
    this.notify(deal.company_id)
    return this.toDto(dealRepository.byId(id)!)
  },
  /** Company leads that are in no deal join the default deal (not for suppliers: their contacts join deals by choice). */
  rehome(companyId: string) {
    if (this.isSupplier(companyId)) return
    const def = this.ensureDefault(companyId)
    for (const l of leadRepository.list({ companyId, archived: 'all' })) if (!dealRepository.forLead(l.id).some((d) => d.company_id === companyId)) dealRepository.addLead(def.id, l.id)
  },
  /** Delete a deal. A non-supplier company always keeps one; the oldest remaining deal becomes the default when needed. */
  delete(id: string) {
    const deal = this.get(id)
    if (!this.isSupplier(deal.company_id) && dealRepository.countByCompany(deal.company_id) <= 1) throw conflict('A company always has at least one deal', undefined, 'LAST_DEAL')
    tx(() => { dealRepository.delete(id); this.rehome(deal.company_id) })
    this.notify(deal.company_id)
  },
  notify(companyId: string) { socketService.toAll('lead:updated', { type: 'deals', companyId }) },
}
