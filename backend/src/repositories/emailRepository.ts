/** emailRepository — threads, messages, tracking events. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { EventRow, MessageRow, ThreadRow } from '../types/index.ts'

export interface ThreadFilter { accountIds: string[]; q?: string; unread?: boolean; unlinked?: boolean; /** Threads with at least one outbound message. */ sent?: boolean; /** Threads with at least one inbound message. */ inbound?: boolean; /** Which message orders/pages the list: latest inbound ('in'), latest outbound ('out') or latest of either ('any'). Default: the thread's last_message_at. */ sort?: 'in' | 'out' | 'any'; leadId?: string; companyId?: string; /** false (default) = not archived; true = archived only; 'all' = both. */ archived?: boolean | 'all'; limit?: number; before?: string }

export const emailRepository = {
  threads(f: ThreadFilter): (ThreadRow & { message_count: number; has_draft: number; last_out_status: string | null; last_from: string | null; last_direction: 'in' | 'out' | null; last_to: string | null; last_out_at: string | null; sort_at: string | null })[] {
    // Inbox orders by the latest inbound message, Sent by the latest outbound one (as Gmail's Sent does), Threads by the latest message either way.
    const lastOut = `(SELECT MAX(o.sent_at) FROM email_messages o WHERE o.thread_id = t.id AND o.direction = 'out')`
    const lastIn = `(SELECT MAX(i.sent_at) FROM email_messages i WHERE i.thread_id = t.id AND i.direction = 'in')`
    const lastAny = `COALESCE((SELECT MAX(a.sent_at) FROM email_messages a WHERE a.thread_id = t.id), t.last_message_at)`
    const sortKey = f.sort === 'out' ? lastOut : f.sort === 'in' ? lastIn : f.sort === 'any' ? lastAny : 't.last_message_at'
    if (!f.accountIds.length && !f.leadId && !f.companyId) return []
    const where: string[] = []; const params: unknown[] = []
    if (f.accountIds.length) { where.push(`t.google_account_id IN (${f.accountIds.map(() => '?').join(',')})`); params.push(...f.accountIds) }
    if (f.q) { where.push('(t.subject LIKE ? OR t.snippet LIKE ?)'); params.push(`%${f.q}%`, `%${f.q}%`) }
    if (f.unread) where.push('t.unread = 1')
    if (f.unlinked) where.push('t.lead_id IS NULL')
    if (f.leadId) { where.push('t.lead_id = ?'); params.push(f.leadId) }
    if (f.companyId) { where.push('t.company_id = ?'); params.push(f.companyId) }
    if (f.sent) where.push(`EXISTS (SELECT 1 FROM email_messages o WHERE o.thread_id = t.id AND o.direction = 'out')`)
    if (f.inbound) where.push(`EXISTS (SELECT 1 FROM email_messages i WHERE i.thread_id = t.id AND i.direction = 'in')`)
    if (f.archived !== 'all') where.push(`t.archived = ${f.archived ? 1 : 0}`)
    if (f.before) { where.push(`${sortKey} < ?`); params.push(f.before) }
    return all(`SELECT t.*, (SELECT COUNT(*) FROM email_messages m WHERE m.thread_id = t.id) message_count,
      (SELECT COUNT(*) FROM email_drafts d WHERE d.thread_id = t.id AND d.status = 'proposed') has_draft,
      (SELECT o.status FROM email_messages o WHERE o.thread_id = t.id AND o.direction = 'out' ORDER BY o.sent_at DESC LIMIT 1) last_out_status,
      (SELECT l.from_addr FROM email_messages l WHERE l.thread_id = t.id ORDER BY l.sent_at DESC LIMIT 1) last_from,
      (SELECT l.direction FROM email_messages l WHERE l.thread_id = t.id ORDER BY l.sent_at DESC LIMIT 1) last_direction,
      (SELECT l.to_json FROM email_messages l WHERE l.thread_id = t.id ORDER BY l.sent_at DESC LIMIT 1) last_to,
      ${lastOut} last_out_at, ${sortKey} sort_at
      FROM email_threads t WHERE ${where.join(' AND ')} ORDER BY ${sortKey} DESC LIMIT ?`, ...params, f.limit ?? 100)
  },
  deleteThread(id: string) { run('DELETE FROM email_threads WHERE id = ?', id) },
  threadById(id: string) { return get<ThreadRow>('SELECT * FROM email_threads WHERE id = ?', id) },
  threadByGmail(accountId: string, gmailThreadId: string) { return get<ThreadRow>('SELECT * FROM email_threads WHERE google_account_id = ? AND gmail_thread_id = ?', accountId, gmailThreadId) },
  /** Gmail thread ids of the account's most recently active threads (newest first), for archive reconciliation when Gmail history is unavailable. */
  recentGmailThreadIds(accountId: string, limit: number): string[] { return all<{ gmail_thread_id: string }>('SELECT gmail_thread_id FROM email_threads WHERE google_account_id = ? ORDER BY last_message_at DESC LIMIT ?', accountId, limit).map((r) => r.gmail_thread_id) },
  createThread(d: { google_account_id: string; gmail_thread_id: string; subject: string | null; snippet: string | null; lead_id: string | null; company_id: string | null; last_message_at: string | null; unread: boolean; archived?: boolean }) {
    const id = nanoid(12)
    run('INSERT INTO email_threads (id,google_account_id,gmail_thread_id,subject,snippet,lead_id,company_id,last_message_at,unread,archived,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)', id, d.google_account_id, d.gmail_thread_id, d.subject, d.snippet, d.lead_id, d.company_id, d.last_message_at, d.unread ? 1 : 0, d.archived ? 1 : 0, nowIso())
    return this.threadById(id)!
  },
  updateThread(id: string, patch: Partial<Pick<ThreadRow, 'subject' | 'snippet' | 'lead_id' | 'company_id' | 'last_message_at' | 'unread' | 'archived'>>) {
    const keys = Object.keys(patch) as (keyof typeof patch)[]
    if (keys.length) run(`UPDATE email_threads SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), id)
    return this.threadById(id)!
  },
  unreadCount(accountIds: string[]) {
    if (!accountIds.length) return 0
    return get<{ n: number }>(`SELECT COUNT(*) n FROM email_threads WHERE unread = 1 AND archived = 0 AND google_account_id IN (${accountIds.map(() => '?').join(',')})`, ...accountIds)!.n
  },

  /** ISO sent_at of the oldest message across the given accounts, or null when empty. */
  oldestMessageAt(accountIds: string[]): string | null {
    if (!accountIds.length) return null
    return get<{ v: string | null }>(`SELECT MIN(m.sent_at) v FROM email_messages m JOIN email_threads t ON t.id = m.thread_id WHERE t.google_account_id IN (${accountIds.map(() => '?').join(',')})`, ...accountIds)?.v ?? null
  },
  messages(threadId: string): MessageRow[] { return all<MessageRow>('SELECT * FROM email_messages WHERE thread_id = ? ORDER BY sent_at ASC', threadId) },
  messageCount(threadId: string) { return get<{ n: number }>('SELECT COUNT(*) n FROM email_messages WHERE thread_id = ?', threadId)!.n },
  /** Status of the thread's most recent outbound message, or null. */
  /** Sender and direction of the thread's newest message. */
  lastSender(threadId: string) { return get<{ from_addr: string | null; direction: 'in' | 'out'; to_json: string | null }>('SELECT from_addr, direction, to_json FROM email_messages WHERE thread_id = ? ORDER BY sent_at DESC LIMIT 1', threadId) ?? null },
  lastOutboundStatus(threadId: string): string | null { return get<{ status: string }>(`SELECT status FROM email_messages WHERE thread_id = ? AND direction = 'out' ORDER BY sent_at DESC LIMIT 1`, threadId)?.status ?? null },
  /** Messages imported before attachment support, newest first (background backfill). */
  unscannedMessages(limit: number): MessageRow[] { return all<MessageRow>('SELECT * FROM email_messages WHERE attachments_scanned = 0 AND gmail_message_id IS NOT NULL ORDER BY sent_at DESC LIMIT ?', limit) },
  messageById(id: string) { return get<MessageRow>('SELECT * FROM email_messages WHERE id = ?', id) },
  messageByGmail(gmailId: string) { return get<MessageRow>('SELECT * FROM email_messages WHERE gmail_message_id = ?', gmailId) },
  messageByToken(token: string) { return get<MessageRow>('SELECT * FROM email_messages WHERE tracking_token = ?', token) },
  hasInbound(threadId: string) { return !!get(`SELECT 1 x FROM email_messages WHERE thread_id = ? AND direction = 'in' LIMIT 1`, threadId) },
  /** Gmail thread ids of the account's newest threads that sit in the CRM inbox (not archived, with inbound mail). */
  inboxGmailThreadIds(accountId: string, limit: number): string[] {
    return all<{ gmail_thread_id: string }>(`SELECT t.gmail_thread_id FROM email_threads t WHERE t.google_account_id = ? AND t.archived = 0 AND EXISTS (SELECT 1 FROM email_messages i WHERE i.thread_id = t.id AND i.direction = 'in') ORDER BY t.last_message_at DESC LIMIT ?`, accountId, limit).map((r) => r.gmail_thread_id)
  },
  lastInbound(threadId: string) { return get<MessageRow>(`SELECT * FROM email_messages WHERE thread_id = ? AND direction = 'in' ORDER BY sent_at DESC LIMIT 1`, threadId) },
  createMessage(d: Omit<MessageRow, 'id' | 'created_at' | 'attachments_scanned'> & { attachments_scanned?: number }) {
    const id = nanoid(14)
    run('INSERT INTO email_messages (id,thread_id,gmail_message_id,direction,from_addr,to_json,cc_json,bcc_json,subject,body_text,body_html,sent_at,tracking_token,status,attachments_scanned,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id, d.thread_id, d.gmail_message_id, d.direction, d.from_addr, d.to_json, d.cc_json, d.bcc_json, d.subject, d.body_text, d.body_html, d.sent_at, d.tracking_token, d.status, d.attachments_scanned ?? 1, nowIso())
    return this.messageById(id)!
  },
  /** Thread ids (from the given set) that have at least one non-inline attachment. */
  threadsWithAttachments(threadIds: string[]): Set<string> {
    if (!threadIds.length) return new Set()
    return new Set(all<{ thread_id: string }>(`SELECT DISTINCT m.thread_id FROM email_attachments a JOIN email_messages m ON m.id = a.message_id WHERE a.is_inline = 0 AND m.thread_id IN (${threadIds.map(() => '?').join(',')})`, ...threadIds).map((r) => r.thread_id))
  },
  updateMessage(id: string, patch: Partial<Pick<MessageRow, 'status' | 'gmail_message_id' | 'attachments_scanned'>>) {
    const keys = Object.keys(patch) as (keyof typeof patch)[]
    if (keys.length) run(`UPDATE email_messages SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), id)
  },
  outboundByHeaderMessageId(rfcId: string) { return get<MessageRow>(`SELECT * FROM email_messages WHERE direction='out' AND body_html LIKE ?`, `%${rfcId}%`) },

  addEvent(messageId: string, type: string, meta: { ip?: string; userAgent?: string; url?: string }) {
    const id = nanoid(12)
    run('INSERT INTO email_events (id,message_id,type,ip,user_agent,url,created_at) VALUES (?,?,?,?,?,?,?)', id, messageId, type, meta.ip ?? null, meta.userAgent ?? null, meta.url ?? null, nowIso())
    return get<EventRow>('SELECT * FROM email_events WHERE id = ?', id)!
  },
  events(messageId: string): EventRow[] { return all<EventRow>('SELECT * FROM email_events WHERE message_id = ? ORDER BY created_at DESC', messageId) },
  recentEvents(accountIds: string[], limit = 30): (EventRow & { subject: string | null; to_json: string | null; lead_id: string | null })[] {
    if (!accountIds.length) return []
    return all(`SELECT e.*, m.subject, m.to_json, t.lead_id FROM email_events e JOIN email_messages m ON m.id = e.message_id JOIN email_threads t ON t.id = m.thread_id WHERE t.google_account_id IN (${accountIds.map(() => '?').join(',')}) ORDER BY e.created_at DESC LIMIT ?`, ...accountIds, limit)
  },
  outboundStats(accountIds: string[], sinceIso: string) {
    if (!accountIds.length) return { sent: 0, opened: 0, clicked: 0, bounced: 0 }
    const r = get<{ sent: number; opened: number; clicked: number; bounced: number }>(`SELECT COUNT(*) sent,
      SUM(CASE WHEN m.status IN ('opened','clicked') THEN 1 ELSE 0 END) opened,
      SUM(CASE WHEN m.status = 'clicked' THEN 1 ELSE 0 END) clicked,
      SUM(CASE WHEN m.status = 'bounced' THEN 1 ELSE 0 END) bounced
      FROM email_messages m JOIN email_threads t ON t.id = m.thread_id WHERE m.direction='out' AND m.sent_at >= ? AND t.google_account_id IN (${accountIds.map(() => '?').join(',')})`, sinceIso, ...accountIds)!
    return { sent: r.sent ?? 0, opened: r.opened ?? 0, clicked: r.clicked ?? 0, bounced: r.bounced ?? 0 }
  },
  outboundMessages(accountIds: string[], limit = 50): (MessageRow & { lead_id: string | null; opens: number; clicks: number })[] {
    if (!accountIds.length) return []
    return all(`SELECT m.*, t.lead_id,
      (SELECT COUNT(*) FROM email_events e WHERE e.message_id = m.id AND e.type='open') opens,
      (SELECT COUNT(*) FROM email_events e WHERE e.message_id = m.id AND e.type='click') clicks
      FROM email_messages m JOIN email_threads t ON t.id = m.thread_id WHERE m.direction='out' AND t.google_account_id IN (${accountIds.map(() => '?').join(',')}) ORDER BY m.sent_at DESC LIMIT ?`, ...accountIds, limit)
  },
}
