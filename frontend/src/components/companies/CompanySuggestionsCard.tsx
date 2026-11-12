import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Loader2, Mail, Sparkles, User } from 'lucide-react'
import { companiesApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { Avatar, Button, Card } from '../ui'
import { shortDate } from '../../lib/format'

export interface CompanySuggestionsCardProps { cmp: string; companyId: string; companyName: string; onLinked: () => void }

/**
 * CompanySuggestionsCard — leads and email threads whose email domain matches the company but are not linked to it.
 * Each row links individually; "Link all" links everything at once. Hidden when there is nothing to suggest.
 */
export function CompanySuggestionsCard({ cmp, companyId, companyName, onLinked }: CompanySuggestionsCardProps) {
  const toast = useToast()
  const { data, reload } = useAsync(() => companiesApi.suggestions(companyId), [companyId])
  const [busy, setBusy] = useState<string | null>(null)
  if (!data || (!data.leads.length && !data.threads.length)) return null
  async function accept(d: { leadIds?: string[]; threadIds?: string[] }, key: string) {
    setBusy(key)
    try { const r = await companiesApi.acceptSuggestions(companyId, d); toast.success(`Linked ${r.linked} to ${companyName}`); await reload(true); onLinked() } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) }
  }
  const total = data.leads.length + data.threads.length
  return (
    <Card cmp={cmp} className="xl:col-span-3 border-dashed border-primary/40" padded={false} title={<span className="inline-flex items-center gap-1.5"><Sparkles size={14} className="text-primary" /> Suggested by email domain ({total})</span>} actions={<Button cmp={`${cmp}.all_button`} size="sm" variant="primary" disabled={!!busy} icon={busy === 'all' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} onClick={() => void accept({ leadIds: data.leads.map((l) => l.id), threadIds: data.threads.map((t) => t.id) }, 'all')}>Link all</Button>}>
      <ul data-cmp={`${cmp}.list`} className="divide-y divide-border">
        {data.leads.map((l) => (
          <li key={l.id} data-cmp={`${cmp}.lead_${l.id}`} className="p-3 flex items-center gap-3 text-sm">
            <Avatar cmp={`${cmp}.lead_avatar_${l.id}`} name={l.name} size="sm" />
            <div data-cmp={`${cmp}.lead_meta_${l.id}`} className="min-w-0 flex-1">
              <Link dir="auto" data-cmp={`${cmp}.lead_link_${l.id}`} to={`/leads/${l.id}`} className="font-medium hover:text-primary truncate inline-flex items-center gap-1"><User size={11} className="text-fg-subtle" /> {l.name}</Link>
              <p data-cmp={`${cmp}.lead_email_${l.id}`} className="text-xs text-fg-subtle font-mono truncate">{l.email}</p>
            </div>
            <Button cmp={`${cmp}.lead_accept_${l.id}`} size="sm" disabled={!!busy} icon={busy === l.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} onClick={() => void accept({ leadIds: [l.id] }, l.id)}>Link lead</Button>
          </li>
        ))}
        {data.threads.map((t) => (
          <li key={t.id} data-cmp={`${cmp}.thread_${t.id}`} className="p-3 flex items-center gap-3 text-sm">
            <span data-cmp={`${cmp}.thread_icon_${t.id}`} className="h-8 w-8 shrink-0 rounded-full bg-surface-3 grid place-items-center text-fg-subtle"><Mail size={14} /></span>
            <div data-cmp={`${cmp}.thread_meta_${t.id}`} className="min-w-0 flex-1">
              <Link dir="auto" data-cmp={`${cmp}.thread_link_${t.id}`} to={`/inbox/${t.id}`} className="font-medium hover:text-primary truncate block">{t.subject ?? '(no subject)'}</Link>
              <p data-cmp={`${cmp}.thread_from_${t.id}`} className="text-xs text-fg-subtle truncate"><span className="font-mono">{t.counterpart?.email}</span> · {shortDate(t.lastMessageAt)}</p>
            </div>
            <Button cmp={`${cmp}.thread_accept_${t.id}`} size="sm" disabled={!!busy} icon={busy === t.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} onClick={() => void accept({ threadIds: [t.id] }, t.id)}>Link thread</Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
