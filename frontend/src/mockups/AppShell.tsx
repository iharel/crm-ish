import { ResizeHandle } from '../components/common/ResizeHandle'
import type { ReactNode } from 'react'
import { Bell, Building2, Calendar, LayoutDashboard, Inbox, BookOpen, Search, Settings, Users, Plug, Kanban, Plus } from 'lucide-react'
import { Avatar, Button, cn } from '../components/ui'

export type NavKey = 'dashboard' | 'leads' | 'companies' | 'inbox' | 'knowledge' | 'calendar' | 'users' | 'integrations' | 'settings'

export interface AppShellProps {
  active: NavKey
  title: string
  /** Right-side toolbar actions for the page header. */
  actions?: ReactNode
  children: ReactNode
  unread?: number
}

const nav: Array<{ key: NavKey; label: string; icon: ReactNode; section?: string; badge?: number }> = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { key: 'leads', label: 'Leads', icon: <Kanban size={16} /> },
  { key: 'companies', label: 'Companies', icon: <Building2 size={16} /> },
  { key: 'inbox', label: 'Inbox', icon: <Inbox size={16} />, badge: 2 },
  { key: 'knowledge', label: 'Knowledge', icon: <BookOpen size={16} /> },
  { key: 'calendar', label: 'Calendar', icon: <Calendar size={16} /> },
  { key: 'users', label: 'Users', icon: <Users size={16} />, section: 'Admin' },
  { key: 'integrations', label: 'Integrations', icon: <Plug size={16} /> },
  { key: 'settings', label: 'Settings', icon: <Settings size={16} /> },
]

/** AppShell — sidebar + top bar layout used by every authenticated screen. */
export function AppShell({ active, title, actions, children, unread = 3 }: AppShellProps) {
  return (
    <div data-cmp="shell.root_div" className="h-full w-full flex bg-bg">
      <aside data-cmp="shell.sidebar_aside" className="w-56 shrink-0 h-full flex flex-col border-r border-border bg-surface">
        <div data-cmp="shell.brand_div" className="h-14 flex items-center gap-2 px-4 border-b border-border">
          <span data-cmp="shell.brand_logo" className="h-7 w-7 rounded-lg bg-primary text-on-primary inline-flex items-center justify-center font-bold text-sm">L</span>
          <span data-cmp="shell.brand_text" className="font-semibold tracking-tight">Looper CRM</span>
        </div>
        <nav data-cmp="shell.nav" className="flex-1 overflow-auto py-3 px-2 flex flex-col gap-0.5">
          {nav.map((n) => (
            <div key={n.key} data-cmp={`shell.nav.${n.key}_wrap`}>
              {n.section && <div data-cmp={`shell.nav.${n.key}_section`} className="px-2 pt-4 pb-1 text-[10px] uppercase tracking-wider text-fg-subtle">{n.section}</div>}
              <a
                data-cmp={`shell.nav.${n.key}_link`}
                aria-current={active === n.key ? 'page' : undefined}
                className={cn('flex items-center gap-2.5 h-9 px-2.5 rounded-[var(--radius)] text-sm transition-colors', active === n.key ? 'bg-primary/10 text-primary font-medium' : 'text-fg-muted hover:text-fg hover:bg-surface-2')}
              >
                {n.icon}
                <span data-cmp={`shell.nav.${n.key}_label`} className="flex-1">{n.label}</span>
                {n.badge && <span data-cmp={`shell.nav.${n.key}_badge`} className="rounded-full bg-primary text-on-primary text-[10px] px-1.5 leading-4 font-semibold">{n.badge}</span>}
              </a>
            </div>
          ))}
        </nav>
        <div data-cmp="shell.user_div" className="h-14 border-t border-border flex items-center gap-2 px-3">
          <Avatar cmp="shell.user_avatar" name="Alex Morgan" size="sm" />
          <div data-cmp="shell.user_meta" className="flex flex-col min-w-0 leading-tight">
            <span data-cmp="shell.user_name" className="text-sm font-medium truncate">Alex Morgan</span>
            <span data-cmp="shell.user_role" className="text-[11px] text-fg-subtle">Admin</span>
          </div>
        </div>
      </aside>
      <ResizeHandle cmp="shell.nav_handle" panelSide="left" label="navigation" collapsed={false} onToggle={() => undefined} />
      <div data-cmp="shell.main_div" className="flex-1 min-w-0 h-full flex flex-col">
        <header data-cmp="shell.topbar_header" className="h-14 shrink-0 flex items-center gap-3 px-5 border-b border-border bg-surface">
          <h1 data-cmp="shell.topbar_title" className="text-base font-semibold tracking-tight">{title}</h1>
          <div data-cmp="shell.topbar_search" className="ml-6 hidden md:flex items-center gap-2 h-8 w-72 px-3 rounded-[var(--radius)] border border-border bg-surface-2 text-fg-subtle text-sm">
            <Search size={14} /><span data-cmp="shell.topbar_search_text" className="flex-1">Search leads, companies, emails…</span><kbd data-cmp="shell.topbar_search_kbd" className="font-mono text-[10px] border border-border rounded px-1">⌘K</kbd>
          </div>
          <div data-cmp="shell.topbar_spacer" className="flex-1" />
          <div data-cmp="shell.topbar_actions" className="flex items-center gap-2">{actions}</div>
          <Button cmp="shell.topbar_quickadd_button" size="icon" variant="ghost" aria-label="Quick add"><Plus size={16} /></Button>
          <button data-cmp="shell.topbar_bell_button" aria-label="Notifications" className="relative h-9 w-9 inline-flex items-center justify-center rounded-[var(--radius)] text-fg-muted hover:text-fg hover:bg-surface-2">
            <Bell size={16} />
            {unread > 0 && <span data-cmp="shell.topbar_bell_badge" className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-danger text-white text-[10px] font-semibold leading-4 text-center">{unread}</span>}
          </button>
        </header>
        <main data-cmp="shell.content_main" className="flex-1 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
