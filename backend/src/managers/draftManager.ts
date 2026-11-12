/** draftManager — RAG-grounded AI reply drafts; propose/edit/send/dismiss. */
import { badRequest, notFound } from '../middleware/errors.ts'
import { companyRepository } from '../repositories/companyRepository.ts'
import { draftRepository } from '../repositories/draftRepository.ts'
import { emailRepository } from '../repositories/emailRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { userRepository } from '../repositories/userRepository.ts'
import { llmService } from '../services/llmService.ts'
import { notificationService } from '../services/notificationService.ts'
import { socketService } from '../services/socketService.ts'
import { textService } from '../services/textService.ts'
import type { Citation, DraftRow } from '../types/index.ts'
import { calendarManager } from './calendarManager.ts'
import { emailManager } from './emailManager.ts'
import { knowledgeManager } from './knowledgeManager.ts'

export interface DraftDto { id: string; threadId: string | null; leadId: string | null; kind: string; subject: string | null; bodyText: string; bodyHtml: string; citations: Citation[]; slots: { start: string; end: string; label: string }[]; model: string | null; confidence: number | null; status: string; createdAt: string; updatedAt: string }

export const draftManager = {
  toDto(d: DraftRow): DraftDto {
    return { id: d.id, threadId: d.thread_id, leadId: d.lead_id, kind: d.kind, subject: d.subject, bodyText: d.body_text ?? '', bodyHtml: d.body_html ?? '', citations: d.citations_json ? JSON.parse(d.citations_json) : [], slots: d.slots_json ? JSON.parse(d.slots_json) : [], model: d.model, confidence: d.confidence, status: d.status, createdAt: d.created_at, updatedAt: d.updated_at }
  },
  list(userId: string, f: { threadId?: string; leadId?: string; status?: string }) {
    // Drafts quote private mail, so a user only ever gets their own.
    const rows = f.threadId ? draftRepository.forThread(f.threadId) : f.leadId ? draftRepository.forLead(f.leadId) : draftRepository.listForUser(userId, f.status)
    return rows.filter((d) => d.user_id === userId).map((d) => this.toDto(d))
  },
  get(id: string) { const d = draftRepository.byId(id); if (!d) throw notFound('Draft not found'); return this.toDto(d) },

  async autoDraft(threadId: string, userId: string) {
    const existing = draftRepository.proposedForThread(threadId)
    if (existing) draftRepository.update(existing.id, { status: 'dismissed' })
    return this.generate(userId, { threadId, kind: 'reply' })
  },

  async generate(userId: string, d: { threadId?: string; leadId?: string; kind: 'reply' | 'new' | 'follow_up'; instructions?: string }) {
    const user = userRepository.byId(userId); if (!user) throw badRequest('User not found')
    const thread = d.threadId ? emailRepository.threadById(d.threadId) : undefined
    if (d.threadId && (!thread || !emailManager.accountIdsFor(userId, user.role).includes(thread.google_account_id))) throw notFound('Thread not found')
    const leadId = d.leadId ?? thread?.lead_id ?? null
    const lead = leadId ? leadRepository.byId(leadId) : undefined
    const company = lead?.company_id ? companyRepository.byId(lead.company_id) : undefined
    const messages = thread ? emailRepository.messages(thread.id).slice(-6) : []
    const lastIn = thread ? emailRepository.lastInbound(thread.id) : undefined

    const query = [lastIn?.subject, lastIn?.body_text?.slice(0, 1500), d.instructions, lead?.title, company?.industry].filter(Boolean).join('\n')
    const citations = query ? await knowledgeManager.search(query) : []
    const slots = await calendarManager.proposeSlots(userId, 2).catch(() => [])
    const slotText = slots.length ? slots.map((s) => s.label).join(' or ') : ''

    const system = `You are ${user.name}, a sales representative, writing an email on their behalf. Write in a warm, concise, professional tone. Plain text only (no markdown, no asterisks). Use the knowledge snippets to answer questions accurately; never invent product facts not present in them. If the prospect asked something the snippets do not cover, say you'll confirm and follow up. ${slotText ? `When a meeting makes sense, offer these slots verbatim: ${slotText}${user.scheduling_link ? ` and include the scheduling link ${user.scheduling_link}` : ''}.` : user.scheduling_link ? `If a meeting makes sense, include the scheduling link ${user.scheduling_link}.` : ''} Sign off with "${user.name}". Return JSON: {"subject": string, "body": string, "confidence": number between 0 and 1 describing how well the knowledge covered the prospect's questions}.`
    const user_prompt = [
      company?.is_supplier ? `Important: ${company.name} is one of OUR SUPPLIERS (we are their customer), not a prospect. Do not pitch or sell; write as a customer handling a supplier matter. "Prospect" below means this supplier contact.` : '',
      lead ? `Prospect: ${lead.first_name} ${lead.last_name}, ${lead.title ?? 'unknown title'} at ${company?.name ?? 'unknown company'}${company?.industry ? ` (${company.industry})` : ''}.` : 'Prospect: unknown.',
      lead?.enrichment_json ? `Prospect insights: ${lead.enrichment_json.slice(0, 800)}` : '',
      lead?.notes ? `Internal notes: ${lead.notes}` : '',
      messages.length ? `Conversation so far (oldest first):\n${messages.map((m) => `--- ${m.direction === 'in' ? 'THEM' : 'ME'} (${m.sent_at}) ---\n${(m.body_text ?? '').slice(0, 2000)}`).join('\n')}` : '',
      citations.length ? `Knowledge snippets:\n${citations.map((c, i) => `[${i + 1}] (${c.sourceTitle}) ${c.snippet}`).join('\n\n')}` : 'Knowledge snippets: none available.',
      d.kind === 'new' ? `Task: write a first outreach email.${d.instructions ? ` Instructions: ${d.instructions}` : ''}` : d.kind === 'follow_up' ? `Task: write a short follow-up email.${d.instructions ? ` Instructions: ${d.instructions}` : ''}` : `Task: reply to the latest message from THEM.${d.instructions ? ` Instructions: ${d.instructions}` : ''}`,
    ].filter(Boolean).join('\n\n')

    const { data, model } = await llmService.completeJson<{ subject: string; body: string; confidence: number }>({ system, user: user_prompt, model: 'draft', maxTokens: 1200 })
    let subject: string; let body: string; let confidence: number
    if (data?.body) { subject = data.subject || (thread?.subject ? `Re: ${thread.subject.replace(/^re:\s*/i, '')}` : 'Hello'); body = data.body.replace(/\*\*/g, ''); confidence = Math.max(0, Math.min(1, Number(data.confidence) || 0.5)) }
    else {
      subject = thread?.subject ? `Re: ${thread.subject.replace(/^re:\s*/i, '')}` : 'Following up'
      body = `Hi ${lead?.first_name ?? 'there'},\n\n${d.kind === 'reply' ? 'Thanks for your message. ' : d.kind === 'follow_up' ? 'Just following up on my last note. ' : `I'm reaching out${company?.name ? ` because ${company.name}` : ''}${d.instructions ? ` — ${d.instructions}` : ' to see if we can help'}. `}${citations[0] ? `Here is what I can share: ${citations[0].snippet.slice(0, 300)}` : "I'd be glad to share more details."}\n\n${slotText ? `Would ${slotText} work for a quick call?${user.scheduling_link ? ` You can also pick any slot here: ${user.scheduling_link}` : ''}\n\n` : ''}Best,\n${user.name}`
      confidence = citations.length ? 0.4 : 0.2
    }
    const row = draftRepository.create({ thread_id: thread?.id ?? null, lead_id: leadId, user_id: userId, kind: d.kind, subject, body_text: body, body_html: textService.textToHtml(body), citations_json: JSON.stringify(citations), slots_json: JSON.stringify(slots), model, confidence })
    if (thread) draftRepository.dismissOthers(thread.id, row.id)
    const dto = this.toDto(row)
    socketService.toUser(userId, 'draft:ready', dto)
    if (thread && d.kind === 'reply') notificationService.notify(userId, { type: 'draft', title: 'AI draft ready', body: `${lead ? `${lead.first_name} ${lead.last_name}`.trim() : thread.subject ?? ''}`, link: `/inbox/${thread.id}` })
    return dto
  },
  update(userId: string, id: string, d: { subject?: string; bodyText?: string }) {
    const row = draftRepository.byId(id); if (!row || row.user_id !== userId) throw notFound('Draft not found')
    const patch: Partial<DraftRow> = { status: row.status === 'proposed' ? 'edited' : row.status }
    if (d.subject !== undefined) patch.subject = d.subject
    if (d.bodyText !== undefined) { patch.body_text = d.bodyText; patch.body_html = textService.textToHtml(d.bodyText) }
    return this.toDto(draftRepository.update(id, patch))
  },
  dismiss(userId: string, id: string) {
    const row = draftRepository.byId(id); if (!row || row.user_id !== userId) throw notFound('Draft not found')
    return this.toDto(draftRepository.update(id, { status: 'dismissed' }))
  },
  async send(userId: string, id: string, d: { to?: string[]; subject?: string; bodyText?: string }) {
    const row = draftRepository.byId(id); if (!row || row.user_id !== userId) throw notFound('Draft not found')
    const thread = row.thread_id ? emailRepository.threadById(row.thread_id) : undefined
    const lead = row.lead_id ? leadRepository.byId(row.lead_id) : undefined
    let to = d.to ?? []
    if (!to.length && thread) { const last = emailRepository.lastInbound(thread.id); if (last?.from_addr) to = [last.from_addr] }
    if (!to.length && lead?.email) to = [lead.email]
    if (!to.length) throw badRequest('No recipient')
    const bodyText = d.bodyText ?? row.body_text ?? ''
    const sent = await emailManager.send(userId, { to, subject: d.subject ?? row.subject ?? '', bodyText, threadId: thread?.id, leadId: row.lead_id })
    draftRepository.update(id, { status: 'sent', body_text: bodyText, body_html: textService.textToHtml(bodyText), subject: d.subject ?? row.subject })
    return sent
  },
}
