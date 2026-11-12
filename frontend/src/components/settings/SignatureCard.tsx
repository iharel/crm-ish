import { useEffect, useState } from 'react'
import { PenLine } from 'lucide-react'
import { authApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { SignaturePreview } from '../email/SignaturePreview'
import { Button, Card, Skeleton, Textarea, Toggle } from '../ui'
import type { Signature } from '../../types'

const MAX = 2000

/** SignatureCard — edit the user's email signature and when it is added (new emails / replies), with a live preview. */
export function SignatureCard() {
  const toast = useToast()
  const saved = useAsync(() => authApi.signature())
  const [f, setF] = useState<Signature | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (saved.data) setF(saved.data) }, [saved.data])
  const dirty = !!f && !!saved.data && JSON.stringify(f) !== JSON.stringify(saved.data)

  async function save() {
    if (!f) return
    setBusy(true)
    try { saved.setData(await authApi.setSignature(f)); toast.success('Signature saved') } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <Card cmp="settings.signature_card" title={<span data-cmp="settings.signature_title" className="inline-flex items-center gap-2"><PenLine size={14} /> Email signature</span>}>
      {saved.error ? <p data-cmp="settings.signature_error" className="text-sm text-danger">{saved.error}</p> : !f ? (
        <div data-cmp="settings.signature_skeleton" aria-busy="true" className="grid md:grid-cols-2 gap-4"><Skeleton cmp="settings.signature_skeleton_input" className="h-40" /><Skeleton cmp="settings.signature_skeleton_preview" className="h-40" /></div>
      ) : (
        <>
          <div data-cmp="settings.signature_grid" className="grid md:grid-cols-2 gap-4">
            <div data-cmp="settings.signature_edit" className="flex flex-col gap-1.5">
              <Textarea cmp="settings.signature_textarea" label="Signature" dir="auto" value={f.text} maxLength={MAX} onChange={(e) => setF({ ...f, text: e.target.value })} className="min-h-40 font-sans leading-relaxed" placeholder={'Maya Cohen\nHead of Sales, Acme Demo\n+972 50 000 0000\nhttps://acme-demo.example'} />
              <p data-cmp="settings.signature_hint" className="text-[11px] text-fg-subtle">Plain text. Links and email addresses become clickable. {f.text.length}/{MAX}</p>
            </div>
            <div data-cmp="settings.signature_preview_box" className="flex flex-col gap-1.5">
              <span data-cmp="settings.signature_preview_label" className="text-sm">Preview</span>
              <div data-cmp="settings.signature_preview_frame" className="flex-1 min-h-40 rounded-lg border border-border bg-surface-2 p-3">
                <p data-cmp="settings.signature_preview_body" className="text-sm text-fg-subtle mb-3">Hi Dana, thanks for the call today…</p>
                {f.text.trim() ? <SignaturePreview cmp="settings.signature_preview" text={f.text} /> : <p data-cmp="settings.signature_preview_empty" className="text-xs text-fg-subtle italic">Your signature will appear here.</p>}
              </div>
            </div>
          </div>
          <div data-cmp="settings.signature_toggles" className="mt-4 flex flex-wrap gap-6">
            <Toggle cmp="settings.signature_new_toggle" checked={f.enabled} onChange={(v) => setF({ ...f, enabled: v })} label="Add to new emails" />
            <Toggle cmp="settings.signature_reply_toggle" checked={f.onReplies} onChange={(v) => setF({ ...f, onReplies: v })} label="Add to replies (incl. sent AI drafts)" />
          </div>
          <p data-cmp="settings.signature_note" className="mt-2 text-[11px] text-fg-subtle">You can still switch it off for a single email in the compose window.</p>
          <div data-cmp="settings.signature_actions" className="mt-4 flex justify-end gap-2">
            {dirty && <Button cmp="settings.signature_reset_button" variant="ghost" onClick={() => setF(saved.data)}>Discard changes</Button>}
            <Button cmp="settings.signature_save_button" variant="primary" disabled={busy || !dirty} onClick={() => void save()}>Save</Button>
          </div>
        </>
      )}
    </Card>
  )
}
