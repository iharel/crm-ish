/** server — Express + Socket.IO bootstrap. */
import { companyManager } from './managers/companyManager.ts'
import { dealManager } from './managers/dealManager.ts'
import http from 'node:http'
import fs from 'node:fs'
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { CONSTANTS, insecureDefaults } from './constants.ts'
import { getDb } from './db/dbAccessor.ts'
import { errorHandler } from './middleware/errors.ts'
import { api, publicRouter } from './routers/index.ts'
import { socketService } from './services/socketService.ts'
import { schedulerService } from './services/schedulerService.ts'
import { emailManager } from './managers/emailManager.ts'
import { leadStatusManager } from './managers/leadStatusManager.ts'
import { seedIfEmpty } from './scripts/seed.ts'

console.log(`[crm] starting — port=${CONSTANTS.PORT} db=${CONSTANTS.DB_PATH} uploads=${CONSTANTS.UPLOAD_DIR} public=${CONSTANTS.PUBLIC_URL}`)
for (const w of insecureDefaults()) console.error(`[crm] SECURITY WARNING: ${w}`)
let phase = 'init'
const mark = (p: string) => { phase = p; console.log(`[crm] phase=${p}`) }
const heartbeat = setInterval(() => console.log(`[crm] still starting — phase=${phase}`), 5000)
process.on('uncaughtException', (e) => { console.error('[crm] uncaught exception:', e); process.exit(1) })
process.on('unhandledRejection', (e) => { console.error('[crm] unhandled rejection:', e); process.exit(1) })
process.on('exit', (code) => console.log(`[crm] process exit code=${code} phase=${phase}`))
try {
  mark('open-db')
  getDb()
  mark('lead-statuses')
  leadStatusManager.ensureDefaults()
  mark('seed-admin')
  mark('company-domains'); companyManager.reconcileDomainsAfterBackfill()
  mark('deals'); dealManager.backfill()
  await seedIfEmpty()
  mark('upload-dir')
  fs.mkdirSync(CONSTANTS.UPLOAD_DIR, { recursive: true })
  mark('listen')
} catch (e) {
  console.error('[crm] startup failed:', e)
  process.exit(1)
}

const app = express()
app.set('trust proxy', true)
app.disable('x-powered-by')
app.use(cors({ origin: CONSTANTS.FRONTEND_URL, credentials: true }))
// Baseline hardening for every response (the API only ever serves JSON, a tracking gif and attachment bytes).
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  if (CONSTANTS.PUBLIC_URL.startsWith('https://')) res.setHeader('Strict-Transport-Security', 'max-age=15552000')
  next()
})
// gzip JSON (mail HTML compresses ~5-10x); already-compressed attachment bytes are skipped by the default filter.
app.use(compression())
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))
app.get('/health', (_req, res) => res.json({ ok: true, name: 'looper-crm-backend' }))
app.use(publicRouter)
app.use('/api', api)
app.use((_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' }))
app.use(errorHandler)

const server = http.createServer(app)
socketService.init(server)
schedulerService.startDefaults(() => emailManager.syncAll(), () => emailManager.backfillAttachmentScans())
server.on('error', (e) => { console.error('[crm] listen failed:', e); process.exit(1) })
server.listen(CONSTANTS.PORT, '0.0.0.0', () => { clearInterval(heartbeat); phase = 'ready'; console.log(`[crm] backend on :${CONSTANTS.PORT}`) })
