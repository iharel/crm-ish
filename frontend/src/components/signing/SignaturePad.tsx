import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button, Input, Modal, Tabs } from '../ui'

export interface SignaturePadProps {
  /** 'signature' or 'initials' — only changes the wording and the default typed text. */
  kind: 'signature' | 'initials'
  signerName: string
  onCancel: () => void
  /** PNG data URL with a transparent background. */
  onApply: (dataUrl: string) => void
}

const W = 640; const H = 220
const SCRIPT_FONT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", "Apple Chancery", "Lucida Handwriting", cursive'
const initials = (name: string) => name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 3).join('').toUpperCase()

/**
 * SignaturePad — draw a signature with the mouse or a finger, or type it in a script font. The canvas ref is
 * required: drawing happens straight on the element.
 */
export function SignaturePad({ kind, signerName, onCancel, onApply }: SignaturePadProps) {
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [typed, setTyped] = useState(kind === 'initials' ? initials(signerName) : signerName)
  const [hasInk, setHasInk] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d'); if (!ctx) return
    ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827'
  }, [mode])
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H } }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = e.currentTarget.getContext('2d'); if (!ctx) return
    const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y + 0.1); ctx.stroke()
    setDrawing(true); setHasInk(true)
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return
    const ctx = e.currentTarget.getContext('2d'); if (!ctx) return
    const p = point(e); ctx.lineTo(p.x, p.y); ctx.stroke()
  }
  function clear() { canvas.current?.getContext('2d')?.clearRect(0, 0, W, H); setHasInk(false) }
  function apply() {
    if (mode === 'draw') { if (canvas.current && hasInk) onApply(canvas.current.toDataURL('image/png')); return }
    const text = typed.trim(); if (!text) return
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d'); if (!ctx) return
    let size = 110
    do { size -= 4; ctx.font = `italic ${size}px ${SCRIPT_FONT}` } while (size > 24 && ctx.measureText(text).width > W - 40)
    ctx.fillStyle = '#111827'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
    ctx.fillText(text, W / 2, H / 2)
    onApply(c.toDataURL('image/png'))
  }
  const ready = mode === 'draw' ? hasInk : !!typed.trim()
  return (
    <Modal cmp="sign.pad_modal" title={kind === 'initials' ? 'Add your initials' : 'Add your signature'} onClose={onCancel} footer={<><Button cmp="sign.pad_modal.cancel_button" variant="ghost" onClick={onCancel}>Cancel</Button><Button cmp="sign.pad_modal.apply_button" variant="primary" disabled={!ready} onClick={apply}>Use this {kind === 'initials' ? 'for my initials' : 'signature'}</Button></>}>
      <div data-cmp="sign.pad_modal.body" className="p-4 flex flex-col gap-3">
        <Tabs cmp="sign.pad_modal.tabs" active={mode} onChange={(m) => setMode(m as 'draw' | 'type')} tabs={[{ id: 'draw', label: 'Draw' }, { id: 'type', label: 'Type' }]} />
        {mode === 'draw' ? (
          <div data-cmp="sign.pad_modal.draw_wrap" className="relative">
            <canvas data-cmp="sign.pad_modal.canvas" ref={canvas} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={() => setDrawing(false)} onPointerCancel={() => setDrawing(false)} className="w-full rounded-[var(--radius)] border border-border-strong bg-white touch-none cursor-crosshair" style={{ aspectRatio: `${W} / ${H}` }} />
            {!hasInk && <span data-cmp="sign.pad_modal.placeholder" className="absolute inset-0 grid place-items-center text-sm text-gray-400 pointer-events-none">Sign here with your mouse or finger</span>}
            <button type="button" data-cmp="sign.pad_modal.clear_button" onClick={clear} className="absolute right-2 top-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"><Eraser size={12} /> Clear</button>
          </div>
        ) : (
          <>
            <Input cmp="sign.pad_modal.typed_input" label={kind === 'initials' ? 'Your initials' : 'Your name'} dir="auto" maxLength={60} autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} />
            <div data-cmp="sign.pad_modal.typed_preview" dir="auto" style={{ fontFamily: SCRIPT_FONT, fontStyle: 'italic', aspectRatio: `${W} / ${H}` }} className="w-full rounded-[var(--radius)] border border-border-strong bg-white text-gray-900 grid place-items-center text-5xl overflow-hidden px-4 text-center">{typed || ' '}</div>
          </>
        )}
        <p data-cmp="sign.pad_modal.hint" className="text-xs text-fg-subtle">It is used for every {kind === 'initials' ? 'initials' : 'signature'} field of this document.</p>
      </div>
    </Modal>
  )
}
