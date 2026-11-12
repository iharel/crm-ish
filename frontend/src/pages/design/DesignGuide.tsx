import { Link } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { MockupFrame } from '../../mockups/MockupFrame'

const sections: Array<{ title: string; items: string[] }> = [
  { title: 'Principles', items: ['Data-dense but calm: 14px base, tight tracking on headings, generous row height (40–44px).', 'Monochrome surfaces with one blue primary and one green AI accent. Color means status, not decoration.', 'Every AI-generated artifact (drafts, enrichment, insights) is marked with the Sparkles icon and the accent color, and shows its sources.', 'Local-first feel: instant optimistic updates, live badges from WebSocket.'] },
  { title: 'Layout', items: ['App shell: 224px sidebar · 56px top bar · scrolling main area.', 'Pages use a 20px padding grid; cards separated by 16px.', 'Inbox is a three-pane layout: 320px thread list · reading pane · 360px AI draft panel.', 'Kanban columns are 288px wide, horizontally scrollable.'] },
  { title: 'Theming', items: ['All colors come from CSS variables on :root / [data-theme="dark"]; Tailwind utilities map to them via @theme inline.', 'Theme is persisted via themeService (localStorage) and defaults to the OS preference.', 'Contrast target: WCAG AA (4.5:1) for text in both themes.'] },
  { title: 'Typography', items: ['Inter for UI; JetBrains Mono for emails, domains, ids, metrics and code.', 'Headings 600 weight; body 400; labels 500.'] },
  { title: 'Components', items: ['Buttons: primary (blue), accent (green, AI actions only), secondary, ghost, danger.', 'Badges: tone-based (/15 opacity background) or custom hex for configurable lead statuses.', 'Tables: sticky uppercase header, 2.5 row padding, hover highlight when clickable.', 'Modals: 512px max width, header + body + footer with secondary surface.'] },
  { title: 'Conventions', items: ['Every element has a unique data-cmp="{section}.{element}_{type}".', 'Icons from lucide-react, 12–16px; never emojis as icons.', 'cursor-pointer and 150ms color transitions on all interactive elements; focus-visible ring uses --ring.', 'Respect prefers-reduced-motion.'] },
]

/** DesignGuide — `/design-guide`: written rules behind the design system. */
export default function DesignGuide() {
  return (
    <MockupFrame name="design-guide" title="Design guide">
      <div data-cmp="guide.root_div" className="h-full overflow-auto p-8 max-w-4xl mx-auto flex flex-col gap-6">
        <header data-cmp="guide.header" className="flex items-start justify-between">
          <div><h1 data-cmp="guide.title" className="text-2xl font-semibold tracking-tight">Looper CRM — Design guide</h1><p data-cmp="guide.subtitle" className="text-fg-muted mt-1">How screens should look and behave. Live examples at <Link data-cmp="guide.ds_link" to="/design/design-system" className="text-primary hover:underline">/design/design-system</Link>.</p></div>
          <Link data-cmp="guide.index_link" to="/design/index"><Button cmp="guide.index_button" size="sm">All mockups</Button></Link>
        </header>
        {sections.map((s) => (
          <Card key={s.title} cmp={`guide.section_${s.title}`} title={s.title}>
            <ul data-cmp={`guide.list_${s.title}`} className="list-disc pl-5 flex flex-col gap-1.5 text-sm text-fg-muted">
              {s.items.map((it, i) => <li key={i} data-cmp={`guide.item_${s.title}_${i}`}>{it}</li>)}
            </ul>
          </Card>
        ))}
      </div>
    </MockupFrame>
  )
}
