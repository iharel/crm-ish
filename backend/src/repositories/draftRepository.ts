/** draftRepository — AI email drafts. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { DraftRow } from '../types/index.ts'

export const draftRepository = {
  byId(id: string) { return get<DraftRow>('SELECT * FROM email_drafts WHERE id = ?', id) },
  forThread(threadId: string): DraftRow[] { return all<DraftRow>(`SELECT * FROM email_drafts WHERE thread_id = ? ORDER BY created_at DESC`, threadId) },
  forLead(leadId: string): DraftRow[] { return all<DraftRow>(`SELECT * FROM email_drafts WHERE lead_id = ? ORDER BY created_at DESC`, leadId) },
  proposedForThread(threadId: string) { return get<DraftRow>(`SELECT * FROM email_drafts WHERE thread_id = ? AND status = 'proposed' ORDER BY created_at DESC LIMIT 1`, threadId) },
  listForUser(userId: string, status?: string): DraftRow[] {
    return status ? all<DraftRow>('SELECT * FROM email_drafts WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 100', userId, status)
      : all<DraftRow>('SELECT * FROM email_drafts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', userId)
  },
  create(d: Omit<DraftRow, 'id' | 'created_at' | 'updated_at' | 'status'>) {
    const id = nanoid(12); const t = nowIso()
    run('INSERT INTO email_drafts (id,thread_id,lead_id,user_id,kind,subject,body_html,body_text,citations_json,slots_json,model,confidence,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id, d.thread_id, d.lead_id, d.user_id, d.kind, d.subject, d.body_html, d.body_text, d.citations_json, d.slots_json, d.model, d.confidence, 'proposed', t, t)
    return this.byId(id)!
  },
  update(id: string, patch: Partial<Pick<DraftRow, 'subject' | 'body_html' | 'body_text' | 'status'>>) {
    const keys = Object.keys(patch) as (keyof typeof patch)[]
    if (keys.length) run(`UPDATE email_drafts SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), nowIso(), id)
    return this.byId(id)!
  },
  dismissOthers(threadId: string, keepId: string) { run(`UPDATE email_drafts SET status='dismissed', updated_at=? WHERE thread_id = ? AND id != ? AND status='proposed'`, nowIso(), threadId, keepId) },
  stats(userId: string, sinceIso: string) {
    return get<{ total: number; sent: number }>(`SELECT COUNT(*) total, SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) sent FROM email_drafts WHERE user_id = ? AND created_at >= ?`, userId, sinceIso)!
  },
}
