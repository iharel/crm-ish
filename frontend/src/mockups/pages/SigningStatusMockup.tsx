import { Ban, Bell, Copy, CopyPlus, Download, FileText, Mail } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Badge, Button, Card } from '../../components/ui'

const people = [
  { id: 'p1', name: 'Maya Lindqvist', email: 'maya@northfield.example', color: '#0ea5a4', status: 'Signed · Nov 12, 4:10 PM', tone: 'success' as const, waiting: false, copy: false },
  { id: 'p2', name: 'Alex Morgan', email: 'alex@acme-demo.example', color: '#db2777', status: 'Opened', tone: 'accent' as const, waiting: true, copy: false },
  { id: 'p3', name: 'Northfield Legal', email: 'legal@northfield.example', color: 'var(--border-strong)', status: 'Gets a copy', tone: 'neutral' as const, waiting: false, copy: true },
]
const events = ['Request sent', 'Maya Lindqvist was invited to sign', 'Alex Morgan was invited to sign', 'Maya Lindqvist opened the document', 'Maya Lindqvist agreed to sign electronically', 'Maya Lindqvist signed', 'Alex Morgan opened the document', 'Alex Morgan was reminded']

/** SigningStatusMockup — a sent request: recipients with status, reminders and private links, files and activity. */
export default function SigningStatusMockup() {
  return (
    <MockupFrame name="signing-status" title="Signing request status">
      <AppShell active="documents" title="Document" actions={<><Button cmp="signstat.void_button" size="sm" variant="danger" icon={<Ban size={13} />}>Void</Button><Button cmp="signstat.duplicate_button" size="sm" variant="secondary" icon={<CopyPlus size={13} />}>Duplicate</Button></>}>
        <div data-cmp="signstat.root_div" className="p-4 flex flex-col gap-4 h-full overflow-y-auto">
          <div data-cmp="signstat.header" className="flex items-center gap-3"><span data-cmp="signstat.title" className="text-lg font-semibold tracking-tight flex-1">Northfield — Master agreement + appendices</span><Badge cmp="signstat.status_badge" tone="info">Out for signature · 1/2</Badge></div>
          <div data-cmp="signstat.grid" className="grid gap-4 lg:grid-cols-2">
            <div data-cmp="signstat.left_col" className="flex flex-col gap-4">
              <Card cmp="signstat.recipients_card" title="Recipients" padded={false}>
                <ul data-cmp="signstat.recipients_list" className="divide-y divide-border">
                  {people.map((p) => <li key={p.id} data-cmp={`signstat.person_${p.id}`} className="p-3 flex items-center gap-3"><span data-cmp={`signstat.person_color_${p.id}`} style={{ backgroundColor: p.color }} className="h-2.5 w-2.5 rounded-full" /><div data-cmp={`signstat.person_meta_${p.id}`} className="min-w-0 flex-1"><div data-cmp={`signstat.person_name_${p.id}`} className="text-sm font-medium">{p.name}</div><div data-cmp={`signstat.person_email_${p.id}`} className="text-xs text-fg-muted font-mono">{p.email}</div></div><Badge cmp={`signstat.person_status_${p.id}`} tone={p.tone}>{p.copy && <Mail size={10} />} {p.status}</Badge>{p.waiting && <Button cmp={`signstat.remind_button_${p.id}`} size="sm" variant="secondary" icon={<Bell size={12} />}>Remind</Button>}<Button cmp={`signstat.link_button_${p.id}`} size="sm" variant="ghost" icon={<Copy size={12} />}>Link</Button></li>)}
                </ul>
              </Card>
              <Card cmp="signstat.files_card" title="Files" padded={false}>
                <ul data-cmp="signstat.files_list" className="divide-y divide-border">
                  {['Master agreement.pdf', 'Appendix A — Pricing.pdf', 'Appendix B — SLA.pdf'].map((f, i) => <li key={f} data-cmp={`signstat.file_${i}`} className="p-3 flex items-center gap-3"><FileText size={15} className="text-fg-subtle" /><span data-cmp={`signstat.file_name_${i}`} className="text-sm flex-1">{i + 1}. {f}</span><Button cmp={`signstat.file_download_${i}`} size="sm" variant="ghost" icon={<Download size={12} />}>Original</Button></li>)}
                </ul>
              </Card>
            </div>
            <Card cmp="signstat.activity_card" title="Activity" padded={false} className="self-start">
              <ol data-cmp="signstat.activity_list" className="divide-y divide-border">{events.map((e, i) => <li key={i} data-cmp={`signstat.event_${i}`} className="px-3 py-2 flex items-baseline gap-3 text-sm"><span data-cmp={`signstat.event_text_${i}`} className="flex-1">{e}</span><span data-cmp={`signstat.event_when_${i}`} className="text-[11px] text-fg-subtle">Nov 1{i > 4 ? 2 : 1}, 2026</span></li>)}</ol>
            </Card>
          </div>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
