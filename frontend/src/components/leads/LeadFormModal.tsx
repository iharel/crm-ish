import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { companiesApi, leadsApi, statusesApi, usersApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { Button, Input, Modal, Select, Textarea, Toggle } from '../ui'
import type { Company, Lead, LeadStatus, User } from '../../types'

export interface LeadFormModalProps { lead?: Lead; defaultCompanyId?: string | null; onClose: () => void; onSaved: (lead: Lead) => void }

/** LeadFormModal — create/edit a lead with company picker and optional AI enrichment. */
export function LeadFormModal({ lead, defaultCompanyId, onClose, onSaved }: LeadFormModalProps) {
  const toast = useToast()
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [newCompany, setNewCompany] = useState('')
  const [enrich, setEnrich] = useState(!lead)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({ firstName: lead?.firstName ?? '', lastName: lead?.lastName ?? '', email: lead?.email ?? '', phone: lead?.phone ?? '', title: lead?.title ?? '', companyId: lead?.companyId ?? defaultCompanyId ?? '', statusId: lead?.statusId ?? '', ownerId: lead?.ownerId ?? '', source: lead?.source ?? 'Website', notes: lead?.notes ?? '', linkedinUrl: lead?.linkedinUrl ?? '' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }))

  useEffect(() => { Promise.all([statusesApi.list(), companiesApi.list(), usersApi.list()]).then(([s, c, u]) => { setStatuses(s); setCompanies(c); setUsers(u.filter((x) => x.isActive)); if (!lead && !f.statusId) setF((x) => ({ ...x, statusId: s.find((y) => y.isDefault)?.id ?? s[0]?.id ?? '' })) }).catch((e) => setError(errorMessage(e))) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!f.firstName.trim()) { setError('First name is required'); return }
    setSaving(true); setError(null)
    try {
      let companyId: string | null = f.companyId || null
      if (f.companyId === '__new__') companyId = (await companiesApi.create({ name: newCompany.trim() || 'New company' })).id
      const payload = { firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim() || null, phone: f.phone || null, title: f.title || null, companyId, statusId: f.statusId || null, ownerId: f.ownerId || null, source: f.source || null, notes: f.notes || null, linkedinUrl: f.linkedinUrl || null }
      let saved = lead ? await leadsApi.update(lead.id, payload) : await leadsApi.create(payload)
      toast.success(lead ? 'Lead updated' : 'Lead created')
      onSaved(saved)
      if (!lead && enrich) { leadsApi.enrich(saved.id).then((l) => { saved = l }).catch((e) => toast.error(`Enrichment failed: ${errorMessage(e)}`)) }
    } catch (e) { setError(errorMessage(e)) } finally { setSaving(false) }
  }

  return (
    <Modal cmp="leadform.modal" title={lead ? 'Edit lead' : 'New lead'} onClose={onClose} footer={<><Button cmp="leadform.cancel_button" onClick={onClose}>Cancel</Button><Button cmp="leadform.save_button" variant="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : lead ? 'Save changes' : 'Create lead'}</Button></>}>
      {error && <p data-cmp="leadform.error_text" className="text-xs text-danger">{error}</p>}
      <div data-cmp="leadform.names_row" className="grid grid-cols-2 gap-3">
        <Input cmp="leadform.first_input" label="First name" value={f.firstName} onChange={set('firstName')} autoFocus />
        <Input cmp="leadform.last_input" label="Last name" value={f.lastName} onChange={set('lastName')} />
      </div>
      <Input cmp="leadform.email_input" label="Email" type="email" value={f.email} onChange={set('email')} hint="Used to auto-link Gmail threads and create the company by domain." />
      <div data-cmp="leadform.company_row" className="grid grid-cols-2 gap-3">
        <Select cmp="leadform.company_select" label="Company" value={f.companyId} onChange={set('companyId')} options={[{ value: '', label: 'Auto by email domain' }, ...companies.map((c) => ({ value: c.id, label: c.name })), { value: '__new__', label: '+ New company…' }]} />
        {f.companyId === '__new__' ? <Input cmp="leadform.company_new_input" label="New company name" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} /> : <Input cmp="leadform.title_input" label="Title" value={f.title} onChange={set('title')} />}
      </div>
      <div data-cmp="leadform.meta_row" className="grid grid-cols-3 gap-3">
        <Select cmp="leadform.status_select" label="Status" value={f.statusId} onChange={set('statusId')} options={statuses.map((s) => ({ value: s.id, label: s.name }))} />
        <Select cmp="leadform.owner_select" label="Owner" value={f.ownerId} onChange={set('ownerId')} options={[{ value: '', label: 'Me' }, ...users.map((u) => ({ value: u.id, label: u.name }))]} />
        <Select cmp="leadform.source_select" label="Source" value={f.source} onChange={set('source')} options={['Website', 'Referral', 'LinkedIn', 'Event', 'Inbound email', 'Cold outreach', 'Other'].map((s) => ({ value: s, label: s }))} />
      </div>
      <div data-cmp="leadform.contact_row" className="grid grid-cols-2 gap-3">
        <Input cmp="leadform.phone_input" label="Phone" value={f.phone} onChange={set('phone')} />
        <Input cmp="leadform.linkedin_input" label="LinkedIn URL" value={f.linkedinUrl} onChange={set('linkedinUrl')} />
      </div>
      <Textarea cmp="leadform.notes_textarea" label="Notes" value={f.notes} onChange={set('notes')} className="min-h-20" />
      {!lead && (
        <div data-cmp="leadform.enrich_row" className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
          <span data-cmp="leadform.enrich_label" className="inline-flex items-center gap-2 text-sm"><Sparkles size={14} className="text-accent" /> Enrich with AI after saving</span>
          <Toggle cmp="leadform.enrich_toggle" checked={enrich} onChange={setEnrich} />
        </div>
      )}
    </Modal>
  )
}
