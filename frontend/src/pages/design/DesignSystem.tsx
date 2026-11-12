import { Mail, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Input, Select, Stat, Tabs, Toggle } from '../../components/ui'
import { useTheme } from '../../hooks/useTheme'

const tokens = ['bg', 'surface', 'surface-2', 'surface-3', 'border', 'border-strong', 'fg', 'fg-muted', 'fg-subtle', 'primary', 'accent', 'success', 'warning', 'danger', 'info']

/** DesignSystem — `/design/design-system`: tokens and components in both themes. */
export default function DesignSystem() {
  const { theme, toggle } = useTheme()
  return (
    <div data-cmp="ds.root_div" className="min-h-full p-8 max-w-6xl mx-auto flex flex-col gap-8">
      <header data-cmp="ds.header" className="flex items-start justify-between">
        <div><h1 data-cmp="ds.title" className="text-2xl font-semibold tracking-tight">Design system</h1><p data-cmp="ds.subtitle" className="text-fg-muted mt-1">Tokens, type and primitives. Theme: <span className="font-mono">{theme}</span></p></div>
        <div className="flex gap-2"><Link data-cmp="ds.index_link" to="/design/index"><Button cmp="ds.index_button" size="sm">Mockups</Button></Link><Button cmp="ds.theme_button" size="sm" onClick={toggle}>Toggle theme</Button></div>
      </header>
      <Card cmp="ds.colors_card" title="Color tokens">
        <div data-cmp="ds.colors_grid" className="grid grid-cols-3 md:grid-cols-5 gap-3">
          {tokens.map((t) => (
            <div key={t} data-cmp={`ds.color_${t}`} className="flex flex-col gap-1.5"><div data-cmp={`ds.color_swatch_${t}`} className="h-12 rounded-[var(--radius)] border border-border" style={{ background: `var(--${t})` }} /><code data-cmp={`ds.color_name_${t}`} className="font-mono text-xs">--{t}</code></div>
          ))}
        </div>
      </Card>
      <Card cmp="ds.type_card" title="Typography">
        <div data-cmp="ds.type_list" className="flex flex-col gap-2">
          <p data-cmp="ds.type_h1" className="text-2xl font-semibold tracking-tight">Heading 1 — Inter 600 / 24px</p>
          <p data-cmp="ds.type_h2" className="text-xl font-semibold">Heading 2 — Inter 600 / 20px</p>
          <p data-cmp="ds.type_h3" className="text-base font-semibold">Heading 3 — Inter 600 / 16px</p>
          <p data-cmp="ds.type_body" className="text-sm">Body — Inter 400 / 14px. The quick brown fox jumps over the lazy dog.</p>
          <p data-cmp="ds.type_muted" className="text-sm text-fg-muted">Muted — for secondary information.</p>
          <p data-cmp="ds.type_mono" className="font-mono text-xs">Mono — JetBrains Mono 12px for emails, ids, paths, numbers.</p>
        </div>
      </Card>
      <Card cmp="ds.buttons_card" title="Buttons">
        <div data-cmp="ds.buttons_row" className="flex flex-wrap gap-2 items-center">
          <Button cmp="ds.btn_primary" variant="primary" icon={<Plus size={13} />}>Primary</Button>
          <Button cmp="ds.btn_secondary">Secondary</Button>
          <Button cmp="ds.btn_accent" variant="accent" icon={<Sparkles size={13} />}>AI action</Button>
          <Button cmp="ds.btn_ghost" variant="ghost">Ghost</Button>
          <Button cmp="ds.btn_danger" variant="danger">Danger</Button>
          <Button cmp="ds.btn_sm" size="sm">Small</Button>
          <Button cmp="ds.btn_lg" size="lg">Large</Button>
          <Button cmp="ds.btn_icon" size="icon" aria-label="Mail"><Mail size={14} /></Button>
          <Button cmp="ds.btn_disabled" disabled>Disabled</Button>
        </div>
      </Card>
      <Card cmp="ds.badges_card" title="Badges & avatars">
        <div data-cmp="ds.badges_row" className="flex flex-wrap gap-2 items-center">
          {(['neutral', 'primary', 'success', 'warning', 'danger', 'info', 'accent'] as const).map((t) => <Badge key={t} cmp={`ds.badge_${t}`} tone={t}>{t}</Badge>)}
          <Badge cmp="ds.badge_custom" color="#7c3aed">custom #7c3aed</Badge>
          <Avatar cmp="ds.avatar_xs" name="Alex Morgan" size="xs" /><Avatar cmp="ds.avatar_sm" name="Maya Levi" size="sm" /><Avatar cmp="ds.avatar_md" name="Tom Ben-David" /><Avatar cmp="ds.avatar_lg" name="Noa Katz" size="lg" />
        </div>
      </Card>
      <Card cmp="ds.forms_card" title="Forms">
        <div data-cmp="ds.forms_grid" className="grid md:grid-cols-3 gap-4">
          <Input cmp="ds.input_default" label="Input" placeholder="Placeholder" hint="Helper text" leading={<Mail size={14} />} />
          <Input cmp="ds.input_error" label="With error" defaultValue="bad@value" error="Enter a valid email." />
          <Select cmp="ds.select" label="Select" options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]} />
          <Toggle cmp="ds.toggle_on" checked label="Toggle on" /><Toggle cmp="ds.toggle_off" checked={false} label="Toggle off" />
        </div>
      </Card>
      <Card cmp="ds.data_card" title="Data display">
        <div data-cmp="ds.data_grid" className="grid md:grid-cols-3 gap-4">
          <Stat cmp="ds.stat" label="Open leads" value="37" delta="+6 this week" deltaTone="up" icon={<Mail size={16} />} />
          <div className="md:col-span-2"><Tabs cmp="ds.tabs" active="a" tabs={[{ id: 'a', label: 'Active' }, { id: 'b', label: 'With count', count: 4 }, { id: 'c', label: 'Third' }]} /></div>
        </div>
      </Card>
    </div>
  )
}
