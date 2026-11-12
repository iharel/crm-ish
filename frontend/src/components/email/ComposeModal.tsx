import { useState } from 'react'
import { Send, Sparkles, Calendar, Eye, Link2, Loader2, PenLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { authApi, calendarApi, draftsApi, emailsApi } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { SignaturePreview } from './SignaturePreview'
import { errorMessage } from '../../api/apiError'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Button, Input, Modal, Skeleton, Textarea, Toggle } from '../ui'

export interface ComposeModalProps { to?: string[]; /** Pre-filled Cc (reply all). */ cc?: string[]; subject?: string; body?: string; leadId?: string | null; threadId?: string; /** Reply-all titling; recipients are passed via `to` / `cc`. */ replyAll?: boolean; onClose: () => void; onSent: () => void }

/** ComposeModal — new email / reply with AI assist, slot insertion, tracking toggles and the sender's signature. */
export function ComposeModal({ to: to0 = [], cc: cc0 = [], subject: s0 = '', body: b0 = '', leadId, threadId, replyAll, onClose, onSent }: ComposeModalProps) {
  const toast = useToast()
  const { user } = useAuth()
  const [to, setTo] = useState(to0.join(', '))
  const [cc, setCc] = useState(cc0.join(', '))
  const [subject, setSubject] = useState(s0)
  const [body, setBody] = useState(b0)
  const [trackOpens, setTrackOpens] = useState(true)
  const [trackClicks, setTrackClicks] = useState(true)
  const [busy, setBusy] = useState<'send' | 'ai' | 'slots' | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Signature: defaults from Settings (new emails vs replies); the sender can switch it off for this one email.
  const sig = useAsync(() => authApi.signature())
  const hasSig = !!sig.data?.text.trim()
  const [sigChoice, setSigChoice] = useState<boolean | null>(null)
  const includeSig = hasSig && (sigChoice ?? (threadId ? sig.data!.onReplies : sig.data!.enabled))
  const split = (s: string) => s.split(/[,;]/).map((x) => x.trim()).filter(Boolean)

  async function send() {
    const toList = split(to); if (!toList.length) { setError('Add at least one recipient'); return }
    if (!body.trim()) { setError('Write a message'); return }
    setBusy('send'); setError(null)
    try {
      if (threadId) await emailsApi.reply(threadId, { to: toList, cc: split(cc), subject, bodyText: body, trackOpens, trackClicks, includeSignature: hasSig ? includeSig : undefined })
      else await emailsApi.send({ to: toList, cc: split(cc), subject, bodyText: body, leadId: leadId ?? undefined, trackOpens, trackClicks, includeSignature: hasSig ? includeSig : undefined })
      toast.success('Email sent'); onSent()
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(null) }
  }
  async function writeWithAi() {
    setBusy('ai'); setError(null)
    try { const d = await draftsApi.generate({ threadId, leadId: leadId ?? undefined, kind: threadId ? 'reply' : 'new', instructions: body.trim() || undefined }); setBody(d.bodyText); if (!subject && d.subject) setSubject(d.subject) } catch (e) { setError(errorMessage(e)) } finally { setBusy(null) }
  }
  async function insertSlots() {
    setBusy('slots')
    try { const slots = await calendarApi.slots(3); const text = slots.length ? `Would any of these work for a 30-minute call?\n${slots.map((s) => `• ${s.label}`).join('\n')}${user?.schedulingLink ? `\nOr pick any slot: ${user.schedulingLink}` : ''}` : user?.schedulingLink ? `Pick any slot that suits you: ${user.schedulingLink}` : 'Let me know what times suit you.'; setBody((b) => (b ? `${b}\n\n${text}` : text)) } catch (e) { setError(errorMessage(e)) } finally { setBusy(null) }
  }
  return (
    <Modal cmp="compose.modal" title={threadId ? (replyAll ? 'Reply all' : 'Reply') : 'New email'} onClose={onClose} wide footer={<>
      <div data-cmp="compose.tracking" className="flex items-center gap-4 mr-auto text-xs text-fg-muted">
        <label data-cmp="compose.track_open_label" className="inline-flex items-center gap-1.5"><Eye size={12} /><Toggle cmp="compose.track_open_toggle" checked={trackOpens} onChange={setTrackOpens} /> Opens</label>
        <label data-cmp="compose.track_click_label" className="inline-flex items-center gap-1.5"><Link2 size={12} /><Toggle cmp="compose.track_click_toggle" checked={trackClicks} onChange={setTrackClicks} /> Clicks</label>
      </div>
      <Button cmp="compose.cancel_button" onClick={onClose}>Discard</Button>
      <Button cmp="compose.send_button" variant="primary" disabled={!!busy} icon={busy === 'send' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} onClick={() => void send()}>{busy === 'send' ? 'Sending…' : 'Send'}</Button>
    </>}>
      {error && <p data-cmp="compose.error_text" className="text-xs text-danger">{error}</p>}
      {!user?.gmail && <p data-cmp="compose.nogmail_text" className="text-xs text-warning rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">Connect your Gmail in Settings → Email to send messages.</p>}
      <Input cmp="compose.to_input" dir="ltr" label="To" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com, …" />
      <div data-cmp="compose.row2" className="grid grid-cols-2 gap-3"><Input cmp="compose.cc_input" dir="ltr" label="Cc" value={cc} onChange={(e) => setCc(e.target.value)} /><Input cmp="compose.subject_input" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
      <div data-cmp="compose.ai_row" className="flex items-center gap-2">
        <Button cmp="compose.ai_write_button" size="sm" variant="accent" disabled={!!busy} icon={busy === 'ai' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} onClick={() => void writeWithAi()}>{body.trim() ? 'Rewrite with AI (uses text as instructions)' : 'Write with AI'}</Button>
        <Button cmp="compose.slots_button" size="sm" variant="ghost" disabled={!!busy} icon={busy === 'slots' ? <Loader2 size={12} className="animate-spin" /> : <Calendar size={12} />} onClick={() => void insertSlots()}>Insert available times</Button>
      </div>
      <Textarea cmp="compose.body_textarea" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-64 font-sans leading-relaxed" placeholder="Write your message, or describe what to say and click Write with AI…" />
      <div data-cmp="compose.signature" className="rounded-lg border border-border bg-surface-2/60 px-3 py-2">
        {sig.loading ? <div data-cmp="compose.signature_skeleton" aria-busy="true" className="flex flex-col gap-1.5"><Skeleton cmp="compose.signature_skeleton_line1" className="h-3 w-32" /><Skeleton cmp="compose.signature_skeleton_line2" className="h-3 w-48" /></div> : hasSig ? (
          <div data-cmp="compose.signature_row" className="flex items-start gap-3">
            <SignaturePreview cmp="compose.signature_preview" text={sig.data!.text} muted={!includeSig} />
            <div data-cmp="compose.signature_controls" className="ml-auto flex items-center gap-3 shrink-0 text-xs text-fg-muted">
              <Toggle cmp="compose.signature_toggle" checked={includeSig} onChange={setSigChoice} label="Signature" />
              <Link data-cmp="compose.signature_edit_link" to="/settings?tab=signature" onClick={onClose} className="text-primary hover:underline">Edit</Link>
            </div>
          </div>
        ) : (
          <p data-cmp="compose.signature_empty" className="text-xs text-fg-subtle inline-flex items-center gap-1.5"><PenLine size={12} /> No signature yet. <Link data-cmp="compose.signature_add_link" to="/settings?tab=signature" onClick={onClose} className="text-primary hover:underline">Add one in Settings</Link></p>
        )}
      </div>
    </Modal>
  )
}
