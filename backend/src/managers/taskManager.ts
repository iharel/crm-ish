/** taskManager — tasks (private to their creator): CRUD, AI title/summary suggestion from an email thread. */
import { badRequest, notFound } from '../middleware/errors.ts'
import { companyRepository } from '../repositories/companyRepository.ts'
import { emailRepository } from '../repositories/emailRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { taskRepository, type TaskFilter, type TaskPatch } from '../repositories/taskRepository.ts'
import { userRepository } from '../repositories/userRepository.ts'
import { llmService } from '../services/llmService.ts'
import { socketService } from '../services/socketService.ts'
import type { TaskRow } from '../types/index.ts'
import { emailManager } from './emailManager.ts'

export interface TaskDto { id: string; title: string; summary: string | null; status: 'open' | 'done'; dueAt: string | null; assigneeId: string | null; assigneeName: string | null; createdBy: string | null; threadId: string | null; threadSubject: string | null; leadId: string | null; leadName: string | null; companyId: string | null; companyName: string | null; completedAt: string | null; createdAt: string; updatedAt: string }
export interface TaskInput { title?: string; summary?: string | null; status?: 'open' | 'done'; dueAt?: string | null; assigneeId?: string | null; threadId?: string | null; leadId?: string | null; companyId?: string | null }

type User = { id: string; role: string }

