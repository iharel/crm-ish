import { Mail, Lock, Moon, Sun } from 'lucide-react'
import { MockupFrame } from '../MockupFrame'
import { Button, Input } from '../../components/ui'
import { useTheme } from '../../hooks/useTheme'

/** LoginMockup — email/password sign-in. */
export default function LoginMockup() {
  const { theme, toggle } = useTheme()
  return (
    <MockupFrame name="login" title="Login">
      <div data-cmp="login.root_div" className="h-full w-full grid lg:grid-cols-2">
        <section data-cmp="login.hero_section" className="hidden lg:flex flex-col justify-between p-10 bg-surface border-r border-border">
          <div data-cmp="login.hero_brand" className="flex items-center gap-2">
            <span data-cmp="login.hero_logo" className="h-8 w-8 rounded-lg bg-primary text-on-primary inline-flex items-center justify-center font-bold">L</span>
            <span data-cmp="login.hero_brand_text" className="font-semibold">Looper CRM</span>
          </div>
          <div data-cmp="login.hero_copy" className="max-w-md">
            <h2 data-cmp="login.hero_title" className="text-4xl font-semibold tracking-tight leading-tight">Your inbox, your pipeline, one place.</h2>
            <p data-cmp="login.hero_subtitle" className="mt-4 text-fg-muted">Leads and companies linked to every Gmail thread, with AI-drafted replies grounded in your own knowledge base.</p>
          </div>
          <p data-cmp="login.hero_footer" className="text-xs text-fg-subtle">© 2026 Acme Demo · Local-first</p>
        </section>
        <section data-cmp="login.form_section" className="flex items-center justify-center p-6 relative">
          <Button cmp="login.theme_button" size="icon" variant="ghost" className="absolute top-4 right-4" onClick={toggle} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</Button>
          <form data-cmp="login.form" className="card w-full max-w-sm p-6 flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <div data-cmp="login.form_header">
              <h1 data-cmp="login.form_title" className="text-xl font-semibold">Sign in</h1>
              <p data-cmp="login.form_subtitle" className="text-sm text-fg-muted">Use the account your admin created for you.</p>
            </div>
            <Input cmp="login.email_input" label="Email" type="email" placeholder="you@company.com" leading={<Mail size={14} />} defaultValue="alex@acme-demo.example" />
            <Input cmp="login.password_input" label="Password" type="password" placeholder="••••••••" leading={<Lock size={14} />} defaultValue="password" />
            <div data-cmp="login.form_row" className="flex items-center justify-between text-xs">
              <label data-cmp="login.remember_label" className="inline-flex items-center gap-2 text-fg-muted"><input data-cmp="login.remember_checkbox" type="checkbox" defaultChecked className="accent-[var(--primary)]" />Remember me</label>
              <a data-cmp="login.forgot_link" className="text-primary hover:underline">Forgot password?</a>
            </div>
            <Button cmp="login.submit_button" variant="primary" size="lg" type="submit" className="justify-center">Sign in</Button>
            <p data-cmp="login.error_text" className="hidden text-xs text-danger">Invalid email or password.</p>
          </form>
        </section>
      </div>
    </MockupFrame>
  )
}
