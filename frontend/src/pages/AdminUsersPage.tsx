import { useState } from 'react'
import { Plus, Mail, KeyRound, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { usersApi } from '../api'
import { errorMessage } from '../api/apiError'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { Avatar, Badge, Button, Input, Modal, Select, Table, Toggle, type Column } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { timeAgo } from '../lib/format'
import type { User } from '../types'

/** AdminUsersPage — admin CRUD over team members. */
export default function AdminUsersPage() {
  const toast = useToast(); const { user: me } = useAuth()
  const { data, loading, error, reload } = useAsync(() => usersApi.list())
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; user: User } | { mode: 'reset'; user: User }>(null)
  const [f, setF] = useState({ name: '', email: '', role: 'member' as 'admin' | 'member', password: '', isActive: true })
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null)
  const open = (m: typeof modal) => { setErr(null); if (m?.mode === 'edit') setF({ name: m.user.name, email: m.user.email, role: m.user.role, password: '', isActive: m.user.isActive }); else setF({ name: '', email: '', role: 'member', password: genPassword(), isActive: true }); setModal(m) }
  async function save() {
    if (!modal) return; setBusy(true); setErr(null)
    try {
      if (modal.mode === 'create') await usersApi.create({ name: f.name, email: f.email, role: f.role, password: f.password })
      else if (modal.mode === 'edit') await usersApi.update(modal.user.id, { name: f.name, email: f.email, role: f.role, isActive: f.isActive })
      else await usersApi.resetPassword(modal.user.id, f.password)
      toast.success(modal.mode === 'create' ? `User created. Temporary password: ${f.password}` : modal.mode === 'edit' ? 'User updated' : `Password reset to: ${f.password}`); setModal(null); await reload(true)
    } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  async function remove(u: User) { if (!confirm(`Delete ${u.name}?`)) return; try { await usersApi.remove(u.id); toast.success('User deleted'); await reload(true) } catch (e) { toast.error(errorMessage(e)) } }
  const columns: Column<User>[] = [
    { key: 'user', header: 'User', render: (u) => <div data-cmp={`users.cell_${u.id}`} className="flex items-center gap-2"><Avatar cmp={`users.avatar_${u.id}`} name={u.name} size="sm" /><div data-cmp={`users.meta_${u.id}`}><div dir="auto" data-cmp={`users.name_${u.id}`} className="font-medium">{u.name}{u.id === me?.id && <span className="text-xs text-fg-subtle"> (you)</span>}</div><div data-cmp={`users.email_${u.id}`} className="text-xs text-fg-muted font-mono">{u.email}</div></div></div> },
    { key: 'role', header: 'Role', render: (u) => <Badge cmp={`users.role_${u.id}`} tone={u.role === 'admin' ? 'primary' : 'neutral'}>{u.role === 'admin' && <ShieldCheck size={10} />} {u.role}</Badge> },
    { key: 'gmail', header: 'Gmail', render: (u) => u.gmail ? <Badge cmp={`users.gmail_${u.id}`} tone={u.gmail.status === 'error' ? 'danger' : 'success'}><Mail size={10} /> {u.gmail.email}</Badge> : <span data-cmp={`users.gmail_${u.id}`} className="text-xs text-fg-subtle">Not connected</span> },
    { key: 'status', header: 'Status', render: (u) => <Badge cmp={`users.active_${u.id}`} tone={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Active' : 'Disabled'}</Badge> },
    { key: 'created', header: 'Created', render: (u) => <span data-cmp={`users.created_${u.id}`} className="text-xs text-fg-subtle">{timeAgo(u.createdAt)}</span> },
    { key: 'actions', header: '', render: (u) => <div data-cmp={`users.actions_${u.id}`} className="flex gap-1 justify-end"><Button cmp={`users.reset_${u.id}`} size="icon" variant="ghost" aria-label="Reset password" onClick={() => open({ mode: 'reset', user: u })}><KeyRound size={13} /></Button><Button cmp={`users.edit_${u.id}`} size="icon" variant="ghost" aria-label="Edit" onClick={() => open({ mode: 'edit', user: u })}><Pencil size={13} /></Button><Button cmp={`users.delete_${u.id}`} size="icon" variant="ghost" aria-label="Delete" disabled={u.id === me?.id} onClick={() => void remove(u)}><Trash2 size={13} /></Button></div> },
  ]
  return (
    <AppShell title="Users" actions={<Button cmp="users.add_button" size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => open({ mode: 'create' })}>Add user</Button>}>
      <div data-cmp="users.root_div" className="p-6 animate-fade-in">
        {loading && !data ? <PageState cmp="users" loading /> : error ? <PageState cmp="users" error={error} onRetry={() => void reload()} /> : <div data-cmp="users.table_card" className="card overflow-hidden"><Table cmp="users.table" columns={columns} rows={data ?? []} rowKey={(u) => u.id} /></div>}
      </div>
      {modal && (
        <Modal cmp="users.modal" title={modal.mode === 'create' ? 'Add user' : modal.mode === 'edit' ? 'Edit user' : `Reset password — ${modal.user.name}`} onClose={() => setModal(null)} footer={<><Button cmp="users.modal_cancel_button" onClick={() => setModal(null)}>Cancel</Button><Button cmp="users.modal_save_button" variant="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</Button></>}>
          {err && <p data-cmp="users.modal_error" className="text-xs text-danger">{err}</p>}
          {modal.mode !== 'reset' && <>
            <Input cmp="users.modal_name_input" label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
            <Input cmp="users.modal_email_input" label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <Select cmp="users.modal_role_select" label="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as 'admin' | 'member' })} options={[{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin' }]} />
          </>}
          {modal.mode !== 'edit' && <Input cmp="users.modal_password_input" label="Temporary password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} hint="Share it securely. The user must change it at first login." className="font-mono" />}
          {modal.mode === 'edit' && <div data-cmp="users.modal_active_row" className="flex items-center justify-between text-sm"><span>Active</span><Toggle cmp="users.modal_active_toggle" checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} /></div>}
        </Modal>
      )}
    </AppShell>
  )
}
function genPassword() { const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: 12 }, () => c[Math.floor(Math.random() * c.length)]).join('') }