export const taskManager = {
  toDto(t: TaskRow): TaskDto {
    const lead = t.lead_id ? leadRepository.byId(t.lead_id) : undefined
    const company = t.company_id ? companyRepository.byId(t.company_id) : undefined
    const thread = t.thread_id ? emailRepository.threadById(t.thread_id) : undefined
    const assignee = t.assignee_id ? userRepository.byId(t.assignee_id) : undefined
    return { id: t.id, title: t.title, summary: t.summary, status: t.status, dueAt: t.due_at, assigneeId: t.assignee_id, assigneeName: assignee?.name ?? null, createdBy: t.created_by, threadId: t.thread_id, threadSubject: thread?.subject ?? null, leadId: t.lead_id, leadName: lead ? `${lead.first_name} ${lead.last_name}`.trim() : null, companyId: t.company_id, companyName: company?.name ?? null, completedAt: t.completed_at, createdAt: t.created_at, updatedAt: t.updated_at }
  },
  list(user: User, f: Omit<TaskFilter, 'ownerId'>) { return taskRepository.list({ ...f, ownerId: user.id }).map((t) => this.toDto(t)) },
  openCount(user: User, f: { threadId?: string; leadId?: string; companyId?: string }) { return taskRepository.openCount(user.id, f) },
  own(user: User, id: string): TaskRow {
    const t = taskRepository.byId(id)
    if (!t || t.created_by !== user.id) throw notFound('Task not found')
    return t
  },
  /** Resolve lead/company from the thread when not given; company from the lead when not given. */
  resolveLinks(user: User, d: { threadId?: string | null; leadId?: string | null; companyId?: string | null }) {
    let threadId = d.threadId ?? null; let leadId = d.leadId ?? null; let companyId = d.companyId ?? null
    if (threadId) {
      const t = emailRepository.threadById(threadId); if (!t) throw badRequest('Thread not found')
      if (!emailManager.accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw badRequest('Thread not found')
      leadId = leadId ?? t.lead_id; companyId = companyId ?? t.company_id
    }
    if (leadId) { const l = leadRepository.byId(leadId); if (!l) throw badRequest('Lead not found'); companyId = companyId ?? l.company_id }
    if (companyId && !companyRepository.byId(companyId)) throw badRequest('Company not found')
    return { threadId, leadId, companyId }
  },
  create(user: User, d: TaskInput & { title: string }) {
    if (!d.title.trim()) throw badRequest('Title is required')
    const links = this.resolveLinks(user, d)
    const row = taskRepository.create({ title: d.title.trim(), summary: d.summary?.trim() || null, due_at: d.dueAt ?? null, assignee_id: d.assigneeId ?? user.id, created_by: user.id, thread_id: links.threadId, lead_id: links.leadId, company_id: links.companyId })
    const dto = this.toDto(row); socketService.toUser(user.id, 'task:updated', { type: 'created', task: dto }); return dto
  },
  update(user: User, id: string, d: TaskInput) {
    const existing = this.own(user, id)
    const p: TaskPatch = {}
    if (d.title !== undefined) { if (!d.title.trim()) throw badRequest('Title is required'); p.title = d.title.trim() }
    if (d.summary !== undefined) p.summary = d.summary?.trim() || null
    if (d.dueAt !== undefined) p.due_at = d.dueAt
    if (d.assigneeId !== undefined) p.assignee_id = d.assigneeId
    if (d.threadId !== undefined || d.leadId !== undefined || d.companyId !== undefined) {
      const links = this.resolveLinks(user, { threadId: d.threadId ?? existing.thread_id, leadId: d.leadId ?? existing.lead_id, companyId: d.companyId ?? existing.company_id })
      p.thread_id = links.threadId; p.lead_id = links.leadId; p.company_id = links.companyId
    }
    if (d.status !== undefined && d.status !== existing.status) { p.status = d.status; p.completed_at = d.status === 'done' ? new Date().toISOString() : null }
    const dto = this.toDto(taskRepository.update(id, p)); socketService.toUser(user.id, 'task:updated', { type: 'updated', task: dto }); return dto
  },
  delete(user: User, id: string) { this.own(user, id); taskRepository.delete(id); socketService.toUser(user.id, 'task:updated', { type: 'deleted', id }) },
  /** AI: propose a title and a short summary of what needs to be done, from the thread. Stub fallback when no key is configured. */
  async suggest(user: User, threadId: string): Promise<{ title: string; summary: string; model: string }> {
    const t = emailRepository.threadById(threadId); if (!t) throw notFound('Thread not found')
    if (!emailManager.accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw notFound('Thread not found')
    const msgs = emailRepository.messages(threadId).slice(-6)
    const lead = t.lead_id ? leadRepository.byId(t.lead_id) : undefined
    const company = t.company_id ? companyRepository.byId(t.company_id) : undefined
    const system = 'You turn an email conversation into one actionable task for the sales rep reading it. Return JSON {"title": string (max 70 chars, imperative, no trailing period), "summary": string (1-3 sentences: what exactly needs to be done, for whom, any numbers/dates/constraints mentioned)}. Write in the language of the latest message.'
    const prompt = [
      `Subject: ${t.subject ?? '(no subject)'}`,
      lead ? `Contact: ${lead.first_name} ${lead.last_name}${lead.title ? `, ${lead.title}` : ''}${company ? ` at ${company.name}` : ''}` : company ? `Company: ${company.name}` : '',
      `Conversation (oldest first):\n${msgs.map((m) => `--- ${m.direction === 'in' ? 'THEM' : 'ME'} (${m.sent_at}) ---\n${(m.body_text ?? '').slice(0, 1500)}`).join('\n')}`,
    ].filter(Boolean).join('\n\n')
    const { data, model } = await llmService.completeJson<{ title: string; summary: string }>({ system, user: prompt, model: 'draft', maxTokens: 400 })
    if (data?.title) return { title: String(data.title).slice(0, 120), summary: String(data.summary ?? '').slice(0, 1000), model }
    // Stub: first substantive paragraph of the latest inbound message (skip greetings, quotes and signatures).
    const last = emailRepository.lastInbound(threadId) ?? msgs.at(-1)
    const paras = (last?.body_text ?? '').replace(/\r/g, '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    const greeting = /^(hi|hello|hey|dear|good (morning|afternoon|evening)|שלום|היי|הי|בוקר טוב|ערב טוב)\b[^\n]{0,40}$/i
    const body = paras.find((p) => !greeting.test(p) && !p.startsWith('>') && !/^(on .*wrote:|-{2,}|from:)/i.test(p)) ?? paras[0] ?? ''
    return { title: `Follow up: ${(t.subject ?? 'email').replace(/^(re|fwd?):\s*/i, '').slice(0, 60)}`, summary: body.replace(/\s+/g, ' ').slice(0, 300), model }
  },
}
