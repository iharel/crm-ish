import { NavLink } from 'react-router-dom'
import { Bell, Building2, Calendar, LayoutDashboard, Inbox, BookOpen, Settings, Users, Plug, Kanban, Sparkles, BarChart3, CheckSquare, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Avatar, cn } from '../ui'
import { versionApi } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { fullDate } from '../../lib/format'

interface Item { to: string; label: string; icon: LucideIcon; badge?: number; adminOnly?: boolean; end?: boolean }
interface Group { label: string; items: Item[] }

export interface SidebarProps { unreadInbox: number; unreadNotifications: number; /** Icon rail: logo, icons with tooltips, avatar. */ collapsed?: boolean; /** Width in px when expanded (resizable). */ width?: number }

/** Sidebar — primary navigation with grouped sections. */
export function Sidebar({ unreadInbox, unreadNotifications, collapsed = false, width }: SidebarProps) {
  const { user, isAdmin } = useAuth()
  const build = useAsync(() => versionApi.get(), [])
  // Hover text of the footer: which commit the web app and the api each run, so a stale deploy is visible.
  const versionTitle = [
    'Powered by Looper.ing',
    `Web ${__APP_COMMIT__} · started ${fullDate(__APP_STARTED_AT__)}`,
    build.data ? `API v${build.data.version} ${build.data.commit} · started ${fullDate(build.data.startedAt)}` : build.error ? `API version unavailable: ${build.error}` : 'API version loading…',
  ].join('\n')
  const groups: Group[] = [
    { label: 'Work', items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/inbox', label: 'Inbox', icon: Inbox, badge: unreadInbox },
      { to: '/leads', label: 'Leads', icon: Kanban },
      { to: '/companies', label: 'Companies', icon: Building2 },
      { to: '/tasks', label: 'Tasks', icon: CheckSquare },
      { to: '/calendar', label: 'Calendar', icon: Calendar },
    ] },
    { label: 'Intelligence', items: [
      { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
      { to: '/tracking', label: 'Email tracking', icon: BarChart3 },
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    ] },
    { label: 'Admin', items: [
      { to: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
      { to: '/admin/integrations', label: 'Integrations', icon: Plug, adminOnly: true },
      { to: '/settings', label: 'Settings', icon: Settings },
    ] },
  ]
  return (
    <aside data-cmp="shell.sidebar_aside" data-collapsed={collapsed || undefined} style={collapsed ? undefined : width ? { width } : undefined} className={cn('shrink-0 h-full flex flex-col border-r border-border bg-sidebar overflow-hidden', collapsed ? 'w-14' : 'w-60')}>
      <div data-cmp="shell.brand_div" className={cn('h-14 flex items-center gap-2.5 border-b border-border', collapsed ? 'justify-center px-0' : 'px-4')}>
        <span data-cmp="shell.brand_logo" title={collapsed ? 'Looper CRM' : undefined} className="h-8 w-8 shrink-0 rounded-lg bg-brand-gradient glow grid place-items-center text-white"><Sparkles size={15} /></span>
        {!collapsed && <div data-cmp="shell.brand_meta" className="leading-tight min-w-0">
          <div data-cmp="shell.brand_text" className="text-sm font-semibold tracking-tight truncate">Looper CRM</div>
          <div data-cmp="shell.brand_sub" className="text-[10px] uppercase tracking-widest text-fg-subtle">Sales OS</div>
        </div>}
      </div>
      <nav data-cmp="shell.nav" className={cn('flex-1 overflow-y-auto overflow-x-hidden py-3 flex flex-col gap-4', collapsed ? 'px-1.5' : 'px-2')}>
        {groups.map((g) => {
          const items = g.items.filter((i) => !i.adminOnly || isAdmin)
          if (!items.length) return null
          return (
            <div key={g.label} data-cmp={`shell.nav_group_${g.label}`}>
              {collapsed ? <div data-cmp={`shell.nav_group_rule_${g.label}`} className="mx-2 mb-1.5 border-t border-border/70" aria-hidden /> : <div data-cmp={`shell.nav_group_label_${g.label}`} className="px-2.5 pb-1.5 text-[10px] uppercase tracking-widest text-fg-subtle truncate">{g.label}</div>}
              <div data-cmp={`shell.nav_group_items_${g.label}`} className="flex flex-col gap-0.5">
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.end} data-cmp={`shell.nav_link_${i.label}`} title={collapsed ? i.label : undefined} aria-label={i.label} className={({ isActive }) => cn('relative flex items-center gap-2.5 h-9 rounded-lg text-sm transition-colors', collapsed ? 'justify-center px-0' : 'px-2.5', isActive ? 'bg-primary/12 text-primary font-medium' : 'text-fg-muted hover:text-fg hover:bg-surface-2')}>
                    <i.icon size={16} className="shrink-0" />
                    {!collapsed && <span data-cmp={`shell.nav_label_${i.label}`} className="flex-1 truncate">{i.label}</span>}
                    {!!i.badge && <span data-cmp={`shell.nav_badge_${i.label}`} className={cn('rounded-full bg-brand-gradient text-white text-[10px] px-1.5 leading-4 font-semibold', collapsed && 'absolute -top-0.5 right-0.5 px-1 min-w-4 text-center')}>{i.badge}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>
      {user && (
        <div data-cmp="shell.user_div" title={collapsed ? `${user.name} · ${user.role}` : undefined} className={cn('h-14 border-t border-border flex items-center gap-2', collapsed ? 'justify-center px-0' : 'px-3')}>
          <Avatar cmp="shell.user_avatar" name={user.name} size="sm" />
          {!collapsed && <div data-cmp="shell.user_meta" className="flex flex-col min-w-0 leading-tight">
            <span dir="auto" data-cmp="shell.user_name" className="text-sm font-medium truncate">{user.name}</span>
            <span data-cmp="shell.user_role" className="text-[11px] text-fg-subtle capitalize">{user.role}</span>
          </div>}
        </div>
      )}
      <a data-cmp="shell.powered_by_link" href="https://looper.ing" target="_blank" rel="noopener noreferrer" title={versionTitle} className="h-7 px-3 flex items-center justify-center gap-1 text-[10px] text-fg-subtle hover:text-fg-muted border-t border-border/60 whitespace-nowrap">{collapsed ? <span data-cmp="shell.powered_by_brand" className="font-semibold">L</span> : <>Powered by <span data-cmp="shell.powered_by_brand" className="font-semibold">Looper.ing</span></>}</a>
    </aside>
  )
}
