import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, CheckCircle2, ExternalLink, GripVertical, Plus, Trash2, Trophy, XCircle, KeyRound, Loader2, RefreshCw } from 'lucide-react'
import { authApi, emailsApi, googleApi, statusesApi } from '../api'
import { errorMessage } from '../api/apiError'
import { AppShell } from '../components/shell/AppShell'
import { SignatureCard } from '../components/settings/SignatureCard'
import { Badge, Button, Card, Input, Select, Tabs, Toggle, cn } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useSocketEvent } from '../hooks/useSocketEvent'
import { timeAgo } from '../lib/format'
import type { LeadStatus } from '../types'

const TZS = ['UTC', 'Asia/Jerusalem', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Singapore', 'Australia/Sydney']

/** SettingsPage — profile, email/calendar connection, email signature, pipeline statuses (admin), password. */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') ?? (params.get('google') ? 'email' : 'profile'))
  const { isAdmin } = useAuth()
  const tabs = [{ id: 'profile', label: 'Profile' }, { id: 'email', label: 'Email & calendar' }, { id: 'signature', label: 'Signature' }, ...(isAdmin ? [{ id: 'statuses', label: 'Lead statuses' }] : []), { id: 'password', label: 'Password' }]
  useEffect(() => { if (params.get('google')) { const p = new URLSearchParams(params); p.delete('google'); p.delete('reason'); setParams(p, { replace: true }) } }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AppShell title="Settings">
      <div data-cmp="settings.root_div" className="p-6 max-w-4xl space-y-5 animate-fade-in">
        <Tabs cmp="settings.tabs" active={tab} onChange={setTab} tabs={tabs} />
        {tab === 'profile' && <ProfileTab />}
        {tab === 'email' && <EmailTab googleResult={params.get('google')} reason={params.get('reason')} />}
        {tab === 'signature' && <SignatureCard />}
        {tab === 'statuses' && isAdmin && <StatusesTab />}
        {tab === 'password' && <PasswordTab />}
      </div>
    </AppShell>
  )
}

function ProfileTab() {
  const { user, refreshUser } = useAuth(); const toast = useToast()
  const [f, setF] = useState({ name: user?.name ?? '', schedulingLink: user?.schedulingLink ?? '', timezone: user?.timezone ?? 'UTC', workingHoursStart: user?.workingHoursStart ?? '09:00', workingHoursEnd: user?.workingHoursEnd ?? '17:00' })
  const [busy, setBusy] = useState(false)
  async function save() { setBusy(true); try { await authApi.updateProfile({ ...f, schedulingLink: f.schedulingLink || null }); await refreshUser(); toast.success('Profile saved') } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) } }
  return (
    <Card cmp="settings.profile_card" title="Profile & scheduling">
      <div data-cmp="settings.profile_form" className="grid md:grid-cols-2 gap-4">
        <Input cmp="settings.name_input" label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input cmp="settings.email_input" label="Email" value={user?.email ?? ''} disabled className="opacity-70" />
        <Input cmp="settings.link_input" label="Scheduling link" value={f.schedulingLink} onChange={(e) => setF({ ...f, schedulingLink: e.target.value })} placeholder="https://cal.com/you/30" hint="The AI includes this in replies when proposing a meeting." className="md:col-span-2" />
        <Select cmp="settings.tz_select" label="Timezone" value={f.timezone} onChange={(e) => setF({ ...f, timezone: e.target.value })} options={TZS.map((t) => ({ value: t, label: t }))} />
        <div data-cmp="settings.hours_row" className="grid grid-cols-2 gap-3"><Input cmp="settings.hours_from" label="Working hours from" type="time" value={f.workingHoursStart} onChange={(e) => setF({ ...f, workingHoursStart: e.target.value })} /><Input cmp="settings.hours_to" label="to" type="time" value={f.workingHoursEnd} onChange={(e) => setF({ ...f, workingHoursEnd: e.target.value })} /></div>
      </div>
      <div data-cmp="settings.profile_actions" className="mt-4 flex justify-end"><Button cmp="settings.profile_save_button" variant="primary" disabled={busy} onClick={() => void save()}>Save</Button></div>
    </Card>
  )
}

