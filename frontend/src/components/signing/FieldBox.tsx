import { useState } from 'react'
import { PenLine, Type, Calendar, CheckSquare, User, CaseSensitive } from 'lucide-react'
import { fieldLabel } from '../../lib/signing'
import type { SignFieldType } from '../../types'

export interface FieldBoxValue { type: SignFieldType; x: number; y: number; w: number; h: number; required: boolean; label: string | null }
export interface FieldBoxProps {
  cmp: string
  field: FieldBoxValue
  color: string
  /** Who the field is for (shown in the tooltip). */
  owner: string
  /** Page size in CSS pixels: pointer movement is converted to page fractions with it. */
  pageWidth: number
  pageHeight: number
  selected: boolean
  onSelect: () => void
  onChange: (patch: Partial<FieldBoxValue>) => void
}

const ICONS: Record<SignFieldType, typeof PenLine> = { signature: PenLine, initials: CaseSensitive, name: User, date: Calendar, text: Type, checkbox: CheckSquare }
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** FieldBox — one field in the editor: drag to move, drag the corner to resize. Positions are fractions of the page. */
export function FieldBox({ cmp, field, color, owner, pageWidth, pageHeight, selected, onSelect, onChange }: FieldBoxProps) {
  const [drag, setDrag] = useState<null | { mode: 'move' | 'resize'; px: number; py: number; start: FieldBoxValue }>(null)
  const Icon = ICONS[field.type]
  function begin(e: React.PointerEvent<HTMLElement>, mode: 'move' | 'resize') {
    e.stopPropagation(); e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    onSelect()
    setDrag({ mode, px: e.clientX, py: e.clientY, start: field })
  }
  function move(e: React.PointerEvent<HTMLElement>) {
    if (!drag) return
    const dx = (e.clientX - drag.px) / pageWidth; const dy = (e.clientY - drag.py) / pageHeight
    if (drag.mode === 'move') onChange({ x: clamp(drag.start.x + dx, 0, 1 - drag.start.w), y: clamp(drag.start.y + dy, 0, 1 - drag.start.h) })
    else onChange({ w: clamp(drag.start.w + dx, 0.02, 1 - drag.start.x), h: clamp(drag.start.h + dy, 0.012, 1 - drag.start.y) })
  }
  const small = field.w * pageWidth < 56
  return (
    <div
      data-cmp={cmp} data-selected={selected || undefined} title={`${fieldLabel(field.type)} — ${owner}${field.required ? '' : ' (optional)'}`}
      onPointerDown={(e) => begin(e, 'move')} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
      style={{ left: `${field.x * 100}%`, top: `${field.y * 100}%`, width: `${field.w * 100}%`, height: `${field.h * 100}%`, borderColor: color, backgroundColor: `${color}26`, color, boxShadow: selected ? `0 0 0 2px ${color}` : undefined }}
      className="absolute z-10 flex items-center gap-1 px-1 rounded-[3px] border text-[10px] font-medium leading-none cursor-move touch-none overflow-hidden"
    >
      <Icon size={10} className="shrink-0" />
      {!small && <span data-cmp={`${cmp}.label`} className="truncate">{field.label || fieldLabel(field.type)}{field.required ? '' : ' · optional'}</span>}
      {selected && <span data-cmp={`${cmp}.resize_handle`} onPointerDown={(e) => begin(e, 'resize')} onPointerMove={move} onPointerUp={() => setDrag(null)} style={{ backgroundColor: color }} className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-tl-[3px] cursor-nwse-resize touch-none" />}
    </div>
  )
}
