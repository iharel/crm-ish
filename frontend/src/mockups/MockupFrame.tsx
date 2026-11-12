import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Moon, Sun, LayoutGrid } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { clipboardService } from '../services/clipboardService'
import { Button } from '../components/ui'

export interface MockupFrameProps {
  /** Mockup name (copied to clipboard). */
  name: string
  title: string
  children: ReactNode
}

/**
 * MockupFrame — wraps every mockup with a thin toolbar: name + copy button,
 * theme toggle and link back to /design/index.
 */
export function MockupFrame({ name, title, children }: MockupFrameProps) {
  const { theme, toggle } = useTheme()
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (await clipboardService.copy(name)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div data-cmp={`mockup.${name}_frame`} className="h-full w-full flex flex-col">
      <div data-cmp={`mockup.${name}_toolbar`} className="h-10 shrink-0 flex items-center justify-between gap-3 px-3 border-b border-dashed border-border-strong bg-surface-2 text-xs">
        <div data-cmp={`mockup.${name}_toolbar.left_div`} className="flex items-center gap-2 min-w-0">
          <Link data-cmp={`mockup.${name}_toolbar.index_link`} to="/design/index" className="inline-flex items-center gap-1 text-fg-muted hover:text-fg"><LayoutGrid size={14} /> Mockups</Link>
          <span data-cmp={`mockup.${name}_toolbar.sep_text`} className="text-fg-subtle">/</span>
          <span data-cmp={`mockup.${name}_toolbar.title_text`} className="font-medium truncate">{title}</span>
          <code data-cmp={`mockup.${name}_toolbar.name_code`} className="font-mono text-fg-muted bg-surface px-1.5 py-0.5 rounded border border-border">{name}</code>
          <Button cmp={`mockup.${name}_toolbar.copy_button`} size="sm" variant="ghost" onClick={copy} icon={copied ? <Check size={12} /> : <Copy size={12} />}>{copied ? 'Copied' : 'Copy name'}</Button>
        </div>
        <Button cmp={`mockup.${name}_toolbar.theme_button`} size="sm" variant="ghost" onClick={toggle} icon={theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}>{theme === 'dark' ? 'Light' : 'Dark'}</Button>
      </div>
      <div data-cmp={`mockup.${name}_canvas`} className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
