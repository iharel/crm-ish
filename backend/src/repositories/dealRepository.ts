/** dealRepository — deals and their lead membership. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { DealRow, LeadRow } from '../types/index.ts'

export interface DealPatch { name?: string; status_id?: string | null; owner_id?: string | null; amount?: number | null; expected_close_date?: string | null; contact_lead_id?: string | null; is_default?: number; closed_at?: string | null }
/** A deal as seen from one of its leads. */
export type LeadDealRow = DealRow & { lead_id: string }

const ORDER = 'ORDER BY d.is_default DESC, d.created_at ASC, d.id ASC'

export const dealRepository = {
  byId(id: string) { return get<DealRow>('SELECT * FROM deals WHERE id = ?', id) },
  /** A company's deals, default first. */
  byCompany(companyId: string): DealRow[] { return all<DealRow>(`SELECT d.* FROM deals d WHERE d.company_id = ? ${ORDER}`, companyId) },
  defaultOf(companyId: string) { return get<DealRow>('SELECT * FROM deals WHERE company_id = ? AND is_default = 1', companyId) },
  countByCompany(companyId: string) { return get<{ n: number }>('SELECT COUNT(*) n FROM deals WHERE company_id = ?', companyId)!.n },
  /** How many deals each company has (only companies with at least one). */
  dealCounts(): Map<string, number> { return new Map(all<{ company_id: string; n: number }>('SELECT company_id, COUNT(*) n FROM deals GROUP BY company_id').map((r) => [r.company_id, r.n])) },
  /** Companies that have no deal yet (suppliers have none by design and are left out). */
  companiesWithoutDeal(): { id: string; name: string; owner_id: string | null }[] { return all('SELECT c.id, c.name, c.owner_id FROM companies c WHERE c.is_supplier = 0 AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.company_id = c.id)') },
  /** Leads linked to a (non-supplier) company but in none of that company's deals. */
  leadsWithoutDeal(): { id: string; company_id: string }[] {
    return all('SELECT l.id, l.company_id FROM leads l WHERE l.company_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = l.company_id AND c.is_supplier = 1) AND NOT EXISTS (SELECT 1 FROM deal_leads dl JOIN deals d ON d.id = dl.deal_id WHERE dl.lead_id = l.id AND d.company_id = l.company_id)')
  },
  create(d: { company_id: string; name: string; status_id: string | null; owner_id: string | null; amount?: number | null; expected_close_date?: string | null; is_default: boolean; closed_at?: string | null }): DealRow {
    const id = nanoid(12); const t = nowIso()
    run('INSERT INTO deals (id,company_id,name,status_id,owner_id,amount,expected_close_date,is_default,closed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      id, d.company_id, d.name, d.status_id, d.owner_id, d.amount ?? null, d.expected_close_date ?? null, d.is_default ? 1 : 0, d.closed_at ?? null, t, t)
    return this.byId(id)!
  },
  update(id: string, patch: DealPatch): DealRow {
    const keys = Object.keys(patch) as (keyof DealPatch)[]
    if (keys.length) run(`UPDATE deals SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), nowIso(), id)
    return this.byId(id)!
  },
  delete(id: string) { run('DELETE FROM deals WHERE id = ?', id) },

  leadIds(dealId: string): string[] { return all<{ lead_id: string }>('SELECT lead_id FROM deal_leads WHERE deal_id = ? ORDER BY created_at ASC', dealId).map((r) => r.lead_id) },
  addLead(dealId: string, leadId: string) { run('INSERT OR IGNORE INTO deal_leads (deal_id, lead_id, created_at) VALUES (?,?,?)', dealId, leadId, nowIso()) },
  removeLead(dealId: string, leadId: string) { run('DELETE FROM deal_leads WHERE deal_id = ? AND lead_id = ?', dealId, leadId) },
  /** Drop the lead from every deal that is not of the given company (all deals when null). */
  removeLeadExceptCompany(leadId: string, companyId: string | null) {
    if (companyId) run('DELETE FROM deal_leads WHERE lead_id = ? AND deal_id NOT IN (SELECT id FROM deals WHERE company_id = ?)', leadId, companyId)
    else run('DELETE FROM deal_leads WHERE lead_id = ?', leadId)
  },
  /** The deals a lead takes part in, default first. */
  forLead(leadId: string): DealRow[] { return all<DealRow>(`SELECT d.* FROM deals d JOIN deal_leads dl ON dl.deal_id = d.id WHERE dl.lead_id = ? ${ORDER}`, leadId) },
  /** Every (lead, deal) pair, default first — one query for list pages. */
  allLeadDeals(): LeadDealRow[] { return all<LeadDealRow>(`SELECT d.*, dl.lead_id FROM deals d JOIN deal_leads dl ON dl.deal_id = d.id ${ORDER}`) },
  /** Every deal with its company's name, domain and logo (for the deals view). */
  allWithCompany(): (DealRow & { company_name: string; company_domain: string | null; company_logo_url: string | null })[] {
    return all(`SELECT d.*, c.name company_name, c.domain company_domain, c.logo_url company_logo_url FROM deals d JOIN companies c ON c.id = d.company_id ${ORDER}`)
  },
  /** Every lead of every deal, in the order they joined it. */
  allDealLeads(): (LeadRow & { deal_id: string })[] { return all('SELECT l.*, dl.deal_id FROM deal_leads dl JOIN leads l ON l.id = dl.lead_id ORDER BY dl.created_at ASC, l.id ASC') },
  /** Pipeline counts: deals that have leads, plus leads without a company. */
  countByStatus(): { status_id: string | null; n: number }[] {
    return all(`SELECT status_id, SUM(n) n FROM (
      SELECT status_id, COUNT(*) n FROM deals d WHERE EXISTS (SELECT 1 FROM deal_leads dl WHERE dl.deal_id = d.id) GROUP BY status_id
      UNION ALL SELECT status_id, COUNT(*) n FROM leads WHERE company_id IS NULL GROUP BY status_id) GROUP BY status_id`)
  },
  /** Forget contact persons who are no longer leads of their deal. */
  clearStaleContacts() { run('UPDATE deals SET contact_lead_id = NULL WHERE contact_lead_id IS NOT NULL AND contact_lead_id NOT IN (SELECT lead_id FROM deal_leads WHERE deal_id = deals.id)') },
  /** Re-point deals of a deleted status. */
  moveStatus(from: string, to: string | null) { run('UPDATE deals SET status_id = ? WHERE status_id = ?', to, from) },
}
