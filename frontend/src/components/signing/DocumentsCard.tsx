import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSignature, Lock, Plus } from 'lucide-react'
import { signingApi } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { useSocketEvent } from '../../hooks/useSocketEvent'
import { timeAgo } from '../../lib/format'
import { Button, Card } from '../ui'
import { NewRequestModal } from './NewRequestModal'
import { SigningStatusBadge } from './SigningStatusBadge'

export interface DocumentsCardProps { cmp: string; companyId: string; companyName?: string | null }

/**
 * DocumentsCard — the signing requests of one company, with "Send for signature". Requests of other users show their
 * status only and cannot be opened.
 */
export function DocumentsCard({ cmp, companyId, companyName }: DocumentsCardProps) {
  const [modal, setModal] = useState(false)
  const list = useAsync(() => signingApi.list({ companyId }), [companyId])
  useSocketEvent('signing:updated', () => void list.reload(true))
  const rows = list.data ?? []
  return (
    <Card cmp={cmp} title={`Documents${list.data ? ` (${rows.length})` : ''}`} padded={false} actions={<Button cmp={`${cmp}.add_button`} size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setModal(true)}>Send for signature</Button>}>
      {list.error ? <p data-cmp={`${cmp}.error`} className="p-3 text-sm text-danger">{list.error}</p> : !rows.length ? <p data-cmp={`${cmp}.empty`} className="p-3 text-sm text-fg-muted">{list.loading ? 'Loading…' : 'Nothing sent for signature yet.'}</p> : (
        <ul data-cmp={`${cmp}.list`} className="divide-y divide-border">
          {rows.map((r) => {
            const body = <>
              {r.restricted ? <Lock size={13} className="text-fg-subtle shrink-0" /> : <FileSignature size={13} className="text-fg-subtle shrink-0" />}
              <span data-cmp={`${cmp}.row_meta_${r.id}`} className="min-w-0 flex-1"><span data-cmp={`${cmp}.row_title_${r.id}`} dir="auto" className="block text-sm truncate">{r.title}</span><span data-cmp={`${cmp}.row_sub_${r.id}`} className="block text-[11px] text-fg-subtle">{r.ownerName} · {timeAgo(r.sentAt ?? r.createdAt)}</span></span>
              <SigningStatusBadge cmp={`${cmp}.row_status_${r.id}`} request={r} />
            </>
            return <li key={r.id} data-cmp={`${cmp}.row_${r.id}`}>{r.restricted ? <div data-cmp={`${cmp}.row_locked_${r.id}`} title="Only the sender and admins can open this request" className="px-3 py-2 flex items-center gap-2.5">{body}</div> : <Link data-cmp={`${cmp}.row_link_${r.id}`} to={`/documents/${r.id}`} className="px-3 py-2 flex items-center gap-2.5 hover:bg-surface-2">{body}</Link>}</li>
          })}
        </ul>
      )}
      {modal && <NewRequestModal companyId={companyId} companyName={companyName} onClose={() => setModal(false)} />}
    </Card>
  )
}
