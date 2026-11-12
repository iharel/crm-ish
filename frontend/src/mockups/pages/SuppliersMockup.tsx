import { Plus, Globe, Truck, Handshake } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Badge, Button, Input, Table, Tabs, type Column } from '../../components/ui'

interface MockSupplier { id: string; name: string; domain: string; industry: string; location: string; contacts: number; deal: string | null }

const suppliers: MockSupplier[] = [
  { id: 's1', name: 'Northwind Hosting', domain: 'northwind.host', industry: 'Cloud infrastructure', location: 'Dublin', contacts: 3, deal: null },
  { id: 's2', name: 'Brightside Agency', domain: 'brightside.agency', industry: 'Marketing', location: 'Tel Aviv', contacts: 2, deal: 'Proposal' },
  { id: 's3', name: 'Ledgerly', domain: 'ledgerly.io', industry: 'Accounting software', location: 'Berlin', contacts: 1, deal: null },
]

/** SuppliersMockup — the Suppliers tab of the Companies page: supplier companies, their contacts and optional deal. */
export default function SuppliersMockup() {
  const columns: Column<MockSupplier>[] = [
    { key: 'name', header: 'Company', render: (c) => <div data-cmp={`suppliers.name_${c.id}`} className="flex items-center gap-2"><span data-cmp={`suppliers.logo_${c.id}`} className="h-7 w-7 rounded bg-surface-3 inline-flex items-center justify-center text-xs font-semibold text-fg-muted">{c.name[0]}</span><div data-cmp={`suppliers.meta_${c.id}`}><div data-cmp={`suppliers.title_${c.id}`} className="font-medium inline-flex items-center gap-2">{c.name}<Badge cmp={`suppliers.badge_${c.id}`} tone="warning"><Truck size={10} /> Supplier</Badge></div><div data-cmp={`suppliers.domain_${c.id}`} className="text-xs text-fg-muted font-mono flex items-center gap-1"><Globe size={10} /> {c.domain}</div></div></div> },
    { key: 'industry', header: 'Industry', render: (c) => <span data-cmp={`suppliers.industry_${c.id}`} className="text-fg-muted">{c.industry}</span> },
    { key: 'location', header: 'Location', render: (c) => <span data-cmp={`suppliers.location_${c.id}`} className="text-fg-muted">{c.location}</span> },
    { key: 'contacts', header: 'Contacts', render: (c) => <Badge cmp={`suppliers.contacts_${c.id}`} tone="primary">{c.contacts}</Badge> },
    { key: 'deal', header: 'Deal', render: (c) => c.deal ? <Badge cmp={`suppliers.deal_${c.id}`} tone="info"><Handshake size={10} /> {c.deal}</Badge> : <span data-cmp={`suppliers.deal_${c.id}`} className="text-xs text-fg-subtle">No deal</span> },
  ]
  return (
    <MockupFrame name="suppliers" title="Suppliers">
      <AppShell active="companies" title="Companies" actions={<Button cmp="suppliers.add_button" size="sm" variant="primary" icon={<Plus size={13} />}>New supplier</Button>}>
        <div data-cmp="suppliers.root_div" className="p-4 flex flex-col gap-3 h-full">
          <Tabs cmp="suppliers.tabs" active="suppliers" tabs={[{ id: 'companies', label: 'Companies' }, { id: 'suppliers', label: 'Suppliers' }]} />
          <div data-cmp="suppliers.filters" className="flex items-center gap-3"><Input cmp="suppliers.search_input" placeholder="Search suppliers or domains…" className="w-80" /><span data-cmp="suppliers.count_text" className="ml-auto text-xs text-fg-subtle">{suppliers.length} suppliers</span></div>
          <div data-cmp="suppliers.table_card" className="card flex-1 min-h-0 overflow-hidden"><Table cmp="suppliers.table" columns={columns} rows={suppliers} rowKey={(c) => c.id} onRowClick={() => {}} /></div>
          <p data-cmp="suppliers.hint_text" className="text-xs text-fg-subtle">Supplier contacts stay out of the Leads pipeline until they are added to a deal.</p>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
