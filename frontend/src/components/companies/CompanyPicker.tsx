import { useState } from 'react'
import { Building2, Plus } from 'lucide-react'
import { Input, cn } from '../ui'
import type { Company } from '../../types'

/** What the picker holds: an existing company (`id` set) or the name of one to create (`id` null). */
export interface CompanyPick { id: string | null; name: string }

export interface CompanyPickerProps {
  cmp: string
  label?: string
  companies: Company[]
  value: CompanyPick
  onChange: (v: CompanyPick) => void
  autoFocus?: boolean
}

const MAX_OPTIONS = 8

/**
 * CompanyPicker — auto-complete for choosing a company. Typing filters existing companies by name or domain; a name
 * that matches none is offered as "Create …". A typed name equal to an existing one resolves to that company, so the
 * same company is never created twice.
 */
export function CompanyPicker({ cmp, label = 'Company', companies, value, onChange, autoFocus }: CompanyPickerProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const text = value.name.trim().toLowerCase()
  const matches = (text ? companies.filter((c) => c.name.toLowerCase().includes(text) || c.domains.some((d) => d.includes(text))) : companies).slice(0, MAX_OPTIONS)
  const exact = companies.find((c) => c.name.trim().toLowerCase() === text)
  const canCreate = !!text && !exact
  const count = matches.length + (canCreate ? 1 : 0)
  /** Typing: an exact name selects that company, anything else is a new name. */
  function type(name: string) { const hit = companies.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()); onChange({ id: hit?.id ?? null, name }); setOpen(true); setActive(0) }
  function choose(i: number) { const c = matches[i]; if (c) onChange({ id: c.id, name: c.name }); else if (canCreate) onChange({ id: null, name: value.name.trim() }); setOpen(false) }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => (count ? (a + 1) % count : 0)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (count ? (a - 1 + count) % count : 0)) }
    else if (e.key === 'Enter' && open && count) { e.preventDefault(); choose(active) }
    else if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) }
  }
  return (
    <div data-cmp={`${cmp}.root_div`} className="flex flex-col gap-1.5">
      <Input cmp={cmp} label={label} value={value.name} placeholder="Type a company name…" autoFocus={autoFocus} autoComplete="off" role="combobox" aria-expanded={open} aria-autocomplete="list"
        leading={<Building2 size={13} />} onChange={(e) => type(e.target.value)} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} />
      {open && count > 0 && (
        <ul data-cmp={`${cmp}.options_list`} role="listbox" className="max-h-52 overflow-auto rounded-lg border border-border bg-surface-2 divide-y divide-border">
          {matches.map((c, i) => (
            <li key={c.id} data-cmp={`${cmp}.option_${c.id}`} role="option" aria-selected={c.id === value.id} onMouseDown={(e) => { e.preventDefault(); choose(i) }} onMouseEnter={() => setActive(i)}
              className={cn('px-3 py-2 text-sm cursor-pointer flex items-center gap-2', i === active ? 'bg-primary/10' : 'hover:bg-surface-3')}>
              <span dir="auto" data-cmp={`${cmp}.option_name_${c.id}`} className={cn('truncate', c.id === value.id && 'font-medium')}>{c.name}</span>
              {c.domain && <span data-cmp={`${cmp}.option_domain_${c.id}`} className="ml-auto text-xs text-fg-subtle font-mono truncate">{c.domain}</span>}
            </li>
          ))}
          {canCreate && (
            <li data-cmp={`${cmp}.option_create`} role="option" aria-selected={false} onMouseDown={(e) => { e.preventDefault(); choose(matches.length) }} onMouseEnter={() => setActive(matches.length)}
              className={cn('px-3 py-2 text-sm cursor-pointer flex items-center gap-2 text-primary', active === matches.length ? 'bg-primary/10' : 'hover:bg-surface-3')}>
              <Plus size={13} /> <span dir="auto" data-cmp={`${cmp}.option_create_text`} className="truncate">Create “{value.name.trim()}”</span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
