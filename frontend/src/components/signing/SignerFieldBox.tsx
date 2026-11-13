import { Check, PenLine } from 'lucide-react'
import { fieldLabel } from '../../lib/signing'
import type { SignerField } from '../../types'
import { cn } from '../ui'

export interface SignerFieldBoxProps {
  cmp: string
  field: SignerField
  /** The next empty required field: highlighted so the signer knows where to go. */
  current: boolean
  /** Shown in date fields until the signer finishes. */
  today: string
  onSign: () => void
  onText: (value: string) => void
  onToggle: () => void
}

/** SignerFieldBox — one field on the signer's page: click to sign, type into text fields, tick boxes. */
export function SignerFieldBox({ cmp, field, current, today, onSign, onText, onToggle }: SignerFieldBoxProps) {
  const filled = !!field.image || !!field.value
  const style = { left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%` }
  const frame = cn('absolute z-10 rounded-[3px] border text-[11px] leading-none transition-shadow', filled ? 'border-emerald-500/70 bg-emerald-400/10' : field.required ? 'border-amber-500 bg-amber-300/25' : 'border-sky-500/70 bg-sky-300/15', current && 'ring-2 ring-amber-500 ring-offset-1')
  const hint = `${field.label || fieldLabel(field.type)}${field.required ? '' : ' (optional)'}`
  if (field.type === 'signature' || field.type === 'initials') return (
    <button type="button" data-cmp={cmp} data-field={field.id} title={hint} onClick={onSign} style={style} className={cn(frame, 'flex items-center justify-center gap-1 text-amber-900 font-medium overflow-hidden cursor-pointer')}>
      {field.image ? <img data-cmp={`${cmp}.image`} src={field.image} alt={fieldLabel(field.type)} className="h-full w-full object-contain" /> : <><PenLine size={11} /><span data-cmp={`${cmp}.label`} className="truncate">{field.type === 'initials' ? 'Initial' : 'Sign here'}</span></>}
    </button>
  )
  if (field.type === 'checkbox') return (
    <button type="button" data-cmp={cmp} data-field={field.id} role="checkbox" aria-checked={field.value === 'true'} title={hint} onClick={onToggle} style={style} className={cn(frame, 'grid place-items-center text-gray-900 cursor-pointer')}>
      {field.value === 'true' && <Check size={14} strokeWidth={3} />}
    </button>
  )
  if (field.type === 'date') return <div data-cmp={cmp} data-field={field.id} title="Filled in automatically when you finish" style={style} className={cn(frame, 'flex items-center px-1 text-gray-700 border-emerald-500/70 bg-emerald-400/10')}><span data-cmp={`${cmp}.value`} className="truncate">{field.value || today}</span></div>
  return <input key={`${field.id}-${field.value ?? ''}`} data-cmp={cmp} data-field={field.id} dir="auto" title={hint} placeholder={hint} defaultValue={field.value ?? ''} maxLength={field.type === 'name' ? 120 : 500} onBlur={(e) => { if (e.target.value !== (field.value ?? '')) onText(e.target.value) }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} style={style} className={cn(frame, 'px-1 text-gray-900 placeholder:text-amber-800/70 outline-none focus:ring-2 focus:ring-sky-500')} />
}
