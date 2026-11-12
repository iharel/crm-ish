/** companyManager — companies + domain-based auto-creation. */
import { conflict, notFound } from '../middleware/errors.ts'
import { companyRepository, type CompanyPatch } from '../repositories/companyRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { companyDomainRepository } from '../repositories/companyDomainRepository.ts'
import { textService } from '../services/textService.ts'
import type { CompanyRow, LeadRow } from '../types/index.ts'
import { dealManager } from './dealManager.ts'

export interface CompanyDto { id: string; name: string; domain: string | null; website: string | null; industry: string | null; size: string | null; location: string | null; description: string | null; logoUrl: string | null; linkedinUrl: string | null; enrichment: unknown; enrichedAt: string | null; ownerId: string | null; leadCount: number; /** Supplier: no default deal; its contacts are outside the pipeline until they join a deal. */ isSupplier: boolean; /** Every domain the company owns, primary first. */ domains: string[]; createdAt: string; updatedAt: string }
/** A company that matches an email address by domain (suggestion, never auto-applied). */
export interface CompanySuggestion { id: string; name: string; domain: string | null }
export interface CompanyInput { name?: string; /** Legacy single domain = the primary one. */ domain?: string | null; /** Full domain list; the first is primary. Replaces the company's domains when provided. */ domains?: string[]; website?: string | null; industry?: string | null; size?: string | null; location?: string | null; description?: string | null; linkedinUrl?: string | null; ownerId?: string | null; isSupplier?: boolean }

/** Free, keyless logo: Google's favicon service for the company domain. */
export function logoFor(domain: string | null | undefined): string | null {
  return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null
}

/** Domain → company map, cached briefly: suggestions run once per thread in every list page. Mutations invalidate it. */
type DomainIndex = { at: number; byDomain: Map<string, string>; websites: { id: string; name: string; domain: string | null; website: string | null }[] }
let domainIndex: DomainIndex | null = null
const DOMAIN_INDEX_TTL_MS = 5000
function domainIndexNow(): DomainIndex {
  if (!domainIndex || Date.now() - domainIndex.at > DOMAIN_INDEX_TTL_MS) domainIndex = { at: Date.now(), byDomain: new Map(companyDomainRepository.all().map((d) => [d.domain, d.company_id])), websites: companyRepository.domains().filter((c) => !!c.website) }
  return domainIndex
}
function invalidateDomains() { domainIndex = null }

