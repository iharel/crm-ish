import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileSignature, Plus } from 'lucide-react'
import { signingApi } from '../api'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { NewRequestModal } from '../components/signing/NewRequestModal'
import { SigningStatusBadge } from '../components/signing/SigningStatusBadge'
import { Button, Card, EmptyState, Table, Tabs, type Column } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { timeAgo } from '../lib/format'
import type { SignRequest } from '../types'

type Tab = 'open' | 'drafts' | 'done' | 'closed' | 'templates'
const IN_TAB: Record<Exclude<Tab, 'templates'>, (r: SignRequest) => boolean> = {
  open: (r) => r.status === 'sent',
  drafts: (r) => r.status === 'draft',
  done: (r) => r.status === 'completed',
  closed: (r) => ['declined', 'voided', 'expired'].includes(r.status),
}

/** DocumentsPage — every signing request of the user (admins: of everyone), by status, plus reusable templates. */
export default function DocumentsPage() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab | null) ?? 'open'
  // `?new=1&companyId=…&threadId=…` opens the "send for signature" dialog pre-filled (used by other pages).
  const [modal, setModal] = useState<null | { template: boolean }>(params.get('new') ? { template: false } : null)
  const requests = useAsync(() => signingApi.list(), [])
  const templates = useAsync(() => signingApi.list({ template: true }), [])
  useSocketEvent('signing:updated', () => { void requests.reload(true); void templates.reload(true) })
  const all = requests.data ?? []
  const rows = tab === 'templates' ? templates.data ?? [] : all.filter(IN_TAB[tab])
  const count = (t: Exclude<Tab, 'templates'>) => all.filter(IN_TAB[t]).length

  const columns: Column<SignRequest>[] = [
    { key: 'title', header: tab === 'templates' ? 'Template' : 'Document', render: (r) => <div data-cmp={`documents.title_${r.id}`} className="flex items-center gap-2 min-w-0"><FileSignature size={14} className="text-fg-subtle shrink-0" /><span dir="auto" className="font-medium truncate">{r.title}</span></div> },
    ...(tab === 'templates' ? [] : [{ key: 'company', header: 'Company', render: (r: SignRequest) => <span data-cmp={`documents.company_${r.id}`} dir="auto" className="text-fg-muted">{r.companyName ?? '—'}</span> }]),
    { key: 'files', header: 'Files', render: (r) => <span data-cmp={`documents.files_${r.id}`} className="text-fg-muted">{r.documentCount} · {r.pageCount} page{r.pageCount === 1 ? '' : 's'}</span> },
    { key: 'status', header: 'Status', render: (r) => <SigningStatusBadge cmp={`documents.status_${r.id}`} request={r} /> },
    ...(isAdmin ? [{ key: 'owner', header: 'Sender', render: (r: SignRequest) => <span data-cmp={`documents.owner_${r.id}`} className="text-fg-muted">{r.ownerId === user?.id ? 'You' : r.ownerName}</span> }] : []),
    { key: 'when', header: tab === 'drafts' || tab === 'templates' ? 'Edited' : tab === 'done' ? 'Signed' : 'Sent', render: (r) => <span data-cmp={`documents.when_${r.id}`} className="text-fg-muted">{timeAgo(tab === 'done' ? r.completedAt : tab === 'drafts' || tab === 'templates' ? r.updatedAt : r.sentAt ?? r.updatedAt)}</span> },
  ]
  const state = tab === 'templates' ? templates : requests
  return (
    <AppShell title="Documents" actions={<><Button cmp="documents.new_template_button" size="sm" variant="secondary" onClick={() => setModal({ template: true })}>New template</Button><Button cmp="documents.new_button" size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setModal({ template: false })}>Send for signature</Button></>}>
      <div data-cmp="documents.root_div" className="p-6 flex flex-col gap-4 animate-fade-in h-full">
        <Tabs cmp="documents.tabs" active={tab} onChange={(t) => setParams(t === 'open' ? {} : { tab: t }, { replace: true })} tabs={[{ id: 'open', label: 'Out for signature', count: count('open') }, { id: 'drafts', label: 'Drafts', count: count('drafts') }, { id: 'done', label: 'Signed', count: count('done') }, { id: 'closed', label: 'Closed', count: count('closed') }, { id: 'templates', label: 'Templates', count: templates.data?.length ?? 0 }]} />
        <Card cmp="documents.table_card" padded={false} className="flex-1 min-h-0 overflow-hidden">
          {state.loading && !state.data ? <PageState cmp="documents" loading /> : state.error ? <PageState cmp="documents" error={state.error} onRetry={() => void state.reload()} /> : !rows.length ? (
            <EmptyState cmp="documents.empty" icon={<FileSignature size={22} />} title={tab === 'templates' ? 'No templates yet' : tab === 'open' ? 'Nothing is out for signature' : 'Nothing here'} description={tab === 'templates' ? 'Save a request as a template to send the same document again without placing the fields each time.' : 'Upload one or more PDFs, choose who signs, place the fields and send.'} action={<Button cmp="documents.empty_button" variant="primary" icon={<Plus size={13} />} onClick={() => setModal({ template: tab === 'templates' })}>{tab === 'templates' ? 'New template' : 'Send for signature'}</Button>} />
          ) : <Table cmp="documents.table" columns={columns} rows={rows} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/documents/${r.id}`)} />}
        </Card>
      </div>
      {modal && <NewRequestModal template={modal.template} companyId={params.get('companyId')} companyName={params.get('companyName')} threadId={params.get('threadId')} onClose={() => { setModal(null); if (params.get('new')) setParams({}, { replace: true }) }} />}
    </AppShell>
  )
}
