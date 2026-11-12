import { useNavigate } from 'react-router-dom'
import { CheckCheck, Mail, Sparkles, Eye, AlertTriangle, Calendar, Bell } from 'lucide-react'
import { notificationsApi } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { timeAgo } from '../../lib/format'
import { Button, cn } from '../ui'
import type { Notification } from '../../types'

const icons: Record<string, { icon: React.ReactNode; tone: string }> = {
  email: { icon: <Mail size={13} />, tone: 'text-primary bg-primary/15' },
  draft: { icon: <Sparkles size={13} />, tone: 'text-accent bg-accent/15' },
  enrich: { icon: <Sparkles size={13} />, tone: 'text-accent bg-accent/15' },
  tracking: { icon: <Eye size={13} />, tone: 'text-success bg-success/15' },
  bounce: { icon: <AlertTriangle size={13} />, tone: 'text-danger bg-danger/15' },
  meeting: { icon: <Calendar size={13} />, tone: 'text-info bg-info/15' },
}
export const notificationIcon = (type: string) => icons[type] ?? { icon: <Bell size={13} />, tone: 'text-fg-muted bg-surface-3' }

/** NotificationsPopover — dropdown with the latest notifications. */
export function NotificationsPopover({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const nav = useNavigate()
  const { data, reload } = useAsync(() => notificationsApi.list())
  async function open(n: Notification) {
    if (!n.read_at) { await notificationsApi.markRead(n.id); onChanged() }
    onClose(); if (n.link) nav(n.link)
  }
  return (
    <div data-cmp="notif.popover" className="absolute right-0 top-10 w-96 card shadow-elevated z-50 animate-fade-in overflow-hidden">
      <div data-cmp="notif.popover_header" className="flex items-center justify-between px-3 h-10 border-b border-border">
        <span data-cmp="notif.popover_title" className="text-sm font-semibold">Notifications</span>
        <Button cmp="notif.popover_readall" size="sm" variant="ghost" icon={<CheckCheck size={12} />} onClick={async () => { await notificationsApi.markAllRead(); await reload(true); onChanged() }}>Mark all read</Button>
      </div>
      <ul data-cmp="notif.popover_list" className="max-h-96 overflow-auto divide-y divide-border">
        {(data?.items ?? []).slice(0, 20).map((n) => { const ic = notificationIcon(n.type); return (
          <li key={n.id} data-cmp={`notif.item_${n.id}`} onClick={() => void open(n)} className={cn('px-3 py-2.5 flex items-start gap-2.5 cursor-pointer hover:bg-surface-2', !n.read_at && 'bg-primary/5')}>
            <span data-cmp={`notif.icon_${n.id}`} className={cn('h-7 w-7 rounded-full grid place-items-center shrink-0', ic.tone)}>{ic.icon}</span>
            <div data-cmp={`notif.meta_${n.id}`} className="flex-1 min-w-0"><p dir="auto" data-cmp={`notif.title_${n.id}`} className={cn('text-sm truncate', !n.read_at && 'font-semibold')}>{n.title}</p><p dir="auto" data-cmp={`notif.body_${n.id}`} className="text-xs text-fg-muted truncate">{n.body}</p></div>
            <span data-cmp={`notif.time_${n.id}`} className="text-[11px] text-fg-subtle shrink-0">{timeAgo(n.created_at)}</span>
          </li>
        ) })}
        {data && !data.items.length && <li data-cmp="notif.empty" className="p-6 text-center text-sm text-fg-muted">You're all caught up.</li>}
      </ul>
    </div>
  )
}
