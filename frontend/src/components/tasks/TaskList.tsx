import { Link } from 'react-router-dom'
import { Mail, User, Building2, Calendar, Check, CheckSquare } from 'lucide-react'
import { Badge, cn } from '../ui'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ContextMenu } from '../common/ContextMenu'
import { ExternalLink, Pencil, Trash2, RotateCcw } from 'lucide-react'
import type { Task } from '../../types'

export interface TaskListProps {
  cmp: string
  tasks: Task[]
  /** Compact rows for side cards (no summary, fewer chips). */
  compact?: boolean
  emptyText?: string
  onToggle: (t: Task) => void
  onEdit?: (t: Task) => void
  onDelete?: (t: Task) => void
}

function dueMeta(dueAt: string | null): { label: string; tone: 'neutral' | 'danger' | 'warning' } | null {
  if (!dueAt) return null
  const d = new Date(`${dueAt}T00:00:00`); const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((d.getTime() - today.getTime()) / 86400000)
  const label = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days === -1 ? 'Yesterday' : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return { label, tone: days < 0 ? 'danger' : days <= 2 ? 'warning' : 'neutral' }
}

/** TaskList — rows with a done checkbox, title, summary and links to the email, lead and company. */
export function TaskList({ cmp, tasks, compact, emptyText = 'No tasks.', onToggle, onEdit, onDelete }: TaskListProps) {
  const ctx = useContextMenu<Task>()
  if (!tasks.length) return <p data-cmp={`${cmp}.empty`} className="p-4 text-sm text-fg-muted">{emptyText}</p>
  return (
    <>
      <ul data-cmp={cmp} className="divide-y divide-border">
        {tasks.map((t) => {
          const due = t.status === 'open' ? dueMeta(t.dueAt) : null
          return (
            <li key={t.id} data-cmp={`${cmp}.item_${t.id}`} onContextMenu={(e) => ctx.open(e, t)} className={cn('flex gap-3 hover:bg-surface-2 transition-colors', compact ? 'px-3 py-2' : 'px-4 py-3', t.status === 'done' && 'opacity-60')}>
              <button type="button" data-cmp={`${cmp}.toggle_${t.id}`} role="checkbox" aria-checked={t.status === 'done'} aria-label={t.status === 'done' ? 'Reopen task' : 'Mark done'} onClick={() => onToggle(t)} className={cn('mt-0.5 h-4.5 w-4.5 shrink-0 rounded-md border grid place-items-center transition-colors', t.status === 'done' ? 'bg-primary border-primary text-white' : 'border-border-strong hover:border-primary')}>{t.status === 'done' && <Check size={11} />}</button>
              <div data-cmp={`${cmp}.meta_${t.id}`} className="flex-1 min-w-0">
                <div data-cmp={`${cmp}.top_${t.id}`} className="flex items-center gap-2">
                  <span dir="auto" data-cmp={`${cmp}.title_${t.id}`} role={onEdit ? 'button' : undefined} onClick={onEdit ? () => onEdit(t) : undefined} className={cn('text-sm font-medium truncate', onEdit && 'cursor-pointer hover:text-primary', t.status === 'done' && 'line-through')}>{t.title}</span>
                  {due && <Badge cmp={`${cmp}.due_${t.id}`} tone={due.tone}><Calendar size={10} /> {due.label}</Badge>}
                </div>
                {!compact && t.summary && <p dir="auto" data-cmp={`${cmp}.summary_${t.id}`} className="bidi-plain text-xs text-fg-muted mt-0.5 line-clamp-2">{t.summary}</p>}
                <div data-cmp={`${cmp}.links_${t.id}`} className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                  {t.threadId && <Link data-cmp={`${cmp}.thread_link_${t.id}`} to={`/inbox/${t.threadId}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-fg-muted hover:text-fg max-w-56"><Mail size={10} /> <span dir="auto" className="truncate">{t.threadSubject ?? 'Email'}</span></Link>}
                  {t.leadId && !compact && <Link data-cmp={`${cmp}.lead_link_${t.id}`} to={`/leads/${t.leadId}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-fg-muted hover:text-fg"><User size={10} /> <span dir="auto">{t.leadName ?? 'Lead'}</span></Link>}
                  {t.companyId && !compact && <Link data-cmp={`${cmp}.company_link_${t.id}`} to={`/companies/${t.companyId}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-fg-muted hover:text-fg"><Building2 size={10} /> <span dir="auto">{t.companyName ?? 'Company'}</span></Link>}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {ctx.menu && (() => { const t = ctx.menu.target; return (
        <ContextMenu cmp={`${cmp}.context`} x={ctx.menu.x} y={ctx.menu.y} onClose={ctx.close} items={[
          { id: 'toggle', label: t.status === 'done' ? 'Reopen' : 'Mark done', icon: t.status === 'done' ? <RotateCcw size={13} /> : <CheckSquare size={13} />, onSelect: () => onToggle(t) },
          ...(onEdit ? [{ id: 'edit', label: 'Edit…', icon: <Pencil size={13} />, onSelect: () => onEdit(t) }] : []),
          'separator' as const,
          ...(t.threadId ? [{ id: 'email', label: 'Open email', icon: <ExternalLink size={13} />, onSelect: () => { location.assign(`/inbox/${t.threadId}`) } }] : []),
          ...(t.leadId ? [{ id: 'lead', label: 'Open lead', icon: <User size={13} />, onSelect: () => { location.assign(`/leads/${t.leadId}`) } }] : []),
          ...(t.companyId ? [{ id: 'company', label: 'Open company', icon: <Building2 size={13} />, onSelect: () => { location.assign(`/companies/${t.companyId}`) } }] : []),
          ...(onDelete ? ['separator' as const, { id: 'delete', label: 'Delete task', icon: <Trash2 size={13} />, danger: true, onSelect: () => onDelete(t) }] : []),
        ]} />
      ) })()}
    </>
  )
}
