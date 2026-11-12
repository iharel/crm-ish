/** companyDomainRepository — company_domains rows (lower-cased, unique across companies). */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { CompanyDomainRow } from '../types/index.ts'

export const companyDomainRepository = {
  all(): CompanyDomainRow[] { return all<CompanyDomainRow>('SELECT * FROM company_domains ORDER BY is_primary DESC, created_at ASC') },
  byCompany(companyId: string): CompanyDomainRow[] { return all<CompanyDomainRow>('SELECT * FROM company_domains WHERE company_id = ? ORDER BY is_primary DESC, created_at ASC', companyId) },
  byDomain(domain: string) { return get<CompanyDomainRow>('SELECT * FROM company_domains WHERE domain = ?', domain.toLowerCase()) },
  /** Company ids that have at least one domain. */
  companyIdsWithDomains(): Set<string> { return new Set(all<{ company_id: string }>('SELECT DISTINCT company_id FROM company_domains').map((r) => r.company_id)) },
  add(companyId: string, domain: string, isPrimary: boolean) {
    run('INSERT INTO company_domains (id, company_id, domain, is_primary, created_at) VALUES (?,?,?,?,?)', nanoid(12), companyId, domain.toLowerCase(), isPrimary ? 1 : 0, nowIso())
  },
  setPrimary(companyId: string, domain: string) {
    run('UPDATE company_domains SET is_primary = CASE WHEN domain = ? THEN 1 ELSE 0 END WHERE company_id = ?', domain.toLowerCase(), companyId)
  },
  remove(companyId: string, domain: string) { run('DELETE FROM company_domains WHERE company_id = ? AND domain = ?', companyId, domain.toLowerCase()) },
}
