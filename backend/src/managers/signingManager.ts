/**
 * signingManager — document signing: build a request (PDFs, recipients, fields), send it, let each recipient sign
 * through a private link, remind, and produce the merged signed PDF with its certificate page.
 * Design: docs/specs/2026-11-13_signing_design.md.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import { CONSTANTS } from '../constants.ts'
import { nowIso, tx } from '../db/dbAccessor.ts'
import { ApiError, badRequest, conflict, forbidden, notFound } from '../middleware/errors.ts'
import { companyRepository } from '../repositories/companyRepository.ts'
import { dealRepository } from '../repositories/dealRepository.ts'
import { emailRepository } from '../repositories/emailRepository.ts'
import { leadRepository } from '../repositories/leadRepository.ts'
import { signingRepository, type SignRequestPatch } from '../repositories/signingRepository.ts'
import { userRepository } from '../repositories/userRepository.ts'
import { cryptoService } from '../services/cryptoService.ts'
import { notificationService } from '../services/notificationService.ts'
import { signPdfService, type StampField } from '../services/signPdfService.ts'
import { socketService } from '../services/socketService.ts'
import type { AuthUser, SignDocumentRow, SignEventRow, SignFieldRow, SignFieldType, SignRecipientRow, SignRequestRow } from '../types/index.ts'
import { emailManager } from './emailManager.ts'
import { leadManager } from './leadManager.ts'

const MAX_FILES = 10
const MAX_PAGES = 200
const MAX_SIGNATURE_BYTES = 400 * 1024
const CODE_TTL_MS = 10 * 60 * 1000
const CODE_ATTEMPTS = 5
const SESSION_TTL_MS = 4 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const FIELD_TYPES: SignFieldType[] = ['signature', 'initials', 'name', 'date', 'text', 'checkbox']
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/** Who is calling a public endpoint — recorded with every step. */
export interface SignerContext { ip?: string; userAgent?: string; /** Proof that the emailed code was entered (see verifyCode). */ session?: string }
export interface RecipientInput { id?: string; role?: 'signer' | 'copy'; name: string; email: string; leadId?: string | null; userId?: string | null }
export interface FieldInput { documentId: string; recipientId: string; type: SignFieldType; page: number; x: number; y: number; w: number; h: number; required?: boolean; label?: string | null }
export interface RequestInput { title?: string; message?: string | null; companyId?: string | null; dealId?: string | null; sequential?: boolean; requireCode?: boolean; remindAfterDays?: number | null; remindEveryDays?: number | null; remindMax?: number | null; expiresAt?: string | null }

/** Emailed codes waiting to be entered. In memory on purpose: a restart only means asking for a new code. */
const codes = new Map<string, { hash: string; expires: number; attempts: number }>()

const dir = (requestId: string) => path.join(CONSTANTS.UPLOAD_DIR, 'signing', requestId)
/** The recipient's link secret. Derived (not stored) so the owner can copy the link again later; only its hash is in the DB. */
const linkToken = (recipientId: string) => cryptoService.hmac(`sign-link:${recipientId}`)
const linkUrl = (recipientId: string) => `${CONSTANTS.FRONTEND_URL}/sign/${linkToken(recipientId)}`
const sessionFor = (recipientId: string, expires = Date.now() + SESSION_TTL_MS) => `${expires}.${cryptoService.hmac(`sign-session:${recipientId}:${expires}`)}`
function sessionValid(recipientId: string, session: string | undefined): boolean {
  const [exp] = (session ?? '').split('.')
  return !!exp && Number(exp) > Date.now() && cryptoService.safeEqual(session!, sessionFor(recipientId, Number(exp)))
}
const utc = (iso: string | null) => (iso ? `${iso.slice(0, 16).replace('T', ' ')} UTC` : '')
const isSigner = (r: SignRecipientRow) => r.role === 'signer'

function eventText(e: SignEventRow, who: string): string {
  const meta = e.meta_json ? (JSON.parse(e.meta_json) as Record<string, unknown>) : {}
  const by = who ? `${who} ` : ''
  switch (e.type) {
    case 'sent': return 'Request sent'
    case 'invited': return `${by}was invited to sign`
    case 'opened': return `${by}opened the document`
    case 'code_sent': return `A code was emailed to ${who}`
    case 'code_verified': return `${by}entered the emailed code`
    case 'consented': return `${by}agreed to sign electronically`
    case 'signed': return `${by}signed`
    case 'declined': return `${by}declined${meta.reason ? `: ${String(meta.reason)}` : ''}`
    case 'reminded': return `${by}was reminded${meta.manual ? ' (by the sender)' : ''}`
    case 'voided': return `Request voided${meta.reason ? `: ${String(meta.reason)}` : ''}`
    case 'expired': return 'Request expired'
    case 'completed': return 'All signatures collected'
    case 'downloaded': return `${by || 'The sender '}downloaded the signed document`
    default: return `${by}${e.type}`
  }
}

