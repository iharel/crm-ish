import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Moon, Sun, Palette, BookOpen } from 'lucide-react'
import { mockups } from '../../mockups/registry'
import { Badge, Button } from '../../components/ui'
import { useTheme } from '../../hooks/useTheme'
import { clipboardService } from '../../services/clipboardService'

/** DesignIndex — `/design/index`: catalogue of all mockups with copy-name buttons. */
export default function DesignIndex() {
  const { theme, toggle } = useTheme()
  const [copied, setCopied] = useState<string | null>(null)
  const groups = [...new Set(mockups.map((m) => m.group))]
  async function copy(name: string) {
    if (await clipboardService.copy(name)) { setCopied(name); setTimeout(() => setCopied(null), 1500) }
  }
  return (
    <div data-cmp="designindex.root_div" className="min-h-full p-8 max-w-6xl mx-auto flex flex-col gap-8">
      <header data-cmp="designindex.header" className="flex items-start justify-between gap-4">
        <div data-cmp="designindex.header_copy">
          <h1 data-cmp="designindex.title" className="text-2xl font-semibold tracking-tight">Looper CRM — Mockups</h1>
          <p data-cmp="designindex.subtitle" className="text-fg-muted mt-1">Every screen of the system, lazy-loaded. Click a card to open; copy the name to reference it in chat.</p>
        </div>
        <div data-cmp="designindex.header_actions" className="flex gap-2">
          <Link data-cmp="designindex.ds_link" to="/design/design-system"><Button cmp="designindex.ds_button" size="sm" icon={<Palette size={13} />}>Design system</Button></Link>
          <Link data-cmp="designindex.guide_link" to="/design-guide"><Button cmp="designindex.guide_button" size="sm" icon={<BookOpen size={13} />}>Design guide</Button></Link>
          <Button cmp="designindex.theme_button" size="sm" onClick={toggle} icon={theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}>{theme === 'dark' ? 'Light' : 'Dark'}</Button>
        </div>
      </header>
      {groups.map((g) => (
        <section key={g} data-cmp={`designindex.group_${g}`} className="flex flex-col gap-3">
          <h2 data-cmp={`designindex.group_title_${g}`} className="text-xs uppercase tracking-wider text-fg-subtle">{g}</h2>
          <div data-cmp={`designindex.group_grid_${g}`} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {mockups.filter((m) => m.group === g).map((m) => (
              <div key={m.name} data-cmp={`designindex.card_${m.name}`} className="card p-4 flex flex-col gap-2 hover:border-border-strong transition-colors">
                <Link data-cmp={`designindex.card_link_${m.name}`} to={`/design/${m.name}`} className="font-medium hover:text-primary">{m.title}</Link>
                <p data-cmp={`designindex.card_desc_${m.name}`} className="text-sm text-fg-muted flex-1">{m.description}</p>
                <div data-cmp={`designindex.card_footer_${m.name}`} className="flex items-center justify-between">
                  <Badge cmp={`designindex.card_name_${m.name}`} className="font-mono">{m.name}</Badge>
                  <Button cmp={`designindex.card_copy_${m.name}`} size="sm" variant="ghost" onClick={() => copy(m.name)} icon={copied === m.name ? <Check size={12} /> : <Copy size={12} />}>{copied === m.name ? 'Copied' : 'Copy'}</Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