export const companyManager = {
  toDto(c: CompanyRow & { lead_count?: number }): CompanyDto {
    return { id: c.id, name: c.name, domain: c.domain, website: c.website, industry: c.industry, size: c.size, location: c.location, description: c.description, logoUrl: c.logo_url ?? logoFor(c.domain), linkedinUrl: c.linkedin_url, enrichment: c.enrichment_json ? JSON.parse(c.enrichment_json) : null, enrichedAt: c.enriched_at, ownerId: c.owner_id, leadCount: c.lead_count ?? 0, isSupplier: !!c.is_supplier, domains: companyDomainRepository.byCompany(c.id).map((d) => d.domain), createdAt: c.created_at, updatedAt: c.updated_at }
  },
  list(q?: string, kind: 'company' | 'supplier' | 'all' = 'all') { return companyRepository.list(q, kind).map((c) => this.toDto(c)) },
  get(id: string) { const c = companyRepository.byId(id); if (!c) throw notFound('Company not found'); return this.toDto({ ...c, lead_count: companyRepository.list().find((x) => x.id === id)?.lead_count ?? 0 }) },
  toPatch(d: CompanyInput): CompanyPatch {
    const p: CompanyPatch = {}
    if (d.name !== undefined) p.name = d.name
    if (d.domain !== undefined) p.domain = d.domain ? d.domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : null
    if (d.website !== undefined) p.website = d.website
    if (d.industry !== undefined) p.industry = d.industry
    if (d.size !== undefined) p.size = d.size
    if (d.location !== undefined) p.location = d.location
    if (d.description !== undefined) p.description = d.description
    if (d.linkedinUrl !== undefined) p.linkedin_url = d.linkedinUrl
    if (d.ownerId !== undefined) p.owner_id = d.ownerId
    if (d.isSupplier !== undefined) p.is_supplier = d.isSupplier ? 1 : 0
    return p
  },
  /** Normalize a domain: lower-case, strip scheme / www / path. Empty string when nothing usable remains. */
  normalizeDomain(raw: string | null | undefined): string {
    return (raw ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0].replace(/\s+/g, '')
  },
  /** The desired domain list from an input: `domains` wins; otherwise the legacy `domain` field; undefined = unchanged. */
  domainsFromInput(d: CompanyInput): string[] | undefined {
    if (d.domains !== undefined) return [...new Set(d.domains.map((x) => this.normalizeDomain(x)).filter(Boolean))]
    if (d.domain !== undefined) return d.domain ? [this.normalizeDomain(d.domain)].filter(Boolean) : []
    return undefined
  },
  /** Throw 409 DOMAIN_TAKEN when any of the domains belongs to a different company. */
  assertDomainsFree(domains: string[], companyId: string | null) {
    for (const domain of domains) {
      const owner = companyDomainRepository.byDomain(domain)
      if (owner && owner.company_id !== companyId) {
        const c = companyRepository.byId(owner.company_id)
        throw conflict(`${domain} already belongs to ${c?.name ?? 'another company'}`, { domain, companyId: owner.company_id, companyName: c?.name ?? null }, 'DOMAIN_TAKEN')
      }
    }
  },
  /** Replace a company's domain set (first = primary) and keep companies.domain in sync. */
  setDomains(companyId: string, domains: string[]) {
    this.assertDomainsFree(domains, companyId)
    const current = companyDomainRepository.byCompany(companyId).map((d) => d.domain)
    for (const d of current) if (!domains.includes(d)) companyDomainRepository.remove(companyId, d)
    for (const d of domains) if (!current.includes(d)) companyDomainRepository.add(companyId, d, false)
    if (domains.length) companyDomainRepository.setPrimary(companyId, domains[0])
    companyRepository.update(companyId, { domain: domains[0] ?? null })
    invalidateDomains()
  },
  /** Which company owns a domain (or a parent of it), if any. */
  ownerOfDomain(raw: string): CompanySuggestion | null { const d = this.normalizeDomain(raw); return d ? this.suggestForEmail(`x@${d}`) : null },
  create(d: CompanyInput & { name: string }, actorId: string) {
    const p = this.toPatch(d)
    const domains = this.domainsFromInput(d) ?? []
    this.assertDomainsFree(domains, null)
    if (domains[0] && !p.website) p.website = `https://${domains[0]}`
    const row = companyRepository.create({ ...p, domain: domains[0] ?? null, name: d.name, owner_id: p.owner_id ?? actorId })
    if (domains.length) this.setDomains(row.id, domains)
    invalidateDomains()
    return this.toDto(companyRepository.byId(row.id)!)
  },
  /**
   * Marking a company as a supplier keeps the deals it has (owner's decision 2026-11-12); marking it back as a
   * regular company gives it its default deal again and its contacts join it.
   */
  update(id: string, d: CompanyInput) {
    const existing = companyRepository.byId(id); if (!existing) throw notFound('Company not found')
    const domains = this.domainsFromInput(d)
    const patch = this.toPatch(d); delete patch.domain
    if (domains) this.setDomains(id, domains)
    const updated = companyRepository.update(id, patch); invalidateDomains()
    if (patch.is_supplier !== undefined && patch.is_supplier !== existing.is_supplier) {
      if (!patch.is_supplier) dealManager.rehome(id)
      dealManager.notify(id)
    }
    return this.toDto({ ...updated, lead_count: leadRepository.list({ companyId: id, archived: 'all' }).length })
  },
  delete(id: string) { if (!companyRepository.byId(id)) throw notFound('Company not found'); dealManager.releaseCompany(id); companyRepository.delete(id); invalidateDomains() },
  /**
   * After migration 005's backfill, companies whose domain was already owned by an older company kept a stale
   * companies.domain. Clear it once and log them so the owner can merge or edit by hand.
   */
  reconcileDomainsAfterBackfill() {
    const withDomains = companyDomainRepository.companyIdsWithDomains()
    for (const c of companyRepository.domains()) {
      if (c.domain && !withDomains.has(c.id)) {
        const owner = companyDomainRepository.byDomain(this.normalizeDomain(c.domain))
        companyRepository.update(c.id, { domain: null })
        console.warn(`[company-domains] duplicate domain released: "${c.name}" lost ${c.domain} (kept by ${companyRepository.byId(owner?.company_id ?? '')?.name ?? 'another company'})`)
      }
    }
  },
  /** Find or create a company from an email domain (skips free-mail domains). */
  /**
   * Suggest a company for an email address by domain: exact `domain`, a parent domain (mail.acme.com → acme.com) or
   * the website host. Free-mail domains never match. Returns null when nothing matches.
   */
  suggestForEmail(email: string | null | undefined): CompanySuggestion | null {
    if (!email) return null
    const domain = textService.domainOf(email)
    if (!domain || textService.isFreeMailDomain(domain)) return null
    const candidates = new Set<string>()
    const labels = domain.split('.')
    const publicSecond = /^(co|com|org|net|ac|gov|edu)$/i
    const minLabels = labels.length >= 3 && publicSecond.test(labels[labels.length - 2]) ? 3 : 2
    for (let i = 0; i <= labels.length - minLabels; i++) candidates.add(labels.slice(i).join('.'))
    const host = (u: string | null) => { try { return new URL(u!.includes('://') ? u! : `https://${u}`).hostname.replace(/^www\./, '').toLowerCase() } catch { return '' } }
    const index = domainIndexNow(); const owners = index.byDomain
    // Most specific candidate first (mail.acme.com before acme.com) so a subsidiary on its own domain wins.
    for (const cand of candidates) { const companyId = owners.get(cand); if (companyId) { const c = companyRepository.byId(companyId); if (c) return { id: c.id, name: c.name, domain: c.domain ?? cand } } }
    const byHost = index.websites.find((c) => c.website && candidates.has(host(c.website)))
    return byHost ? { id: byHost.id, name: byHost.name, domain: byHost.domain } : null
  },
  /** Leads with no company whose email domain matches this company. */
  suggestedLeads(companyId: string): LeadRow[] {
    return leadRepository.list({}).filter((l) => !l.company_id && l.email && this.suggestForEmail(l.email)?.id === companyId)
  },
  /** The company owning the email's domain, created from the domain when there is none (`asSupplier` flags a newly created one). Null for free-mail domains. */
  findOrCreateByEmail(email: string, ownerId: string | null, asSupplier = false): CompanyRow | null {
    const domain = textService.domainOf(email)
    if (!domain || textService.isFreeMailDomain(domain)) return null
    const suggested = this.suggestForEmail(email)
    if (suggested) return companyRepository.byId(suggested.id) ?? null
    const name = domain.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    const row = companyRepository.create({ name, domain, website: `https://${domain}`, owner_id: ownerId, is_supplier: asSupplier ? 1 : 0 })
    companyDomainRepository.add(row.id, domain, true)
    invalidateDomains()
    return row
  },
}