function requestDto(r: SignRequestRow, recipients: SignRecipientRow[], documents: SignDocumentRow[]) {
  const owner = userRepository.byId(r.owner_id)
  const company = r.company_id ? companyRepository.byId(r.company_id) : undefined
  const signers = recipients.filter(isSigner)
  return {
    id: r.id, title: r.title, message: r.message, status: r.status, isTemplate: !!r.is_template,
    ownerId: r.owner_id, ownerName: owner?.name ?? 'Unknown', companyId: r.company_id, companyName: company?.name ?? null, dealId: r.deal_id, threadId: r.thread_id,
    sequential: !!r.sequential, requireCode: !!r.require_code, remindAfterDays: r.remind_after_days, remindEveryDays: r.remind_every_days, remindMax: r.remind_max, expiresAt: r.expires_at,
    voidReason: r.void_reason, sentAt: r.sent_at, completedAt: r.completed_at, createdAt: r.created_at, updatedAt: r.updated_at,
    documentCount: documents.length, pageCount: documents.reduce((n, d) => n + d.page_count, 0), signerCount: signers.length, signedCount: signers.filter((s) => s.status === 'signed').length,
    hasSignedFile: !!r.signed_file_path,
  }
}
const documentDto = (d: SignDocumentRow) => ({ id: d.id, filename: d.filename, pageCount: d.page_count, size: d.size, sha256: d.sha256, sortOrder: d.sort_order })
const recipientDto = (r: SignRecipientRow) => ({ id: r.id, role: r.role, name: r.name, email: r.email, leadId: r.lead_id, userId: r.user_id, sortOrder: r.sort_order, status: r.status, declineReason: r.decline_reason, remindersSent: r.reminders_sent, lastRemindedAt: r.last_reminded_at, signedAt: r.signed_at })
const fieldDto = (f: SignFieldRow) => ({ id: f.id, documentId: f.document_id, recipientId: f.recipient_id, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: !!f.required, label: f.label, filled: f.value !== null && f.value !== '' })

