import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '../ui'

/** PageState — loading / error placeholders shared by pages. */
export function PageState({ cmp, loading, error, onRetry }: { cmp: string; loading?: boolean; error?: string | null; onRetry?: () => void }) {
  if (loading) return <div data-cmp={`${cmp}.loading_div`} className="flex items-center justify-center gap-2 p-16 text-sm text-fg-muted"><Loader2 size={16} className="animate-spin" /> Loading…</div>
  if (error) return <div data-cmp={`${cmp}.error_div`} className="flex flex-col items-center justify-center gap-3 p-16 text-sm"><span data-cmp={`${cmp}.error_icon`} className="h-10 w-10 rounded-full bg-danger/15 text-danger grid place-items-center"><AlertCircle size={18} /></span><p data-cmp={`${cmp}.error_text`} className="text-fg-muted">{error}</p>{onRetry && <Button cmp={`${cmp}.retry_button`} size="sm" onClick={onRetry}>Retry</Button>}</div>
  return null
}
