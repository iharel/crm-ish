/** buildInfoService — what code this backend process runs: package version, git commit and start time. Read once at boot. */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface BuildInfo { version: string; commit: string; startedAt: string }

/** backend/ — the package root. */
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Read HEAD from the nearest .git without needing the git binary. */
function fromGitDir(start: string): string | null {
  for (let dir = start; ; dir = dirname(dir)) {
    const git = join(dir, '.git')
    if (existsSync(git) && statSync(git).isDirectory()) {
      const head = readFileSync(join(git, 'HEAD'), 'utf8').trim()
      if (!head.startsWith('ref: ')) return head.slice(0, 7)
      const ref = head.slice(5)
      if (existsSync(join(git, ref))) return readFileSync(join(git, ref), 'utf8').trim().slice(0, 7)
      const packed = existsSync(join(git, 'packed-refs')) ? readFileSync(join(git, 'packed-refs'), 'utf8') : ''
      const line = packed.split('\n').find((l) => l.endsWith(` ${ref}`))
      return line ? line.slice(0, 7) : null
    }
    if (dirname(dir) === dir) return null
  }
}
/** BUILD_COMMIT is filled in by `git archive` (export-subst); unfilled it still holds the placeholder. */
function fromBuildFile(): string | null {
  const f = join(root, 'BUILD_COMMIT')
  const v = existsSync(f) ? readFileSync(f, 'utf8').trim() : ''
  return v && !v.includes('$Format') ? v.slice(0, 7) : null
}
/** Last resort: a fingerprint of the source tree, so two deploys of different code still read differently. */
function sourceHash(): string {
  const h = createHash('sha1')
  const walk = (dir: string) => { for (const name of readdirSync(dir).sort()) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p); else h.update(p.slice(root.length)).update(readFileSync(p)) } }
  walk(join(root, 'src'))
  return `src-${h.digest('hex').slice(0, 7)}`
}
function readCommit(): string {
  const env = process.env.GIT_COMMIT ?? process.env.LOOPER_COMMIT_SHA ?? process.env.SOURCE_COMMIT
  if (env) return env.slice(0, 7)
  try { return fromGitDir(root) ?? fromBuildFile() ?? sourceHash() } catch { return 'unknown' }
}
function readVersion(): string {
  try { return (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version?: string }).version ?? '0.0.0' } catch { return '0.0.0' }
}

const info: BuildInfo = { version: readVersion(), commit: readCommit(), startedAt: new Date().toISOString() }

export const buildInfoService = { get(): BuildInfo { return info } }
