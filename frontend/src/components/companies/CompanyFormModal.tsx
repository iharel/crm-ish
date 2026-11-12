import { useState } from 'react'
import { companiesApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { Button, Input, Modal, Textarea, Toggle } from '../ui'
import { DomainsInput } from './DomainsInput'
import type { Company } from '../../types'

/** CompanyFormModal — create/edit a company or a supplier (`defaultSupplier` presets the Supplier switch for a new one). */
export function CompanyFormModal({ company, defaultSupplier = false, onClose, onSaved }: { company?: Company; defaultSupplier?: boolean; onClose: () => void; onSaved: (c: Company) => void }) {
  const toast = useToast()
  const [domains, setDomains] = useState<string[]>(company?.domains ?? (company?.domain ? [company.domain] : []))
  const [f, setF] = useState({ name: company?.name ?? '', website: company?.website ?? '', industry: company?.industry ?? '', size: company?.size ?? '', location: company?.location ?? '', linkedinUrl: company?.linkedinUrl ?? '', description: company?.description ?? '' })
  const [isSupplier, setIsSupplier] = useState(company?.isSupplier ?? defaultSupplier)
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }))
  async function save() {
    if (!f.name.trim()) { setError('Name is required'); return }
    setBusy(true); setError(null)
    try { const payload = { name: f.name.trim(), domains, website: f.website || (domains[0] ? `https://${domains[0]}` : null), industry: f.industry || null, size: f.size || null, location: f.location || null, linkedinUrl: f.linkedinUrl || null, description: f.description || null, isSupplier }; const c = company ? await companiesApi.update(company.id, payload) : await companiesApi.create(payload); toast.success(company ? 'Company updated' : isSupplier ? 'Supplier created' : 'Company created'); onSaved(c) } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <Modal cmp="companyform.modal" title={company ? 'Edit company' : isSupplier ? 'New supplier' : 'New company'} onClose={onClose} footer={<><Button cmp="companyform.cancel_button" onClick={onClose}>Cancel</Button><Button cmp="companyform.save_button" variant="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      {error && <p data-cmp="companyform.error_text" className="text-xs text-danger">{error}</p>}
      <Input cmp="companyform.name_input" label="Name" value={f.name} onChange={set('name')} autoFocus />
      <div data-cmp="companyform.supplier_row" className="flex flex-col gap-1"><Toggle cmp="companyform.supplier_toggle" checked={isSupplier} onChange={setIsSupplier} label="Supplier" /><p data-cmp="companyform.supplier_hint" className="text-xs text-fg-subtle">{isSupplier ? 'No deal by default; its contacts stay out of the Leads pipeline until you add them to a deal.' : 'A regular company: it has a deal and its people are leads.'}</p></div>
      <DomainsInput cmp="companyform.domains_input" value={domains} onChange={setDomains} companyId={company?.id} />
      <div data-cmp="companyform.row1" className="grid grid-cols-2 gap-3"><Input cmp="companyform.website_input" label="Website" value={f.website} onChange={set('website')} placeholder="https://acme.com" /></div>
      <div data-cmp="companyform.row2" className="grid grid-cols-3 gap-3"><Input cmp="companyform.industry_input" label="Industry" value={f.industry} onChange={set('industry')} /><Input cmp="companyform.size_input" label="Size" value={f.size} onChange={set('size')} placeholder="50-200" /><Input cmp="companyform.location_input" label="Location" value={f.location} onChange={set('location')} /></div>
      <Input cmp="companyform.linkedin_input" label="LinkedIn URL" value={f.linkedinUrl} onChange={set('linkedinUrl')} />
      <Textarea cmp="companyform.description_textarea" label="Description" value={f.description} onChange={set('description')} className="min-h-20" />
    </Modal>
  )
}
