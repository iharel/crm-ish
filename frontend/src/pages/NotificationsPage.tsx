import { useNavigate } from 'react-router-dom'
import { CheckCheck, Bell } from 'lucide-react'
import { notificationsApi } from '../api'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { notificationIcon } from '../components/shell/NotificationsPopover'
import { Button, Card, Toggle, cn } from '../components/ui'
import { useAsync } from '../hooks/useAsync'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { notificationService } from '../services/notificationService'
import { timeAgo } from '../lib/format'
import { useState } from 'react'

/** NotificationsPage — full notification center + browser push preference. */
export default function NotificationsPage() {
  const nav = useNavigate()
  const { data, loading, error, reload } = useAsync(() => notificationsApi.list())
  const [perm, setPerm] = useState(notificationService.permission())
  useSocketEvent('notification:new', () => void reload(true))
  return (
    <AppShell title="Notifications" actions={<Button cmp="notifications.readall_button" size="sm" icon={<CheckCheck size={13} />} onClick={async () => { await notificationsApi.markAllRead(); await reload(true) }}>Mark all read</Button>}>
      <div data-cmp="notifications.root_div" className="p-6 grid xl:grid-cols-[1fr_340px] gap-5 animate-fade-in">
        {loading && !data ? <PageState cmp="notifications" loading /> : error ? <PageState cmp="notifications" error={error} onRetry={() => void reload()} /> : (
          <Card cmp="notifications.list_card" title="Recent" padded={false}>
            <ul data-cmp="notifications.list" className="divide-y divide-border">
              {(data?.items ?? []).map((n) => { const ic = notificationIcon(n.type); return (
                <li key={n.id} data-cmp={`notifications.item_${n.id}`} onClick={async () => { if (!n.read_at) { await notificationsApi.markRead(n.id); void reload(true) } if (n.link) nav(n.link) }} className={cn('px-4 py-3 flex items-start gap-3 hover:bg-surface-2 cursor-pointer', !n.read_at && 'bg-primary/5')}>
                  <span data-cmp={`notifications.icon_${n.id}`} className={cn('h-8 w-8 rounded-full grid place-items-center shrink-0', ic.tone)}>{ic.icon}</span>
                  <div data-cmp={`notifications.meta_${n.id}`} className="flex-1 min-w-0"><p dir="auto" data-cmp={`notifications.title_${n.id}`} className={cn('text-sm', !n.read_at && 'font-semibold')}>{n.title}</p><p dir="auto" data-cmp={`notifications.body_${n.id}`} className="text-xs text-fg-muted">{n.body}</p></div>
                  <span data-cmp={`notifications.time_${n.id}`} className="text-xs text-fg-subtle">{timeAgo(n.created_at)}</span>
                  {!n.read_at && <span data-cmp={`notifications.dot_${n.id}`} className="mt-1.5 h-2 w-2 rounded-full bg-brand-gradient" />}
                </li>
              ) })}
              {data && !data.items.length && <li data-cmp="notifications.empty" className="p-10 text-center text-sm text-fg-muted flex flex-col items-center gap-2"><Bell size={18} className="text-fg-subtle" /> Nothing yet.</li>}
            </ul>
          </Card>
        )}
        <Card cmp="notifications.prefs_card" title="Channels">
          <div data-cmp="notifications.prefs_list" className="flex flex-col gap-3 text-sm">
            <div data-cmp="notifications.pref_inapp" className="flex items-center justify-between"><span>In-app (realtime)</span><Toggle cmp="notifications.pref_inapp_toggle" checked /></div>
            <div data-cmp="notifications.pref_browser" className="flex items-center justify-between"><div><p>Browser push</p><p className="text-xs text-fg-muted">{perm === 'granted' ? 'Enabled' : perm === 'denied' ? 'Blocked in browser settings' : perm === 'unsupported' ? 'Not supported' : 'Ask permission'}</p></div><Toggle cmp="notifications.pref_browser_toggle" checked={perm === 'granted'} onChange={async () => setPerm(await notificationService.request())} /></div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
