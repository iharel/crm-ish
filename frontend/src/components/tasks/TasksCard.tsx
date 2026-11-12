import { useState } from 'react'
import { Plus } from 'lucide-react'
import { tasksApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { useSocketEvent } from '../../hooks/useSocketEvent'
import { Button, Card } from '../ui'
import { TaskList } from './TaskList'
import { TaskModal } from './TaskModal'
import type { Task } from '../../types'

export interface TasksCardProps { cmp: string; leadId?: string; leadName?: string | null; companyId?: string; companyName?: string | null }

/** TasksCard — the caller's open tasks for a lead or company, with a quick "add" button. */
export function TasksCard({ cmp, leadId, leadName, companyId, companyName }: TasksCardProps) {
  const toast = useToast()
  const [modal, setModal] = useState<null | { task?: Task }>(null)
  const tasks = useAsync(() => tasksApi.list({ status: 'open', leadId, companyId }), [leadId, companyId])
  useSocketEvent('task:updated', () => void tasks.reload(true))
  async function toggle(t: Task) { try { await tasksApi.update(t.id, { status: t.status === 'done' ? 'open' : 'done' }); void tasks.reload(true) } catch (e) { toast.error(errorMessage(e)) } }
  return (
    <Card cmp={cmp} title={`Open tasks${tasks.data ? ` (${tasks.data.length})`: ''}`} padded={false} actions={<Button cmp={`${cmp}.add_button`} size="sm" variant="ghost" icon={<Plus size={12} />} onClick={() => setModal({})}>Add</Button>}>
      <TaskList cmp={`${cmp}.list`} tasks={tasks.data ?? []} compact emptyText="No open tasks." onToggle={(t) => void toggle(t)} onEdit={(t) => setModal({ task: t })} />
      {modal && <TaskModal task={modal.task} leadId={leadId} leadName={leadName} companyId={companyId} companyName={companyName} onClose={() => setModal(null)} onSaved={() => { setModal(null); void tasks.reload(true) }} />}
    </Card>
  )
}
