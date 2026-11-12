import { useEffect, useState, type KeyboardEvent } from 'react'
import { Globe, Star, X, AlertTriangle, Loader2 } from 'lucide-react'
import { companiesApi } from '../../api'
import { cn } from '../ui'
import type { CompanySuggestion } from '../../types'

export interface DomainsInputProps {
  cmp: string
  value: string[]
  onChange: (domains: string[]) => void
  /** Company being edited, so its own domains are not reported as taken. */
  companyId?: string
}

const normalize = (raw: string) => raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('?')[0]

/**
 * DomainsInput — chips editor for a company's domains. Enter, comma or space adds; the first chip is the primary
 * (star to change); each chip is checked live against other companies and flagged when the domain is taken.
 */
export function DomainsInput({ cmp, value, onChange, companyId }: DomainsInputProps) {
  const [draft, setDraft] = useState('')
  const [taken, setTaken] = useState<Record<string, CompanySuggestion | null | 'loading'>>({})
  useEffect(() => {
    let alive = true
    for (const d of value) {
      if (taken[d] !== undefined) continue
      setTaken((t) => ({ ...t, [d]: 'loading' }))
      companiesApi.checkDomain(d).then((r) => { if (alive) setTaken((t) => ({ ...t, [d]: r.company && r.company.id !== companyId ? r.company : null })) }).catch(() => { if (alive) setTaken((t) => ({ ...t, [d]: null })) })
    }
    return () => { alive = false }
  }, [value, companyId]) // eslint-disable-line react-hooks/exhaustive-deps
  function add(raw: string) {
    const parts = raw.split(/[,\s;]+/).map(normalize).filter(Boolean)
    if (!parts.length) return
    onChange([...new Set([...value, ...parts])]); setDraft('')
  }
  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); add(draft) }
    else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
  }
  const conflicts = value.filter((d) => taken[d] && taken[d] !== 'loading')
  return (
    <label data-cmp={cmp} className="flex flex-col gap-1 text-sm">
      <span data-cmp={`${cmp}.label_span`} className="text-xs font-medium text-fg-muted">Domains <span className="font-normal text-fg-subtle">· first is primary</span></span>
      <span data-cmp={`${cmp}.field_span`} className={cn('flex flex-wrap items-center gap-1.5 min-h-9 px-2 py-1 rounded-[var(--radius)] border bg-surface focus-within:border-ring', conflicts.length ? 'border-danger' : 'border-border')}>
        {value.map((d, i) => {
          const t = taken[d]
          return (
            <span key={d} data-cmp={`${cmp}.chip_${d}`} title={t && t !== 'loading' ? `Already belongs to ${t.name}` : i === 0 ? 'Primary domain' : 'Click the star to make primary'} className={cn('inline-flex items-center gap-1 h-6 rounded-md border px-1.5 font-mono text-xs', t && t !== 'loading' ? 'border-danger/50 bg-danger/10 text-danger' : i === 0 ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-surface-2 text-fg')}>
              {t === 'loading' ? <Loader2 size={10} className="animate-spin" /> : t ? <AlertTriangle size={10} /> : <Globe size={10} />}
              {d}
              {i > 0 && <button type="button" data-cmp={`${cmp}.primary_${d}`} aria-label={`Make ${d} primary`} onClick={() => onChange([d, ...value.filter((x) => x !== d)])} className="text-fg-subtle hover:text-primary"><Star size={10} /></button>}
              <button type="button" data-cmp={`${cmp}.remove_${d}`} aria-label={`Remove ${d}`} onClick={() => onChange(value.filter((x) => x !== d))} className="text-fg-subtle hover:text-danger"><X size={10} /></button>
            </span>
          )
        })}
        <input data-cmp={`${cmp}.input`} dir="ltr" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={() => add(draft)} placeholder={value.length ? 'add another…' : 'acme.com, acme.co.il'} className="flex-1 min-w-32 bg-transparent outline-none text-sm font-mono placeholder:font-sans placeholder:text-fg-subtle" />
      </span>
      {conflicts.length > 0 && <span data-cmp={`${cmp}.conflict_text`} className="text-xs text-danger">{conflicts.map((d) => `${d} already belongs to ${(taken[d] as CompanySuggestion).name}`).join(' · ')}. Remove it or edit that company.</span>}
    </label>
  )
}
