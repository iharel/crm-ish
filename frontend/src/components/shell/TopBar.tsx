import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, LogOut, Moon, Search, Sun, Wifi, WifiOff, Plus, KeyRound } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import { socketService } from '../../services/socketService'
import { Button, cn } from '../ui'
import { NotificationsPopover } from './NotificationsPopover'

export interface TopBarProps { title: string; actions?: ReactNode; unreadNotifications: number; onNotificationsChanged: () => void; onQuickAdd: () => void }

/** TopBar — page title, global search, theme, notifications, account menu. */
export function TopBar({ title, actions, unreadNotifications, onNotificationsChanged, onQuickAdd }: TopBarProps) {
  const { theme, toggle } = useTheme()
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<'notif' | 'account' | null>(null)
  const [connected, setConnected] = useState(socketService.isConnected())
  useEffect(() => socketService.onStatus(setConnected), [])
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.querySelector<HTMLInputElement>('[data-cmp="shell.topbar_search_input"]')?.focus() } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [])

  return (
    <header data-cmp="shell.topbar_header" className="h-14 shrink-0 flex items-center gap-3 px-5 border-b border-border bg-surface/70 backdrop-blur-xl sticky top-0 z-30">
      <h1 data-cmp="shell.topbar_title" className="text-base font-semibold tracking-tight">{title}</h1>
      <form data-cmp="shell.topbar_search_form" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { nav(`/leads?q=${encodeURIComponent(q.trim())}`); setQ('') } }} className="ml-4 hidden md:flex items-center gap-2 h-9 w-80 px-3 rounded-lg border border-border bg-surface-2/60 text-fg-subtle text-sm focus-within:border-ring transition">
        <Search size={14} />
        <input data-cmp="shell.topbar_search_input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leads…" className="flex-1 bg-transparent outline-none text-fg placeholder:text-fg-subtle" />
        <kbd data-cmp="shell.topbar_search_kbd" className="font-mono text-[10px] border border-border rounded px-1 bg-surface">⌘K</kbd>
      </form>
      <div data-cmp="shell.topbar_spacer" className="flex-1" />
      <div data-cmp="shell.topbar_actions" className="flex items-center gap-2">{actions}</div>
      <span data-cmp="shell.topbar_ws" title={connected ? 'Realtime connected' : 'Realtime disconnected'} className={cn('hidden lg:inline-flex items-center gap-1 text-[11px]', connected ? 'text-success' : 'text-fg-subtle')}>{connected ? <Wifi size={12} /> : <WifiOff size={12} />}</span>
      <Button cmp="shell.topbar_quickadd_button" size="icon" variant="ghost" aria-label="New lead" onClick={onQuickAdd}><Plus size={16} /></Button>
      <Button cmp="shell.topbar_theme_button" size="icon" variant="ghost" aria-label="Toggle theme" onClick={toggle}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</Button>
      <div data-cmp="shell.topbar_notif_wrap" className="relative">
        <button data-cmp="shell.topbar_bell_button" aria-label="Notifications" onClick={() => setOpen(open === 'notif' ? null : 'notif')} className="relative h-9 w-9 inline-flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2">
          <Bell size={16} />
          {unreadNotifications > 0 && <span data-cmp="shell.topbar_bell_badge" className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-brand-gradient text-white text-[10px] font-semibold leading-4 text-center">{unreadNotifications}</span>}
        </button>
        {open === 'notif' && <NotificationsPopover onClose={() => setOpen(null)} onChanged={onNotificationsChanged} />}
      </div>
      <div data-cmp="shell.topbar_account_wrap" className="relative">
        <button data-cmp="shell.topbar_account_button" aria-label="Account" onClick={() => setOpen(open === 'account' ? null : 'account')} className="h-8 w-8 rounded-full bg-brand-gradient grid place-items-center text-white text-xs font-semibold">{user?.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</button>
        {open === 'account' && (
          <div data-cmp="shell.account_menu" className="absolute right-0 top-10 w-56 card shadow-elevated p-1 z-50 animate-fade-in">
            <div data-cmp="shell.account_menu_header" className="px-2 py-2 border-b border-border mb-1"><div dir="auto" data-cmp="shell.account_menu_name" className="text-sm font-medium truncate">{user?.name}</div><div data-cmp="shell.account_menu_email" className="text-xs text-fg-muted truncate">{user?.email}</div></div>
            <button data-cmp="shell.account_menu_settings" onClick={() => { setOpen(null); nav('/settings') }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-surface-2"><KeyRound size={14} /> Profile & password</button>
            <button data-cmp="shell.account_menu_logout" onClick={() => void logout()} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-surface-2 text-danger"><LogOut size={14} /> Sign out</button>
          </div>
        )}
      </div>
    </header>
  )
}
