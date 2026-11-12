/** emailManager — Gmail sync (history + full), thread/lead linking, send/reply with tracking. */
import type { gmail_v1 } from 'googleapis'
import { badRequest, conflict, notFound } from '../middleware/errors.ts'
import { CONSTANTS } from '../constants.ts'
import { nowIso } from '../db/dbAccessor.ts'
import { companyRepository } from '../repositories/companyRepository.ts'
import { emailRepository, type ThreadFilter } from '../repositories/emailRepository.ts'
import { googleRepository } from '../repositories/googleRepository.ts'
import { attachmentRepository } from '../repositories/attachmentRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { settingsRepository } from '../repositories/settingsRepository.ts'
import { userRepository } from '../repositories/userRepository.ts'
import { cryptoService } from '../services/cryptoService.ts'
import { googleService } from '../services/googleService.ts'
import { mimeService } from '../services/mimeService.ts'
import { notificationService } from '../services/notificationService.ts'
import { socketService } from '../services/socketService.ts'
import { textService } from '../services/textService.ts'
import type { CompanyRow, GoogleAccountRow, MessageRow, ThreadRow } from '../types/index.ts'
import { leadManager } from './leadManager.ts'
import { companyManager, type CompanySuggestion } from './companyManager.ts'
import { attachmentManager, type AttachmentDto } from './attachmentManager.ts'
import { signatureManager } from './signatureManager.ts'

export interface ThreadDto { id: string; subject: string | null; snippet: string | null; leadId: string | null; leadName: string | null; companyId: string | null; companyName: string | null; lastMessageAt: string | null; /** Newest outbound message; only list queries fill it (null elsewhere). */ lastSentAt: string | null; /** Time the list this row came from is ordered and paged by (inbound / outbound / either, per tab); null outside list queries. */ sortAt: string | null; /** The linked company is a supplier. */ supplier: boolean; unread: boolean; archived: boolean; messageCount: number; hasDraft: boolean; counterpart: { email: string; name: string } | null; /** Who sent the newest message — what the inbox list shows (isMe = sent from the CRM user's account). */ lastSender: { email: string; name: string; isMe: boolean } | null; /** Who the newest message went to (display names, else addresses) — filled only when we sent it, so the list can show "To: …". */ lastRecipients: string[]; /** Status of the most recent outbound message (sent/opened/clicked/bounced), or null when none. */ lastOutStatus: string | null; /** True when any message carries a non-inline attachment. */ hasAttachments: boolean; /** Company matching the counterpart's email domain when the thread has no company. */ suggestedCompany: CompanySuggestion | null }
export interface MessageDto { id: string; threadId: string; direction: 'in' | 'out'; from: string; to: string[]; cc: string[]; subject: string | null; bodyText: string; /** Sanitized HTML with cid: images resolved to signed urls; empty when the message has no HTML part or it was left out (see hasHtml). */ bodyHtml: string; /** The message has an HTML part — when bodyHtml is empty it loads separately via GET /emails/messages/:id/html. */ hasHtml: boolean; sentAt: string | null; status: string; attachments: AttachmentDto[]; events?: { type: string; createdAt: string; url: string | null }[] }

const syncing = new Set<string>()
const scanning = new Set<string>()

/** Gmail 404 on a message id: the message vanished between the history event and our fetch (discarded draft, deleted/purged mail). Nothing to import. */
function isGone(e: unknown): boolean { return (e as { code?: number; status?: number }).code === 404 || (e as { status?: number }).status === 404 }

/** Mail is private per user: everyone (admins included) only ever sees threads of their own connected Gmail account. */
function accountIdsFor(userId: string, _role: string): string[] {
  const own = googleRepository.accountByUser(userId)
  return own ? [own.id] : []
}

function counterpartOf(thread: ThreadRow, accountEmail: string): { email: string; name: string } | null {
  const msgs = emailRepository.messages(thread.id)
  for (const m of msgs) {
    if (m.direction === 'in' && m.from_addr) return textService.parseAddress(m.from_addr)
  }
  for (const m of msgs) {
    const to = m.to_json ? (JSON.parse(m.to_json) as string[]) : []
    const other = to.map((t) => textService.parseAddress(t)).find((a) => a.email !== accountEmail.toLowerCase())
    if (other) return other
  }
  return null
}

