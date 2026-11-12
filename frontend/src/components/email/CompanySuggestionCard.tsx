import { useState } from 'react'
import { Building2, Check, Loader2, Search } from 'lucide-react'
import { Button } from '../ui'
import type { CompanySuggestion } from '../../types'

export interface CompanySuggestionCardProps {
  cmp: string
  suggestion: CompanySuggestion
  /** What is being linked, for the copy: "this thread" / "this lead". */
  subject: string
  onAccept: () => Promise<void>
  onChooseOther?: () => void
}

/** CompanySuggestionCard — "Looks like <company>" box with one-click link and an escape hatch to pick another company. */
export function CompanySuggestionCard({ cmp, suggestion, subject, onAccept, onChooseOther }: CompanySuggestionCardProps) {
  const [busy, setBusy] = useState(false)
  return (
    <div data-cmp={cmp} className="border-b border-dashed border-primary/40 bg-primary/5 p-3 flex flex-col gap-2 text-sm">
      <div data-cmp={`${cmp}.head_div`} className="flex items-start gap-2.5">
        <span data-cmp={`${cmp}.icon_span`} className="h-8 w-8 shrink-0 rounded-lg bg-primary/15 text-primary grid place-items-center"><Building2 size={14} /></span>
        <div data-cmp={`${cmp}.meta_div`} className="min-w-0 flex-1">
          <p data-cmp={`${cmp}.title_text`} className="font-medium leading-tight">Looks like <span dir="auto">{suggestion.name}</span></p>
          <p data-cmp={`${cmp}.hint_text`} className="text-xs text-fg-muted">{suggestion.domain ? <>Email domain matches <span className="font-mono">{suggestion.domain}</span>.</> : 'Email domain matches this company.'} Link {subject}?</p>
        </div>
      </div>
      <div data-cmp={`${cmp}.actions_div`} className="flex items-center gap-2">
        <Button cmp={`${cmp}.accept_button`} size="sm" variant="primary" disabled={busy} icon={busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} onClick={() => { setBusy(true); void onAccept().finally(() => setBusy(false)) }}>Link to {suggestion.name}</Button>
        {onChooseOther && <Button cmp={`${cmp}.other_button`} size="sm" variant="ghost" icon={<Search size={12} />} onClick={onChooseOther}>Choose another</Button>}
      </div>
    </div>
  )
}
