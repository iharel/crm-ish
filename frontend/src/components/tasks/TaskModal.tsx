import { useEffect, useState } from 'react'
import { Sparkles, Loader2, RefreshCw, Mail, User, Building2 } from 'lucide-react'
import { tasksApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { Badge, Button, Input, Modal, Textarea } from '../ui'
import type { Task } from '../../types'

export interface TaskModalProps {
  task?: Task
  /** Links for a new task; the backend fills lead/company from the thread when omitted. */
  threadId?: string | null; threadSubject?: string | null
  leadId?: string | null; leadName?: string | null
  companyId?: string | null; companyName?: string | null
  onClose: () => void
  onSaved: (task: Task) => void
}

/** TaskModal — create or edit a task; when created from an email the title and summary are pre-filled by AI. */
export function TaskModal({ task, threadId, threadSubject, leadId, leadName, companyId, companyName, onClose, onSaved }: TaskModalProps) {
  const toast = useToast()
  const [title, setTitle] = useState(task?.title ?? '')
  const [summary, setSummary] = useState(task?.summary ?? '')
  const [dueAt, setDueAt] = useState(task?.dueAt ?? '')
  const [suggesting, setSuggesting] = useState(false)
  const [model, setModel] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tid = task?.threadId ?? threadId ?? null

  async function suggest() {
    if (!tid) return
    setSuggesting(true); setError(null)
    try { const s = await tasksApi.suggest(tid); setTitle(s.title); setSummary(s.summary); setModel(s.model) } catch (e) { setError(errorMessage(e)) } finally { setSuggesting(false) }
  }
  useEffect(() => { if (!task && tid) void suggest() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true); setError(null)
    try {
      const payload = { title: title.trim(), summary: summary.trim() || null, dueAt: dueAt || null }
      const saved = task ? await tasksApi.update(task.id, payload) : await tasksApi.create({ ...payload, threadId: tid, leadId: leadId ?? null, companyId: companyId ?? null })
      toast.success(task ? 'Task updated' : 'Task created'); onSaved(saved)
    } catch (e) { setError(errorMessage(e)) } finally { setSaving(false) }
  }
  const links = [
    (task?.threadId ?? threadId) && { icon: <Mail size={10} />, label: task?.threadSubject ?? threadSubject ?? 'Email thread', cmp: 'thread' },
    (task?.leadId ?? leadId) && { icon: <User size={10} />, label: task?.leadName ?? leadName ?? 'Lead', cmp: 'lead' },
    (task?.companyId ?? companyId) && { icon: <Building2 size={10} />, label: task?.companyName ?? companyName ?? 'Company', cmp: 'company' },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; cmp: string }[]

  return (
    <Modal cmp="taskmodal.modal" title={task ? 'Edit task' : 'New task'} onClose={onClose} footer={<><Button cmp="taskmodal.cancel_button" onClick={onClose}>Cancel</Button><Button cmp="taskmodal.save_button" variant="primary" disabled={saving || suggesting} onClick={() => void save()}>{saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}</Button></>}>
      {error && <p data-cmp="taskmodal.error_text" className="text-xs text-danger">{error}</p>}
      {!!links.length && <div data-cmp="taskmodal.links" className="flex flex-wrap gap-1.5">{links.map((l) => <Badge key={l.cmp} cmp={`taskmodal.link_${l.cmp}`}>{l.icon} <span dir="auto" className="truncate max-w-56">{l.label}</span></Badge>)}</div>}
      {tid && !task && (
        <div data-cmp="taskmodal.ai_row" className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs">
          <span data-cmp="taskmodal.ai_label" className="inline-flex items-center gap-1.5 text-fg-muted"><Sparkles size={12} className="text-accent" /> {suggesting ? 'Reading the email…' : model ? `Suggested by AI${model === 'stub' ? ' (stub — add an Anthropic key for better results)' : ''}` : 'AI suggestion'}</span>
          <Button cmp="taskmodal.regen_button" size="sm" variant="ghost" disabled={suggesting} icon={suggesting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} onClick={() => void suggest()}>Regenerate</Button>
        </div>
      )}
      <Input cmp="taskmodal.title_input" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={suggesting ? '…' : 'What needs to be done?'} autoFocus={!tid} />
      <Textarea cmp="taskmodal.summary_textarea" label="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Details: for whom, numbers, dates, constraints…" className="min-h-28" />
      <Input cmp="taskmodal.due_input" label="Due date" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-48" dir="ltr" />
    </Modal>
  )
}
