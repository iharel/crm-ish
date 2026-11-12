import { Plus, Mail, Calendar, KeyRound, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { AppShell } from '../AppShell'
import { Avatar, Badge, Button, Input, Modal, Select, Table, Toggle, type Column } from '../../components/ui'
import { users, type MockUser } from '../data'

/** AdminUsersMockup — admin CRUD over team members. */
export default function AdminUsersMockup() {
  const columns: Column<MockUser>[] = [
    { key: 'user', header: 'User', render: (u) => <div data-cmp={`users.cell_${u.id}`} className="flex items-center gap-2"><Avatar cmp={`users.avatar_${u.id}`} name={u.name} size="sm" /><div data-cmp={`users.meta_${u.id}`}><div data-cmp={`users.name_${u.id}`} className="font-medium">{u.name}</div><div data-cmp={`users.email_${u.id}`} className="text-xs text-fg-muted font-mono">{u.email}</div></div></div> },
    { key: 'role', header: 'Role', render: (u) => <Badge cmp={`users.role_${u.id}`} tone={u.role === 'admin' ? 'primary' : 'neutral'}>{u.role === 'admin' && <ShieldCheck size={10} />} {u.role}</Badge> },
    { key: 'gmail', header: 'Gmail', render: (u) => u.gmail ? <Badge cmp={`users.gmail_${u.id}`} tone="success"><Mail size={10} /> Connected</Badge> : <span data-cmp={`users.gmail_${u.id}`} className="text-xs text-fg-subtle">Not connected</span> },
    { key: 'calendar', header: 'Calendar', render: (u) => u.calendar ? <Badge cmp={`users.calendar_${u.id}`} tone="success"><Calendar size={10} /> Connected</Badge> : <span data-cmp={`users.calendar_${u.id}`} className="text-xs text-fg-subtle">—</span> },
    { key: 'status', header: 'Status', render: (u) => <Badge cmp={`users.active_${u.id}`} tone={u.active ? 'success' : 'danger'}>{u.active ? 'Active' : 'Disabled'}</Badge> },
    { key: 'actions', header: '', render: (u) => <div data-cmp={`users.actions_${u.id}`} className="flex gap-1 justify-end"><Button cmp={`users.reset_${u.id}`} size="icon" variant="ghost" aria-label="Reset password"><KeyRound size={13} /></Button><Button cmp={`users.edit_${u.id}`} size="icon" variant="ghost" aria-label="Edit"><Pencil size={13} /></Button><Button cmp={`users.delete_${u.id}`} size="icon" variant="ghost" aria-label="Delete"><Trash2 size={13} /></Button></div> },
  ]
  return (
    <MockupFrame name="admin-users" title="Admin — Users">
      <AppShell active="users" title="Users" actions={<Button cmp="users.add_button" size="sm" variant="primary" icon={<Plus size={13} />}>Invite user</Button>}>
        <div data-cmp="users.root_div" className="p-5 grid xl:grid-cols-[1fr_420px] gap-4">
          <div data-cmp="users.table_card" className="card overflow-hidden self-start"><Table cmp="users.table" columns={columns} rows={users} rowKey={(u) => u.id} /></div>
          <Modal cmp="users.modal" inline title="Invite user" footer={<><Button cmp="users.modal_cancel_button">Cancel</Button><Button cmp="users.modal_save_button" variant="primary">Create & send invite</Button></>}>
            <Input cmp="users.modal_name_input" label="Full name" placeholder="Noa Katz" />
            <Input cmp="users.modal_email_input" label="Email" type="email" placeholder="noa@acme-demo.example" />
            <Select cmp="users.modal_role_select" label="Role" options={[{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin' }]} />
            <Input cmp="users.modal_password_input" label="Temporary password" type="text" defaultValue="Wq7!pz-temp" hint="User must change it at first login." />
            <div data-cmp="users.modal_active_row" className="flex items-center justify-between text-sm"><span>Active</span><Toggle cmp="users.modal_active_toggle" checked /></div>
          </Modal>
        </div>
      </AppShell>
    </MockupFrame>
  )
}
