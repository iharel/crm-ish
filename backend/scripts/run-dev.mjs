/**
 * run-dev — starts the backend. Locally: `tsx watch` for hot reload.
 * With CRM_SUPERVISED=1 (set in the Looper production overlay): plain `tsx`,
 * supervised here so a crash reports its exit code / signal and restarts,
 * instead of `tsx watch` silently waiting for a file change that never comes.
 */
import { spawn } from 'node:child_process'

const production = process.env.CRM_SUPERVISED === '1'
const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx'

if (!production) {
  spawn(bin, ['tsx', 'watch', 'src/server.ts'], { stdio: 'inherit' }).on('exit', (code) => process.exit(code ?? 0))
} else {
  let attempt = 0
  const start = () => {
    attempt += 1
    console.log(`[run-dev] starting backend (attempt ${attempt})`)
    const child = spawn(bin, ['tsx', 'src/server.ts'], { stdio: 'inherit' })
    child.on('exit', (code, signal) => {
      console.error(`[run-dev] backend exited code=${code} signal=${signal}`)
      setTimeout(start, 3000)
    })
  }
  start()
}
