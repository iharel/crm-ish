/** leadRepository — leads and lead activities. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { ActivityRow, LeadRow } from '../types/index.ts'

export interface LeadPatch { first_name?: string; last_name?: string; email?: string | null; phone?: string | null; title?: string | null; company_id?: string | null; status_id?: string | null; owner_id?: string | null; source?: string | null; score?: number; linkedin_url?: string | null; notes?: string | null; enrichment_json?: string | null; enriched_at?: string | null; last_activity_at?: string | null }
export interface LeadFilter { q?: string; statusId?: string; ownerId?: string; companyId?: string; /** undefined = active only; true = archived only; 'all' = both */ archived?: boolean | 'all'; /** Leave out contacts of supplier companies that are in no deal (they are not in the pipeline). */ hideSupplierOnly?: boolean }

export const leadRepository = {
  list(f: LeadFilter = {}): LeadRow[] {
    const where: string[] = []; const params: unknown[] = []
    if (f.q) { where.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR title LIKE ?)'); params.push(...Array(4).fill(`%${f.q}%`)) }
    if (f.statusId) { where.push('status_id = ?'); params.push(f.statusId) }
    if (f.ownerId) { where.push('owner_id = ?'); params.push(f.ownerId) }
    if (f.companyId) { where.push('company_id = ?'); params.push(f.companyId) }
    if (f.archived !== 'all') where.push(f.archived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL')
    if (f.hideSupplierOnly) where.push(`NOT (company_id IS NOT NULL AND EXISTS (SELECT 1 FROM companies c WHERE c.id = leads.company_id AND c.is_supplier = 1) AND NOT EXISTS (SELECT 1 FROM deal_leads dl JOIN deals d ON d.id = dl.deal_id WHERE dl.lead_id = leads.id AND d.company_id = leads.company_id))`)
    return all<LeadRow>(`SELECT * FROM leads ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY COALESCE(last_activity_at, updated_at) DESC`, ...params)
  },
  setArchived(id: string, archived: boolean) { run('UPDATE leads SET archived_at = ?, updated_at = ? WHERE id = ?', archived ? nowIso() : null, nowIso(), id); return this.byId(id)! },
  byId(id: string) { return get<LeadRow>('SELECT * FROM leads WHERE id = ?', id) },
  byEmail(email: string) { return get<LeadRow>('SELECT * FROM leads WHERE lower(email) = lower(?)', email) },
  create(d: LeadPatch & { first_name: string }): LeadRow {
    const id = nanoid(12); const t = nowIso()
    run('INSERT INTO leads (id,first_name,last_name,email,phone,title,company_id,status_id,owner_id,source,score,linkedin_url,notes,last_activity_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id, d.first_name, d.last_name ?? '', d.email ?? null, d.phone ?? null, d.title ?? null, d.company_id ?? null, d.status_id ?? null, d.owner_id ?? null, d.source ?? null, d.score ?? 0, d.linkedin_url ?? null, d.notes ?? null, t, t, t)
    return this.byId(id)!
  },
  update(id: string, patch: LeadPatch): LeadRow {
    const keys = Object.keys(patch) as (keyof LeadPatch)[]
    if (keys.length) run(`UPDATE leads SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), nowIso(), id)
    return this.byId(id)!
  },
  touch(id: string) { run('UPDATE leads SET last_activity_at = ? WHERE id = ?', nowIso(), id) },
  delete(id: string) { run('DELETE FROM leads WHERE id = ?', id) },
  countByStatus(): { status_id: string | null; n: number }[] { return all('SELECT status_id, COUNT(*) n FROM leads GROUP BY status_id') },

  activities(leadId: string): ActivityRow[] { return all<ActivityRow>('SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY created_at DESC LIMIT 200', leadId) },
  addActivity(leadId: string, userId: string | null, type: string, payload: unknown): ActivityRow {
    const id = nanoid(12); const t = nowIso()
    run('INSERT INTO lead_activities (id,lead_id,user_id,type,payload_json,created_at) VALUES (?,?,?,?,?,?)', id, leadId, userId, type, JSON.stringify(payload ?? {}), t)
    this.touch(leadId)
    return get<ActivityRow>('SELECT * FROM lead_activities WHERE id = ?', id)!
  },
  recentActivities(limit = 20): (ActivityRow & { lead_name: string })[] {
    return all(`SELECT a.*, (l.first_name || ' ' || l.last_name) lead_name FROM lead_activities a JOIN leads l ON l.id = a.lead_id ORDER BY a.created_at DESC LIMIT ?`, limit)
  },
}
