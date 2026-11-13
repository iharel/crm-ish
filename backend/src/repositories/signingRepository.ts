/** signingRepository — signing requests, their documents, recipients, fields and audit events. */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { SignDocumentRow, SignEventRow, SignFieldRow, SignRecipientRow, SignRequestRow } from '../types/index.ts'

export type SignRequestPatch = Partial<Omit<SignRequestRow, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>
export type SignRecipientPatch = Partial<Omit<SignRecipientRow, 'id' | 'request_id'>>
export interface SignRequestFilter { ownerId?: string; companyId?: string; template?: boolean; status?: string }

export const signingRepository = {
  // ---- requests
  list(f: SignRequestFilter): SignRequestRow[] {
    const where = ['is_template = ?']; const params: unknown[] = [f.template ? 1 : 0]
    if (f.ownerId) { where.push('owner_id = ?'); params.push(f.ownerId) }
    if (f.companyId) { where.push('company_id = ?'); params.push(f.companyId) }
    if (f.status) { where.push('status = ?'); params.push(f.status) }
    return all<SignRequestRow>(`SELECT * FROM sign_requests WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 500`, ...params)
  },
  byId(id: string) { return get<SignRequestRow>('SELECT * FROM sign_requests WHERE id = ?', id) },
  /** Sent requests that may need a reminder or have an expiry date. */
  open(): SignRequestRow[] { return all<SignRequestRow>("SELECT * FROM sign_requests WHERE status = 'sent' AND is_template = 0") },
  create(d: { owner_id: string; title: string; company_id: string | null; deal_id: string | null; thread_id: string | null; is_template: boolean }): SignRequestRow {
    const id = nanoid(14); const t = nowIso()
    run('INSERT INTO sign_requests (id,owner_id,company_id,deal_id,thread_id,title,status,is_template,remind_after_days,remind_every_days,remind_max,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      id, d.owner_id, d.company_id, d.deal_id, d.thread_id, d.title, 'draft', d.is_template ? 1 : 0, 3, 3, 3, t, t)
    return this.byId(id)!
  },
  update(id: string, patch: SignRequestPatch): SignRequestRow {
    const keys = Object.keys(patch) as (keyof SignRequestPatch)[]
    if (keys.length) run(`UPDATE sign_requests SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = ? WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), nowIso(), id)
    return this.byId(id)!
  },
  delete(id: string) { run('DELETE FROM sign_requests WHERE id = ?', id) },

  // ---- documents
  documents(requestId: string): SignDocumentRow[] { return all<SignDocumentRow>('SELECT * FROM sign_documents WHERE request_id = ? ORDER BY sort_order ASC', requestId) },
  documentById(id: string) { return get<SignDocumentRow>('SELECT * FROM sign_documents WHERE id = ?', id) },
  addDocument(d: Omit<SignDocumentRow, 'sort_order'>): SignDocumentRow {
    const next = (get<{ n: number | null }>('SELECT MAX(sort_order) n FROM sign_documents WHERE request_id = ?', d.request_id)?.n ?? -1) + 1
    run('INSERT INTO sign_documents (id,request_id,filename,file_path,sha256,page_count,size,sort_order) VALUES (?,?,?,?,?,?,?,?)', d.id, d.request_id, d.filename, d.file_path, d.sha256, d.page_count, d.size, next)
    return this.documentById(d.id)!
  },
  setDocumentOrder(id: string, sortOrder: number) { run('UPDATE sign_documents SET sort_order = ? WHERE id = ?', sortOrder, id) },
  deleteDocument(id: string) { run('DELETE FROM sign_documents WHERE id = ?', id) },

  // ---- recipients
  recipients(requestId: string): SignRecipientRow[] { return all<SignRecipientRow>('SELECT * FROM sign_recipients WHERE request_id = ? ORDER BY sort_order ASC', requestId) },
  recipientById(id: string) { return get<SignRecipientRow>('SELECT * FROM sign_recipients WHERE id = ?', id) },
  recipientByTokenHash(hash: string) { return get<SignRecipientRow>('SELECT * FROM sign_recipients WHERE token_hash = ?', hash) },
  addRecipient(d: { id: string; request_id: string; role: string; name: string; email: string; lead_id: string | null; user_id: string | null; sort_order: number; token_hash: string }): SignRecipientRow {
    run('INSERT INTO sign_recipients (id,request_id,role,name,email,lead_id,user_id,sort_order,token_hash,status) VALUES (?,?,?,?,?,?,?,?,?,?)', d.id, d.request_id, d.role, d.name, d.email, d.lead_id, d.user_id, d.sort_order, d.token_hash, 'pending')
    return this.recipientById(d.id)!
  },
  updateRecipient(id: string, patch: SignRecipientPatch): SignRecipientRow {
    const keys = Object.keys(patch) as (keyof SignRecipientPatch)[]
    if (keys.length) run(`UPDATE sign_recipients SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, ...keys.map((k) => patch[k] ?? null), id)
    return this.recipientById(id)!
  },
  deleteRecipient(id: string) { run('DELETE FROM sign_recipients WHERE id = ?', id) },

  // ---- fields
  fields(requestId: string): SignFieldRow[] { return all<SignFieldRow>('SELECT * FROM sign_fields WHERE request_id = ? ORDER BY document_id, page, y, x', requestId) },
  fieldById(id: string) { return get<SignFieldRow>('SELECT * FROM sign_fields WHERE id = ?', id) },
  addField(d: Omit<SignFieldRow, 'value' | 'filled_at'>) {
    run('INSERT INTO sign_fields (id,request_id,document_id,recipient_id,type,page,x,y,w,h,required,label) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', d.id, d.request_id, d.document_id, d.recipient_id, d.type, d.page, d.x, d.y, d.w, d.h, d.required, d.label)
  },
  deleteFields(requestId: string) { run('DELETE FROM sign_fields WHERE request_id = ?', requestId) },
  setFieldValue(id: string, value: string | null) { run('UPDATE sign_fields SET value = ?, filled_at = ? WHERE id = ?', value, value === null ? null : nowIso(), id) },

  // ---- events
  events(requestId: string): SignEventRow[] { return all<SignEventRow>('SELECT * FROM sign_events WHERE request_id = ? ORDER BY created_at ASC, rowid ASC', requestId) },
  /** When the recipient was (last) invited — the clock reminders run on. */
  lastEventAt(recipientId: string, type: string): string | null { return get<{ t: string | null }>('SELECT MAX(created_at) t FROM sign_events WHERE recipient_id = ? AND type = ?', recipientId, type)?.t ?? null },
  addEvent(d: { request_id: string; recipient_id?: string | null; type: string; ip?: string | null; user_agent?: string | null; meta?: unknown }): SignEventRow {
    const id = nanoid(14); const t = nowIso()
    run('INSERT INTO sign_events (id,request_id,recipient_id,type,ip,user_agent,meta_json,created_at) VALUES (?,?,?,?,?,?,?,?)', id, d.request_id, d.recipient_id ?? null, d.type, d.ip ?? null, d.user_agent?.slice(0, 300) ?? null, d.meta === undefined ? null : JSON.stringify(d.meta), t)
    return get<SignEventRow>('SELECT * FROM sign_events WHERE id = ?', id)!
  },
}
