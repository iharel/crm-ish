import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { emailsApi, notificationsApi } from '../../api'
import { useSocketEvent } from '../../hooks/useSocketEvent'
import { notificationService } from '../../services/notificationService'
import { Sidebar } from './Sidebar'
import { ResizeHandle } from '../common/ResizeHandle'
import { usePanelSize } from '../../hooks/usePanelSize'
import { TopBar } from './TopBar'
import { LeadFormModal } from '../leads/LeadFormModal'
import type { Notification } from '../../types'

export interface AppShellProps { title: string; actions?: ReactNode; children: ReactNode }

/** AppShell — authenticated layout: sidebar + top bar + content, with live badges. */
export function AppShell({ title, actions, children }: AppShellProps) {
  const loc = useLocation()
  const [unreadInbox, setUnreadInbox] = useState(0)
  const [unreadNotif, setUnreadNotif] = useState(0)
  const [quickAdd, setQuickAdd] = useState(false)
  const nav = usePanelSize('nav', { default: 240, min: 200, max: 320 })

  const refreshBadges = async () => {
    try { const [a, b] = await Promise.all([emailsApi.unread(), notificationsApi.list()]); setUnreadInbox(a.unread); setUnreadNotif(b.unread) } catch { /* ignore */ }
  }
  useEffect(() => { void refreshBadges() }, [loc.pathname])
  useEffect(() => { document.documentElement.dataset.section = loc.pathname === '/' ? 'dashboard' : loc.pathname.split('/')[1] }, [loc.pathname])
  useSocketEvent<Notification>('notification:new', (n) => { setUnreadNotif((x) => x + 1); notificationService.show(n.title, n.body ?? undefined) })
  useSocketEvent('email:new', () => void refreshBadges())

  return (
    <div data-cmp="shell.root_div" className="h-full w-full flex">
      <Sidebar unreadInbox={unreadInbox} unreadNotifications={unreadNotif} collapsed={nav.collapsed} width={nav.width} />
      <ResizeHandle cmp="shell.nav_handle" panelSide="left" label="navigation" collapsed={nav.collapsed} dragging={nav.dragging} onToggle={nav.toggle} onDrag={nav.startDrag} onReset={nav.reset} onNudge={nav.nudge} />
      <div data-cmp="shell.main_div" className="flex-1 min-w-0 h-full flex flex-col">
        <TopBar title={title} actions={actions} unreadNotifications={unreadNotif} onNotificationsChanged={() => void refreshBadges()} onQuickAdd={() => setQuickAdd(true)} />
        <main data-cmp="shell.content_main" className="flex-1 min-h-0 overflow-auto">{children}</main>
      </div>
      {quickAdd && <LeadFormModal onClose={() => setQuickAdd(false)} onSaved={() => setQuickAdd(false)} />}
    </div>
  )
}
