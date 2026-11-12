import { cn } from './cn'

export interface ToggleProps {
  cmp: string
  checked: boolean
  onChange?: (v: boolean) => void
  label?: string
}

/** Toggle — switch control. */
export function Toggle({ cmp, checked, onChange, label }: ToggleProps) {
  return (
    <label data-cmp={`${cmp}.wrapper_label`} className="inline-flex items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-cmp={cmp}
        onClick={() => onChange?.(!checked)}
        className={cn('relative inline-block h-5 w-9 shrink-0 rounded-full p-0 align-middle transition-colors', checked ? 'bg-primary' : 'bg-border-strong')}
      >
        <span data-cmp={`${cmp}.knob_span`} className={cn('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0')} />
      </button>
      {label && <span data-cmp={`${cmp}.label_text`}>{label}</span>}
    </label>
  )
}
