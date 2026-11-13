import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Ban, Check, Copy, CopyPlus, LayoutTemplate, Send, Trash2 } from 'lucide-react'
import { signingApi } from '../api'
import { errorMessage } from '../api/apiError'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { DocumentList } from '../components/signing/DocumentList'
import { FieldEditor, type EditorField } from '../components/signing/FieldEditor'
import { RecipientsEditor } from '../components/signing/RecipientsEditor'
import { RequestSettings } from '../components/signing/RequestSettings'
import { RequestStatus } from '../components/signing/RequestStatus'
import { SigningStatusBadge } from '../components/signing/SigningStatusBadge'
import { Button, Card, Input, Select, Toggle, cn } from '../components/ui'
import { useToast } from '../contexts/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useElementWidth } from '../hooks/useElementWidth'
import { usePdfDocuments } from '../hooks/usePdfDocuments'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { FIELD_TYPES, fieldLabel, signerColor } from '../lib/signing'
import { clipboardService } from '../services/clipboardService'
import type { SignDocument, SignField, SignFieldType, SignLink, SignRecipientInput, SignRequestDetail, SignRequestInput } from '../types'

const toEditor = (fields: SignField[]): EditorField[] => fields.map((f) => ({ key: f.id, documentId: f.documentId, recipientId: f.recipientId, type: f.type, page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, required: f.required, label: f.label }))
const stripKey = ({ key: _key, ...f }: EditorField) => f

/**
 * SignRequestPage — one signing request. A draft (or template) opens the builder: files, recipients, fields on the
 * pages and the send settings. Once sent it shows who has signed, reminders, links, files and the activity record.
 */
