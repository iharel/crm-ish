/**
 * attachmentManager — records attachment parts at import, downloads their bytes from Gmail into UPLOAD_DIR/attachments,
 * scans mail imported before this feature on first open, and serves bytes through user-bound signed urls.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import type { Response } from 'express'
import type { gmail_v1 } from 'googleapis'
import { CONSTANTS } from '../constants.ts'
import { notFound, unauthorized } from '../middleware/errors.ts'
import { attachmentRepository } from '../repositories/attachmentRepository.ts'
import { emailRepository } from '../repositories/emailRepository.ts'
import { googleRepository } from '../repositories/googleRepository.ts'
import { googleService } from '../services/googleService.ts'
import { mimeService } from '../services/mimeService.ts'
import { sanitizeService } from '../services/sanitizeService.ts'
import { htmlCacheService } from '../services/htmlCacheService.ts'
import type { AttachmentRow, GoogleAccountRow, MessageRow } from '../types/index.ts'

export interface AttachmentDto { id: string; filename: string; mime: string; size: number; inline: boolean; url: string; /** True when the bytes are on disk (false = download failed at import, will retry on first request). */ available: boolean }

/** Placeholder written into cached HTML instead of a per-user signed url. */
const ATT_PLACEHOLDER = 'att://'
const ROOT = () => path.join(CONSTANTS.UPLOAD_DIR, 'attachments')
const MAX_BYTES = 25 * 1024 * 1024
const SIGNED_TTL_S = 2 * 60 * 60
/** Mime types safe to show inline from our origin (no script execution). */
const INLINE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/avif', 'application/pdf'])

