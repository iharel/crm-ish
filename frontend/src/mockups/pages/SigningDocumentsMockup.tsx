import { FileSignature, Plus } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Badge, Button, Table, Tabs, type Column } from '../../components/ui'

interface MockRequest { id: string; title: string; company: string; files: string; status: string; tone: 'info' | 'success' | 'neutral'; when: string }

const rows: MockRequest[] = [
  { id: 'r1', title: 'Northfield — Master agreement + appendices', company: 'Northfield Logistics', files: '3 · 14 pages', status: 'Out for signature · 1/2', tone: 'info', when: '2h ago' },
  { id: 'r2', title: 'Halden Energy — Order form', company: 'Halden Energy', files: '1 · 2 pages', status: 'Out for signature · 0/1', tone: 'info', when: 'yesterday' },
  { id: 'r3', title: 'Brightwave — NDA', company: 'Brightwave Health', files: '1 · 3 pages', status: 'Out for signature · 2/3', tone: 'info', when: '3d ago' },
]

/** SigningDocumentsMockup — the Documents page: signing requests by status, and reusable templates. */
export default function SigningDocumentsMockup() {
  const columns: Column<MockRequest>[] = [
    { key: 'title', header: 'Document', render: (r) => <div data-cmp={`signdocs.title_${r.id}`} className="flex items-center gap-2"><FileSignature size={14} className="text-fg-subtle" /><span className="font-medium">{r.title}</span></div> },
    { key: 'company', header: 'Company', render: (r) => <span data-cmp={`signdocs.company_${r.id}`} className="text-fg-muted">{r.company}</span> },
    { key: 'files', header: 'Files', render: (r) => <span data-cmp={`signdocs.files_${r.id}`} className="text-fg-muted">{r.files}</span> },
    { key: 'status', header: 'Status', render: (r) => <Badge cmp={`signdocs.status_${r.id}`} tone={r.tone}>{r.status}</Badge> },
    { key: 'when', header: 'Sent', render: (r) => <span data-cmp={`signdocs.when_${r.id}`} className="text-fg-muted">{r.when}</span> },
  ]
  return (
    <MockupFrame name="signing-documents" title="Documents — signing requests">
      <AppShell active="documents" title="Documents" actions={<><Button cmp="signdocs.new_template_button" size="sm" variant="secondary">New template</Button><Button cmp="signdocs.new_button" size="sm" variant="primary" icon={<Plus size={13} />}>Send for signature</Button></>}>
        <div data-cmp="signdocs.root_div" className="p-4 flex flex-col gap-3 h-full">
          <Tabs cmp="signdocs.tabs" active="open" tabs={[{ id: 'open', label: 'Out for signature', count: 3 }, { id: 'drafts', label: 'Drafts', count: 1 }, { id: 'done', label: 'Signed', count: 12 }, { id: 'closed', label: 'Closed', count: 2 }, { id: 'templates', label: 'Templates', count: 4 }]} />
          <div data-cmp="signdocs.table_card" className="card flex-1 min-h-0 overflow-hidden"><Table cmp="signdocs.table" columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={() => {}} /></div>
          <p data-cmp="signdocs.hint_text" className="text-xs text-fg-subtle">You see your own requests. On a company page, other people's requests show their status only.</p>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