export default function SignRequestPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const loaded = useAsync(() => signingApi.get(id), [id])
  const [detail, setDetail] = useState<SignRequestDetail | null>(null)
  const [fields, setFields] = useState<EditorField[]>([])
  // Fields save themselves a moment after the last change: `version` counts edits, `savedVersion` what the server has.
  const [version, setVersion] = useState(0)
  const [savedVersion, setSavedVersion] = useState(0)
  const [armed, setArmed] = useState<SignFieldType | null>(null)
  const [activeSigner, setActiveSigner] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [sent, setSent] = useState<null | { emailed: boolean; links: SignLink[] }>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [canvasRef, canvasWidth] = useElementWidth<HTMLDivElement>()

  /** Take a server answer as the truth, fields included (used after loads and after changes that can drop fields). */
  function adopt(d: SignRequestDetail) { setDetail(d); setFields(toEditor(d.fields)); setSavedVersion(0); setVersion(0) }
  useEffect(() => { if (loaded.data) adopt(loaded.data) }, [loaded.data])
  // Someone signed, declined or the request expired while this page is open.
  useSocketEvent<{ id: string }>('signing:updated', (p) => { if (p.id === id && detail && detail.request.status !== 'draft') void signingApi.get(id).then(setDetail).catch(() => undefined) })

  const request = detail?.request
  const isDraft = request?.status === 'draft'
  const signers = (detail?.recipients ?? []).filter((r) => r.role === 'signer').map((r, i) => ({ id: r.id, name: r.name, colorIndex: i }))
  const active = signers.find((s) => s.id === activeSigner) ?? signers[0] ?? null
  const pdfs = usePdfDocuments(isDraft ? (detail?.documents ?? []).map((d) => d.id) : [], (docId) => signingApi.documentBytes(id, docId))

  async function saveFields(list: EditorField[], v: number) {
    try { const d = await signingApi.setFields(id, list.map(stripKey)); setDetail((cur) => (cur ? { ...cur, request: d.request } : cur)); setSavedVersion(v) } catch (e) { toast.error(errorMessage(e)) }
  }
  useEffect(() => {
    if (!isDraft || version === savedVersion) return
    const t = setTimeout(() => void saveFields(fields, version), 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, version, savedVersion, isDraft])
  /** Push unsaved field edits now (before anything that reloads fields from the server). */
  async function flush() { if (version !== savedVersion) await saveFields(fields, version) }
  function editFields(next: EditorField[]) { setFields(next); setVersion((v) => v + 1) }

  async function run<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(key)
    try { return await fn() } catch (e) { toast.error(errorMessage(e)); return undefined } finally { setBusy(null) }
  }
  const patch = (p: SignRequestInput) => void run('settings', async () => { const d = await signingApi.update(id, p); setDetail((cur) => (cur ? { ...cur, request: d.request } : cur)) })
  const upload = (files: File[]) => void run('upload', async () => { await flush(); const d = await signingApi.upload(id, files); adopt(d); for (const r of d.rejected) toast.error(`${r.filename}: ${r.reason}`) })
  const removeDocument = (doc: SignDocument) => { if (fields.some((f) => f.documentId === doc.id) && !confirm(`Remove "${doc.filename}"? The fields placed on it are removed too.`)) return; void run('doc', async () => { await flush(); adopt(await signingApi.removeDocument(id, doc.id)) }) }
  const reorder = (ids: string[]) => void run('doc', async () => { const d = await signingApi.reorderDocuments(id, ids); setDetail((cur) => (cur ? { ...cur, documents: d.documents } : cur)) })
  const saveRecipients = (list: SignRecipientInput[]) => void run('recipients', async () => { await flush(); adopt(await signingApi.setRecipients(id, list)) })

  async function send() {
    await run('send', async () => {
      await flush()
      const d = await signingApi.send(id)
      setDetail(d); setSent({ emailed: d.emailed, links: d.links })
      if (d.emailed) toast.success('Sent for signature')
    })
  }
  const duplicate = (asTemplate: boolean) => void run('duplicate', async () => { const d = await signingApi.duplicate(id, { asTemplate }); toast.success(asTemplate ? 'Saved as a template' : 'Copy created'); navigate(`/documents/${d.request.id}`) })
  const voidRequest = () => { const reason = prompt('Void this request? Signers are told it was cancelled and their links stop working.\n\nReason (optional):'); if (reason === null) return; void run('void', async () => setDetail(await signingApi.void(id, reason || null))) }
  const remove = () => { if (!confirm(`Delete "${request?.title}"? Its files are deleted too.`)) return; void run('delete', async () => { await signingApi.remove(id); navigate(request?.isTemplate ? '/documents?tab=templates' : '/documents') }) }
  async function copyLink(l: SignLink) { if (await clipboardService.copy(l.url)) { setCopied(l.recipientId); setTimeout(() => setCopied(null), 1500) } }

  if (!detail || !request) return <AppShell title="Document"><PageState cmp="signreq" loading={loaded.loading} error={loaded.error} onRetry={() => void loaded.reload()} /></AppShell>

  const selectedField = fields.find((f) => f.key === selected) ?? null
  const unsaved = version !== savedVersion
  const pageWidth = Math.max(280, Math.min(820, canvasWidth - 48))
  const missing = [
    !detail.documents.length && 'a PDF',
    !signers.length && 'a signer',
    ...signers.filter((s) => !fields.some((f) => f.recipientId === s.id)).map((s) => `a field for ${s.name}`),
  ].filter(Boolean) as string[]

  const actions = isDraft ? (
    <>
      <span data-cmp="signreq.save_state" className="text-xs text-fg-subtle mr-1">{unsaved ? 'Saving…' : 'Saved'}</span>
      <Button cmp="signreq.delete_button" size="sm" variant="ghost" icon={<Trash2 size={13} />} disabled={!!busy} onClick={remove}>Delete</Button>
      {!request.isTemplate && <Button cmp="signreq.template_button" size="sm" variant="secondary" icon={<LayoutTemplate size={13} />} disabled={!!busy} onClick={() => duplicate(true)}>Save as template</Button>}
      {request.isTemplate
        ? <Button cmp="signreq.use_template_button" size="sm" variant="primary" icon={<CopyPlus size={13} />} disabled={!!busy} onClick={() => duplicate(false)}>Use this template</Button>
        : <Button cmp="signreq.send_button" size="sm" variant="primary" icon={<Send size={13} />} disabled={!!busy || missing.length > 0} title={missing.length ? `Still needed: ${missing.join(', ')}` : undefined} onClick={() => void send()}>{busy === 'send' ? 'Sending…' : 'Send'}</Button>}
    </>
  ) : (
    <>
      {request.status === 'sent' && <Button cmp="signreq.void_button" size="sm" variant="danger" icon={<Ban size={13} />} disabled={!!busy} onClick={voidRequest}>Void</Button>}
      <Button cmp="signreq.duplicate_button" size="sm" variant="secondary" icon={<CopyPlus size={13} />} disabled={!!busy} onClick={() => duplicate(false)}>Duplicate</Button>
      <Button cmp="signreq.template_button" size="sm" variant="secondary" icon={<LayoutTemplate size={13} />} disabled={!!busy} onClick={() => duplicate(true)}>Save as template</Button>
      {request.status !== 'sent' && <Button cmp="signreq.delete_button" size="sm" variant="ghost" icon={<Trash2 size={13} />} disabled={!!busy} onClick={remove}>Delete</Button>}
    </>
  )

  return (
    <AppShell title={request.isTemplate ? 'Template' : 'Document'} actions={actions}>
      <div data-cmp="signreq.root_div" className="h-full flex flex-col min-h-0 animate-fade-in">
        <div data-cmp="signreq.header" className="shrink-0 px-6 py-3 border-b border-border flex items-center gap-3 flex-wrap">
          <Link data-cmp="signreq.back_link" to={request.isTemplate ? '/documents?tab=templates' : '/documents'} className="text-fg-muted hover:text-fg inline-flex items-center gap-1 text-sm"><ArrowLeft size={14} /> Documents</Link>
          {isDraft
            ? <input key={request.id} data-cmp="signreq.title_input" dir="auto" defaultValue={request.title} maxLength={200} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== request.title) patch({ title: v }); else e.target.value = request.title }} className="flex-1 min-w-48 bg-transparent text-lg font-semibold tracking-tight outline-none border-b border-transparent focus:border-border-strong" />
            : <h1 data-cmp="signreq.title" dir="auto" className="flex-1 min-w-0 text-lg font-semibold tracking-tight truncate">{request.title}</h1>}
          <SigningStatusBadge cmp="signreq.status_badge" request={request} />
          {request.companyId && <Link data-cmp="signreq.company_link" dir="auto" to={`/companies/${request.companyId}`} className="text-sm text-primary hover:underline">{request.companyName}</Link>}
        </div>

        {isDraft ? (
          <div data-cmp="signreq.builder" className="flex-1 min-h-0 flex">
            <aside data-cmp="signreq.sidebar" className="w-[340px] shrink-0 border-r border-border overflow-y-auto p-4 flex flex-col gap-4">
              <Card cmp="signreq.documents_card" title="1 · Files"><DocumentList cmp="signreq.documents" documents={detail.documents} uploading={busy === 'upload'} onUpload={upload} onRemove={removeDocument} onReorder={reorder} /></Card>
              <Card cmp="signreq.recipients_card" title={request.isTemplate ? '2 · Signer roles' : '2 · Recipients'}>
                <RecipientsEditor cmp="signreq.recipients" recipients={detail.recipients.map((r) => ({ id: r.id, role: r.role, name: r.name, email: r.email, leadId: r.leadId, userId: r.userId }))} companyId={request.companyId} allowEmptyEmail={request.isTemplate} activeId={active?.id ?? null} onActive={setActiveSigner} onChange={saveRecipients} />
              </Card>
              <Card cmp="signreq.fields_card" title="3 · Fields">
                {!active ? <p data-cmp="signreq.fields_hint" className="text-sm text-fg-muted">Add a signer first, then place the fields they fill in.</p> : !detail.documents.length ? <p data-cmp="signreq.fields_hint" className="text-sm text-fg-muted">Upload a PDF to place fields on.</p> : (
                  <div data-cmp="signreq.fields_palette" className="flex flex-col gap-2.5">
                    <p data-cmp="signreq.fields_for" className="text-xs text-fg-muted">Placing for <span data-cmp="signreq.fields_for_name" dir="auto" style={{ color: signerColor(active.colorIndex) }} className="font-semibold">{active.name}</span> — pick a field, then click the page. Click another recipient above to switch.</p>
                    <div data-cmp="signreq.field_types" className="grid grid-cols-2 gap-1.5">
                      {FIELD_TYPES.map((t) => <button key={t.type} type="button" data-cmp={`signreq.field_type_${t.type}`} aria-pressed={armed === t.type} onClick={() => setArmed(armed === t.type ? null : t.type)} className={cn('h-8 rounded-[var(--radius)] border text-xs font-medium transition-colors', armed === t.type ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface hover:bg-surface-2')}>{t.label}</button>)}
                    </div>
                    {selectedField && (
                      <div data-cmp="signreq.field_inspector" className="rounded-[var(--radius)] border border-border p-2.5 flex flex-col gap-2">
                        <div data-cmp="signreq.field_inspector_title" className="text-xs font-semibold">{fieldLabel(selectedField.type)} · page {selectedField.page}</div>
                        <Select cmp="signreq.field_signer_select" label="Filled in by" value={selectedField.recipientId} onChange={(e) => editFields(fields.map((f) => (f.key === selectedField.key ? { ...f, recipientId: e.target.value } : f)))} options={signers.map((s) => ({ value: s.id, label: s.name }))} />
                        {selectedField.type !== 'date' && <Toggle cmp="signreq.field_required_toggle" checked={selectedField.required} onChange={(v) => editFields(fields.map((f) => (f.key === selectedField.key ? { ...f, required: v } : f)))} label="Required" />}
                        {(selectedField.type === 'text' || selectedField.type === 'checkbox') && <Input cmp="signreq.field_label_input" label="Label shown to the signer" dir="auto" maxLength={80} value={selectedField.label ?? ''} onChange={(e) => editFields(fields.map((f) => (f.key === selectedField.key ? { ...f, label: e.target.value || null } : f)))} />}
                        <Button cmp="signreq.field_delete_button" size="sm" variant="danger" icon={<Trash2 size={12} />} onClick={() => { editFields(fields.filter((f) => f.key !== selectedField.key)); setSelected(null) }}>Remove field</Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
              <Card cmp="signreq.settings_card" title="4 · Sending"><RequestSettings cmp="signreq.settings" request={request} manySigners={signers.length > 1} onChange={patch} /></Card>
              {!request.isTemplate && missing.length > 0 && <p data-cmp="signreq.missing_text" className="text-xs text-warning inline-flex items-start gap-1.5"><AlertTriangle size={13} className="shrink-0 mt-0.5" /> Before sending, add {missing.join(', ')}.</p>}
            </aside>
            <div data-cmp="signreq.canvas" ref={canvasRef} className="flex-1 min-w-0 overflow-auto bg-surface-2">
              {pdfs.error ? <PageState cmp="signreq.canvas" error={pdfs.error} /> : !detail.documents.length ? (
                <div data-cmp="signreq.canvas_empty" className="h-full grid place-items-center text-sm text-fg-muted p-8 text-center">Upload the PDFs to sign — a contract and its appendices can go in the same request.</div>
              ) : canvasWidth > 0 && <FieldEditor cmp="signreq.editor" documents={detail.documents} pdfs={pdfs.docs} signers={signers} fields={fields} width={pageWidth} armedType={armed} activeSignerId={active?.id ?? null} selectedKey={selected} onSelect={setSelected} onChange={editFields} onPlaced={() => setArmed(null)} />}
            </div>
          </div>
        ) : (
          <div data-cmp="signreq.status_view" className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4">
            {sent && !sent.emailed && (
              <div data-cmp="signreq.links_banner" className="card border-warning/40 bg-warning/5 p-4 flex flex-col gap-2">
                <p data-cmp="signreq.links_banner_text" className="text-sm inline-flex items-start gap-2"><AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" /> The request is ready, but the invitation emails could not be sent (connect your Gmail in Settings → Email). Send each person their private link yourself:</p>
                {sent.links.map((l) => <div key={l.recipientId} data-cmp={`signreq.links_row_${l.recipientId}`} className="flex items-center gap-2 text-sm"><span dir="auto" className="w-40 truncate font-medium">{l.name}</span><code className="flex-1 min-w-0 truncate font-mono text-xs text-fg-muted">{l.url}</code><Button cmp={`signreq.links_copy_${l.recipientId}`} size="sm" variant="secondary" icon={copied === l.recipientId ? <Check size={12} /> : <Copy size={12} />} onClick={() => void copyLink(l)}>{copied === l.recipientId ? 'Copied' : 'Copy'}</Button></div>)}
              </div>
            )}
            {request.status === 'voided' && request.voidReason && <p data-cmp="signreq.void_reason" dir="auto" className="text-sm text-fg-muted">Voided: {request.voidReason}</p>}
            {request.message && <p data-cmp="signreq.message" dir="auto" className="text-sm text-fg-muted whitespace-pre-wrap border-l-2 border-border pl-3">{request.message}</p>}
            <RequestStatus cmp="signreq.status" detail={detail} onChanged={setDetail} />
          </div>
        )}
      </div>
    </AppShell>
  )
}