function EmailTab({ googleResult, reason }: { googleResult: string | null; reason: string | null }) {
  const toast = useToast(); const { refreshUser } = useAuth()
  const acc = useAsync(() => googleApi.account())
  const [busy, setBusy] = useState<string | null>(null)
  useSocketEvent('account:status', () => { void acc.reload(true); void refreshUser() })
  useEffect(() => { if (googleResult === 'connected') toast.success('Google account connected'); else if (googleResult === 'error') toast.error(`Google connection failed: ${reason ?? 'unknown'}`) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  async function connect() { setBusy('connect'); try { const { url } = await googleApi.connectUrl(); window.location.href = url } catch (e) { toast.error(errorMessage(e)); setBusy(null) } }
  async function disconnect() { if (!confirm('Disconnect Google? Synced emails stay in the CRM.')) return; try { await googleApi.disconnect(); await acc.reload(true); await refreshUser(); toast.success('Disconnected') } catch (e) { toast.error(errorMessage(e)) } }
  async function sync() { setBusy('sync'); try { const r = await emailsApi.sync(); toast.success(`Synced · ${r.imported} new messages`); await acc.reload(true) } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(null) } }
  const a = acc.data
  return (
    <Card cmp="settings.email_card" title={<span className="inline-flex items-center gap-2"><Mail size={14} /> Gmail & Google Calendar</span>} actions={a ? <Badge cmp="settings.email_status" tone={a.status === 'error' ? 'danger' : 'success'}><CheckCircle2 size={10} /> {a.status}</Badge> : <Badge cmp="settings.email_status" tone="neutral">Not connected</Badge>}>
      {a ? (
        <div data-cmp="settings.email_connected" className="flex flex-col gap-3 text-sm">
          <p data-cmp="settings.email_account">Connected as <span dir="auto" className="font-mono">{a.email}</span> · {a.lastSyncAt ? `last sync ${timeAgo(a.lastSyncAt)}` : 'not synced yet'}</p>
          {a.lastError && <p data-cmp="settings.email_error" className="text-xs text-danger rounded-lg border border-danger/30 bg-danger/10 px-3 py-2">{a.lastError}</p>}
          <p data-cmp="settings.email_help" className="text-xs text-fg-muted">Inbound mail from business senders is pulled every 2 minutes, linked to leads by email address, and an AI reply is drafted. Calendar availability is used to propose meeting slots.</p>
          <div data-cmp="settings.email_actions" className="flex gap-2"><Button cmp="settings.email_sync_button" size="sm" disabled={busy === 'sync'} icon={busy === 'sync' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} onClick={() => void sync()}>Sync now</Button><Button cmp="settings.email_reconnect_button" size="sm" variant="ghost" icon={<ExternalLink size={12} />} onClick={() => void connect()}>Reconnect</Button><Button cmp="settings.email_disconnect_button" size="sm" variant="danger" onClick={() => void disconnect()}>Disconnect</Button></div>
        </div>
      ) : (
        <div data-cmp="settings.email_disconnected" className="flex flex-col gap-3 text-sm">
          <p data-cmp="settings.email_intro" className="text-fg-muted">Connect your Google Workspace account to read and send email from the CRM and let the AI propose meeting times from your calendar. Your admin must configure the OAuth client first (Admin → Integrations).</p>
          <div><Button cmp="settings.email_connect_button" variant="primary" disabled={busy === 'connect'} icon={<ExternalLink size={13} />} onClick={() => void connect()}>{busy === 'connect' ? 'Redirecting…' : 'Connect Google account'}</Button></div>
        </div>
      )}
    </Card>
  )
}

function StatusesTab() {
  const toast = useToast()
  const { data, reload, setData } = useAsync(() => statusesApi.list())
  const [dragId, setDragId] = useState<string | null>(null)
  const [adding, setAdding] = useState({ name: '', color: '#2563eb' })
  const list = data ?? []
  const patch = async (s: LeadStatus, d: Partial<{ name: string; color: string; isWon: boolean; isLost: boolean; isDefault: boolean }>) => { try { await statusesApi.update(s.id, d); await reload(true) } catch (e) { toast.error(errorMessage(e)) } }
  async function add() { if (!adding.name.trim()) return; try { await statusesApi.create({ name: adding.name.trim(), color: adding.color }); setAdding({ name: '', color: '#2563eb' }); await reload(true) } catch (e) { toast.error(errorMessage(e)) } }
  async function remove(s: LeadStatus) {
    const others = list.filter((x) => x.id !== s.id); if (!others.length) { toast.error('Keep at least one status'); return }
    const target = s.leadCount ? prompt(`Move ${s.leadCount} lead(s) to which status? Type the exact name:\n${others.map((o) => o.name).join(', ')}`) : null
    const to = target ? others.find((o) => o.name.toLowerCase() === target.toLowerCase()) : undefined
    if (s.leadCount && !to) { toast.error('Unknown target status'); return }
    try { await statusesApi.remove(s.id, to?.id); await reload(true) } catch (e) { toast.error(errorMessage(e)) }
  }
  async function drop(targetId: string) {
    if (!dragId || dragId === targetId) return
    const ids = list.map((s) => s.id); const from = ids.indexOf(dragId); const to = ids.indexOf(targetId); ids.splice(from, 1); ids.splice(to, 0, dragId)
    setData(ids.map((id) => list.find((s) => s.id === id)!)); setDragId(null)
    try { await statusesApi.reorder(ids) } catch (e) { toast.error(errorMessage(e)); void reload(true) }
  }
  return (
    <Card cmp="settings.statuses_card" title="Pipeline stages" padded={false}>
      <ul data-cmp="settings.statuses_list" className="divide-y divide-border">
        {list.map((s) => (
          <li key={s.id} data-cmp={`settings.status_row_${s.id}`} draggable onDragStart={() => setDragId(s.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => void drop(s.id)} className={cn('px-4 py-3 flex items-center gap-3 flex-wrap', dragId === s.id && 'opacity-50')}>
            <GripVertical data-cmp={`settings.status_grip_${s.id}`} size={14} className="text-fg-subtle cursor-grab" />
            <input data-cmp={`settings.status_color_${s.id}`} type="color" defaultValue={s.color} onBlur={(e) => e.target.value !== s.color && void patch(s, { color: e.target.value })} className="h-7 w-7 rounded border border-border bg-transparent cursor-pointer" />
            <Input cmp={`settings.status_name_${s.id}`} defaultValue={s.name} onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && void patch(s, { name: e.target.value.trim() })} className="w-52" />
            <Badge cmp={`settings.status_preview_${s.id}`} color={s.color}>{s.name}</Badge>
            <span data-cmp={`settings.status_count_${s.id}`} className="text-xs text-fg-subtle font-mono">{s.leadCount ?? 0} leads</span>
            <span data-cmp={`settings.status_spacer_${s.id}`} className="flex-1" />
            <label data-cmp={`settings.status_default_label_${s.id}`} className="inline-flex items-center gap-1.5 text-xs text-fg-muted" title="Default for new leads"><input data-cmp={`settings.status_default_${s.id}`} type="radio" name="default-status" checked={s.isDefault} onChange={() => void patch(s, { isDefault: true })} /> default</label>
            <label data-cmp={`settings.status_won_label_${s.id}`} className="inline-flex items-center gap-1.5 text-xs text-fg-muted" title="Counts as won"><Trophy size={12} /><Toggle cmp={`settings.status_won_${s.id}`} checked={s.isWon} onChange={(v) => void patch(s, { isWon: v })} /></label>
            <label data-cmp={`settings.status_lost_label_${s.id}`} className="inline-flex items-center gap-1.5 text-xs text-fg-muted" title="Counts as lost"><XCircle size={12} /><Toggle cmp={`settings.status_lost_${s.id}`} checked={s.isLost} onChange={(v) => void patch(s, { isLost: v })} /></label>
            <Button cmp={`settings.status_delete_${s.id}`} size="icon" variant="ghost" aria-label="Delete" onClick={() => void remove(s)}><Trash2 size={13} /></Button>
          </li>
        ))}
      </ul>
      <div data-cmp="settings.statuses_add" className="px-4 py-3 border-t border-border flex items-center gap-3">
        <input data-cmp="settings.add_color" type="color" value={adding.color} onChange={(e) => setAdding({ ...adding, color: e.target.value })} className="h-7 w-7 rounded border border-border bg-transparent cursor-pointer" />
        <Input cmp="settings.add_name" placeholder="New status name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} className="w-52" />
        <Button cmp="settings.add_button" size="sm" variant="primary" icon={<Plus size={12} />} onClick={() => void add()}>Add status</Button>
        <span data-cmp="settings.statuses_hint" className="ml-auto text-xs text-fg-muted">Drag to reorder. Won/Lost flags drive win-rate metrics.</span>
      </div>
    </Card>
  )
}

function PasswordTab() {
  const toast = useToast(); const { user, refreshUser } = useAuth()
  const [f, setF] = useState({ current: '', next: '', confirm: '' }); const [busy, setBusy] = useState(false)
  async function save() {
    if (f.next.length < 8) { toast.error('New password must be at least 8 characters'); return }
    if (f.next !== f.confirm) { toast.error('Passwords do not match'); return }
    setBusy(true); try { await authApi.changePassword(f.current, f.next); setF({ current: '', next: '', confirm: '' }); await refreshUser(); toast.success('Password changed') } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <Card cmp="settings.password_card" title={<span className="inline-flex items-center gap-2"><KeyRound size={14} /> Change password</span>}>
      {user?.mustChangePassword && <p data-cmp="settings.password_must" className="mb-3 text-xs text-warning rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">You are using a temporary password. Please set a new one.</p>}
      <div data-cmp="settings.password_form" className="grid md:grid-cols-3 gap-4">
        <Input cmp="settings.password_current" label="Current password" type="password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} />
        <Input cmp="settings.password_new" label="New password" type="password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} />
        <Input cmp="settings.password_confirm" label="Confirm" type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
      </div>
      <div data-cmp="settings.password_actions" className="mt-4 flex justify-end"><Button cmp="settings.password_save_button" variant="primary" disabled={busy} onClick={() => void save()}>Update password</Button></div>
    </Card>
  )
}
