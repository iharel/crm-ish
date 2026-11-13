import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { companiesApi, signingApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { CompanyPicker, type CompanyPick } from '../companies/CompanyPicker'
import { Button, Input, Modal, Select } from '../ui'

export interface NewRequestModalProps {
  /** Pre-chosen company (from a company or lead page). */
  companyId?: string | null
  companyName?: string | null
  dealId?: string | null
  threadId?: string | null
  /** Create a reusable template instead of a request. */
  template?: boolean
  onClose: () => void
}

/**
 * NewRequestModal — start a signing request: a title, the company it is for and, optionally, a template to start
 * from. Creates the draft and opens its builder.
 */
export function NewRequestModal({ companyId, companyName, dealId, threadId, template, onClose }: NewRequestModalProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState<CompanyPick>({ id: companyId ?? null, name: companyName ?? '' })
  const [from, setFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const companies = useAsync(() => companiesApi.list(), [])
  const templates = useAsync(() => (template ? Promise.resolve([]) : signingApi.list({ template: true })), [template])

  async function create() {
    if (!title.trim() && !from) { toast.error('Give the request a title'); return }
    setBusy(true)
    try {
      let cid = company.id
      if (!template && !cid && company.name.trim()) cid = (await companiesApi.create({ name: company.name.trim() })).id
      const d = from
        ? await signingApi.duplicate(from, { title: title.trim() || undefined, companyId: cid })
        : await signingApi.create({ title: title.trim(), companyId: template ? null : cid, dealId: dealId ?? null, threadId: threadId ?? null, isTemplate: !!template })
      navigate(`/documents/${d.request.id}`)
    } catch (e) { toast.error(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal cmp="signing.new_modal" title={template ? 'New template' : 'Send for signature'} onClose={onClose} footer={<><Button cmp="signing.new_modal.cancel_button" variant="ghost" onClick={onClose}>Cancel</Button><Button cmp="signing.new_modal.create_button" variant="primary" disabled={busy} onClick={() => void create()}>{busy ? 'Creating…' : 'Continue'}</Button></>}>
      <div data-cmp="signing.new_modal.body" className="p-4 flex flex-col gap-3">
        <Input cmp="signing.new_modal.title_input" label="Title" dir="auto" autoFocus maxLength={200} placeholder={template ? 'e.g. Master services agreement' : 'e.g. Northfield — Master agreement'} value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void create() }} />
        {!template && <CompanyPicker cmp="signing.new_modal.company_picker" label="Company (optional)" companies={companies.data ?? []} value={company} onChange={setCompany} />}
        {!template && (templates.data?.length ?? 0) > 0 && <Select cmp="signing.new_modal.template_select" label="Start from a template (optional)" value={from} onChange={(e) => setFrom(e.target.value)} options={[{ value: '', label: 'No template — upload PDFs' }, ...(templates.data ?? []).map((t) => ({ value: t.id, label: t.title }))]} />}
        <p data-cmp="signing.new_modal.hint" className="text-xs text-fg-subtle">{template ? 'A template keeps the files, the fields and the signer roles so the same document can be sent again and again.' : 'Next: upload the PDFs, choose who signs and place the fields.'}</p>
      </div>
    </Modal>
  )
}
