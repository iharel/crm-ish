import { useState } from 'react'
import { CalendarClock, Handshake, Pencil, Plus, Split, Trash2, UserCheck } from 'lucide-react'
import { dealsApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { Avatar, Badge, Button, Card, Select } from '../ui'
import { DealFormModal } from './DealFormModal'
import type { Deal, Lead, LeadStatus } from '../../types'

export interface DealsCardProps { cmp: string; companyId: string; deals: Deal[]; leads: Lead[]; statuses: LeadStatus[]; /** Supplier company: no deal by default, any deal can be deleted, contacts are picked per deal. */ supplier?: boolean; onChanged: () => void }

const money = (n: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n)
const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * DealsCard — the company's deals. A company starts with one deal (its status is what "the company is won" means);
 * "Split into deals" adds more, each with its own status, amount, expected close date and leads.
 * A supplier has no deal until one is added, and its last deal can be deleted.
 */
export function DealsCard({ cmp, companyId, deals, leads, statuses, supplier = false, onChanged }: DealsCardProps) {
  const toast = useToast()
  const [form, setForm] = useState<{ deal?: Deal } | null>(null)
  const multi = deals.length > 1
  async function setStatus(d: Deal, statusId: string) { try { await dealsApi.update(d.id, { statusId }); onChanged() } catch (e) { toast.error(errorMessage(e)) } }
  async function remove(d: Deal) {
    if (!confirm(`Delete the deal "${d.name}"? ${supplier ? 'Its contacts stay with the supplier.' : 'Its leads stay with the company.'}`)) return
    try { await dealsApi.remove(d.id); toast.success('Deal deleted'); onChanged() } catch (e) { toast.error(errorMessage(e)) }
  }
  return (
    <Card cmp={cmp} className="xl:col-span-3" padded={false}
      title={<span className="inline-flex items-center gap-1.5"><Handshake size={14} className="text-primary" /> {multi ? `Deals (${deals.length})` : 'Deal'}</span>}
      actions={<Button cmp={`${cmp}.add_button`} size="sm" icon={multi || supplier ? <Plus size={12} /> : <Split size={12} />} onClick={() => setForm({})}>{multi || supplier ? 'Add deal' : 'Split into deals'}</Button>}>
      <ul data-cmp={`${cmp}.list`} className="divide-y divide-border">
        {deals.map((d) => {
          const members = leads.filter((l) => d.leadIds.includes(l.id))
          const contact = members.find((l) => l.id === d.contactLeadId) ?? members[0]
          return (
            <li key={d.id} data-cmp={`${cmp}.item_${d.id}`} className="p-3 flex items-center gap-3 flex-wrap text-sm">
              {multi && <div data-cmp={`${cmp}.name_wrap_${d.id}`} className="min-w-40 flex-1 flex items-center gap-2"><span dir="auto" data-cmp={`${cmp}.name_${d.id}`} className="font-medium truncate">{d.name}</span>{d.isDefault && <Badge cmp={`${cmp}.default_badge_${d.id}`}>First deal</Badge>}</div>}
              <Select cmp={`${cmp}.status_select_${d.id}`} aria-label="Deal status" value={d.statusId ?? ''} onChange={(e) => void setStatus(d, e.target.value)} className="w-40" options={[...(d.statusId ? [] : [{ value: '', label: 'No status' }]), ...statuses.map((s) => ({ value: s.id, label: s.name }))]} />
              <span data-cmp={`${cmp}.amount_${d.id}`} className="font-mono text-xs w-28">{d.amount != null ? money(d.amount) : <span className="text-fg-subtle font-sans">No amount</span>}</span>
              <span data-cmp={`${cmp}.close_${d.id}`} className="inline-flex items-center gap-1 text-xs text-fg-muted w-40"><CalendarClock size={12} /> {d.expectedCloseDate ? day(d.expectedCloseDate) : 'No close date'}</span>
              <span data-cmp={`${cmp}.contact_${d.id}`} title="Contact person" className="inline-flex items-center gap-1.5 text-xs min-w-32"><UserCheck size={12} className="text-fg-subtle" />{contact ? <span dir="auto" data-cmp={`${cmp}.contact_name_${d.id}`} className="truncate">{contact.name}</span> : <span data-cmp={`${cmp}.contact_none_${d.id}`} className="text-fg-subtle">No contact</span>}</span>
              {multi && <div data-cmp={`${cmp}.leads_${d.id}`} className="flex items-center gap-1 min-w-24">{members.map((l) => <span key={l.id} data-cmp={`${cmp}.lead_${d.id}_${l.id}`} title={l.name}><Avatar cmp={`${cmp}.lead_avatar_${d.id}_${l.id}`} name={l.name} size="xs" /></span>)}{!members.length && <span data-cmp={`${cmp}.leads_empty_${d.id}`} className="text-xs text-fg-subtle">No leads</span>}</div>}
              <div data-cmp={`${cmp}.actions_${d.id}`} className="ml-auto flex items-center gap-1">
                <Button cmp={`${cmp}.edit_button_${d.id}`} size="icon" variant="ghost" aria-label={`Edit ${d.name}`} onClick={() => setForm({ deal: d })}><Pencil size={14} /></Button>
                {(multi || supplier) && <Button cmp={`${cmp}.delete_button_${d.id}`} size="icon" variant="ghost" aria-label={`Delete ${d.name}`} onClick={() => void remove(d)}><Trash2 size={14} /></Button>}
              </div>
            </li>
          )
        })}
        {!deals.length && <li data-cmp={`${cmp}.empty`} className="p-6 text-center text-sm text-fg-muted">No deal with this supplier. Add one to track it in the pipeline.</li>}
      </ul>
      {form && <DealFormModal companyId={companyId} deal={form.deal} leads={leads} statuses={statuses} pickLeads={!form.deal || multi || supplier} supplier={supplier} onClose={() => setForm(null)} onSaved={() => { setForm(null); onChanged() }} />}
    </Card>
  )
}
