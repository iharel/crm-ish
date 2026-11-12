import { Mail, Sparkles, Eye, AlertTriangle, Calendar, CheckCheck, Wifi } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Badge, Button, Card, Toggle, cn } from '../../components/ui'
import { notifications } from '../data'

const icons: Record<string, { icon: React.ReactNode; tone: string }> = {
  email: { icon: <Mail size={14} />, tone: 'text-primary bg-primary/15' },
  draft: { icon: <Sparkles size={14} />, tone: 'text-accent bg-accent/15' },
  enrich: { icon: <Sparkles size={14} />, tone: 'text-accent bg-accent/15' },
  tracking: { icon: <Eye size={14} />, tone: 'text-success bg-success/15' },
  bounce: { icon: <AlertTriangle size={14} />, tone: 'text-danger bg-danger/15' },
  meeting: { icon: <Calendar size={14} />, tone: 'text-info bg-info/15' },
}

/** NotificationsMockup — realtime notification center + preferences. */
export default function NotificationsMockup() {
  return (
    <MockupFrame name="notifications" title="Notifications">
      <AppShell active="dashboard" title="Notifications" actions={<><Badge cmp="notifications.ws_badge" tone="success"><Wifi size={10} /> Live</Badge><Button cmp="notifications.readall_button" size="sm" icon={<CheckCheck size={13} />}>Mark all read</Button></>}>
        <div data-cmp="notifications.root_div" className="p-5 grid xl:grid-cols-[1fr_340px] gap-4">
          <Card cmp="notifications.list_card" title="Recent" padded={false}>
            <ul data-cmp="notifications.list" className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} data-cmp={`notifications.item_${n.id}`} className={cn('px-4 py-3 flex items-start gap-3 hover:bg-surface-2 cursor-pointer', !n.read && 'bg-primary/5')}>
                  <span data-cmp={`notifications.icon_${n.id}`} className={cn('h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0', icons[n.type].tone)}>{icons[n.type].icon}</span>
                  <div data-cmp={`notifications.meta_${n.id}`} className="flex-1 min-w-0"><p data-cmp={`notifications.title_${n.id}`} className={cn('text-sm', !n.read && 'font-semibold')}>{n.title}</p><p data-cmp={`notifications.body_${n.id}`} className="text-xs text-fg-muted">{n.body}</p></div>
                  <span data-cmp={`notifications.time_${n.id}`} className="text-xs text-fg-subtle">{n.at}</span>
                  {!n.read && <span data-cmp={`notifications.dot_${n.id}`} className="mt-1.5 h-2 w-2 rounded-full bg-primary" />}
                </li>
              ))}
            </ul>
          </Card>
          <Card cmp="notifications.prefs_card" title="Preferences">
            <div data-cmp="notifications.prefs_list" className="flex flex-col gap-3 text-sm">
              {[['New inbound email from a lead', true], ['AI draft ready', true], ['Email opened / clicked', false], ['Email bounced', true], ['Lead status changed by teammate', true], ['Meeting booked', true], ['Knowledge indexing finished', false]].map(([label, on], i) => (
                <div key={i} data-cmp={`notifications.pref_${i}`} className="flex items-center justify-between"><span>{label as string}</span><Toggle cmp={`notifications.pref_toggle_${i}`} checked={on as boolean} /></div>
              ))}
              <div data-cmp="notifications.pref_channels" className="border-t border-border pt-3 flex flex-col gap-2">
                <p data-cmp="notifications.pref_channels_title" className="text-xs font-medium text-fg-muted">Channels</p>
                <div data-cmp="notifications.pref_inapp" className="flex items-center justify-between"><span>In-app (WebSocket)</span><Toggle cmp="notifications.pref_inapp_toggle" checked /></div>
                <div data-cmp="notifications.pref_browser" className="flex items-center justify-between"><span>Browser push</span><Toggle cmp="notifications.pref_browser_toggle" checked={false} /></div>
                <div data-cmp="notifications.pref_digest" className="flex items-center justify-between"><span>Daily email digest</span><Toggle cmp="notifications.pref_digest_toggle" checked /></div>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
