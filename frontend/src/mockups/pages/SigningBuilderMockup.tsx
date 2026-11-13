import { ArrowDown, ArrowUp, FileText, LayoutTemplate, PenLine, Plus, Send, Trash2, Upload, User, Calendar } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Badge, Button, Card, Toggle } from '../../components/ui'

const TEAL = '#0ea5a4'; const PINK = '#db2777'
const files = [{ id: 'f1', name: 'Master agreement.pdf', info: '8 pages · 412 KB' }, { id: 'f2', name: 'Appendix A — Pricing.pdf', info: '2 pages · 96 KB' }, { id: 'f3', name: 'Appendix B — SLA.pdf', info: '4 pages · 150 KB' }]
const people = [{ id: 'p1', name: 'Maya Lindqvist', email: 'maya@northfield.example', role: 'Signs', color: TEAL, active: true }, { id: 'p2', name: 'Alex Morgan', email: 'alex@acme-demo.example', role: 'Signs', color: PINK, active: false }, { id: 'p3', name: 'Northfield Legal', email: 'legal@northfield.example', role: 'Gets a copy', color: 'var(--border-strong)', active: false }]
const types = ['Signature', 'Initials', 'Full name', 'Date signed', 'Text', 'Checkbox']

/** SigningBuilderMockup — the request builder: files, recipients, fields placed on the pages, send settings. */
export default function SigningBuilderMockup() {
  return (
    <MockupFrame name="signing-builder" title="Signing request builder">
      <AppShell active="documents" title="Document" actions={<><span data-cmp="signbuild.save_state" className="text-xs text-fg-subtle">Saved</span><Button cmp="signbuild.template_button" size="sm" variant="secondary" icon={<LayoutTemplate size={13} />}>Save as template</Button><Button cmp="signbuild.send_button" size="sm" variant="primary" icon={<Send size={13} />}>Send</Button></>}>
        <div data-cmp="signbuild.root_div" className="h-full flex flex-col min-h-0">
          <div data-cmp="signbuild.header" className="px-4 py-3 border-b border-border flex items-center gap-3"><span data-cmp="signbuild.title" className="text-lg font-semibold tracking-tight flex-1">Northfield — Master agreement + appendices</span><Badge cmp="signbuild.status_badge">Draft</Badge><span data-cmp="signbuild.company" className="text-sm text-primary">Northfield Logistics</span></div>
          <div data-cmp="signbuild.body" className="flex-1 min-h-0 flex">
            <aside data-cmp="signbuild.sidebar" className="w-[340px] shrink-0 border-r border-border overflow-y-auto p-4 flex flex-col gap-4">
              <Card cmp="signbuild.files_card" title="1 · Files">
                <div data-cmp="signbuild.files_list" className="flex flex-col gap-2">
                  {files.map((f, i) => <div key={f.id} data-cmp={`signbuild.file_${f.id}`} className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5"><FileText size={14} className="text-fg-subtle" /><div data-cmp={`signbuild.file_meta_${f.id}`} className="min-w-0 flex-1"><div data-cmp={`signbuild.file_name_${f.id}`} className="text-sm truncate">{i + 1}. {f.name}</div><div data-cmp={`signbuild.file_info_${f.id}`} className="text-[11px] text-fg-subtle">{f.info}</div></div><ArrowUp size={13} className="text-fg-subtle" /><ArrowDown size={13} className="text-fg-subtle" /><Trash2 size={13} className="text-fg-subtle" /></div>)}
                  <div data-cmp="signbuild.upload" className="flex items-center justify-center gap-2 h-12 rounded-[var(--radius)] border border-dashed border-border-strong text-sm text-fg-muted"><Upload size={14} /> Add another PDF</div>
                </div>
              </Card>
              <Card cmp="signbuild.recipients_card" title="2 · Recipients">
                <div data-cmp="signbuild.recipients_list" className="flex flex-col gap-2">
                  {people.map((p) => <div key={p.id} data-cmp={`signbuild.person_${p.id}`} className={`rounded-[var(--radius)] border p-2 flex flex-col gap-1 ${p.active ? 'border-primary bg-primary/5' : 'border-border bg-surface'}`}><div data-cmp={`signbuild.person_top_${p.id}`} className="flex items-center gap-2"><span data-cmp={`signbuild.person_color_${p.id}`} style={{ backgroundColor: p.color }} className="h-2.5 w-2.5 rounded-full" /><span data-cmp={`signbuild.person_name_${p.id}`} className="text-sm font-medium flex-1">{p.name}</span><Trash2 size={13} className="text-fg-subtle" /></div><div data-cmp={`signbuild.person_bottom_${p.id}`} className="flex items-center gap-2"><span data-cmp={`signbuild.person_email_${p.id}`} className="text-xs font-mono text-fg-muted flex-1 truncate">{p.email}</span><Badge cmp={`signbuild.person_role_${p.id}`}>{p.role}</Badge></div></div>)}
                  <div data-cmp="signbuild.add_person" className="flex items-center gap-2 h-9 px-2.5 rounded-[var(--radius)] border border-dashed border-border-strong text-sm text-fg-subtle"><Plus size={13} /> Add a person or type an email</div>
                </div>
              </Card>
              <Card cmp="signbuild.fields_card" title="3 · Fields">
                <p data-cmp="signbuild.fields_for" className="text-xs text-fg-muted mb-2">Placing for <span style={{ color: TEAL }} className="font-semibold">Maya Lindqvist</span> — pick a field, then click the page.</p>
                <div data-cmp="signbuild.field_types" className="grid grid-cols-2 gap-1.5">{types.map((t, i) => <span key={t} data-cmp={`signbuild.field_type_${i}`} className={`h-8 grid place-items-center rounded-[var(--radius)] border text-xs font-medium ${i === 0 ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface'}`}>{t}</span>)}</div>
              </Card>
              <Card cmp="signbuild.settings_card" title="4 · Sending">
                <div data-cmp="signbuild.settings" className="flex flex-col gap-3">
                  <Toggle cmp="signbuild.order_toggle" checked={false} label="Sign in order" />
                  <Toggle cmp="signbuild.code_toggle" checked={false} label="Ask for an emailed code before opening" />
                  <Toggle cmp="signbuild.reminders_toggle" checked label="Send reminders" />
                  <p data-cmp="signbuild.reminders_text" className="text-xs text-fg-muted">First after 3 days · then every 3 days · at most 3 times</p>
                </div>
              </Card>
            </aside>
            <div data-cmp="signbuild.canvas" className="flex-1 min-w-0 overflow-auto bg-surface-2 flex flex-col items-center gap-3 py-4">
              <div data-cmp="signbuild.doc_title" className="w-[560px] text-xs text-fg-muted flex items-center gap-2"><FileText size={12} /><span className="font-medium text-fg">1. Master agreement.pdf</span><span className="ml-auto">8 pages</span></div>
              <div data-cmp="signbuild.page" className="relative w-[560px] h-[792px] bg-white rounded-sm shadow-elevated text-gray-800 p-12 text-[11px] leading-relaxed">
                <div data-cmp="signbuild.page_heading" className="text-base font-semibold mb-3">Master Services Agreement</div>
                <p data-cmp="signbuild.page_text">This agreement is made between Acme Demo Ltd. and Northfield Logistics B.V. The parties agree to the terms set out below and in Appendices A and B, which form part of this agreement.</p>
                <div data-cmp="signbuild.field_signature_1" style={{ borderColor: TEAL, backgroundColor: `${TEAL}26`, color: TEAL, boxShadow: `0 0 0 2px ${TEAL}` }} className="absolute left-[56px] top-[620px] w-[150px] h-[46px] rounded-[3px] border flex items-center gap-1 px-1 text-[10px] font-medium"><PenLine size={10} /> Signature</div>
                <div data-cmp="signbuild.field_name_1" style={{ borderColor: TEAL, backgroundColor: `${TEAL}26`, color: TEAL }} className="absolute left-[56px] top-[676px] w-[150px] h-[22px] rounded-[3px] border flex items-center gap-1 px-1 text-[10px] font-medium"><User size={10} /> Full name</div>
                <div data-cmp="signbuild.field_date_1" style={{ borderColor: TEAL, backgroundColor: `${TEAL}26`, color: TEAL }} className="absolute left-[56px] top-[704px] w-[110px] h-[22px] rounded-[3px] border flex items-center gap-1 px-1 text-[10px] font-medium"><Calendar size={10} /> Date signed</div>
                <div data-cmp="signbuild.field_signature_2" style={{ borderColor: PINK, backgroundColor: `${PINK}26`, color: PINK }} className="absolute left-[330px] top-[620px] w-[150px] h-[46px] rounded-[3px] border flex items-center gap-1 px-1 text-[10px] font-medium"><PenLine size={10} /> Signature</div>
                <div data-cmp="signbuild.field_name_2" style={{ borderColor: PINK, backgroundColor: `${PINK}26`, color: PINK }} className="absolute left-[330px] top-[676px] w-[150px] h-[22px] rounded-[3px] border flex items-center gap-1 px-1 text-[10px] font-medium"><User size={10} /> Full name</div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
