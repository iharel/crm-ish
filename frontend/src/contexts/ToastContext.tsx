import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../components/ui'

type Tone = 'success' | 'error' | 'info'
interface Toast { id: number; tone: Tone; text: string }
interface ToastApi { toast: (text: string, tone?: Tone) => void; success: (t: string) => void; error: (t: string) => void }

const Ctx = createContext<ToastApi | null>(null)
let seq = 0

/** ToastProvider — lightweight toast notifications. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const toast = useCallback((text: string, tone: Tone = 'info') => {
    const id = ++seq
    setItems((x) => [...x, { id, tone, text }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500)
  }, [])
  const api: ToastApi = { toast, success: (t) => toast(t, 'success'), error: (t) => toast(t, 'error') }
  const icons = { success: <CheckCircle2 size={15} className="text-success" />, error: <AlertCircle size={15} className="text-danger" />, info: <Info size={15} className="text-info" /> }
  return (
    <Ctx.Provider value={api}>
      {children}
      <div data-cmp="toast.container_div" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {items.map((t) => (
          <div key={t.id} data-cmp={`toast.item_${t.id}`} className={cn('card shadow-elevated p-3 flex items-start gap-2 text-sm animate-fade-in', t.tone === 'error' && 'border-danger/40')}>
            {icons[t.tone]}<span dir="auto" data-cmp={`toast.text_${t.id}`} className="flex-1">{t.text}</span>
            <button data-cmp={`toast.close_${t.id}`} onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))} className="text-fg-subtle hover:text-fg"><X size={14} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
export function useToast() { const c = useContext(Ctx); if (!c) throw new Error('ToastProvider missing'); return c }
