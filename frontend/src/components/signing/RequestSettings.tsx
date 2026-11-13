import type { SignRequest, SignRequestInput } from '../../types'
import { Input, Textarea, Toggle } from '../ui'

export interface RequestSettingsProps {
  cmp: string
  request: SignRequest
  /** More than one signer: the signing-order switch only matters then. */
  manySigners: boolean
  onChange: (patch: SignRequestInput) => void
}

const days = (v: string, fallback: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 1 ? Math.min(60, n) : fallback }

/** RequestSettings — the message to signers, signing order, the emailed-code check, reminders and the expiry date. */
export function RequestSettings({ cmp, request, manySigners, onChange }: RequestSettingsProps) {
  const reminders = !!request.remindAfterDays && (request.remindMax ?? 0) > 0
  return (
    <div data-cmp={cmp} className="flex flex-col gap-3">
      <Textarea key={`msg-${request.id}`} cmp={`${cmp}.message_textarea`} label="Message to signers (optional)" dir="auto" rows={3} maxLength={4000} defaultValue={request.message ?? ''} onBlur={(e) => { if (e.target.value !== (request.message ?? '')) onChange({ message: e.target.value }) }} />
      {manySigners && <Toggle cmp={`${cmp}.order_toggle`} checked={request.sequential} onChange={(v) => onChange({ sequential: v })} label="Sign in order (each person is invited after the one before signs)" />}
      <Toggle cmp={`${cmp}.code_toggle`} checked={request.requireCode} onChange={(v) => onChange({ requireCode: v })} label="Ask for a code sent to the signer's email before opening" />
      <Toggle cmp={`${cmp}.reminders_toggle`} checked={reminders} onChange={(v) => onChange(v ? { remindAfterDays: 3, remindEveryDays: 3, remindMax: 3 } : { remindAfterDays: null, remindEveryDays: null, remindMax: 0 })} label="Send reminders to people who have not signed" />
      {reminders && (
        <div data-cmp={`${cmp}.reminders_grid`} className="grid grid-cols-3 gap-2">
          <Input key={`a-${request.remindAfterDays}`} cmp={`${cmp}.remind_after_input`} label="First after (days)" type="number" min={1} max={60} defaultValue={request.remindAfterDays ?? 3} onBlur={(e) => onChange({ remindAfterDays: days(e.target.value, 3) })} />
          <Input key={`e-${request.remindEveryDays}`} cmp={`${cmp}.remind_every_input`} label="Then every (days)" type="number" min={1} max={60} defaultValue={request.remindEveryDays ?? 3} onBlur={(e) => onChange({ remindEveryDays: days(e.target.value, 3) })} />
          <Input key={`m-${request.remindMax}`} cmp={`${cmp}.remind_max_input`} label="At most (times)" type="number" min={1} max={10} defaultValue={request.remindMax ?? 3} onBlur={(e) => onChange({ remindMax: Math.min(10, days(e.target.value, 3)) })} />
        </div>
      )}
      <Input key={`x-${request.expiresAt}`} cmp={`${cmp}.expires_input`} label="Can be signed until (optional)" type="date" min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} defaultValue={request.expiresAt?.slice(0, 10) ?? ''} onChange={(e) => onChange({ expiresAt: e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null })} />
    </div>
  )
}
