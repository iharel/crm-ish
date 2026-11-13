/** signing — shared look-up tables for document signing: field types, signer colours, status wording. */
import type { SignFieldType, SignRecipientStatus, SignRequestStatus } from '../types'

export const FIELD_TYPES: { type: SignFieldType; label: string; /** Default size as a fraction of the page. */ w: number; h: number }[] = [
  { type: 'signature', label: 'Signature', w: 0.24, h: 0.06 },
  { type: 'initials', label: 'Initials', w: 0.09, h: 0.045 },
  { type: 'name', label: 'Full name', w: 0.22, h: 0.03 },
  { type: 'date', label: 'Date signed', w: 0.16, h: 0.03 },
  { type: 'text', label: 'Text', w: 0.24, h: 0.03 },
  { type: 'checkbox', label: 'Checkbox', w: 0.03, h: 0.022 },
]
export const fieldLabel = (t: SignFieldType) => FIELD_TYPES.find((f) => f.type === t)?.label ?? t

/** One colour per signer (by position in the recipient list), reused on their fields. */
const SIGNER_COLORS = ['#0ea5a4', '#db2777', '#7c3aed', '#d97706', '#2563eb', '#059669', '#dc2626', '#4f46e5']
export const signerColor = (index: number) => SIGNER_COLORS[((index % SIGNER_COLORS.length) + SIGNER_COLORS.length) % SIGNER_COLORS.length]

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
export const REQUEST_STATUS: Record<SignRequestStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Out for signature', tone: 'info' },
  completed: { label: 'Signed', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
  voided: { label: 'Voided', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'warning' },
}
export const RECIPIENT_STATUS: Record<SignRecipientStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Waiting for their turn', tone: 'neutral' },
  sent: { label: 'Invited', tone: 'info' },
  opened: { label: 'Opened', tone: 'accent' },
  signed: { label: 'Signed', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
}
export const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
export const fileSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)
