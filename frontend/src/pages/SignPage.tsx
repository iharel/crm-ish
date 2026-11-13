import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Download, FileSignature, FileText, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { signerApi } from '../api'
import { ApiError, errorMessage } from '../api/apiError'
import { PdfPage } from '../components/signing/PdfPage'
import { SignaturePad } from '../components/signing/SignaturePad'
import { SignNotice as Notice } from '../components/signing/SignNotice'
import { SignerFieldBox } from '../components/signing/SignerFieldBox'
import { Button, Input, Modal, Textarea } from '../components/ui'
import { useElementWidth } from '../hooks/useElementWidth'
import { usePdfDocuments } from '../hooks/usePdfDocuments'
import { pdfService } from '../services/pdfService'
import { storageService } from '../services/storageService'
import type { SignerField, SignerView } from '../types'

const isEmpty = (f: SignerField) => f.type !== 'date' && !f.image && !f.value

/**
 * SignPage — what a recipient sees through their private link (no login): an optional emailed code, consent to
 * sign electronically, the documents with their own fields, then Finish — or Decline. After everyone signed, the
 * same link offers the signed PDF.
 */
export default function SignPage() {
  const { token = '' } = useParams()
  const [session, setSession] = useState<string | null>(() => storageService.getSignSession(token))
  const [view, setView] = useState<SignerView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [agree, setAgree] = useState(false)
  const [pad, setPad] = useState<SignerField | null>(null)
  /** The signature / initials drawn in this visit, reused for the other fields of the same kind. */
  const [ink, setInk] = useState<{ signature?: string; initials?: string }>({})
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [justSigned, setJustSigned] = useState(false)
  const [wrapRef, wrapWidth] = useElementWidth<HTMLDivElement>()

  async function load(s = session) { try { setView(await signerApi.view(token, s)); setError(null) } catch (e) { setError(errorMessage(e)) } }
  useEffect(() => { void load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const signing = !!view && view.status === 'sent' && view.recipient.role === 'signer' && !view.needsCode && (view.recipient.status === 'sent' || view.recipient.status === 'opened')
  const pdfs = usePdfDocuments(signing && view!.recipient.consented ? view!.documents.map((d) => d.id) : [], (docId) => signerApi.documentBytes(token, docId, session))

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key); setNotice(null)
    try { await fn() } catch (e) { setNotice(errorMessage(e)); if (e instanceof ApiError && (e.status === 409 || e.code === 'CODE_REQUIRED')) void load() } finally { setBusy(null) }
  }
  const sendCode = () => run('code', async () => { await signerApi.sendCode(token); setCodeSent(true) })
  const verify = () => run('verify', async () => { const r = await signerApi.verifyCode(token, code); storageService.setSignSession(token, r.session); setSession(r.session); await load(r.session) })
  const consent = () => run('consent', async () => { await signerApi.consent(token, session); await load() })
  function patchField(id: string, p: Partial<SignerField>) { setView((v) => (v ? { ...v, fields: v.fields.map((f) => (f.id === id ? { ...f, ...p } : f)) } : v)) }
  const saveText = (f: SignerField, value: string) => run(`f-${f.id}`, async () => { await signerApi.setField(token, f.id, value.trim() || null, session); patchField(f.id, { value: value.trim() || null }) })
  const toggle = (f: SignerField) => run(`f-${f.id}`, async () => { const next = f.value === 'true' ? null : 'true'; await signerApi.setField(token, f.id, next, session); patchField(f.id, { value: next }) })
  const applyInk = (f: SignerField, dataUrl: string) => run(`f-${f.id}`, async () => { await signerApi.setField(token, f.id, dataUrl, session); patchField(f.id, { image: dataUrl }); setInk((x) => ({ ...x, [f.type]: dataUrl })) })
  function sign(f: SignerField) { const kind = f.type as 'signature' | 'initials'; if (!f.image && ink[kind]) void applyInk(f, ink[kind]!); else setPad(f) }
  const finish = () => run('finish', async () => { await signerApi.finish(token, session); setJustSigned(true); await load() })
  const decline = () => run('decline', async () => { await signerApi.decline(token, reason.trim() || null, session); setDeclining(false); await load() })
  const download = () => run('download', async () => { pdfService.download(await signerApi.signedBytes(token), `${view?.title ?? 'document'} - signed.pdf`) })

  const required = view?.fields.filter((f) => f.required && f.type !== 'date') ?? []
  const remaining = required.filter(isEmpty)
  const next = remaining[0] ?? null
  const goNext = () => { if (next) document.querySelector(`[data-field="${next.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
  const today = new Date().toISOString().slice(0, 10)
  const pageWidth = Math.max(260, Math.min(860, wrapWidth - 24))

  let body: ReactNode
  if (error) body = <Notice cmp="sign.invalid" icon={<XCircle size={22} className="text-danger" />} title="This link cannot be opened"><p data-cmp="sign.invalid.text" className="text-sm text-fg-muted">{error}. Ask the person who sent it to you for a new link.</p></Notice>
  else if (!view) body = <div data-cmp="sign.loading" className="flex-1 grid place-items-center text-sm text-fg-muted"><span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Opening…</span></div>
  else if (view.status === 'completed') body = (
    <Notice cmp="sign.completed" icon={<CheckCircle2 size={24} className="text-success" />} title={justSigned ? 'You have signed — and so has everyone else' : 'This document is signed by everyone'}>
      <p data-cmp="sign.completed.text" dir="auto" className="text-sm text-fg-muted">“{view.title}” is complete. The signed copy includes a certificate page listing who signed and when.</p>
      {view.canDownload && <Button cmp="sign.completed.download_button" variant="primary" icon={<Download size={14} />} disabled={busy === 'download'} onClick={() => void download()}>Download the signed document</Button>}
    </Notice>
  )
  else if (view.status !== 'sent') body = <Notice cmp="sign.closed" icon={<XCircle size={22} className="text-fg-muted" />} title={view.status === 'expired' ? 'This signing request has expired' : view.status === 'declined' ? 'This signing request was declined' : 'This signing request was cancelled'}><p data-cmp="sign.closed.text" dir="auto" className="text-sm text-fg-muted">“{view.title}” can no longer be signed. Contact {view.senderName} if you think this is a mistake.</p></Notice>
  else if (view.recipient.role === 'copy') body = <Notice cmp="sign.copy" icon={<FileText size={22} className="text-fg-muted" />} title="You will get a copy when it is signed"><p data-cmp="sign.copy.text" dir="auto" className="text-sm text-fg-muted">{view.senderName} added you to “{view.title}” to receive the signed document. There is nothing for you to sign.</p></Notice>
  else if (view.recipient.status === 'signed') body = <Notice cmp="sign.done" icon={<CheckCircle2 size={24} className="text-success" />} title="Thank you — your part is done"><p data-cmp="sign.done.text" dir="auto" className="text-sm text-fg-muted">{view.others.some((o) => !o.signed) ? `Waiting for ${view.others.filter((o) => !o.signed).map((o) => o.name).join(', ')} to sign. ` : ''}You will get an email with the signed document once everyone has signed, and this link will offer it too.</p></Notice>
  else if (view.recipient.status === 'pending') body = <Notice cmp="sign.waiting" icon={<FileSignature size={22} className="text-fg-muted" />} title="It is not your turn yet"><p data-cmp="sign.waiting.text" dir="auto" className="text-sm text-fg-muted">“{view.title}” is signed in order. You will get an email when the people before you have signed.</p></Notice>
  else if (view.needsCode) body = (
    <Notice cmp="sign.code" icon={<ShieldCheck size={22} className="text-primary" />} title="Confirm it is you">
      <p data-cmp="sign.code.text" dir="auto" className="text-sm text-fg-muted">{view.senderName} asked for an extra check before “{view.title}” opens. We will email a 6-digit code to <span className="font-mono">{view.recipient.email}</span>.</p>
      {!codeSent ? <Button cmp="sign.code.send_button" variant="primary" disabled={busy === 'code'} onClick={() => void sendCode()}>{busy === 'code' ? 'Sending…' : 'Email me a code'}</Button> : (
        <div data-cmp="sign.code.form" className="w-full flex flex-col gap-2">
          <Input cmp="sign.code.input" label="Code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6) void verify() }} className="text-center font-mono tracking-[0.4em]" />
          <Button cmp="sign.code.verify_button" variant="primary" disabled={code.length !== 6 || busy === 'verify'} onClick={() => void verify()}>Continue</Button>
          <button type="button" data-cmp="sign.code.resend_button" onClick={() => void sendCode()} className="text-xs text-fg-muted hover:text-fg">Send a new code</button>
        </div>
      )}
    </Notice>
  )
  else if (!view.recipient.consented) body = (
    <Notice cmp="sign.consent" icon={<FileSignature size={22} className="text-primary" />} title={view.title}>
      <p data-cmp="sign.consent.from" dir="auto" className="text-sm text-fg-muted">{view.senderName} sent you {view.documents.length === 1 ? 'a document' : `${view.documents.length} documents`} to review and sign, {view.recipient.name}.</p>
      {view.message && <p data-cmp="sign.consent.message" dir="auto" className="w-full text-sm text-left whitespace-pre-wrap border-l-2 border-border pl-3">{view.message}</p>}
      <ul data-cmp="sign.consent.files" className="w-full text-left text-sm flex flex-col gap-1">{view.documents.map((d, i) => <li key={d.id} data-cmp={`sign.consent.file_${d.id}`} dir="auto" className="flex items-center gap-2"><FileText size={13} className="text-fg-subtle shrink-0" /><span className="truncate">{i + 1}. {d.filename}</span><span className="ml-auto text-xs text-fg-subtle shrink-0">{d.pageCount} p.</span></li>)}</ul>
      <label data-cmp="sign.consent.agree_label" className="w-full flex items-start gap-2 text-left text-sm cursor-pointer"><input data-cmp="sign.consent.agree_checkbox" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" /><span>I agree to review and sign these documents electronically, and that my electronic signature has the same effect as a handwritten one.</span></label>
      <Button cmp="sign.consent.continue_button" variant="primary" disabled={!agree || busy === 'consent'} onClick={() => void consent()}>Continue to the document</Button>
      <button type="button" data-cmp="sign.consent.decline_button" onClick={() => setDeclining(true)} className="text-xs text-fg-muted hover:text-danger">I do not want to sign</button>
    </Notice>
  )
  else body = (
    <>
      <div data-cmp="sign.bar" className="shrink-0 sticky top-0 z-20 border-b border-border bg-surface px-4 py-2 flex items-center gap-3 flex-wrap">
        <div data-cmp="sign.bar_meta" className="min-w-0 flex-1"><div data-cmp="sign.bar_title" dir="auto" className="text-sm font-semibold truncate">{view.title}</div><div data-cmp="sign.bar_progress" className="text-xs text-fg-muted">{remaining.length ? `${required.length - remaining.length} of ${required.length} required fields done` : 'Everything is filled in — finish to sign'}</div></div>
        <button type="button" data-cmp="sign.bar_decline_button" onClick={() => setDeclining(true)} className="text-xs text-fg-muted hover:text-danger">Decline</button>
        {next ? <Button cmp="sign.bar_next_button" variant="secondary" size="sm" onClick={goNext}>Next field</Button> : null}
        <Button cmp="sign.bar_finish_button" variant="primary" size="sm" disabled={remaining.length > 0 || busy === 'finish'} title={remaining.length ? 'Fill in the highlighted fields first' : undefined} onClick={() => void finish()}>{busy === 'finish' ? 'Signing…' : 'Finish and sign'}</Button>
      </div>
      <div data-cmp="sign.pages" ref={wrapRef} className="flex-1 min-h-0 overflow-auto bg-surface-2">
        <div data-cmp="sign.pages_inner" className="flex flex-col items-center gap-4 py-4">
          {pdfs.error && <p data-cmp="sign.pages_error" className="text-sm text-danger">{pdfs.error}</p>}
          {wrapWidth > 0 && view.documents.map((d, di) => {
            const pdf = pdfs.docs[d.id]
            return (
              <div key={d.id} data-cmp={`sign.document_${d.id}`} className="flex flex-col items-center gap-3">
                <div data-cmp={`sign.document_title_${d.id}`} dir="auto" style={{ width: pageWidth }} className="text-xs text-fg-muted flex items-center gap-2"><FileText size={12} /><span className="font-medium text-fg truncate">{di + 1}. {d.filename}</span></div>
                {!pdf ? <div data-cmp={`sign.document_loading_${d.id}`} style={{ width: pageWidth, height: Math.round(pageWidth * 1.3) }} className="rounded-sm bg-surface-3 animate-pulse" /> : pdf.sizes.map((size, i) => (
                  <PdfPage key={i} cmp={`sign.page_${d.id}_${i + 1}`} doc={pdf.doc} pageNumber={i + 1} size={size} width={pageWidth}>
                    {view.fields.filter((f) => f.documentId === d.id && f.page === i + 1).map((f) => <SignerFieldBox key={f.id} cmp={`sign.field_${f.id}`} field={f} current={next?.id === f.id} today={today} onSign={() => sign(f)} onText={(v) => void saveText(f, v)} onToggle={() => void toggle(f)} />)}
                  </PdfPage>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )

  return (
    <div data-cmp="sign.root_div" className="h-full w-full flex flex-col bg-bg text-fg">
      <header data-cmp="sign.header" className="shrink-0 h-12 px-4 flex items-center gap-2 border-b border-border bg-surface text-sm">
        <FileSignature size={16} className="text-primary" /><span data-cmp="sign.header_brand" className="font-semibold">Document signing</span>
        {view && <span data-cmp="sign.header_sender" dir="auto" className="ml-auto text-xs text-fg-muted truncate">Sent by {view.senderName}</span>}
      </header>
      {notice && <div data-cmp="sign.notice" role="alert" className="shrink-0 px-4 py-2 text-sm bg-danger/10 text-danger border-b border-danger/20">{notice}</div>}
      {body}
      {pad && view && <SignaturePad kind={pad.type as 'signature' | 'initials'} signerName={view.recipient.name} onCancel={() => setPad(null)} onApply={(url) => { const f = pad; setPad(null); void applyInk(f, url) }} />}
      {declining && (
        <Modal cmp="sign.decline_modal" title="Decline to sign" onClose={() => setDeclining(false)} footer={<><Button cmp="sign.decline_modal.cancel_button" variant="ghost" onClick={() => setDeclining(false)}>Back</Button><Button cmp="sign.decline_modal.confirm_button" variant="danger" disabled={busy === 'decline'} onClick={() => void decline()}>Decline</Button></>}>
          <div data-cmp="sign.decline_modal.body" className="p-4 flex flex-col gap-3">
            <p data-cmp="sign.decline_modal.text" className="text-sm text-fg-muted">Declining ends this signing request for everyone. {view?.senderName} is told, with your reason if you give one.</p>
            <Textarea cmp="sign.decline_modal.reason_textarea" label="Reason (optional)" dir="auto" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </Modal>
      )}
    </div>
  )
}
