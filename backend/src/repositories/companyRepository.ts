/** companyRepository — companies. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { CompanyRow } from '../types/index.ts'

export interface CompanyPatch { name?: string; domain?: string | null; website?: string | null; industry?: string | null; size?: string | null; location?: string | null; description?: string | null; logo_url?: string | null; linkedin_url?: string | null; owner_id?: string | null; enrichment_json?: string | null; enriched_at?: string | null; is_supplier?: number }

export const companyRepository = {
  /** `kind`: 'supplier' = suppliers only, 'company' = everything else, 'all' (default) = both. */
  list(q?: string, kind: 'company' | 'supplier' | 'all' = 'all'): (CompanyRow & { lead_count: number })[] {
    const where: string[] = []; const params: unknown[] = []
    if (q) { where.push('(c.name LIKE ? OR c.domain LIKE ?)'); params.push(`%${q}%`, `%${q}%`) }
    if (kind !== 'all') where.push(`c.is_supplier = ${kind === 'supplier' ? 1 : 0}`)
    return all(`SELECT c.*, (SELECT COUNT(*) FROM leads l WHERE l.company_id = c.id) lead_count FROM companies c ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.updated_at DESC`, ...params)
  },
  byId(id: string) { return get<CompanyRow>('SELECT * FROM companies WHERE id = ?', id) },
  byName(name: string) { return get<CompanyRow>('SELECT * FROM companies WHERE lower(name) = lower(?)', name.trim()) },
  /** Light projection for domain matching (all companies). */
  domains(): { id: string; name: string; domain: string | null; website: string | null }[] { return all('SELECT id, name, domain, website FROM companies') },
  byDomain(domain: string) { return get<CompanyRow>('SELECT * FROM companies WHERE lower(domain) = lower(?)', domain) },
  create(d: CompanyPatch & { name: string }): CompanyRow {
    const id = nanoid(12); const t = nowIso()
    run('INSERT INTO companies (id,name,domain,website,industry,size,location,description,logo_url,linkedin_url,owner_id,is_supplier,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id, d.name, d.domain ?? null, d.website ?? null, d.industry ?? null, d.size ?? null, d.location ?? null, d.description ?? null, d.logo_url ?? null, d.linkedin_url ?? null, d.owner_id ?? null, d.is_supplier ? 1 : 0, t, t)
    return this.byId(id)!
  },
  update(id: string, patch: CompanyPatch): CompanyRow {
    const keys = Object.keys(patch) as (keyof CompanyPatch)[]
    if (keys.length) run(`UPDATE companies SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), nowIso(), id)
    return this.byId(id)!
  },
  delete(id: string) { run('DELETE FROM companies WHERE id = ?', id) },
}
