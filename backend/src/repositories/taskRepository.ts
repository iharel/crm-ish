/** taskRepository — tasks created from emails or by hand; scoped to their creator. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { TaskRow } from '../types/index.ts'

export interface TaskFilter { ownerId: string; status?: 'open' | 'done' | 'all'; leadId?: string; companyId?: string; threadId?: string; dueBefore?: string }
export type TaskPatch = Partial<Pick<TaskRow, 'title' | 'summary' | 'status' | 'due_at' | 'assignee_id' | 'thread_id' | 'lead_id' | 'company_id' | 'completed_at'>>

export const taskRepository = {
  list(f: TaskFilter): TaskRow[] {
    const where = ['created_by = ?']; const params: unknown[] = [f.ownerId]
    if (f.status && f.status !== 'all') { where.push('status = ?'); params.push(f.status) }
    if (f.leadId) { where.push('lead_id = ?'); params.push(f.leadId) }
    if (f.companyId) { where.push('company_id = ?'); params.push(f.companyId) }
    if (f.threadId) { where.push('thread_id = ?'); params.push(f.threadId) }
    if (f.dueBefore) { where.push('due_at IS NOT NULL AND due_at <= ?'); params.push(f.dueBefore) }
    // Open first, then soonest due, then newest.
    return all<TaskRow>(`SELECT * FROM tasks WHERE ${where.join(' AND ')} ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, due_at IS NULL, due_at ASC, created_at DESC`, ...params)
  },
  byId(id: string) { return get<TaskRow>('SELECT * FROM tasks WHERE id = ?', id) },
  openCount(ownerId: string, f: { threadId?: string; leadId?: string; companyId?: string }): number {
    const where = ["created_by = ? AND status = 'open'"]; const params: unknown[] = [ownerId]
    if (f.threadId) { where.push('thread_id = ?'); params.push(f.threadId) }
    if (f.leadId) { where.push('lead_id = ?'); params.push(f.leadId) }
    if (f.companyId) { where.push('company_id = ?'); params.push(f.companyId) }
    return get<{ n: number }>(`SELECT COUNT(*) n FROM tasks WHERE ${where.join(' AND ')}`, ...params)!.n
  },
  create(d: { title: string; summary: string | null; due_at: string | null; assignee_id: string | null; created_by: string; thread_id: string | null; lead_id: string | null; company_id: string | null }): TaskRow {
    const id = nanoid(12); const t = nowIso()
    run('INSERT INTO tasks (id,title,summary,status,due_at,assignee_id,created_by,thread_id,lead_id,company_id,completed_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', id, d.title, d.summary, 'open', d.due_at, d.assignee_id, d.created_by, d.thread_id, d.lead_id, d.company_id, null, t, t)
    return this.byId(id)!
  },
  update(id: string, patch: TaskPatch): TaskRow {
    const keys = Object.keys(patch) as (keyof TaskPatch)[]
    if (keys.length) run(`UPDATE tasks SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), nowIso(), id)
    return this.byId(id)!
  },
  delete(id: string) { run('DELETE FROM tasks WHERE id = ?', id) },
}