function sign(id: string, exp: number, userId: string) { return crypto.createHmac('sha256', CONSTANTS.JWT_SECRET).update(`${id}.${exp}.${userId}`).digest('base64url') }
function safeName(name: string | null, mime: string) {
  const base = (name ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim()
  if (base) return base
  const ext = mime.startsWith('image/') ? `.${mime.split('/')[1].replace('jpeg', 'jpg').replace(/[^a-z0-9]/g, '')}` : ''
  return `attachment${ext}`
}
function extOf(name: string, mime: string) { const e = path.extname(name); return e || (mime.startsWith('image/') ? `.${mime.split('/')[1].replace('jpeg', 'jpg')}` : '.bin') }
/** Normalizes Gmail's base64url (sometimes with padding stripped or standard chars). */
function decodeB64(data: string) { return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64') }

export const attachmentManager = {
  /**
   * Record and download every attachment part of a freshly imported message. Never throws: a failed download leaves
   * file_path null so the first request retries it.
   */
  async recordAndDownload(account: GoogleAccountRow, message: MessageRow, msg: gmail_v1.Schema$Message, html: string): Promise<AttachmentRow[]> {
    const rows: AttachmentRow[] = []
    for (const part of mimeService.attachments(msg, html)) {
      if (part.size > MAX_BYTES) continue
      const row = attachmentRepository.create({ message_id: message.id, gmail_attachment_id: part.attachmentId, filename: part.filename, mime: part.mime, size: part.size, content_id: part.contentId, is_inline: part.inline ? 1 : 0, file_path: null })
      // While the account is over its Gmail quota, leave file_path null: the first request downloads it.
      if (!part.data && googleService.coolingDown(account.id)) { rows.push(row); continue }
      try {
        const bytes = part.data ? decodeB64(part.data) : await this.fetchBytes(account, msg.id!, part.attachmentId!)
        await this.store(row, bytes)
      } catch (e) {
        if (googleService.isRateLimited(e)) googleService.coolDown(account.id)
        else console.warn('[attachment-download]', msg.id, part.filename, (e as Error).message)
      }
      rows.push(attachmentRepository.byId(row.id)!)
    }
    if (!message.attachments_scanned) emailRepository.updateMessage(message.id, { attachments_scanned: 1 })
    return rows
  },
  /** Mail imported before attachments existed: fetch its Gmail payload once and record/download. Quiet on failure. */
  async ensureScanned(account: GoogleAccountRow, message: MessageRow): Promise<void> {
    if (message.attachments_scanned) return
    if (!message.gmail_message_id) { emailRepository.updateMessage(message.id, { attachments_scanned: 1 }); return }
    try {
      const full = await googleService.gmail(account).users.messages.get({ userId: 'me', id: message.gmail_message_id, format: 'full' })
      await this.recordAndDownload(account, message, full.data, message.body_html ?? '')
    } catch (e) {
      // 404: the message is gone from Gmail; nothing to scan. Other errors: leave unscanned so a later open retries.
      if ((e as { code?: number }).code === 404) emailRepository.updateMessage(message.id, { attachments_scanned: 1 })
      else if (googleService.isRateLimited(e)) googleService.coolDown(account.id)
      else console.warn('[attachment-scan]', message.gmail_message_id, (e as Error).message)
    }
  },
  async fetchBytes(account: GoogleAccountRow, gmailMessageId: string, attachmentId: string): Promise<Buffer> {
    const res = await googleService.gmail(account).users.messages.attachments.get({ userId: 'me', messageId: gmailMessageId, id: attachmentId })
    if (!res.data.data) throw new Error('Empty attachment body')
    return decodeB64(res.data.data)
  },
  async store(row: AttachmentRow, bytes: Buffer): Promise<string> {
    const dir = path.join(ROOT(), row.message_id)
    await fsp.mkdir(dir, { recursive: true })
    const file = path.join(dir, `${row.id}${extOf(safeName(row.filename, row.mime), row.mime)}`)
    await fsp.writeFile(file, bytes)
    attachmentRepository.setFilePath(row.id, file)
    return file
  },
  /** Delete the on-disk files of every message in a thread (rows go with the cascade). */
  async removeForThread(threadId: string): Promise<void> {
    const dirs = new Set(attachmentRepository.byThread(threadId).map((a) => path.join(ROOT(), a.message_id)))
    for (const d of dirs) await fsp.rm(d, { recursive: true, force: true }).catch(() => undefined)
  },

  signedUrl(att: AttachmentRow, userId: string): string {
    // Expiry rounded up to the hour: the url stays identical across refetches, so the browser's image cache hits.
    const exp = Math.ceil((Math.floor(Date.now() / 1000) + SIGNED_TTL_S) / 3600) * 3600
    return `/api/emails/attachments/${att.id}?exp=${exp}&sig=${sign(att.id, exp, userId)}&u=${encodeURIComponent(userId)}`
  },
  dto(att: AttachmentRow, userId: string): AttachmentDto {
    return { id: att.id, filename: safeName(att.filename, att.mime), mime: att.mime, size: att.size, inline: !!att.is_inline, url: this.signedUrl(att, userId), available: !!att.file_path }
  },
  /** DTOs for a message plus its HTML body sanitized with cid: references resolved to signed urls. */
  forMessageAttachments(message: MessageRow, userId: string): AttachmentDto[] {
    return attachmentRepository.byMessage(message.id).map((a) => this.dto(a, userId))
  },
  forMessage(message: MessageRow, userId: string): { attachments: AttachmentDto[]; bodyHtml: string } {
    const rows = attachmentRepository.byMessage(message.id)
    const attachments = rows.map((a) => this.dto(a, userId))
    if (!message.body_html) return { attachments, bodyHtml: '' }
    // Cache key includes the attachment ids so a background scan that adds attachments invalidates the entry.
    const key = `${message.id}|${rows.map((a) => a.id).join(',')}`
    let html = htmlCacheService.get(key)
    if (html === undefined) {
      const cidUrls: Record<string, string> = {}
      for (const a of rows) if (a.content_id) cidUrls[a.content_id.toLowerCase()] = `${ATT_PLACEHOLDER}${a.id}`
      html = sanitizeService.html(message.body_html, { cidUrls })
      htmlCacheService.set(key, html)
    }
    const urlById = new Map(attachments.map((a) => [a.id, a.url]))
    const bodyHtml = html.includes(ATT_PLACEHOLDER) ? html.replace(/att:\/\/([A-Za-z0-9_-]+)/g, (m, id: string) => (urlById.get(id) ?? m).replace(/&/g, '&amp;')) : html
    return { attachments, bodyHtml }
  },

  /** Verify a signed url and stream the bytes; downloads from Gmail first when the import download had failed. */
  async serve(res: Response, id: string, q: { exp?: string; sig?: string; u?: string }, accountIdsForUser: (userId: string) => string[]): Promise<void> {
    const exp = Number(q.exp); const userId = q.u ?? ''
    if (!exp || !q.sig || !userId || exp < Date.now() / 1000) throw unauthorized('Link expired')
    const expected = sign(id, exp, userId)
    if (expected.length !== q.sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(q.sig))) throw unauthorized('Bad signature')
    const att = attachmentRepository.byId(id); if (!att) throw notFound('Attachment not found')
    const message = emailRepository.messageById(att.message_id); if (!message) throw notFound('Attachment not found')
    const thread = emailRepository.threadById(message.thread_id); if (!thread) throw notFound('Attachment not found')
    if (!accountIdsForUser(userId).includes(thread.google_account_id)) throw notFound('Attachment not found')
    let file = att.file_path
    if (!file || !fs.existsSync(file)) {
      const account = googleRepository.accountById(thread.google_account_id)
      if (!account || !att.gmail_attachment_id || !message.gmail_message_id) throw notFound('Attachment is no longer available')
      try { file = await this.store(att, await this.fetchBytes(account, message.gmail_message_id, att.gmail_attachment_id)) } catch { throw notFound('Attachment is no longer available in Gmail') }
    }
    const name = safeName(att.filename, att.mime)
    // Only passive formats render in the browser. Anything else (svg, html, xml...) can carry script, so it is always
    // downloaded and, should a browser render it anyway, sandboxed.
    const mime = att.mime.toLowerCase().split(';')[0].trim()
    const inline = INLINE_MIMES.has(mime)
    res.setHeader('Content-Type', inline ? mime : 'application/octet-stream')
    if (!inline) res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'")
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'private, max-age=86400')
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(name)}`)
    await new Promise<void>((resolve, reject) => { res.sendFile(file!, (err) => (err ? reject(err) : resolve())) })
  },
}
