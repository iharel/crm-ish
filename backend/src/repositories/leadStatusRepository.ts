/** leadStatusRepository — configurable pipeline stages. */
import { nanoid } from 'nanoid'
import { all, get, run, tx } from '../db/dbAccessor.ts'
import type { LeadStatusRow } from '../types/index.ts'

export const leadStatusRepository = {
  list(): LeadStatusRow[] { return all<LeadStatusRow>('SELECT * FROM lead_statuses ORDER BY sort_order ASC') },
  byId(id: string) { return get<LeadStatusRow>('SELECT * FROM lead_statuses WHERE id = ?', id) },
  default() { return get<LeadStatusRow>('SELECT * FROM lead_statuses WHERE is_default = 1') ?? get<LeadStatusRow>('SELECT * FROM lead_statuses ORDER BY sort_order LIMIT 1') },
  create(d: { name: string; color: string; isWon?: boolean; isLost?: boolean; isDefault?: boolean }) {
    const id = nanoid(10)
    const max = get<{ m: number | null }>('SELECT MAX(sort_order) m FROM lead_statuses')!.m ?? -1
    tx(() => {
      if (d.isDefault) run('UPDATE lead_statuses SET is_default = 0')
      run('INSERT INTO lead_statuses (id,name,color,sort_order,is_won,is_lost,is_default) VALUES (?,?,?,?,?,?,?)', id, d.name, d.color, max + 1, d.isWon ? 1 : 0, d.isLost ? 1 : 0, d.isDefault ? 1 : 0)
    })
    return this.byId(id)!
  },
  update(id: string, d: { name?: string; color?: string; isWon?: boolean; isLost?: boolean; isDefault?: boolean }) {
    tx(() => {
      if (d.isDefault) run('UPDATE lead_statuses SET is_default = 0')
      const sets: string[] = []; const vals: unknown[] = []
      if (d.name !== undefined) { sets.push('name = ?'); vals.push(d.name) }
      if (d.color !== undefined) { sets.push('color = ?'); vals.push(d.color) }
      if (d.isWon !== undefined) { sets.push('is_won = ?'); vals.push(d.isWon ? 1 : 0) }
      if (d.isLost !== undefined) { sets.push('is_lost = ?'); vals.push(d.isLost ? 1 : 0) }
      if (d.isDefault !== undefined) { sets.push('is_default = ?'); vals.push(d.isDefault ? 1 : 0) }
      if (sets.length) run(`UPDATE lead_statuses SET ${sets.join(', ')} WHERE id = ?`, ...vals, id)
    })
    return this.byId(id)!
  },
  reorder(ids: string[]) { tx(() => ids.forEach((id, i) => run('UPDATE lead_statuses SET sort_order = ? WHERE id = ?', i, id))) },
  delete(id: string, moveLeadsTo: string | null) {
    tx(() => {
      run('UPDATE leads SET status_id = ? WHERE status_id = ?', moveLeadsTo, id)
      run('UPDATE deals SET status_id = ? WHERE status_id = ?', moveLeadsTo, id)
      run('DELETE FROM lead_statuses WHERE id = ?', id)
    })
  },
  /** Pipeline items in a stage: deals that have leads, plus leads without a company. */
  countLeads(id: string) {
    return get<{ n: number }>('SELECT (SELECT COUNT(*) FROM deals d WHERE d.status_id = ? AND EXISTS (SELECT 1 FROM deal_leads dl WHERE dl.deal_id = d.id)) + (SELECT COUNT(*) FROM leads WHERE status_id = ? AND company_id IS NULL) n', id, id)!.n
  },
}
