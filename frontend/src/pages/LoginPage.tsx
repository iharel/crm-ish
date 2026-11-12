import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, Mail, Moon, Sparkles, Sun } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { errorMessage } from '../api/apiError'
import { Button, Input } from '../components/ui'

/** LoginPage — email/password sign-in. */
export default function LoginPage() {
  const { user, login, loading } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!loading && user) return <Navigate to="/" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null)
    try { await login(email, password); nav('/') } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <div data-cmp="login.root_div" className="h-full w-full grid lg:grid-cols-2 animate-fade-in">
      <section data-cmp="login.hero_section" className="hidden lg:flex flex-col justify-between p-10 border-r border-border">
        <div data-cmp="login.hero_brand" className="flex items-center gap-2.5"><span data-cmp="login.hero_logo" className="h-9 w-9 rounded-lg bg-brand-gradient glow grid place-items-center text-white"><Sparkles size={16} /></span><span data-cmp="login.hero_brand_text" className="font-semibold tracking-tight">Looper CRM</span></div>
        <div data-cmp="login.hero_copy" className="max-w-md">
          <div data-cmp="login.hero_eyebrow" className="text-[11px] uppercase tracking-widest text-fg-subtle">Sales OS</div>
          <h2 data-cmp="login.hero_title" className="mt-2 text-4xl font-semibold tracking-tight leading-tight">Your inbox, your pipeline, <span className="text-brand-gradient">one place</span>.</h2>
          <p data-cmp="login.hero_subtitle" className="mt-4 text-fg-muted">Leads and companies linked to every Gmail thread, with AI-drafted replies grounded in your own knowledge base.</p>
        </div>
        <p data-cmp="login.hero_footer" className="text-xs text-fg-subtle">Local-first · © 2026 · Powered by <a data-cmp="login.powered_by_link" href="https://looper.ing" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-fg-muted">Looper.ing</a></p>
      </section>
      <section data-cmp="login.form_section" className="flex items-center justify-center p-6 relative">
        <Button cmp="login.theme_button" size="icon" variant="ghost" className="absolute top-4 right-4" onClick={toggle} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</Button>
        <form data-cmp="login.form" className="card shadow-elevated w-full max-w-sm p-6 flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
          <div data-cmp="login.form_header"><h1 data-cmp="login.form_title" className="text-xl font-semibold">Sign in</h1><p data-cmp="login.form_subtitle" className="text-sm text-fg-muted">Use the account your admin created for you.</p></div>
          <Input cmp="login.email_input" label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" leading={<Mail size={14} />} autoFocus />
          <Input cmp="login.password_input" label="Password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" leading={<Lock size={14} />} />
          {error && <p data-cmp="login.error_text" className="text-xs text-danger">{error}</p>}
          <Button cmp="login.submit_button" variant="primary" size="lg" type="submit" disabled={busy} className="justify-center bg-brand-gradient border-0 text-white hover:opacity-90">{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      </section>
    </div>
  )
}