export const signingManager = {
  // ------------------------------------------------------------------ access
  /** The request, for its owner or an admin (G16). Anyone else gets "not found". */
  owned(user: AuthUser, id: string): SignRequestRow {
    const r = signingRepository.byId(id)
    if (!r || (r.owner_id !== user.id && user.role !== 'admin')) throw notFound('Signing request not found')
    return r
  },
  draft(user: AuthUser, id: string): SignRequestRow {
    const r = this.owned(user, id)
    if (r.status !== 'draft') throw conflict('A request that was sent cannot be changed. Void it and send a corrected copy.')
    return r
  },
  changed(r: SignRequestRow) { socketService.toUser(r.owner_id, 'signing:updated', { id: r.id, status: r.status }) },
  detail(r: SignRequestRow) {
    const recipients = signingRepository.recipients(r.id); const documents = signingRepository.documents(r.id)
    const names = new Map(recipients.map((x) => [x.id, x.name]))
    return {
      request: requestDto(r, recipients, documents),
      documents: documents.map(documentDto),
      recipients: recipients.map(recipientDto),
      fields: signingRepository.fields(r.id).map(fieldDto),
      events: signingRepository.events(r.id).filter((e) => e.type !== 'field').map((e) => ({ id: e.id, type: e.type, recipientId: e.recipient_id, at: e.created_at, ip: e.ip, text: eventText(e, e.recipient_id ? names.get(e.recipient_id) ?? 'A recipient' : '') })),
    }
  },

  // ------------------------------------------------------------------ owner side
  /**
   * Requests for the Documents page (the caller's own; admins see everyone's) or for one company.
   * On a company, requests of other users are listed with status only — no way into the files (G16).
   */
  list(user: AuthUser, f: { companyId?: string; template?: boolean }) {
    const mine = (r: SignRequestRow) => r.owner_id === user.id || user.role === 'admin'
    const rows = f.companyId ? signingRepository.list({ companyId: f.companyId, template: false }) : signingRepository.list({ template: !!f.template, ownerId: user.role === 'admin' ? undefined : user.id })
    return rows.map((r) => ({ ...requestDto(r, signingRepository.recipients(r.id), signingRepository.documents(r.id)), restricted: !mine(r) }))
      .map((d) => (d.restricted ? { ...d, message: null, voidReason: null } : d))
  },
  get(user: AuthUser, id: string) { return this.detail(this.owned(user, id)) },
  create(user: AuthUser, d: { title: string; companyId?: string | null; dealId?: string | null; threadId?: string | null; isTemplate?: boolean }) {
    if (d.companyId && !companyRepository.byId(d.companyId)) throw badRequest('Company not found')
    if (d.dealId && !dealRepository.byId(d.dealId)) throw badRequest('Deal not found')
    if (d.threadId) {
      const t = emailRepository.threadById(d.threadId)
      if (!t || !emailManager.accountIdsFor(user.id, user.role).includes(t.google_account_id)) throw badRequest('Thread not found')
    }
    const r = signingRepository.create({ owner_id: user.id, title: d.title.trim(), company_id: d.companyId ?? null, deal_id: d.dealId ?? null, thread_id: d.threadId ?? null, is_template: !!d.isTemplate })
    this.changed(r)
    return this.detail(r)
  },
  update(user: AuthUser, id: string, d: RequestInput) {
    const r = this.draft(user, id)
    const p: SignRequestPatch = {}
    if (d.title !== undefined) { if (!d.title.trim()) throw badRequest('Title is required'); p.title = d.title.trim() }
    if (d.message !== undefined) p.message = d.message?.trim() || null
    if (d.companyId !== undefined) { if (d.companyId && !companyRepository.byId(d.companyId)) throw badRequest('Company not found'); p.company_id = d.companyId }
    if (d.dealId !== undefined) { if (d.dealId && !dealRepository.byId(d.dealId)) throw badRequest('Deal not found'); p.deal_id = d.dealId }
    if (d.sequential !== undefined) p.sequential = d.sequential ? 1 : 0
    if (d.requireCode !== undefined) p.require_code = d.requireCode ? 1 : 0
    if (d.remindAfterDays !== undefined) p.remind_after_days = d.remindAfterDays
    if (d.remindEveryDays !== undefined) p.remind_every_days = d.remindEveryDays
    if (d.remindMax !== undefined) p.remind_max = d.remindMax
    if (d.expiresAt !== undefined) {
      if (d.expiresAt && !(new Date(d.expiresAt).getTime() > Date.now())) throw badRequest('The expiry date must be in the future')
      p.expires_at = d.expiresAt ? new Date(d.expiresAt).toISOString() : null
    }
    return this.detail(signingRepository.update(r.id, p))
  },
  async remove(user: AuthUser, id: string) {
    const r = this.owned(user, id)
    if (r.status === 'sent') throw conflict('This request is out for signature. Void it before deleting.')
    signingRepository.delete(r.id)
    await fsp.rm(dir(r.id), { recursive: true, force: true }).catch(() => undefined)
    this.changed({ ...r, status: 'voided' })
  },

  /** Add uploaded PDFs (multer temp files) to a draft. Bad files are rejected one by one with the reason. */
  async addDocuments(user: AuthUser, id: string, files: { path: string; originalname: string; size: number }[]) {
    const cleanup = () => Promise.all(files.map((f) => fsp.unlink(f.path).catch(() => undefined)))
    let r: SignRequestRow
    try { r = this.draft(user, id) } catch (e) { await cleanup(); throw e }
    const rejected: { filename: string; reason: string }[] = []
    try {
      await fsp.mkdir(dir(r.id), { recursive: true })
      for (const f of files) {
        // multer hands over the name as latin1; names in other scripts arrive garbled without this.
        const filename = Buffer.from(f.originalname, 'latin1').toString('utf8').replace(/[\\/\u0000-\u001f]/g, '_').slice(0, 200) || 'document.pdf'
        const existing = signingRepository.documents(r.id)
        if (existing.length >= MAX_FILES) { rejected.push({ filename, reason: `A request holds at most ${MAX_FILES} files` }); continue }
        const bytes = await fsp.readFile(f.path)
        let pageCount: number
        try { pageCount = (await signPdfService.inspect(bytes)).pageCount } catch (e) { rejected.push({ filename, reason: (e as Error).message }); continue }
        if (existing.reduce((n, d) => n + d.page_count, 0) + pageCount > MAX_PAGES) { rejected.push({ filename, reason: `A request holds at most ${MAX_PAGES} pages in total` }); continue }
        const docId = nanoid(14); const target = path.join(dir(r.id), `${docId}.pdf`)
        await fsp.writeFile(target, bytes)
        signingRepository.addDocument({ id: docId, request_id: r.id, filename, file_path: target, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), page_count: pageCount, size: bytes.length })
      }
    } finally { await cleanup() }
    signingRepository.update(r.id, {})
    return { ...this.detail(signingRepository.byId(r.id)!), rejected }
  },
  async removeDocument(user: AuthUser, id: string, docId: string) {
    const r = this.draft(user, id)
    const d = signingRepository.documentById(docId); if (!d || d.request_id !== r.id) throw notFound('Document not found')
    signingRepository.deleteDocument(d.id) // its fields go with it (cascade)
    await fsp.unlink(d.file_path).catch(() => undefined)
    signingRepository.documents(r.id).forEach((x, i) => signingRepository.setDocumentOrder(x.id, i))
    return this.detail(signingRepository.update(r.id, {}))
  },
  reorderDocuments(user: AuthUser, id: string, ids: string[]) {
    const r = this.draft(user, id)
    const docs = signingRepository.documents(r.id)
    if (ids.length !== docs.length || !docs.every((d) => ids.includes(d.id))) throw badRequest('The order must list every document of the request once')
    tx(() => ids.forEach((docId, i) => signingRepository.setDocumentOrder(docId, i)))
    return this.detail(signingRepository.update(r.id, {}))
  },

  /** Replace the recipient list. Rows that keep their id keep their fields; removed recipients lose theirs. */
  setRecipients(user: AuthUser, id: string, list: RecipientInput[]) {
    const r = this.draft(user, id)
    if (list.length > 20) throw badRequest('A request has at most 20 recipients')
    const seen = new Set<string>()
    for (const x of list) {
      const email = x.email.trim().toLowerCase()
      // Templates may hold a role name without an address yet ("Customer"); real requests need one at send.
      if (email && !EMAIL_RE.test(email)) throw badRequest(`"${x.email}" is not a valid email address`)
      if (email && seen.has(email)) throw badRequest(`${email} is on the list twice`)
      if (email) seen.add(email)
      if (!x.name.trim()) throw badRequest('Every recipient needs a name')
    }
    tx(() => {
      const existing = new Map(signingRepository.recipients(r.id).map((x) => [x.id, x]))
      const keep = new Set(list.map((x) => x.id).filter((x): x is string => !!x && existing.has(x)))
      for (const old of existing.values()) if (!keep.has(old.id)) signingRepository.deleteRecipient(old.id)
      list.forEach((x, i) => {
        const base = { role: x.role === 'copy' ? 'copy' as const : 'signer' as const, name: x.name.trim().slice(0, 120), email: x.email.trim().toLowerCase(), lead_id: x.leadId && leadRepository.byId(x.leadId) ? x.leadId : null, user_id: x.userId && userRepository.byId(x.userId) ? x.userId : null, sort_order: i }
        if (x.id && keep.has(x.id)) signingRepository.updateRecipient(x.id, base)
        else { const rid = nanoid(16); signingRepository.addRecipient({ id: rid, request_id: r.id, ...base, token_hash: cryptoService.sha256(linkToken(rid)) }) }
      })
      // A recipient switched to "copy" signs nothing.
      const copies = new Set(signingRepository.recipients(r.id).filter((x) => !isSigner(x)).map((x) => x.id))
      if (copies.size) this.replaceFields(r.id, signingRepository.fields(r.id).filter((f) => !copies.has(f.recipient_id)).map((f) => ({ documentId: f.document_id, recipientId: f.recipient_id, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: !!f.required, label: f.label })))
    })
    return this.detail(signingRepository.update(r.id, {}))
  },
  replaceFields(requestId: string, fields: FieldInput[]) {
    signingRepository.deleteFields(requestId)
    for (const f of fields) signingRepository.addField({ id: nanoid(14), request_id: requestId, document_id: f.documentId, recipient_id: f.recipientId, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required === false ? 0 : 1, label: f.label?.trim().slice(0, 80) || null })
  },
  setFields(user: AuthUser, id: string, fields: FieldInput[]) {
    const r = this.draft(user, id)
    if (fields.length > 500) throw badRequest('A request has at most 500 fields')
    const docs = new Map(signingRepository.documents(r.id).map((d) => [d.id, d]))
    const signers = new Set(signingRepository.recipients(r.id).filter(isSigner).map((x) => x.id))
    for (const f of fields) {
      const d = docs.get(f.documentId)
      if (!d) throw badRequest('A field points at a document that is not part of this request')
      if (!signers.has(f.recipientId)) throw badRequest('A field is assigned to someone who is not a signer on this request')
      if (!FIELD_TYPES.includes(f.type)) throw badRequest(`Unknown field type "${f.type}"`)
      if (!Number.isInteger(f.page) || f.page < 1 || f.page > d.page_count) throw badRequest(`"${d.filename}" has no page ${f.page}`)
      if (![f.x, f.y, f.w, f.h].every((n) => Number.isFinite(n)) || f.x < 0 || f.y < 0 || f.w <= 0 || f.h <= 0 || f.x + f.w > 1.0001 || f.y + f.h > 1.0001) throw badRequest('A field lies outside its page')
    }
    tx(() => this.replaceFields(r.id, fields))
    return this.detail(signingRepository.update(r.id, {}))
  },

  /** Recipient auto-complete: the company's contacts first, then teammates, then any other contact matching the text. */
  suggestions(_user: AuthUser, f: { companyId?: string; q?: string }) {
    const q = (f.q ?? '').trim().toLowerCase()
    const out: { name: string; email: string; leadId: string | null; userId: string | null; source: 'company' | 'team' | 'contact'; detail: string | null }[] = []
    const seen = new Set<string>()
    const push = (x: (typeof out)[number]) => { const k = x.email.toLowerCase(); if (!seen.has(k) && (!q || `${x.name} ${x.email}`.toLowerCase().includes(q))) { seen.add(k); out.push(x) } }
    if (f.companyId) for (const l of leadRepository.list({ companyId: f.companyId })) if (l.email) push({ name: `${l.first_name} ${l.last_name}`.trim(), email: l.email, leadId: l.id, userId: null, source: 'company', detail: l.title })
    for (const u of userRepository.list()) if (u.is_active) push({ name: u.name, email: u.email, leadId: null, userId: u.id, source: 'team', detail: 'Team member' })
    if (q.length >= 2) for (const l of leadRepository.list({ q }).slice(0, 20)) if (l.email) push({ name: `${l.first_name} ${l.last_name}`.trim(), email: l.email, leadId: l.id, userId: null, source: 'contact', detail: l.title })
    return out.slice(0, 30)
  },

  /** Copy a request (files, recipients, fields, settings) into a new draft, or into / out of a template. */
  async duplicate(user: AuthUser, id: string, d: { asTemplate?: boolean; title?: string; companyId?: string | null }) {
    const src = this.owned(user, id)
    const companyId = d.asTemplate ? null : d.companyId !== undefined ? d.companyId : src.company_id
    if (companyId && !companyRepository.byId(companyId)) throw badRequest('Company not found')
    const copy = signingRepository.create({ owner_id: user.id, title: (d.title?.trim() || (d.asTemplate || src.is_template ? src.title : `${src.title} (copy)`)).slice(0, 200), company_id: companyId, deal_id: d.asTemplate ? null : src.deal_id, thread_id: null, is_template: !!d.asTemplate })
    signingRepository.update(copy.id, { message: src.message, sequential: src.sequential, require_code: src.require_code, remind_after_days: src.remind_after_days, remind_every_days: src.remind_every_days, remind_max: src.remind_max })
    await fsp.mkdir(dir(copy.id), { recursive: true })
    const docMap = new Map<string, string>()
    for (const doc of signingRepository.documents(src.id)) {
      const docId = nanoid(14); const target = path.join(dir(copy.id), `${docId}.pdf`)
      await fsp.copyFile(doc.file_path, target)
      signingRepository.addDocument({ id: docId, request_id: copy.id, filename: doc.filename, file_path: target, sha256: doc.sha256, page_count: doc.page_count, size: doc.size })
      docMap.set(doc.id, docId)
    }
    const recMap = new Map<string, string>()
    for (const rec of signingRepository.recipients(src.id)) {
      const rid = nanoid(16)
      signingRepository.addRecipient({ id: rid, request_id: copy.id, role: rec.role, name: rec.name, email: rec.email, lead_id: rec.lead_id, user_id: rec.user_id, sort_order: rec.sort_order, token_hash: cryptoService.sha256(linkToken(rid)) })
      recMap.set(rec.id, rid)
    }
    this.replaceFields(copy.id, signingRepository.fields(src.id).map((f) => ({ documentId: docMap.get(f.document_id)!, recipientId: recMap.get(f.recipient_id)!, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: !!f.required, label: f.label })))
    const fresh = signingRepository.byId(copy.id)!
    this.changed(fresh)
    return this.detail(fresh)
  },

  // ------------------------------------------------------------------ sending
  /** Send one email from the request owner's connected Gmail. Never throws: a request works through copied links too. */
  async mail(r: SignRequestRow, to: SignRecipientRow | { name: string; email: string; lead_id?: string | null }, subject: string, lines: string[]): Promise<boolean> {
    try {
      await emailManager.send(r.owner_id, { to: [to.name ? `${to.name.replace(/[<>"]/g, '')} <${to.email}>` : to.email], subject, bodyText: lines.join('\n\n'), leadId: to.lead_id ?? null, trackOpens: false, trackClicks: false, includeSignature: false })
      return true
    } catch (e) { console.warn('[signing-mail]', r.id, (e as Error).message); return false }
  },
  async invite(r: SignRequestRow, rec: SignRecipientRow, reminder?: { manual: boolean }): Promise<boolean> {
    const owner = userRepository.byId(r.owner_id)
    const sent = await this.mail(r, rec, reminder ? `Reminder: please sign "${r.title}"` : `${owner?.name ?? 'Someone'} asked you to sign "${r.title}"`, [
      `Hi ${rec.name.split(' ')[0] || rec.name},`,
      reminder ? `This is a reminder that "${r.title}" is still waiting for your signature.` : `${owner?.name ?? 'Someone'} sent you "${r.title}" to review and sign.`,
      ...(r.message && !reminder ? [r.message] : []),
      `Open the document: ${linkUrl(rec.id)}`,
      ...(r.expires_at ? [`It can be signed until ${utc(r.expires_at)}.`] : []),
      'This link is personal to you — please do not forward it.',
    ])
    if (reminder) { signingRepository.updateRecipient(rec.id, { reminders_sent: rec.reminders_sent + 1, last_reminded_at: nowIso() }); signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'reminded', meta: { manual: reminder.manual, emailed: sent } }) }
    else { signingRepository.updateRecipient(rec.id, { status: 'sent' }); signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'invited', meta: { emailed: sent } }) }
    return sent
  },
  async send(user: AuthUser, id: string) {
    const r = this.draft(user, id)
    if (r.is_template) throw conflict('A template cannot be sent. Create a request from it first.')
    const docs = signingRepository.documents(r.id); const recipients = signingRepository.recipients(r.id); const fields = signingRepository.fields(r.id)
    const signers = recipients.filter(isSigner)
    if (!docs.length) throw badRequest('Add at least one PDF')
    if (!signers.length) throw badRequest('Add at least one signer')
    for (const rec of recipients) if (!EMAIL_RE.test(rec.email)) throw badRequest(`${rec.name} needs an email address`)
    for (const s of signers) if (!fields.some((f) => f.recipient_id === s.id)) throw badRequest(`${s.name} has nothing to fill in. Place at least one field for them, or make them a copy recipient.`)
    if (r.expires_at && new Date(r.expires_at).getTime() <= Date.now()) throw badRequest('The expiry date has already passed')
    // Name fields start with the recipient's name; they can still correct it.
    for (const f of fields) if (f.type === 'name') signingRepository.setFieldValue(f.id, recipients.find((x) => x.id === f.recipient_id)!.name)
    let sent = signingRepository.update(r.id, { status: 'sent', sent_at: nowIso() })
    signingRepository.addEvent({ request_id: r.id, type: 'sent' })
    const first = r.sequential ? signers.slice(0, 1) : signers
    const results = await Promise.all(first.map((rec) => this.invite(sent, rec)))
    for (const rec of recipients) if (rec.lead_id) leadManager.logActivity(rec.lead_id, user.id, 'system', { text: `Sent for signature: ${r.title}` })
    sent = signingRepository.byId(r.id)!
    this.changed(sent)
    return { ...this.detail(sent), emailed: results.every(Boolean), links: first.map((rec) => ({ recipientId: rec.id, name: rec.name, url: linkUrl(rec.id) })) }
  },
  async void(user: AuthUser, id: string, reason: string | null) {
    const r = this.owned(user, id)
    if (r.status !== 'sent') throw conflict('Only a request that is out for signature can be voided')
    const voided = signingRepository.update(r.id, { status: 'voided', void_reason: reason?.trim().slice(0, 500) || null })
    signingRepository.addEvent({ request_id: r.id, type: 'voided', meta: { reason: voided.void_reason } })
    const owner = userRepository.byId(r.owner_id)
    for (const rec of signingRepository.recipients(r.id)) if (rec.status !== 'pending') void this.mail(voided, rec, `Cancelled: "${r.title}"`, [`Hi ${rec.name.split(' ')[0] || rec.name},`, `${owner?.name ?? 'The sender'} cancelled the signing request "${r.title}". There is nothing more for you to do.`, ...(voided.void_reason ? [`Reason: ${voided.void_reason}`] : [])])
    this.changed(voided)
    return this.detail(voided)
  },
  async remind(user: AuthUser, id: string, recipientId: string) {
    const r = this.owned(user, id)
    const rec = signingRepository.recipientById(recipientId)
    if (!rec || rec.request_id !== r.id) throw notFound('Recipient not found')
    if (r.status !== 'sent' || !['sent', 'opened'].includes(rec.status)) throw conflict('This person is not waiting to sign')
    const emailed = await this.invite(r, rec, { manual: true })
    return { ...this.detail(r), emailed }
  },
  recipientLink(user: AuthUser, id: string, recipientId: string) {
    const r = this.owned(user, id)
    const rec = signingRepository.recipientById(recipientId)
    if (!rec || rec.request_id !== r.id) throw notFound('Recipient not found')
    return { url: linkUrl(rec.id) }
  },
  documentFile(user: AuthUser, id: string, docId: string) {
    const r = this.owned(user, id)
    const d = signingRepository.documentById(docId)
    if (!d || d.request_id !== r.id || !fs.existsSync(d.file_path)) throw notFound('Document not found')
    return { path: d.file_path, filename: d.filename }
  },
  signedFile(user: AuthUser, id: string) {
    const r = this.owned(user, id)
    if (!r.signed_file_path || !fs.existsSync(r.signed_file_path)) throw notFound('The signed document is not available yet')
    signingRepository.addEvent({ request_id: r.id, type: 'downloaded' })
    return { path: r.signed_file_path, filename: `${r.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')} - signed.pdf` }
  },

  // ------------------------------------------------------------------ signer side (public, by link secret)
  /** Resolve a link secret. Unknown secrets and templates look the same: not found. */
  byToken(token: string): { r: SignRequestRow; rec: SignRecipientRow } {
    const rec = token.length >= 20 ? signingRepository.recipientByTokenHash(cryptoService.sha256(token)) : undefined
    const r = rec ? signingRepository.byId(rec.request_id) : undefined
    if (!rec || !r || r.is_template || r.status === 'draft') throw notFound('This signing link is not valid')
    return { r, rec }
  },
  /** For actions that change something: the request must be out for signature and it must be this signer's turn. */
  signing(token: string, ctx: SignerContext): { r: SignRequestRow; rec: SignRecipientRow } {
    const { r, rec } = this.byToken(token)
    if (r.status !== 'sent') throw conflict(r.status === 'completed' ? 'This document is already signed by everyone' : 'This signing request is no longer open')
    if (r.expires_at && new Date(r.expires_at).getTime() <= Date.now()) throw conflict('This signing request has expired')
    if (!isSigner(rec)) throw forbidden('You received a copy of this document and do not need to sign it')
    if (rec.status === 'signed') throw conflict('You have already signed this document')
    if (rec.status === 'pending') throw conflict('It is not your turn to sign yet')
    if (r.require_code && !sessionValid(rec.id, ctx.session)) throw new ApiError(403, 'CODE_REQUIRED', 'Enter the code we emailed you to continue')
    return { r, rec }
  },
  /** What the signing page shows. Only this recipient's own fields are returned. */
  async view(token: string, ctx: SignerContext) {
    const { r, rec } = this.byToken(token)
    const owner = userRepository.byId(r.owner_id)
    const expired = r.status === 'sent' && !!r.expires_at && new Date(r.expires_at).getTime() <= Date.now()
    const needsCode = !!r.require_code && r.status === 'sent' && isSigner(rec) && rec.status !== 'signed' && !sessionValid(rec.id, ctx.session)
    const base = {
      title: r.title, senderName: owner?.name ?? 'The sender', status: expired ? 'expired' : r.status, expiresAt: r.expires_at,
      recipient: { name: rec.name, email: rec.email.replace(/^(.).*(@.*)$/, '$1•••$2'), role: rec.role, status: rec.status, consented: !!rec.consented_at },
      needsCode, canDownload: r.status === 'completed' && !!r.signed_file_path,
    }
    if (needsCode || r.status === 'voided' || r.status === 'declined' || expired) return { ...base, message: null, documents: [], fields: [], others: [] }
    if (r.status === 'sent' && isSigner(rec) && rec.status === 'sent') {
      signingRepository.updateRecipient(rec.id, { status: 'opened' })
      signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'opened', ip: ctx.ip, user_agent: ctx.userAgent })
      this.changed(r)
    }
    const fields = await Promise.all(signingRepository.fields(r.id).filter((f) => f.recipient_id === rec.id).map(async (f) => {
      const isImage = f.type === 'signature' || f.type === 'initials'
      const image = isImage && f.value ? await fsp.readFile(f.value).then((b) => `data:image/png;base64,${b.toString('base64')}`).catch(() => null) : null
      return { id: f.id, documentId: f.document_id, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: !!f.required, label: f.label, value: isImage ? null : f.value, image }
    }))
    return {
      ...base, message: r.message,
      documents: signingRepository.documents(r.id).map((d) => ({ id: d.id, filename: d.filename, pageCount: d.page_count })),
      fields,
      others: signingRepository.recipients(r.id).filter((x) => x.id !== rec.id && isSigner(x)).map((x) => ({ name: x.name, signed: x.status === 'signed' })),
    }
  },
  async sendCode(token: string, ctx: SignerContext) {
    const { r, rec } = this.byToken(token)
    if (!r.require_code || r.status !== 'sent') throw conflict('No code is needed for this document')
    const pending = codes.get(rec.id)
    if (pending && pending.expires - CODE_TTL_MS + 60_000 > Date.now()) throw new ApiError(429, 'RATE_LIMITED', 'A code was just sent. Wait a minute before asking for another one.')
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    codes.set(rec.id, { hash: cryptoService.sha256(`${rec.id}:${code}`), expires: Date.now() + CODE_TTL_MS, attempts: 0 })
    const emailed = await this.mail(r, rec, `Your code for "${r.title}"`, [`Your code is ${code}`, 'It is valid for 10 minutes. If you did not ask for it, you can ignore this email.'])
    if (!emailed) { codes.delete(rec.id); throw new ApiError(422, 'FAILED', 'The code could not be emailed. Ask the sender to check their email connection.') }
    signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'code_sent', ip: ctx.ip, user_agent: ctx.userAgent })
    return { ok: true }
  },
  verifyCode(token: string, code: string, ctx: SignerContext) {
    const { r, rec } = this.byToken(token)
    const pending = codes.get(rec.id)
    if (!pending || pending.expires < Date.now()) throw badRequest('This code has expired. Ask for a new one.')
    if (pending.attempts >= CODE_ATTEMPTS) { codes.delete(rec.id); throw badRequest('Too many wrong attempts. Ask for a new code.') }
    pending.attempts += 1
    if (!cryptoService.safeEqual(pending.hash, cryptoService.sha256(`${rec.id}:${code.trim()}`))) throw badRequest('That code is not correct')
    codes.delete(rec.id)
    signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'code_verified', ip: ctx.ip, user_agent: ctx.userAgent })
    return { session: sessionFor(rec.id) }
  },
  /** Original PDF bytes for the signing page. Open to any recipient of a live or completed request who passed the code. */
  publicDocument(token: string, docId: string, ctx: SignerContext) {
    const { r, rec } = this.byToken(token)
    if (!['sent', 'completed'].includes(r.status)) throw conflict('This signing request is no longer open')
    if (r.require_code && r.status === 'sent' && isSigner(rec) && rec.status !== 'signed' && !sessionValid(rec.id, ctx.session)) throw new ApiError(403, 'CODE_REQUIRED', 'Enter the code we emailed you to continue')
    const d = signingRepository.documentById(docId)
    if (!d || d.request_id !== r.id || !fs.existsSync(d.file_path)) throw notFound('Document not found')
    return { path: d.file_path, filename: d.filename }
  },
  consent(token: string, ctx: SignerContext) {
    const { r, rec } = this.signing(token, ctx)
    if (!rec.consented_at) {
      signingRepository.updateRecipient(rec.id, { consented_at: nowIso() })
      signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'consented', ip: ctx.ip, user_agent: ctx.userAgent })
    }
    return { ok: true }
  },
  async setField(token: string, fieldId: string, value: string | null, ctx: SignerContext) {
    const { r, rec } = this.signing(token, ctx)
    const f = signingRepository.fieldById(fieldId)
    if (!f || f.request_id !== r.id || f.recipient_id !== rec.id) throw notFound('Field not found')
    if (!rec.consented_at) throw conflict('Agree to sign electronically first')
    let stored: string | null = null
    if (f.type === 'date') throw badRequest('The date is filled in automatically when you finish')
    else if (f.type === 'checkbox') stored = value === 'true' ? 'true' : null
    else if (f.type === 'signature' || f.type === 'initials') {
      const file = path.join(dir(r.id), `sig-${f.id}.png`)
      if (value) {
        const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value)
        const bytes = m ? Buffer.from(m[1], 'base64') : null
        if (!bytes || bytes.length < 60 || !bytes.subarray(0, 8).equals(PNG_MAGIC)) throw badRequest('The signature image is not valid')
        if (bytes.length > MAX_SIGNATURE_BYTES) throw badRequest('The signature image is too large')
        await fsp.mkdir(dir(r.id), { recursive: true })
        await fsp.writeFile(file, bytes)
        stored = file
      } else await fsp.unlink(file).catch(() => undefined)
    } else stored = value?.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, f.type === 'name' ? 120 : 500) || null
    signingRepository.setFieldValue(f.id, stored)
    signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'field', ip: ctx.ip, user_agent: ctx.userAgent, meta: { fieldId: f.id, fieldType: f.type, filled: stored !== null } })
    return { id: f.id, filled: stored !== null }
  },
  async finish(token: string, ctx: SignerContext) {
    const { r, rec } = this.signing(token, ctx)
    if (!rec.consented_at) throw conflict('Agree to sign electronically first')
    const mine = signingRepository.fields(r.id).filter((f) => f.recipient_id === rec.id)
    const missing = mine.filter((f) => f.required && f.type !== 'date' && !f.value)
    if (missing.length) throw new ApiError(422, 'INCOMPLETE', `${missing.length} required field${missing.length === 1 ? ' is' : 's are'} still empty`, { fieldIds: missing.map((f) => f.id) })
    const today = new Date().toISOString().slice(0, 10)
    for (const f of mine) if (f.type === 'date') signingRepository.setFieldValue(f.id, today)
    signingRepository.updateRecipient(rec.id, { status: 'signed', signed_at: nowIso(), signed_ip: ctx.ip ?? null, signed_user_agent: ctx.userAgent?.slice(0, 300) ?? null })
    signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'signed', ip: ctx.ip, user_agent: ctx.userAgent })
    if (rec.lead_id) leadManager.logActivity(rec.lead_id, null, 'system', { text: `Signed: ${r.title}` })
    const signers = signingRepository.recipients(r.id).filter(isSigner)
    const waiting = signers.filter((s) => s.status !== 'signed')
    let completed = false
    if (!waiting.length) { await this.complete(r); completed = true }
    else {
      notificationService.notify(r.owner_id, { type: 'signing', title: `${rec.name} signed`, body: `${r.title} — ${signers.length - waiting.length} of ${signers.length} signed`, link: `/documents/${r.id}` })
      // In-order signing: the next person is invited only now.
      if (r.sequential && waiting[0].status === 'pending') await this.invite(r, waiting[0])
    }
    this.changed(signingRepository.byId(r.id)!)
    return { completed }
  },
  async decline(token: string, reason: string | null, ctx: SignerContext) {
    const { r, rec } = this.signing(token, ctx)
    const text = reason?.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, 500) || null
    signingRepository.updateRecipient(rec.id, { status: 'declined', decline_reason: text })
    const declined = signingRepository.update(r.id, { status: 'declined' })
    signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'declined', ip: ctx.ip, user_agent: ctx.userAgent, meta: { reason: text } })
    notificationService.notify(r.owner_id, { type: 'signing', title: `${rec.name} declined to sign`, body: text ? `${r.title} — "${text}"` : r.title, link: `/documents/${r.id}` })
    if (rec.lead_id) leadManager.logActivity(rec.lead_id, null, 'system', { text: `Declined to sign: ${r.title}` })
    this.changed(declined)
    return { ok: true }
  },
  publicSigned(token: string, ctx: SignerContext) {
    const { r, rec } = this.byToken(token)
    if (r.status !== 'completed' || !r.signed_file_path || !fs.existsSync(r.signed_file_path)) throw notFound('The signed document is not available yet')
    signingRepository.addEvent({ request_id: r.id, recipient_id: rec.id, type: 'downloaded', ip: ctx.ip, user_agent: ctx.userAgent })
    return { path: r.signed_file_path, filename: `${r.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')} - signed.pdf` }
  },

  // ------------------------------------------------------------------ completion, reminders, expiry
  /** Everyone signed: stamp, merge, add the certificate, store the result and tell everybody. */
  async complete(r: SignRequestRow) {
    const completedAt = nowIso()
    signingRepository.addEvent({ request_id: r.id, type: 'completed' })
    const documents = signingRepository.documents(r.id); const recipients = signingRepository.recipients(r.id); const fields = signingRepository.fields(r.id); const events = signingRepository.events(r.id)
    const names = new Map(recipients.map((x) => [x.id, x.name]))
    const stampDocs = await Promise.all(documents.map(async (d) => ({
      bytes: await fsp.readFile(d.file_path),
      fields: await Promise.all(fields.filter((f) => f.document_id === d.id).map(async (f): Promise<StampField> => ({
        type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h,
        value: (f.type === 'signature' || f.type === 'initials') && f.value ? await fsp.readFile(f.value).catch(() => null) : f.value,
      }))),
    })))
    const owner = userRepository.byId(r.owner_id)
    const bytes = await signPdfService.buildSigned(stampDocs, {
      title: r.title, requestId: r.id, sender: owner ? `${owner.name} <${owner.email}>` : 'Unknown', completedAt: utc(completedAt),
      documents: documents.map((d) => ({ filename: d.filename, pages: d.page_count, sha256: d.sha256 })),
      recipients: recipients.map((x) => ({ name: x.name, email: x.email, role: x.role, signedAt: x.signed_at ? utc(x.signed_at) : null, ip: x.signed_ip, codeVerified: events.some((e) => e.recipient_id === x.id && e.type === 'code_verified') })),
      events: events.filter((e) => e.type !== 'field' && e.type !== 'downloaded').map((e) => ({ at: utc(e.created_at), text: eventText(e, e.recipient_id ? names.get(e.recipient_id) ?? 'A recipient' : '') })),
    })
    const file = path.join(dir(r.id), 'signed.pdf')
    await fsp.mkdir(dir(r.id), { recursive: true })
    await fsp.writeFile(file, bytes)
    const done = signingRepository.update(r.id, { status: 'completed', completed_at: completedAt, signed_file_path: file, signed_sha256: crypto.createHash('sha256').update(bytes).digest('hex') })
    notificationService.notify(r.owner_id, { type: 'signing', title: 'Document fully signed', body: r.title, link: `/documents/${r.id}` })
    for (const rec of recipients) void this.mail(done, rec, `Signed: "${r.title}"`, [`Hi ${rec.name.split(' ')[0] || rec.name},`, `Everyone has signed "${r.title}".`, `Download the signed document: ${linkUrl(rec.id)}`])
    this.changed(done)
    return done
  },
  /** Hourly: expire requests past their date and send the reminders that are due. */
  async tick() {
    const now = Date.now()
    for (const r of signingRepository.open()) {
      if (r.expires_at && new Date(r.expires_at).getTime() <= now) {
        const expired = signingRepository.update(r.id, { status: 'expired' })
        signingRepository.addEvent({ request_id: r.id, type: 'expired' })
        notificationService.notify(r.owner_id, { type: 'signing', title: 'Signing request expired', body: r.title, link: `/documents/${r.id}` })
        this.changed(expired)
        continue
      }
      if (!r.remind_after_days || !r.remind_max) continue
      for (const rec of signingRepository.recipients(r.id)) {
        if (!isSigner(rec) || !['sent', 'opened'].includes(rec.status) || rec.reminders_sent >= r.remind_max) continue
        const since = rec.last_reminded_at ?? signingRepository.lastEventAt(rec.id, 'invited') ?? r.sent_at
        const waitDays = rec.reminders_sent === 0 ? r.remind_after_days : (r.remind_every_days || r.remind_after_days)
        if (since && now - new Date(since).getTime() >= waitDays * DAY_MS) await this.invite(r, rec, { manual: false })
      }
    }
  },
}
