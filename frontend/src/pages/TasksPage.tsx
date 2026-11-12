import { useState } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import { tasksApi } from '../api'
import { errorMessage } from '../api/apiError'
import { AppShell } from '../components/shell/AppShell'
import { PageState } from '../components/common/PageState'
import { TaskList } from '../components/tasks/TaskList'
import { TaskModal } from '../components/tasks/TaskModal'
import { Button, Card, Tabs } from '../components/ui'
import { useToast } from '../contexts/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { useSocketEvent } from '../hooks/useSocketEvent'
import type { Task } from '../types'

/** TasksPage — the user's own tasks (created from emails or by hand), with links to the thread, lead and company. */
export default function TasksPage() {
  const toast = useToast()
  const [status, setStatus] = useState<'open' | 'done' | 'all'>('open')
  const [modal, setModal] = useState<null | { task?: Task }>(null)
  const tasks = useAsync(() => tasksApi.list({ status }), [status])
  useSocketEvent('task:updated', () => void tasks.reload(true))

  async function toggle(t: Task) {
    const next = t.status === 'done' ? 'open' : 'done'
    tasks.setData((d) => d?.map((x) => (x.id === t.id ? { ...x, status: next } : x)) ?? d)
    try { await tasksApi.update(t.id, { status: next }); void tasks.reload(true) } catch (e) { toast.error(errorMessage(e)); void tasks.reload(true) }
  }
  async function remove(t: Task) { if (!confirm(`Delete task "${t.title}"?`)) return; try { await tasksApi.remove(t.id); tasks.setData((d) => d?.filter((x) => x.id !== t.id) ?? d) } catch (e) { toast.error(errorMessage(e)) } }
  const open = tasks.data?.filter((t) => t.status === 'open').length ?? 0

  return (
    <AppShell title="Tasks" actions={<Button cmp="tasks.new_button" size="sm" variant="primary" icon={<Plus size={13} />} onClick={() => setModal({})}>New task</Button>}>
      <div data-cmp="tasks.root_div" className="p-6 flex flex-col gap-4 animate-fade-in max-w-4xl">
        <div data-cmp="tasks.toolbar" className="flex items-center gap-3">
          <Tabs cmp="tasks.tabs" active={status} onChange={(v) => setStatus(v as typeof status)} tabs={[{ id: 'open', label: 'Open' }, { id: 'done', label: 'Done' }, { id: 'all', label: 'All' }]} />
          <span data-cmp="tasks.count" className="text-xs text-fg-subtle ml-auto">{status === 'open' ? `${open} open` : `${tasks.data?.length ?? 0} tasks`}</span>
        </div>
        <Card cmp="tasks.list_card" padded={false}>
          {tasks.loading && !tasks.data ? <PageState cmp="tasks" loading /> : tasks.error ? <PageState cmp="tasks" error={tasks.error} onRetry={() => void tasks.reload()} /> : (
            <TaskList cmp="tasks.list" tasks={tasks.data ?? []} emptyText={status === 'open' ? 'Nothing to do. Right-click an email → Create task to add one.' : 'No tasks here.'} onToggle={(t) => void toggle(t)} onEdit={(t) => setModal({ task: t })} onDelete={(t) => void remove(t)} />
          )}
        </Card>
        <p data-cmp="tasks.hint" className="text-xs text-fg-subtle inline-flex items-center gap-1.5"><CheckSquare size={12} /> Tasks are private to you for now.</p>
      </div>
      {modal && <TaskModal task={modal.task} onClose={() => setModal(null)} onSaved={() => { setModal(null); void tasks.reload(true) }} />}
    </AppShell>
  )
}
