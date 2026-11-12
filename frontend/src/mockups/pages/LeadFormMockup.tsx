import { Sparkles } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Button, Input, Modal, Select, Textarea, Toggle } from '../../components/ui'
import { companies, statuses, users } from '../data'

/** LeadFormMockup — create/edit lead modal. */
export default function LeadFormMockup() {
  return (
    <MockupFrame name="lead-form" title="Lead create/edit">
      <AppShell active="leads" title="Leads">
        <div data-cmp="leadform.root_div" className="p-8 bg-black/20 h-full">
          <Modal cmp="leadform.modal" inline title="New lead" footer={<><Button cmp="leadform.cancel_button">Cancel</Button><Button cmp="leadform.save_button" variant="primary">Create lead</Button></>}>
            <div data-cmp="leadform.names_row" className="grid grid-cols-2 gap-3">
              <Input cmp="leadform.first_input" label="First name" placeholder="Sarah" />
              <Input cmp="leadform.last_input" label="Last name" placeholder="Cohen" />
            </div>
            <Input cmp="leadform.email_input" label="Email" type="email" placeholder="sarah@northwind.health" hint="Used to auto-link Gmail threads." />
            <div data-cmp="leadform.company_row" className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <Select cmp="leadform.company_select" label="Company" options={[{ value: '', label: 'Select or create…' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]} />
              <Button cmp="leadform.company_new_button">+ New company</Button>
            </div>
            <div data-cmp="leadform.meta_row" className="grid grid-cols-2 gap-3">
              <Input cmp="leadform.title_input" label="Title" placeholder="VP Customer Success" />
              <Input cmp="leadform.phone_input" label="Phone" placeholder="+1 …" />
            </div>
            <div data-cmp="leadform.meta_row2" className="grid grid-cols-3 gap-3">
              <Select cmp="leadform.status_select" label="Status" options={statuses.map((s) => ({ value: s.id, label: s.name }))} />
              <Select cmp="leadform.owner_select" label="Owner" options={users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))} />
              <Select cmp="leadform.source_select" label="Source" options={['Website', 'Referral', 'LinkedIn', 'Event', 'Inbound email', 'Cold outreach'].map((s) => ({ value: s, label: s }))} />
            </div>
            <Textarea cmp="leadform.notes_textarea" label="Notes" placeholder="Context, pain points, next step…" className="min-h-20" />
            <div data-cmp="leadform.enrich_row" className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-2">
              <span data-cmp="leadform.enrich_label" className="inline-flex items-center gap-2 text-sm"><Sparkles size={14} className="text-accent" /> Enrich with AI after saving</span>
              <Toggle cmp="leadform.enrich_toggle" checked />
            </div>
          </Modal>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
