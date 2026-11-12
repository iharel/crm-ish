import { useEffect, useState } from 'react'
import { Calendar, Loader2, Video } from 'lucide-react'
import { calendarApi } from '../../api'
import { errorMessage } from '../../api/apiError'
import { useToast } from '../../contexts/ToastContext'
import { Button, Input, Modal, Toggle, cn } from '../ui'
import type { Slot } from '../../types'

/** MeetingModal — book a Google Calendar meeting from proposed slots or a custom time. */
export function MeetingModal({ leadId, leadName, onClose, onBooked }: { leadId: string | null; leadName?: string; onClose: () => void; onBooked: () => void }) {
  const toast = useToast()
  const [slots, setSlots] = useState<Slot[]>([])
  const [picked, setPicked] = useState<Slot | null>(null)
  const [title, setTitle] = useState(leadName ? `Call with ${leadName}` : 'Call')
  const [custom, setCustom] = useState('')
  const [meet, setMeet] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { calendarApi.slots(4).then(setSlots).catch((e) => setError(errorMessage(e))) }, [])
  async function book() {
    const start = picked?.start ?? (custom ? new Date(custom).toISOString() : null)
    if (!start) { setError('Pick a slot or a time'); return }
    const end = picked?.end ?? new Date(new Date(start).getTime() + 30 * 60000).toISOString()
    setBusy(true); setError(null)
    try { await calendarApi.create({ leadId, title, start, end, meet }); toast.success('Meeting booked'); onBooked() } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <Modal cmp="meeting.modal" title="Book a meeting" onClose={onClose} footer={<><Button cmp="meeting.cancel_button" onClick={onClose}>Cancel</Button><Button cmp="meeting.book_button" variant="primary" disabled={busy} icon={busy ? <Loader2 size={13} className="animate-spin" /> : <Calendar size={13} />} onClick={() => void book()}>Book</Button></>}>
      {error && <p data-cmp="meeting.error_text" className="text-xs text-danger">{error}</p>}
      <Input cmp="meeting.title_input" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div data-cmp="meeting.slots"><p data-cmp="meeting.slots_label" className="text-sm font-medium mb-1.5">Suggested slots (from your calendar)</p>
        <div data-cmp="meeting.slots_list" className="flex flex-wrap gap-2">{slots.map((s) => <button key={s.start} data-cmp={`meeting.slot_${s.start}`} onClick={() => { setPicked(s); setCustom('') }} className={cn('h-8 px-3 rounded-lg border text-xs transition', picked?.start === s.start ? 'bg-primary/12 border-primary text-primary' : 'border-border hover:bg-surface-2')}>{s.label}</button>)}{!slots.length && <span data-cmp="meeting.slots_empty" className="text-xs text-fg-muted">No slots available (connect Google Calendar in Settings).</span>}</div></div>
      <Input cmp="meeting.custom_input" label="Or pick a custom time" type="datetime-local" value={custom} onChange={(e) => { setCustom(e.target.value); setPicked(null) }} />
      <div data-cmp="meeting.meet_row" className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-2"><Video size={14} className="text-fg-muted" /> Add Google Meet link</span><Toggle cmp="meeting.meet_toggle" checked={meet} onChange={setMeet} /></div>
    </Modal>
  )
}
