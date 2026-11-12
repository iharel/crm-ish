/**
 * signatureManager — per-user email signature. Stored in the existing key/value `settings` table under
 * `signature:<userId>` (no schema change). Appended server-side at send time so composed mail, replies and sent AI
 * drafts all carry the same signature.
 */
import { settingsRepository } from '../repositories/settingsRepository.ts'

export interface Signature {
  /** Plain text, multi-line; urls and email addresses become links in the HTML part. */
  text: string
  /** Add the signature to new emails. */
  enabled: boolean
  /** Add it to replies (including sent AI reply drafts). */
  onReplies: boolean
}

const DEFAULT: Signature = { text: '', enabled: false, onReplies: true }
const key = (userId: string) => `signature:${userId}`

export const signatureManager = {
  get(userId: string): Signature { return { ...DEFAULT, ...settingsRepository.get<Partial<Signature>>(key(userId), {}) } },
  set(userId: string, d: Signature): Signature {
    const clean: Signature = { text: d.text.replace(/\r\n/g, '\n').replace(/\s+$/, ''), enabled: d.enabled, onReplies: d.onReplies }
    settingsRepository.set(key(userId), clean)
    return clean
  },
  /** Whether a message should carry the signature: an explicit choice wins, otherwise the user's defaults. */
  applies(userId: string, isReply: boolean, explicit?: boolean): boolean {
    const s = this.get(userId)
    if (!s.text.trim()) return false
    if (explicit !== undefined) return explicit
    return isReply ? s.onReplies : s.enabled
  },
  /** Signature as a plain-text block (with the standard "-- " delimiter) and as an HTML block. */
  render(userId: string): { text: string; html: string } {
    const s = this.get(userId)
    const esc = s.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const linked = esc
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
      .replace(/(^|[\s(])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '$1<a href="mailto:$2">$2</a>')
      .replace(/\n/g, '<br>')
    return { text: `\n\n-- \n${s.text}`, html: `<div class="looper-signature" dir="auto" style="margin-top:16px;color:#555">-- <br>${linked}</div>` }
  },
}