export const emailManager = {
  accountIdsFor,
  /**
   * `extras` lets list callers pass precomputed per-page facts (attachments) so a page costs a handful of queries.
   * Last outbound status comes from one indexed query instead of loading every message body of the thread.
   */
  threadDto(t: ThreadRow & { message_count?: number; has_draft?: number; last_out_status?: string | null; last_from?: string | null; last_direction?: 'in' | 'out' | null; last_to?: string | null; last_out_at?: string | null; sort_at?: string | null }, extras?: { withAttachments?: Set<string> }): ThreadDto {
    const lead = t.lead_id ? leadRepository.byId(t.lead_id) : undefined
    const company = t.company_id ? companyRepository.byId(t.company_id) : undefined
    const acc = googleRepository.accountById(t.google_account_id)
    const counterpart = counterpartOf(t, acc?.email ?? '')
    const lastOutStatus = t.last_out_status !== undefined ? t.last_out_status : emailRepository.lastOutboundStatus(t.id)
    const messageCount = t.message_count ?? emailRepository.messageCount(t.id)
    const last = t.last_direction !== undefined ? (t.last_direction ? { from_addr: t.last_from ?? null, direction: t.last_direction, to_json: t.last_to ?? null } : null) : emailRepository.lastSender(t.id)
    const lastAddr = last?.from_addr ? textService.parseAddress(last.from_addr) : null
    const lastSender = last ? { email: lastAddr?.email ?? '', name: lastAddr?.name || (lead && lastAddr?.email === lead.email?.toLowerCase() ? `${lead.first_name} ${lead.last_name}`.trim() : '') || lastAddr?.email || '', isMe: last.direction === 'out' } : null
    let lastRecipients: string[] = []
    if (last?.direction === 'out' && last.to_json) {
      try {
        lastRecipients = (JSON.parse(last.to_json) as string[]).map((raw) => { const a = textService.parseAddress(raw); return a.name || (lead && a.email === lead.email?.toLowerCase() ? `${lead.first_name} ${lead.last_name}`.trim() : '') || a.email }).filter(Boolean)
      } catch { lastRecipients = [] }
    }
    const hasAttachments = extras?.withAttachments ? extras.withAttachments.has(t.id) : emailRepository.threadsWithAttachments([t.id]).has(t.id)
    return { id: t.id, subject: t.subject, snippet: t.snippet, leadId: t.lead_id, leadName: lead ? `${lead.first_name} ${lead.last_name}`.trim() : null, companyId: t.company_id, companyName: company?.name ?? null, lastMessageAt: t.last_message_at, lastSentAt: t.last_out_at ?? null, sortAt: t.sort_at ?? null, supplier: !!company?.is_supplier, unread: !!t.unread, archived: !!t.archived, messageCount, hasDraft: !!t.has_draft, counterpart, lastSender, lastRecipients, lastOutStatus, hasAttachments, suggestedCompany: t.company_id ? null : companyManager.suggestForEmail(counterpart?.email) }
  },
  /** `userId` binds the attachment urls to the viewer; omitted = the owner of the thread's Gmail account (socket pushes). */
  /** withHtml=false leaves bodyHtml empty (no sanitizing, small payload); the client fetches it on demand. */
  messageDto(m: MessageRow, withEvents = false, userId?: string, withHtml = true): MessageDto {
    const viewer = userId ?? googleRepository.accountById(emailRepository.threadById(m.thread_id)?.google_account_id ?? '')?.user_id ?? ''
    const { attachments, bodyHtml } = withHtml ? attachmentManager.forMessage(m, viewer) : { attachments: attachmentManager.forMessageAttachments(m, viewer), bodyHtml: '' }
    return { id: m.id, threadId: m.thread_id, direction: m.direction, from: m.from_addr ?? '', to: m.to_json ? JSON.parse(m.to_json) : [], cc: m.cc_json ? JSON.parse(m.cc_json) : [], subject: m.subject, bodyText: m.body_text ?? '', bodyHtml, hasHtml: !!m.body_html, sentAt: m.sent_at, status: m.status, attachments, events: withEvents ? emailRepository.events(m.id).map((e) => ({ type: e.type, createdAt: e.created_at, url: e.url })) : undefined }
  },
  listThreads(user: { id: string; role: string }, f: Omit<ThreadFilter, 'accountIds'>) {
    const rows = emailRepository.threads({ ...f, accountIds: accountIdsFor(user.id, user.role) })
    const withAttachments = emailRepository.threadsWithAttachments(rows.map((r) => r.id))
    return rows.map((t) => this.threadDto(t, { withAttachments }))
  },
  /** Remove a thread (and its messages, drafts, events) from the CRM. Gmail is untouched. */
  async deleteThread(user: { id: string; role: string }, id: string) {
    const t = emailRepository.threadById(id); if (!t) throw notFound('Thread not found')
    if (!accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw notFound('Thread not found')
    await attachmentManager.removeForThread(id)
    emailRepository.deleteThread(id)
  },
  /** Create a lead from the thread's counterpart (company from its domain) and link the thread to it. */
  convertToLead(user: { id: string; role: string }, id: string) {
    const t = emailRepository.threadById(id); if (!t) throw notFound('Thread not found')
    if (!accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw notFound('Thread not found')
    if (t.lead_id) return this.threadDto(t)
    const acc = googleRepository.accountById(t.google_account_id)
    const cp = counterpartOf(t, acc?.email ?? '')
    if (!cp?.email) throw badRequest('No external sender on this thread to create a lead from')
    const lead = leadManager.findOrCreateByEmail(cp.email, cp.name || cp.email, user.id, true)
    if (!lead) throw badRequest('Could not create a lead from this sender')
    return this.linkThread(id, lead.id, user.id)
  },
  /**
   * Read a thread from SQLite only — never waits on Gmail and has no side effects (prefetch-safe). Messages imported
   * before attachments existed are scanned in the background; `thread:scanned` tells the client to refresh.
   */
  async getThread(user: { id: string; role: string }, id: string) {
    const t = emailRepository.threadById(id); if (!t) throw notFound('Thread not found')
    if (!accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw notFound('Thread not found')
    const messages = emailRepository.messages(id)
    const account = googleRepository.accountById(t.google_account_id)
    if (account && messages.some((m) => !m.attachments_scanned)) this.scanThreadInBackground(account, id)
    // Text first: only the newest message (open by default) carries its HTML; older ones (collapsed, and usually quoting
    // each other) send text + attachment list and load HTML on expand — keeps long threads small and fast.
    const last = messages.length - 1
    return { thread: this.threadDto({ ...t, message_count: messages.length }), messages: messages.map((m, i) => this.messageDto(m, true, user.id, i === last)) }
  },

  /** Sanitized HTML of one message (cached server-side), for messages the thread payload sent without it. */
  messageHtml(user: { id: string; role: string }, messageId: string) {
    const m = emailRepository.messageById(messageId); const t = m && emailRepository.threadById(m.thread_id)
    if (!m || !t || !accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw notFound('Message not found')
    return { id: m.id, bodyHtml: attachmentManager.forMessage(m, user.id).bodyHtml }
  },
  /** Mark a thread read (explicit, so GET stays side-effect free). */
  markRead(user: { id: string; role: string }, id: string) {
    const t = emailRepository.threadById(id); if (!t) throw notFound('Thread not found')
    if (!accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw notFound('Thread not found')
    if (t.unread) emailRepository.updateThread(id, { unread: 0 })
    return { ok: true as const }
  },
  /** One deduplicated background scan per thread; notifies the owner only when attachments were found. */
  scanThreadInBackground(account: GoogleAccountRow, threadId: string) {
    if (scanning.has(threadId)) return
    scanning.add(threadId)
    void (async () => {
      let found = 0
      for (const m of emailRepository.messages(threadId)) {
        if (m.attachments_scanned) continue
        await attachmentManager.ensureScanned(account, m)
        found += attachmentRepository.byMessage(m.id).length
      }
      if (found) socketService.toUser(account.user_id, 'thread:scanned', { threadId })
    })().catch((e) => console.warn('[attachment-scan]', threadId, (e as Error).message)).finally(() => scanning.delete(threadId))
  },
  /** Low-rate backfill of pre-attachment mail, newest first, so most threads are scanned before anyone opens them. */
  async backfillAttachmentScans() {
    for (const m of emailRepository.unscannedMessages(CONSTANTS.ATTACHMENT_BACKFILL_BATCH)) {
      const t = emailRepository.threadById(m.thread_id); const account = t ? googleRepository.accountById(t.google_account_id) : undefined
      if (!account || scanning.has(m.thread_id)) continue
      if (googleService.coolingDown(account.id)) continue
      await attachmentManager.ensureScanned(account, m)
    }
  },
  unreadCount(user: { id: string; role: string }) { return emailRepository.unreadCount(accountIdsFor(user.id, user.role)) },
  /** The user's threads with no company whose counterpart's domain matches the company (suggestions). */
  suggestedThreadsForCompany(user: { id: string; role: string }, companyId: string): ThreadDto[] {
    const ids = accountIdsFor(user.id, user.role)
    return emailRepository.threads({ accountIds: ids, archived: 'all', limit: 1000 })
      .filter((t) => !t.company_id).map((t) => this.threadDto(t)).filter((d) => d.suggestedCompany?.id === companyId)
  },
  /**
   * The company to link a sender to: the given id, or a company by name — an existing one with that name, else a new
   * one that also takes the sender's email domain (unless it is a free-mail domain or already owned).
   */
  resolveCompany(target: string | { companyId?: string; companyName?: string }, senderEmail: string | null | undefined, actorId: string, isSupplier = false): CompanyRow {
    const t = typeof target === 'string' ? { companyId: target } : target
    if (t.companyId) { const c = companyRepository.byId(t.companyId); if (!c) throw badRequest('Company not found'); return c }
    const name = t.companyName?.trim(); if (!name) throw badRequest('Choose a company or give the new one a name')
    const existing = companyRepository.byName(name); if (existing) return existing
    const domain = senderEmail ? textService.domainOf(senderEmail) : ''
    const free = !!domain && !textService.isFreeMailDomain(domain) && !companyManager.ownerOfDomain(domain)
    return companyRepository.byId(companyManager.create({ name, domains: free ? [domain] : [], isSupplier }, actorId).id)!
  },
  /**
   * Link a thread to a company (by id, or by name — created when no company has that name): the sender becomes
   * (or already is) a lead attached to that company, and the thread is linked to it. No other company is created.
   */
  linkThreadToCompany(user: { id: string; role: string }, id: string, target: string | { companyId?: string; companyName?: string }) {
    const t = emailRepository.threadById(id); if (!t) throw notFound('Thread not found')
    if (!accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw notFound('Thread not found')
    const cp = counterpartOf(t, googleRepository.accountById(t.google_account_id)?.email ?? '')
    let lead = t.lead_id ? leadRepository.byId(t.lead_id) : undefined
    if (!lead && !cp?.email) throw badRequest('No external sender on this thread to create a lead from')
    const company = this.resolveCompany(target, lead?.email ?? cp?.email, user.id)
    if (!lead) {
      lead = leadManager.findOrCreateByEmail(cp!.email, cp!.name || cp!.email, user.id, true, company.id) ?? undefined
      if (!lead) throw badRequest('Could not create a lead from this sender')
    }
    if (lead.company_id !== company.id) leadManager.update(lead.id, { companyId: company.id }, user.id)
    return this.linkThread(id, lead.id, user.id)
  },
  /**
   * Set the thread's peer as a supplier: its company (linked, given, matched by email domain, or created from the
   * domain / the given name) is flagged as a supplier and the peer becomes one of its contacts. Deals the company
   * already has are kept. A free-mail peer needs `companyId` or `companyName` (409 COMPANY_REQUIRED otherwise).
   */
  setSupplier(user: { id: string; role: string }, id: string, d: { companyId?: string; companyName?: string }) {
    const t = emailRepository.threadById(id); if (!t) throw notFound('Thread not found')
    if (!accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw notFound('Thread not found')
    const acc = googleRepository.accountById(t.google_account_id)
    const cp = counterpartOf(t, acc?.email ?? '')
    const existingLead = t.lead_id ? leadRepository.byId(t.lead_id) : cp?.email ? leadRepository.byEmail(cp.email) : undefined
    if (!existingLead && !cp?.email) throw badRequest('No external sender on this thread to set as a supplier')
    let company = d.companyId ? companyRepository.byId(d.companyId) : t.company_id ? companyRepository.byId(t.company_id) : existingLead?.company_id ? companyRepository.byId(existingLead.company_id) : undefined
    if (d.companyId && !company) throw badRequest('Company not found')
    if (!company && cp?.email) company = companyManager.findOrCreateByEmail(cp.email, user.id, true) ?? undefined
    if (!company && d.companyName) company = this.resolveCompany({ companyName: d.companyName }, cp?.email, user.id, true)
    if (!company) throw conflict('Choose or name the supplier company for this sender', undefined, 'COMPANY_REQUIRED')
    if (!company.is_supplier) companyManager.update(company.id, { isSupplier: true })
    const lead = existingLead ?? leadManager.findOrCreateByEmail(cp!.email, cp!.name || cp!.email, user.id, true, company.id)
    if (!lead) throw badRequest('Could not create a contact from this sender')
    if (lead.company_id !== company.id) leadManager.update(lead.id, { companyId: company.id }, user.id)
    return this.linkThread(id, lead.id, user.id)
  },
  linkThread(id: string, leadId: string | null, actorId: string) {
    const t = emailRepository.threadById(id); if (!t) throw notFound('Thread not found')
    if (!accountIdsFor(actorId, 'member').includes(t.google_account_id)) throw notFound('Thread not found')
    const lead = leadId ? leadRepository.byId(leadId) : null
    if (leadId && !lead) throw badRequest('Lead not found')
    const updated = emailRepository.updateThread(id, { lead_id: leadId, company_id: lead?.company_id ?? null })
    if (lead) leadManager.logActivity(lead.id, actorId, 'email', { text: `Thread linked: ${t.subject ?? '(no subject)'}`, threadId: id })
    return this.threadDto(updated)
  },
  /**
   * Archive / unarchive in the CRM and mirror it to Gmail (remove / add the INBOX label on the thread).
   * The local change always applies; `gmailSynced` tells whether Gmail accepted the label change.
   */
  async setArchived(user: { id: string; role: string }, id: string, archived: boolean): Promise<ThreadDto & { gmailSynced: boolean }> {
    const t = emailRepository.threadById(id); if (!t) throw notFound('Thread not found')
    if (!accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw notFound('Thread not found')
    const dto = this.threadDto(emailRepository.updateThread(id, { archived: archived ? 1 : 0 }))
    let gmailSynced = false
    const acc = googleRepository.accountById(t.google_account_id)
    if (acc) {
      try {
        await googleService.gmail(acc).users.threads.modify({ userId: 'me', id: t.gmail_thread_id, requestBody: archived ? { removeLabelIds: ['INBOX'] } : { addLabelIds: ['INBOX'] } })
        gmailSynced = true
      } catch (e) { console.warn('[gmail-archive]', t.gmail_thread_id, (e as Error).message) }
    }
    return { ...dto, gmailSynced }
  },
  /**
   * Gmail -> CRM: for the given Gmail thread ids, set the CRM archived flag from the INBOX label.
   * A thread counts as archived in Gmail when it has inbound messages and none of them carries INBOX.
   * Threads with only outbound mail (sent, never answered) never carry INBOX in Gmail, so they are left alone.
   */
  async reconcileArchived(account: GoogleAccountRow, gmail: ReturnType<typeof googleService.gmail>, gmailThreadIds: Iterable<string>): Promise<number> {
    let changed = 0
    for (const gid of gmailThreadIds) {
      const t = emailRepository.threadByGmail(account.id, gid); if (!t) continue
      try {
        const g = await gmail.users.threads.get({ userId: 'me', id: gid, format: 'minimal' })
        const msgs = (g.data.messages ?? []).filter((m) => { const l = m.labelIds ?? []; return !l.includes('TRASH') && !l.includes('SPAM') && !l.includes('DRAFT') })
        const inbound = msgs.filter((m) => !(m.labelIds ?? []).includes('SENT'))
        if (!inbound.length) continue
        const archived = inbound.every((m) => !(m.labelIds ?? []).includes('INBOX')) ? 1 : 0
        if (archived === t.archived) continue
        const updated = emailRepository.updateThread(t.id, { archived })
        changed++
        socketService.toUser(account.user_id, 'email:updated', { thread: this.threadDto(updated) })
      } catch (e) {
        if (googleService.isRateLimited(e)) { googleService.coolDown(account.id); break }
        console.warn('[gmail-archive-sync]', gid, (e as Error).message)
      }
    }
    return changed
  },

  // ---------------- sync ----------------
  async syncAll() { for (const a of googleRepository.accounts()) await this.syncAccount(a).catch((e) => console.warn('[gmail-sync]', a.email, (e as Error).message)) },
  async syncUser(userId: string) {
    const a = googleRepository.accountByUser(userId); if (!a) throw badRequest('No Gmail account connected')
    return this.syncAccount(a)
  },
  /**
   * Backfill: import Gmail messages older than what the CRM has seen so far. Quiet (no notifications, no drafts).
   * The cursor is the oldest *scanned* message (persisted per account in settings), not the oldest *imported* one —
   * otherwise a page of skipped mail (newsletters, bulk, outbound-only) would never advance it and every call would
   * re-scan the same page. Up to `maxPages` pages are walked in one call until at least one message is imported.
   */
  async syncOlder(userId: string, pageSize = 50, maxPages = 3): Promise<{ imported: number; scanned: number; hasMore: boolean; oldest: string | null }> {
    const account = googleRepository.accountByUser(userId); if (!account) throw badRequest('No Gmail account connected')
    if (syncing.has(account.id)) throw badRequest('A sync is already running — try again in a moment')
    syncing.add(account.id)
    try {
      const gmail = googleService.gmail(account)
      const key = `gmailBackfill:${account.id}`
      const state = settingsRepository.get<{ cursor: number | null; exhausted: boolean }>(key, { cursor: null, exhausted: false })
      if (state.exhausted) return { imported: 0, scanned: 0, hasMore: false, oldest: emailRepository.oldestMessageAt([account.id]) }
      const oldestKnown = emailRepository.oldestMessageAt([account.id])
      let cursor = state.cursor ?? (oldestKnown ? Math.floor(new Date(oldestKnown).getTime() / 1000) : Math.floor(Date.now() / 1000))
      let imported = 0; let scanned = 0; let hasMore = true
      for (let page = 0; page < maxPages && hasMore && imported === 0 && !googleService.coolingDown(account.id); page++) {
        const res = await gmail.users.messages.list({ userId: 'me', maxResults: pageSize, q: `before:${cursor} -category:promotions -category:social` })
        const ids = (res.data.messages ?? []).map((m) => m.id).filter((x): x is string => !!x)
        if (!ids.length) { hasMore = false; break }
        let pageOldest = cursor
        for (const id of ids) {
          scanned++
          const known = emailRepository.messageByGmail(id)
          if (known?.sent_at) { pageOldest = Math.min(pageOldest, Math.floor(new Date(known.sent_at).getTime() / 1000)); continue }
          try {
            const full = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
            if (full.data.internalDate) pageOldest = Math.min(pageOldest, Math.floor(Number(full.data.internalDate) / 1000))
            if (await this.importMessage(account, full.data, { quiet: true })) imported++
          } catch (e) {
            // Over quota: stop here; the cursor only advanced past what was scanned, so the next call resumes.
            if (googleService.isRateLimited(e)) { googleService.coolDown(account.id); hasMore = true; break }
            if (!isGone(e)) console.warn('[gmail-backfill]', id, (e as Error).message)
          }
        }
        // Gmail's before: is second-granular; step back one second when the page did not move the cursor so we never loop on a boundary message.
        cursor = pageOldest < cursor ? pageOldest : cursor - 1
        hasMore = !!res.data.nextPageToken || ids.length >= pageSize
      }
      settingsRepository.set(key, { cursor, exhausted: !hasMore })
      return { imported, scanned, hasMore, oldest: emailRepository.oldestMessageAt([account.id]) }
    } finally { syncing.delete(account.id) }
  },
  async syncAccount(account: GoogleAccountRow): Promise<{ imported: number }> {
    if (syncing.has(account.id) || googleService.coolingDown(account.id)) return { imported: 0 }
    syncing.add(account.id)
    try {
      const gmail = googleService.gmail(account)
      let imported = 0
      const ids = new Set<string>()
      /** Gmail thread ids whose labels changed since last sync (archive / unarchive in Gmail). */
      const labelThreads = new Set<string>()
      if (account.history_id) {
        try {
          let pageToken: string | undefined
          do {
            const res = await gmail.users.history.list({ userId: 'me', startHistoryId: account.history_id, historyTypes: ['messageAdded', 'labelAdded', 'labelRemoved'], pageToken })
            for (const h of res.data.history ?? []) {
              for (const m of h.messagesAdded ?? []) if (m.message?.id) ids.add(m.message.id)
              // A message composed in Gmail is autosaved as a DRAFT first (skipped on import); sending it only adds the SENT label, with no new messageAdded.
              for (const l of h.labelsAdded ?? []) if ((l.labelIds ?? []).includes('SENT') && l.message?.id) ids.add(l.message.id)
              for (const l of [...(h.labelsAdded ?? []), ...(h.labelsRemoved ?? [])]) if ((l.labelIds ?? []).includes('INBOX') && l.message?.threadId) labelThreads.add(l.message.threadId)
            }
            pageToken = res.data.nextPageToken ?? undefined
            if (res.data.historyId) googleRepository.updateAccount(account.id, { history_id: res.data.historyId })
          } while (pageToken)
        } catch (e) {
          if ((e as { code?: number }).code === 404) googleRepository.updateAccount(account.id, { history_id: null })
          else throw e
        }
      }
      if (!googleRepository.accountById(account.id)?.history_id) {
        // No usable history cursor (first sync, or Gmail expired it with a 404): archive changes made in Gmail
        // during the gap would otherwise be missed, so reconcile the most recently active known threads.
        for (const gid of emailRepository.recentGmailThreadIds(account.id, CONSTANTS.GMAIL_ARCHIVE_RECONCILE_LIMIT)) labelThreads.add(gid)
        const res = await gmail.users.messages.list({ userId: 'me', maxResults: 50, q: 'newer_than:30d -category:promotions -category:social' })
        for (const m of res.data.messages ?? []) if (m.id) ids.add(m.id)
        // Sent mail is crowded out of the 50 newest by inbound volume; list it separately so the gap is covered.
        for (const id of await this.listIds(gmail, `in:sent newer_than:${CONSTANTS.GMAIL_SENT_CATCHUP_DAYS}d`, CONSTANTS.GMAIL_SENT_CATCHUP_MAX)) ids.add(id)
        const profile = await gmail.users.getProfile({ userId: 'me' })
        if (profile.data.historyId) googleRepository.updateAccount(account.id, { history_id: profile.data.historyId })
      }
      // One-time repair for accounts synced before SENT label changes were tracked: pull the recent sent mail they missed.
      // v2: v1 ran into the Gmail quota and dropped what it could not fetch, so it runs again with the throttled loop below.
      const repairKey = `gmailSentRepair:v2:${account.id}`
      const needsRepair = !settingsRepository.get<boolean>(repairKey, false)
      if (needsRepair) for (const id of await this.listIds(gmail, `in:sent newer_than:${CONSTANTS.GMAIL_SENT_REPAIR_DAYS}d`, CONSTANTS.GMAIL_SENT_REPAIR_MAX)) ids.add(id)
      // The history cursor has already moved past these ids, so a failed fetch (rate limit, network) is retried on later syncs instead of being lost.
      const retryKey = `gmailRetry:${account.id}`
      const retry = settingsRepository.get<Record<string, number>>(retryKey, {})
      for (const id of Object.keys(retry)) ids.add(id)
      // Fetches are capped per sync and stop at the first quota error; whatever is left waits for the next sync
      // without spending an attempt, so a large catch-up is spread over several syncs instead of being dropped.
      const nextRetry: Record<string, number> = {}
      const pending = [...ids].filter((id) => !emailRepository.messageByGmail(id))
      let fetched = 0
      for (let i = 0; i < pending.length; i++) {
        const id = pending[i]
        if (fetched >= CONSTANTS.GMAIL_IMPORT_MAX_PER_SYNC || googleService.coolingDown(account.id)) {
          for (const rest of pending.slice(i)) nextRetry[rest] = retry[rest] ?? 0
          break
        }
        fetched++
        try {
          const full = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
          if (await this.importMessage(account, full.data)) imported++
        } catch (e) {
          if (isGone(e)) continue
          if (googleService.isRateLimited(e)) {
            googleService.coolDown(account.id)
            console.warn('[gmail-import] quota reached; resuming next sync with', pending.length - i, 'messages left')
            for (const rest of pending.slice(i)) nextRetry[rest] = retry[rest] ?? 0
            break
          }
          console.warn('[gmail-import]', id, (e as Error).message)
          const attempts = (retry[id] ?? 0) + 1
          if (attempts < CONSTANTS.GMAIL_IMPORT_MAX_ATTEMPTS) nextRetry[id] = attempts
        }
      }
      settingsRepository.set(retryKey, nextRetry)
      if (needsRepair) settingsRepository.set(repairKey, true)
      // One-time repair: threads opened in the CRM by one of our own replies were created un-archived, so conversations
      // archived in Gmail showed up in the inbox after an import. Re-check the newest inbox threads against Gmail once.
      const archiveRepairKey = `gmailArchiveRepair:v1:${account.id}`
      const needsArchiveRepair = !settingsRepository.get<boolean>(archiveRepairKey, false)
      if (needsArchiveRepair) for (const gid of emailRepository.inboxGmailThreadIds(account.id, CONSTANTS.GMAIL_ARCHIVE_REPAIR_LIMIT)) labelThreads.add(gid)
      if (labelThreads.size) await this.reconcileArchived(account, gmail, labelThreads)
      // A quota stop leaves the repair unfinished; it runs again on the next sync.
      if (needsArchiveRepair && !googleService.coolingDown(account.id)) settingsRepository.set(archiveRepairKey, true)
      googleRepository.updateAccount(account.id, { last_sync_at: nowIso(), status: 'connected', last_error: null })
      socketService.toUser(account.user_id, 'account:status', { email: account.email, status: 'connected', lastSyncAt: nowIso(), imported })
      return { imported }
    } catch (e) {
      googleRepository.updateAccount(account.id, { status: 'error', last_error: (e as Error).message })
      socketService.toUser(account.user_id, 'account:status', { email: account.email, status: 'error', error: (e as Error).message })
      throw e
    } finally { syncing.delete(account.id) }
  },

  /** Gmail message ids matching `q`, newest first, paging until `max`. */
  async listIds(gmail: ReturnType<typeof googleService.gmail>, q: string, max: number): Promise<string[]> {
    const out: string[] = []
    let pageToken: string | undefined
    do {
      const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: Math.min(100, max - out.length), pageToken })
      for (const m of res.data.messages ?? []) if (m.id) out.push(m.id)
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken && out.length < max)
    return out
  },

  async importMessage(account: GoogleAccountRow, msg: gmail_v1.Schema$Message, opts: { quiet?: boolean } = {}): Promise<boolean> {
    if (!msg.id || !msg.threadId) return false
    const labels = msg.labelIds ?? []
    if (labels.includes('DRAFT') || labels.includes('SPAM') || labels.includes('TRASH')) return false
    const fromRaw = mimeService.header(msg, 'From') ?? ''
    const from = textService.parseAddress(fromRaw)
    const toList = textService.parseAddressList(mimeService.header(msg, 'To'))
    const ccList = textService.parseAddressList(mimeService.header(msg, 'Cc'))
    const subject = mimeService.header(msg, 'Subject') ?? '(no subject)'
    const sentAt = msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : nowIso()
    const direction: 'in' | 'out' = from.email === account.email.toLowerCase() || labels.includes('SENT') ? 'out' : 'in'
    const { text, html } = mimeService.bodies(msg)

    if (mimeService.isBounce(msg)) { this.handleBounce(account, msg, text || textService.htmlToText(html)); return false }

    // Skip messages where the external party is not a lead and auto-create is off, unless it's a reply to something we know.
    const external = direction === 'in' ? from : toList.find((t) => t.email !== account.email.toLowerCase()) ?? toList[0]
    const autoCreate = settingsRepository.get<boolean>('autoCreateLeads', false)
    let thread = emailRepository.threadByGmail(account.id, msg.threadId)
    let lead = external ? leadRepository.byEmail(external.email) : undefined
    if (!lead && external && direction === 'in' && !thread && !textService.isFreeMailDomain(textService.domainOf(external.email)) && !/no-?reply|notifications?@|newsletter|mailer/i.test(external.email)) {
      lead = leadManager.findOrCreateByEmail(external.email, external.name, account.user_id, autoCreate) ?? undefined
    }
    if (!lead && !thread && direction === 'in') {
      // Unlinked inbound from unknown party: keep only if it looks personal (has a To of our account) and not bulk.
      const bulk = !!mimeService.header(msg, 'List-Unsubscribe') || /no-?reply|notifications?@|newsletter|mailer/i.test(from.email)
      if (bulk) return false
    }
    if (!thread) {
      // Mirror Gmail's archive state: an inbound message without the INBOX label was archived in Gmail.
      thread = emailRepository.createThread({ google_account_id: account.id, gmail_thread_id: msg.threadId, subject, snippet: msg.snippet ?? null, lead_id: lead?.id ?? null, company_id: lead?.company_id ?? null, last_message_at: sentAt, unread: direction === 'in' && !opts.quiet, archived: direction === 'in' && !labels.includes('INBOX') })
    } else {
      // Archive state follows Gmail. An inbound message still in Gmail's inbox un-archives the thread (live sync only).
      // The first inbound message of a thread that so far held only our own mail decides it: a thread opened here by
      // one of our replies was created un-archived, so without this an archived conversation would land in the inbox.
      const archived = direction !== 'in' ? thread.archived : labels.includes('INBOX') ? (opts.quiet ? thread.archived : 0) : emailRepository.hasInbound(thread.id) ? thread.archived : 1
      emailRepository.updateThread(thread.id, { snippet: sentAt > (thread.last_message_at ?? '') ? msg.snippet ?? thread.snippet : thread.snippet, last_message_at: direction === 'in' && sentAt > (thread.last_message_at ?? '') ? sentAt : thread.last_message_at, unread: direction === 'in' && !opts.quiet ? 1 : thread.unread, archived, lead_id: thread.lead_id ?? lead?.id ?? null, company_id: thread.company_id ?? lead?.company_id ?? null })
    }
    // Outbound sent from CRM already exists with our tracking token: attach gmail id instead of duplicating.
    const rfcId = mimeService.header(msg, 'Message-ID')
    if (direction === 'out' && rfcId) {
      const existing = emailRepository.messages(thread.id).find((m) => m.direction === 'out' && !m.gmail_message_id && m.body_html?.includes(rfcId))
      if (existing) { emailRepository.updateMessage(existing.id, { gmail_message_id: msg.id }); return false }
    }
    const row = emailRepository.createMessage({ thread_id: thread.id, gmail_message_id: msg.id, direction, from_addr: fromRaw, to_json: JSON.stringify(toList.map((t) => t.name ? `${t.name} <${t.email}>` : t.email)), cc_json: JSON.stringify(ccList.map((t) => t.email)), bcc_json: null, subject, body_text: text || textService.htmlToText(html), body_html: html, sent_at: sentAt, tracking_token: null, status: direction === 'in' ? 'received' : 'sent' })
    await attachmentManager.recordAndDownload(account, row, msg, html)
    if (lead && direction === 'in') leadManager.logActivity(lead.id, null, 'email', { text: `Inbound: ${subject}`, threadId: thread.id, messageId: row.id })
    if (direction === 'in' && !opts.quiet) {
      const dto = this.threadDto(emailRepository.threadById(thread.id)!)
      socketService.toUser(account.user_id, 'email:new', { thread: dto, message: this.messageDto(row, false, undefined, false) })
      notificationService.notify(account.user_id, { type: 'email', title: `New email from ${from.name || from.email}`, body: subject, link: `/inbox/${thread.id}` })
      // AI reply drafts are opt-in (workspace setting `autoDraftReplies`, default off): otherwise the user asks for one from the draft panel.
      if (settingsRepository.get<boolean>('autoDraftReplies', false)) import('./draftManager.ts').then(({ draftManager }) => draftManager.autoDraft(thread!.id, account.user_id)).catch((e) => console.warn('[auto-draft]', (e as Error).message))
    }
    return true
  },

  handleBounce(account: GoogleAccountRow, msg: gmail_v1.Schema$Message, text: string) {
    const failedTo = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g)?.map((e) => e.toLowerCase()).find((e) => e !== account.email.toLowerCase() && !e.includes('mailer-daemon')) ?? null
    const original = text.match(/Message-ID:\s*(<[^>]+>)/i)?.[1]
    let target = original ? emailRepository.outboundByHeaderMessageId(original) : undefined
    if (!target && failedTo) target = emailRepository.outboundMessages([account.id], 200).find((m) => (m.to_json ?? '').toLowerCase().includes(failedTo))
    if (!target) return
    emailRepository.updateMessage(target.id, { status: 'bounced' })
    const ev = emailRepository.addEvent(target.id, 'bounce', { url: msg.snippet ?? undefined })
    const thread = emailRepository.threadById(target.thread_id)
    socketService.toUser(account.user_id, 'email:event', { messageId: target.id, threadId: target.thread_id, type: 'bounce', createdAt: ev.created_at })
    notificationService.notify(account.user_id, { type: 'bounce', title: 'Email bounced', body: `${failedTo ?? 'recipient'} — ${target.subject ?? ''}`, link: thread ? `/inbox/${thread.id}` : null })
    if (thread?.lead_id) leadManager.logActivity(thread.lead_id, null, 'system', { text: `Email bounced: ${target.subject ?? ''}` })
  },

  // ---------------- send ----------------
  async send(userId: string, d: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; bodyText: string; bodyHtml?: string; threadId?: string; leadId?: string | null; trackOpens?: boolean; trackClicks?: boolean; /** true/false = the sender's choice in compose; omitted = their signature defaults. */ includeSignature?: boolean }) {
    const account = googleRepository.accountByUser(userId); if (!account) throw badRequest('Connect your Gmail account first (Settings → Email)')
    const user = userRepository.byId(userId)!
    const gmail = googleService.gmail(account)
    const thread = d.threadId ? emailRepository.threadById(d.threadId) : undefined
    // Mail is private per user: replying is only possible inside a thread of the sender's own account.
    if (d.threadId && (!thread || thread.google_account_id !== account.id)) throw notFound('Thread not found')
    const token = cryptoService.randomToken(18)
    const rfcId = `<${token}.${Date.now()}@looper-crm>`
    let html = d.bodyHtml || textService.textToHtml(d.bodyText)
    if (signatureManager.applies(userId, !!thread, d.includeSignature)) {
      const sig = signatureManager.render(userId)
      d = { ...d, bodyText: d.bodyText + sig.text }
      html += sig.html
    }
    if (d.trackClicks !== false) html = html.replace(/href="(https?:\/\/[^"]+)"/g, (_m, url: string) => `href="${CONSTANTS.PUBLIC_URL}/t/c/${token}?u=${encodeURIComponent(url)}"`)
    if (d.trackOpens !== false) html += `<img src="${CONSTANTS.PUBLIC_URL}/t/o/${token}.gif" width="1" height="1" alt="" style="display:none" />`
    html += `<!-- ${rfcId} -->`

    let inReplyTo: string | undefined; let references: string | undefined; let subject = d.subject
    if (thread) {
      const last = emailRepository.lastInbound(thread.id) ?? emailRepository.messages(thread.id).at(-1)
      if (last?.gmail_message_id) {
        try {
          const g = await gmail.users.messages.get({ userId: 'me', id: last.gmail_message_id, format: 'metadata', metadataHeaders: ['Message-ID', 'References'] })
          inReplyTo = mimeService.header(g.data, 'Message-ID'); references = [mimeService.header(g.data, 'References'), inReplyTo].filter(Boolean).join(' ')
        } catch { /* ignore */ }
      }
      if (thread.subject && !/^re:/i.test(subject)) subject = `Re: ${thread.subject.replace(/^re:\s*/i, '')}`
    }
    const mime = mimeService.build({ from: `${user.name} <${account.email}>`, to: d.to, cc: d.cc, bcc: d.bcc, subject, text: d.bodyText, html, inReplyTo, references, messageId: rfcId })
    const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: mimeService.toRaw(mime), threadId: thread?.gmail_thread_id } })
    const gmailThreadId = res.data.threadId ?? thread?.gmail_thread_id ?? res.data.id!
    const sentAt = nowIso()
    let leadId = d.leadId ?? thread?.lead_id ?? null
    if (!leadId) leadId = leadRepository.byEmail(textService.parseAddress(d.to[0]).email)?.id ?? null
    const lead = leadId ? leadRepository.byId(leadId) : undefined
    let t = thread ?? emailRepository.threadByGmail(account.id, gmailThreadId)
    if (!t) t = emailRepository.createThread({ google_account_id: account.id, gmail_thread_id: gmailThreadId, subject, snippet: d.bodyText.slice(0, 140), lead_id: leadId, company_id: lead?.company_id ?? null, last_message_at: sentAt, unread: false })
    // Outbound mail keeps the thread where it is in the list (last_message_at only moves on inbound mail).
    else emailRepository.updateThread(t.id, { snippet: d.bodyText.slice(0, 140), lead_id: t.lead_id ?? leadId, company_id: t.company_id ?? lead?.company_id ?? null })
    const row = emailRepository.createMessage({ thread_id: t.id, gmail_message_id: res.data.id ?? null, direction: 'out', from_addr: `${user.name} <${account.email}>`, to_json: JSON.stringify(d.to), cc_json: JSON.stringify(d.cc ?? []), bcc_json: JSON.stringify(d.bcc ?? []), subject, body_text: d.bodyText, body_html: html, sent_at: sentAt, tracking_token: token, status: 'sent' })
    if (leadId) leadManager.logActivity(leadId, userId, 'email', { text: `Sent: ${subject}`, threadId: t.id, messageId: row.id })
    const dto = this.threadDto(emailRepository.threadById(t.id)!)
    socketService.toUser(userId, 'email:new', { thread: dto, message: this.messageDto(row, false, undefined, false) })
    return { thread: dto, message: this.messageDto(row, false, undefined, false) }
  },
}
