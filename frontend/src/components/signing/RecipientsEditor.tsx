import { useState } from 'react'
import { Building2, Plus, Trash2, UserRound, Users } from 'lucide-react'
import { signingApi } from '../../api'
import { EMAIL_RE, signerColor } from '../../lib/signing'
import { useAsync } from '../../hooks/useAsync'
import type { SignRecipientInput, SignSuggestion } from '../../types'
import { Select, cn } from '../ui'

export interface RecipientsEditorProps {
  cmp: string
  recipients: SignRecipientInput[]
  companyId: string | null
  /** Templates may hold a role name with no email yet. */
  allowEmptyEmail?: boolean
  /** Which signer new fields are placed for. */
  activeId: string | null
  onActive: (id: string) => void
  /** Called with the full list whenever it should be saved. */
  onChange: (list: SignRecipientInput[]) => void
}

const SOURCE_ICON = { company: Building2, team: Users, contact: UserRound } as const

/**
 * RecipientsEditor — who signs and who only gets a copy. People are added from suggestions (the company's contacts,
 * teammates, any other contact) or by typing any email address.
 */
export function RecipientsEditor({ cmp, recipients, companyId, allowEmptyEmail, activeId, onActive, onChange }: RecipientsEditorProps) {
  const [draft, setDraft] = useState<Record<number, Partial<SignRecipientInput>>>({})
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const suggestions = useAsync(() => signingApi.suggestions({ companyId, q: query.trim() || undefined }), [companyId, query])
  const taken = new Set(recipients.map((r) => r.email.toLowerCase()))
  const options = (suggestions.data ?? []).filter((s) => !taken.has(s.email.toLowerCase())).slice(0, 8)
  const typedEmail = EMAIL_RE.test(query.trim()) && !taken.has(query.trim().toLowerCase()) ? query.trim() : null
  /** Position among the signers (copy recipients have none): picks the colour. */
  const signerOrder = new Map(recipients.filter((r) => r.role === 'signer').map((r, i) => [r, i]))

  function add(s: Pick<SignSuggestion, 'name' | 'email'> & Partial<SignSuggestion>) {
    onChange([...recipients, { role: 'signer', name: s.name || s.email.split('@')[0], email: s.email, leadId: s.leadId ?? null, userId: s.userId ?? null }])
    setQuery(''); setOpen(false)
  }
  /** Save a row's typed name/email once the row is valid; otherwise keep it as a local draft with the error shown. */
  function commit(i: number) {
    const d = draft[i]; if (!d) return
    const next = { ...recipients[i], ...d }
    const emailOk = EMAIL_RE.test(next.email.trim()) || (!!allowEmptyEmail && !next.email.trim())
    if (!next.name.trim() || !emailOk) return
    setDraft((x) => { const c = { ...x }; delete c[i]; return c })
    onChange(recipients.map((r, j) => (j === i ? { ...next, name: next.name.trim(), email: next.email.trim() } : r)))
  }
  return (
    <div data-cmp={cmp} className="flex flex-col gap-2">
      {recipients.map((r, i) => {
        const row = { ...r, ...draft[i] }
        const isSigner = r.role === 'signer'
        const color = isSigner ? signerColor(signerOrder.get(r) ?? 0) : 'var(--border-strong)'
        const badEmail = !!row.email.trim() && !EMAIL_RE.test(row.email.trim())
        return (
          <div key={r.id ?? `new-${i}`} data-cmp={`${cmp}.row_${i}`} data-active={(isSigner && r.id === activeId) || undefined} onClick={() => { if (isSigner && r.id) onActive(r.id) }} className={cn('rounded-[var(--radius)] border p-2 flex flex-col gap-1.5 transition-colors', isSigner && r.id === activeId ? 'border-primary bg-primary/5' : 'border-border bg-surface', isSigner && 'cursor-pointer')}>
            <div data-cmp={`${cmp}.row_top_${i}`} className="flex items-center gap-2">
              <span data-cmp={`${cmp}.color_${i}`} style={{ backgroundColor: color }} className="h-2.5 w-2.5 rounded-full shrink-0" />
              <input data-cmp={`${cmp}.name_input_${i}`} dir="auto" value={row.name} placeholder="Name" onChange={(e) => setDraft((x) => ({ ...x, [i]: { ...x[i], name: e.target.value } }))} onBlur={() => commit(i)} className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none" />
              <button type="button" data-cmp={`${cmp}.remove_button_${i}`} title="Remove" onClick={(e) => { e.stopPropagation(); onChange(recipients.filter((_, j) => j !== i)) }} className="text-fg-subtle hover:text-danger"><Trash2 size={13} /></button>
            </div>
            <div data-cmp={`${cmp}.row_bottom_${i}`} className="flex items-center gap-2">
              <input data-cmp={`${cmp}.email_input_${i}`} value={row.email} placeholder={allowEmptyEmail ? 'Email (filled in when used)' : 'Email'} onChange={(e) => setDraft((x) => ({ ...x, [i]: { ...x[i], email: e.target.value } }))} onBlur={() => commit(i)} className={cn('flex-1 min-w-0 bg-transparent text-xs font-mono outline-none', badEmail ? 'text-danger' : 'text-fg-muted')} />
              <Select cmp={`${cmp}.role_select_${i}`} value={r.role} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange(recipients.map((x, j) => (j === i ? { ...x, role: e.target.value as 'signer' | 'copy' } : x)))} options={[{ value: 'signer', label: 'Signs' }, { value: 'copy', label: 'Gets a copy' }]} className="h-7 text-xs w-28" />
            </div>
            {badEmail && <p data-cmp={`${cmp}.email_error_${i}`} className="text-[11px] text-danger">Not a valid email address — not saved yet.</p>}
          </div>
        )
      })}
      <div data-cmp={`${cmp}.add_wrap`} className="relative">
        <div data-cmp={`${cmp}.add_field`} className="flex items-center gap-2 h-9 px-2.5 rounded-[var(--radius)] border border-dashed border-border-strong bg-surface text-sm">
          <Plus size={13} className="text-fg-subtle shrink-0" />
          <input data-cmp={`${cmp}.add_input`} value={query} placeholder="Add a person or type an email" onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => { setQuery(e.target.value); setOpen(true) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (typedEmail) add({ name: '', email: typedEmail }); else if (options[0]) add(options[0]) } }} className="flex-1 min-w-0 bg-transparent outline-none" />
        </div>
        {open && (options.length > 0 || typedEmail) && (
          <ul data-cmp={`${cmp}.suggestions_list`} className="absolute z-50 left-0 right-0 mt-1 card shadow-elevated py-1 max-h-64 overflow-y-auto">
            {typedEmail && <li data-cmp={`${cmp}.suggestion_typed`}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add({ name: '', email: typedEmail })} className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-2">Add <span className="font-mono">{typedEmail}</span></button></li>}
            {options.map((s) => { const Icon = SOURCE_ICON[s.source]; return (
              <li key={s.email} data-cmp={`${cmp}.suggestion_${s.email}`}>
                <button type="button" data-cmp={`${cmp}.suggestion_button_${s.email}`} onMouseDown={(e) => e.preventDefault()} onClick={() => add(s)} className="w-full text-left px-3 py-1.5 hover:bg-surface-2 flex items-center gap-2">
                  <Icon size={13} className="text-fg-subtle shrink-0" />
                  <span data-cmp={`${cmp}.suggestion_text_${s.email}`} className="min-w-0 flex-1"><span dir="auto" className="block text-sm truncate">{s.name}</span><span className="block text-[11px] text-fg-muted font-mono truncate">{s.email}</span></span>
                  <span data-cmp={`${cmp}.suggestion_source_${s.email}`} className="text-[10px] uppercase tracking-wide text-fg-subtle shrink-0">{s.source === 'company' ? 'Company' : s.source === 'team' ? 'Team' : 'Contact'}</span>
                </button>
              </li>
            ) })}
          </ul>
        )}
      </div>
    </div>
  )
}
