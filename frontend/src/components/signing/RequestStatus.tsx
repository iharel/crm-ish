import { useState } from 'react'
import { Bell, Check, Copy, Download, FileText, Mail } from 'lucide-react'
import { signingApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { fullDate } from '../../lib/format'
import { RECIPIENT_STATUS, fileSize, signerColor } from '../../lib/signing'
import { clipboardService } from '../../services/clipboardService'
import { pdfService } from '../../services/pdfService'
import type { SignRequestDetail } from '../../types'
import { Badge, Button, Card } from '../ui'

export interface RequestStatusProps {
  cmp: string
  detail: SignRequestDetail
  /** Replace the page's data after an action. */
  onChanged: (detail: SignRequestDetail) => void
}

/**
 * RequestStatus — a sent request: who has signed, per-person reminder and private link, the files, the signed PDF
 * and the full activity record.
 */
export function RequestStatus({ cmp, detail, onChanged }: RequestStatusProps) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const { request, recipients, documents, events } = detail
  const open = request.status === 'sent'
  const signerOrder = new Map(recipients.filter((r) => r.role === 'signer').map((r, i) => [r.id, i]))

  async function copyLink(rid: string) {
    try { const { url } = await signingApi.link(request.id, rid); if (await clipboardService.copy(url)) { setCopied(rid); setTimeout(() => setCopied(null), 1500) } } catch (e) { toast.error(errorMessage(e)) }
  }
  async function remind(rid: string) {
    setBusy(rid)
    try { const r = await signingApi.remind(request.id, rid); onChanged(r); if (r.emailed) toast.success('Reminder sent'); else toast.toast('The reminder could not be emailed (is your Gmail connected?). Copy the link and send it yourself.') } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) }
  }
  async function download(kind: 'signed' | string, filename: string) {
    setBusy(kind)
    try { pdfService.download(kind === 'signed' ? await signingApi.signedBytes(request.id) : await signingApi.documentBytes(request.id, kind), filename) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) }
  }
  return (
    <div data-cmp={cmp} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div data-cmp={`${cmp}.left_col`} className="flex flex-col gap-4 min-w-0">
        <Card cmp={`${cmp}.recipients_card`} title="Recipients" padded={false}>
          <ul data-cmp={`${cmp}.recipients_list`} className="divide-y divide-border">
            {recipients.map((r) => {
              const signer = r.role === 'signer'
              const s = RECIPIENT_STATUS[r.status]
              const waiting = open && signer && (r.status === 'sent' || r.status === 'opened')
              return (
                <li key={r.id} data-cmp={`${cmp}.recipient_${r.id}`} className="p-3 flex items-center gap-3">
                  <span data-cmp={`${cmp}.recipient_color_${r.id}`} style={{ backgroundColor: signer ? signerColor(signerOrder.get(r.id) ?? 0) : 'var(--border-strong)' }} className="h-2.5 w-2.5 rounded-full shrink-0" />
                  <div data-cmp={`${cmp}.recipient_meta_${r.id}`} className="min-w-0 flex-1">
                    <div data-cmp={`${cmp}.recipient_name_${r.id}`} dir="auto" className="text-sm font-medium truncate">{r.name}</div>
                    <div data-cmp={`${cmp}.recipient_email_${r.id}`} className="text-xs text-fg-muted font-mono truncate">{r.email}</div>
                    {r.declineReason && <div data-cmp={`${cmp}.recipient_reason_${r.id}`} dir="auto" className="text-xs text-danger mt-0.5">“{r.declineReason}”</div>}
                    {waiting && r.remindersSent > 0 && <div data-cmp={`${cmp}.recipient_reminders_${r.id}`} className="text-[11px] text-fg-subtle mt-0.5">Reminded {r.remindersSent}× · last {r.lastRemindedAt ? fullDate(r.lastRemindedAt) : ''}</div>}
                  </div>
                  {signer ? <Badge cmp={`${cmp}.recipient_status_${r.id}`} tone={s.tone}>{s.label}{r.signedAt ? ` · ${fullDate(r.signedAt)}` : ''}</Badge> : <Badge cmp={`${cmp}.recipient_status_${r.id}`}><Mail size={10} /> Gets a copy</Badge>}
                  {waiting && <Button cmp={`${cmp}.remind_button_${r.id}`} size="sm" variant="secondary" icon={<Bell size={12} />} disabled={busy === r.id} onClick={() => void remind(r.id)}>Remind</Button>}
                  {(open || request.status === 'completed') && <Button cmp={`${cmp}.copy_link_button_${r.id}`} size="sm" variant="ghost" title="Copy this person's private link" icon={copied === r.id ? <Check size={12} /> : <Copy size={12} />} onClick={() => void copyLink(r.id)}>{copied === r.id ? 'Copied' : 'Link'}</Button>}
                </li>
              )
            })}
          </ul>
        </Card>
        <Card cmp={`${cmp}.files_card`} title="Files" padded={false}>
          <ul data-cmp={`${cmp}.files_list`} className="divide-y divide-border">
            {request.hasSignedFile && (
              <li data-cmp={`${cmp}.signed_file`} className="p-3 flex items-center gap-3 bg-success/5">
                <FileText size={15} className="text-success shrink-0" />
                <div data-cmp={`${cmp}.signed_file_meta`} className="min-w-0 flex-1"><div data-cmp={`${cmp}.signed_file_name`} className="text-sm font-medium">Signed document</div><div data-cmp={`${cmp}.signed_file_info`} className="text-xs text-fg-muted">All files merged, with the signing certificate</div></div>
                <Button cmp={`${cmp}.signed_download_button`} size="sm" variant="primary" icon={<Download size={12} />} disabled={busy === 'signed'} onClick={() => void download('signed', `${request.title} - signed.pdf`)}>Download</Button>
              </li>
            )}
            {documents.map((d, i) => (
              <li key={d.id} data-cmp={`${cmp}.file_${d.id}`} className="p-3 flex items-center gap-3">
                <FileText size={15} className="text-fg-subtle shrink-0" />
                <div data-cmp={`${cmp}.file_meta_${d.id}`} className="min-w-0 flex-1"><div data-cmp={`${cmp}.file_name_${d.id}`} dir="auto" className="text-sm truncate">{i + 1}. {d.filename}</div><div data-cmp={`${cmp}.file_info_${d.id}`} className="text-xs text-fg-muted">{d.pageCount} page{d.pageCount === 1 ? '' : 's'} · {fileSize(d.size)} · original</div></div>
                <Button cmp={`${cmp}.file_download_button_${d.id}`} size="sm" variant="ghost" icon={<Download size={12} />} disabled={busy === d.id} onClick={() => void download(d.id, d.filename)}>Original</Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card cmp={`${cmp}.activity_card`} title="Activity" padded={false} className="min-w-0 self-start">
        <ol data-cmp={`${cmp}.activity_list`} className="divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} data-cmp={`${cmp}.event_${e.id}`} className="px-3 py-2 flex items-baseline gap-3 text-sm">
              <span data-cmp={`${cmp}.event_text_${e.id}`} dir="auto" className="min-w-0 flex-1">{e.text}</span>
              <span data-cmp={`${cmp}.event_meta_${e.id}`} className="text-[11px] text-fg-subtle shrink-0 text-right">{fullDate(e.at)}{e.ip ? <span className="block font-mono">{e.ip}</span> : null}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
