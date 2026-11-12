import { useState } from 'react'
import { dealsApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { Avatar, Button, Input, Modal, Select } from '../ui'
import type { Deal, Lead, LeadStatus } from '../../types'

export interface DealFormModalProps {
  companyId: string
  /** Edit this deal; omit to add a new deal to the company (split). */
  deal?: Deal
  /** The company's leads, offered for assignment. */
  leads: Pick<Lead, 'id' | 'name' | 'title' | 'email'>[]
  statuses: LeadStatus[]
  /** Show the lead picker. Off while the company has a single deal: all its leads belong to it. */
  pickLeads: boolean
  /** The company is a supplier: contacts left out of every deal simply stay outside the pipeline. */
  supplier?: boolean
  onClose: () => void
  onSaved: (deal: Deal) => void
}

/** DealFormModal — create (split) or edit a deal: name, status, amount, expected close date and its leads. */
export function DealFormModal({ companyId, deal, leads, statuses, pickLeads, supplier = false, onClose, onSaved }: DealFormModalProps) {
  const toast = useToast()
  const [name, setName] = useState(deal?.name ?? '')
  const [statusId, setStatusId] = useState(deal?.statusId ?? statuses.find((s) => s.isDefault)?.id ?? statuses[0]?.id ?? '')
  const [amount, setAmount] = useState(deal?.amount != null ? String(deal.amount) : '')
  const [closeDate, setCloseDate] = useState(deal?.expectedCloseDate ?? '')
  const [leadIds, setLeadIds] = useState<string[]>(deal?.leadIds ?? [])
  const [contactId, setContactId] = useState(deal?.contactLeadId ?? '')
  // Only leads of the deal can be its contact person.
  const candidates = pickLeads ? leads.filter((l) => leadIds.includes(l.id)) : leads
  const contact = candidates.some((l) => l.id === contactId) ? contactId : ''
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toggle = (id: string) => setLeadIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  async function save() {
    if (!name.trim()) { setError('Give the deal a name'); return }
    const parsed = amount.trim() === '' ? null : Number(amount)
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) { setError('Amount must be a positive number'); return }
    if (closeDate && !/^\d{4}-\d{2}-\d{2}$/.test(closeDate)) { setError('Pick a valid expected close date'); return }
    setSaving(true); setError(null)
    try {
      const fields = { name: name.trim(), statusId: statusId || undefined, amount: parsed, expectedCloseDate: closeDate || null }
      let saved: Deal
      if (!deal) saved = await dealsApi.create(companyId, { ...fields, leadIds: pickLeads ? leadIds : [], contactLeadId: contact || null })
      else {
        // Leads first: the contact person must already be a lead of the deal.
        if (pickLeads && [...leadIds].sort().join() !== [...deal.leadIds].sort().join()) await dealsApi.setLeads(deal.id, leadIds)
        saved = await dealsApi.update(deal.id, { ...fields, contactLeadId: contact || null })
      }
      toast.success(deal ? 'Deal updated' : 'Deal added')
      onSaved(saved)
    } catch (e) { setError(errorMessage(e)) } finally { setSaving(false) }
  }

  return (
    <Modal cmp="dealform.modal" title={deal ? 'Edit deal' : 'Add a deal'} onClose={onClose} footer={<><Button cmp="dealform.cancel_button" onClick={onClose}>Cancel</Button><Button cmp="dealform.save_button" variant="primary" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : deal ? 'Save changes' : 'Add deal'}</Button></>}>
      {error && <p data-cmp="dealform.error_text" className="text-xs text-danger">{error}</p>}
      <Input cmp="dealform.name_input" label="Deal name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Renewal 2027" autoFocus />
      <div data-cmp="dealform.meta_row" className="grid grid-cols-3 gap-3">
        <Select cmp="dealform.status_select" label="Status" value={statusId} onChange={(e) => setStatusId(e.target.value)} options={statuses.map((s) => ({ value: s.id, label: s.name }))} />
        <Input cmp="dealform.amount_input" label="Amount" type="number" min={0} step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} dir="ltr" />
        <Input cmp="dealform.close_input" label="Expected close" type="date" max="9999-12-31" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} dir="ltr" />
      </div>
      <Select cmp="dealform.contact_select" label="Contact person" value={contact} onChange={(e) => setContactId(e.target.value)} options={[{ value: '', label: candidates[0] ? `First lead (${candidates[0].name})` : 'No leads in this deal yet' }, ...candidates.map((l) => ({ value: l.id, label: l.title ? `${l.name} · ${l.title}` : l.name }))]} />
      {pickLeads && (
        <fieldset data-cmp="dealform.leads_fieldset" className="flex flex-col gap-1.5">
          <legend data-cmp="dealform.leads_legend" className="text-xs font-medium text-fg-muted mb-1.5">Leads in this deal</legend>
          {leads.map((l) => (
            <label key={l.id} data-cmp={`dealform.lead_label_${l.id}`} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm cursor-pointer hover:border-primary/40">
              <input data-cmp={`dealform.lead_check_${l.id}`} type="checkbox" checked={leadIds.includes(l.id)} onChange={() => toggle(l.id)} className="accent-[var(--color-primary)]" />
              <Avatar cmp={`dealform.lead_avatar_${l.id}`} name={l.name} size="xs" />
              <span dir="auto" data-cmp={`dealform.lead_name_${l.id}`} className="flex-1 truncate">{l.name}</span>
              <span data-cmp={`dealform.lead_title_${l.id}`} className="text-xs text-fg-subtle truncate">{l.title ?? l.email ?? ''}</span>
            </label>
          ))}
          {!leads.length && <p data-cmp="dealform.leads_empty" className="text-xs text-fg-muted">This company has no leads yet.</p>}
          <p data-cmp="dealform.leads_hint" className="text-xs text-fg-subtle">{supplier ? 'Only the contacts chosen here take part in the deal and show in the Leads pipeline.' : "A lead can be in more than one deal. A lead left in no deal goes back to the company's first deal."}</p>
        </fieldset>
      )}
    </Modal>
  )
}
