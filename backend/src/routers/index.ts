/** routers — all express routes with validation, auth and authorization. */
import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { CONSTANTS } from '../constants.ts'
import { authenticate } from '../middleware/auth.ts'
import { authorize } from '../middleware/authorize.ts'
import { validate } from '../middleware/validate.ts'
import { wrap } from '../middleware/errors.ts'
import { rateLimit } from '../middleware/rateLimit.ts'
import { authController } from '../controllers/authController.ts'
import { userController } from '../controllers/userController.ts'
import { leadStatusController } from '../controllers/leadStatusController.ts'
import { leadController } from '../controllers/leadController.ts'
import { companyController } from '../controllers/companyController.ts'
import { dealController } from '../controllers/dealController.ts'
import { googleController } from '../controllers/googleController.ts'
import { emailController } from '../controllers/emailController.ts'
import { draftController } from '../controllers/draftController.ts'
import { knowledgeController } from '../controllers/knowledgeController.ts'
import { calendarController } from '../controllers/calendarController.ts'
import { miscController } from '../controllers/miscController.ts'
import { taskController } from '../controllers/taskController.ts'
import { attachmentController } from '../controllers/attachmentController.ts'
import { signingController } from '../controllers/signingController.ts'

const id = z.object({ id: z.string().min(1) })
const nullableStr = z.string().nullable().optional()
/** Free-form link field: a bare host is fine, but any explicit scheme must be http(s) (never javascript:, data:, ...). */
const linkStr = z.string().max(2000).refine((v) => !/^\s*[a-z][a-z0-9+.-]*:/i.test(v) || /^\s*https?:\/\//i.test(v), 'Only http(s) links are allowed').nullable().optional()
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, keys: (req) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().slice(0, 200) : ''
  return [{ key: `ip:${req.ip}`, max: 60 }, { key: `ip-email:${req.ip}|${email}`, max: 10 }, { key: `email:${email}`, max: 30 }]
} })
const upload = multer({ dest: CONSTANTS.UPLOAD_DIR, limits: { fileSize: 25 * 1024 * 1024 } })

export const publicRouter = Router()
publicRouter.get('/t/o/:token.gif', wrap(miscController.pixel))
publicRouter.get('/t/c/:token', wrap(miscController.click))
publicRouter.post('/api/webhooks/gmail', wrap(miscController.gmailWebhook))
publicRouter.get('/api/google/callback', wrap(googleController.callback))
// Attachment bytes: authenticated by a user-bound, expiring signature in the query (see attachmentManager.signedUrl).
publicRouter.get('/api/emails/attachments/:id', validate({ params: id, query: z.object({ exp: z.string(), sig: z.string(), u: z.string() }) }), wrap(attachmentController.serve))

// ---- document signing, signer side: no login — the link secret in the path is the credential. Rate-limited per IP and per link.
const signLimiter = rateLimit({ windowMs: 60 * 1000, keys: (req) => [{ key: `sign-ip:${req.ip}`, max: 240 }, { key: `sign-link:${String(req.params.token).slice(0, 64)}`, max: 120 }] })
const signCodeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, keys: (req) => [{ key: `sign-code:${req.ip}`, max: 30 }, { key: `sign-code-link:${String(req.params.token).slice(0, 64)}`, max: 15 }] })
const signToken = z.object({ token: z.string().min(20).max(100) })
publicRouter.get('/api/sign/:token', signLimiter, validate({ params: signToken }), wrap(signingController.view))
publicRouter.post('/api/sign/:token/code', signCodeLimiter, validate({ params: signToken }), wrap(signingController.sendCode))
publicRouter.post('/api/sign/:token/verify', signCodeLimiter, validate({ params: signToken, body: z.object({ code: z.string().min(4).max(12) }) }), wrap(signingController.verifyCode))
publicRouter.get('/api/sign/:token/documents/:docId', signLimiter, validate({ params: signToken.extend({ docId: z.string().min(1) }) }), wrap(signingController.publicDocument))
publicRouter.post('/api/sign/:token/consent', signLimiter, validate({ params: signToken }), wrap(signingController.consent))
publicRouter.put('/api/sign/:token/fields/:fieldId', signLimiter, validate({ params: signToken.extend({ fieldId: z.string().min(1) }), body: z.object({ value: z.string().max(700_000).nullable() }) }), wrap(signingController.setField))
publicRouter.post('/api/sign/:token/finish', signLimiter, validate({ params: signToken }), wrap(signingController.finish))
publicRouter.post('/api/sign/:token/decline', signLimiter, validate({ params: signToken, body: z.object({ reason: z.string().max(500).nullable().optional() }) }), wrap(signingController.decline))
publicRouter.get('/api/sign/:token/signed', signLimiter, validate({ params: signToken }), wrap(signingController.publicSigned))

export const api = Router()

// ---- auth
api.post('/auth/login', loginLimiter, validate({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) }), wrap(authController.login))
api.post('/auth/refresh', wrap(authController.refresh))
api.post('/auth/logout', wrap(authController.logout))
api.get('/auth/me', authenticate, wrap(authController.me))
api.post('/auth/change-password', authenticate, validate({ body: z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }) }), wrap(authController.changePassword))
api.get('/auth/signature', authenticate, wrap(authController.signature))
api.put('/auth/signature', authenticate, validate({ body: z.object({ text: z.string().max(2000), enabled: z.boolean(), onReplies: z.boolean() }) }), wrap(authController.setSignature))
api.patch('/auth/profile', authenticate, validate({ body: z.object({ name: z.string().min(1).optional(), schedulingLink: linkStr, timezone: z.string().optional(), workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(), workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional() }) }), wrap(authController.updateProfile))

// everything below requires auth
api.use(authenticate)

// ---- users (admin)
api.get('/users', wrap(userController.list))
api.post('/users', authorize('admin'), validate({ body: z.object({ email: z.string().email(), name: z.string().min(1), role: z.enum(['admin', 'member']), password: z.string().min(8) }) }), wrap(userController.create))
api.patch('/users/:id', authorize('admin'), validate({ params: id, body: z.object({ name: z.string().min(1).optional(), role: z.enum(['admin', 'member']).optional(), isActive: z.boolean().optional(), email: z.string().email().optional() }) }), wrap(userController.update))
api.post('/users/:id/reset-password', authorize('admin'), validate({ params: id, body: z.object({ password: z.string().min(8) }) }), wrap(userController.resetPassword))
api.delete('/users/:id', authorize('admin'), validate({ params: id }), wrap(userController.remove))

// ---- lead statuses
const statusBody = z.object({ name: z.string().min(1).optional(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), isWon: z.boolean().optional(), isLost: z.boolean().optional(), isDefault: z.boolean().optional() })
api.get('/lead-statuses', wrap(leadStatusController.list))
api.post('/lead-statuses', authorize('admin'), validate({ body: statusBody.required({ name: true, color: true }) }), wrap(leadStatusController.create))
api.post('/lead-statuses/reorder', authorize('admin'), validate({ body: z.object({ ids: z.array(z.string()) }) }), wrap(leadStatusController.reorder))
api.patch('/lead-statuses/:id', authorize('admin'), validate({ params: id, body: statusBody }), wrap(leadStatusController.update))
api.delete('/lead-statuses/:id', authorize('admin'), validate({ params: id }), wrap(leadStatusController.remove))

// ---- leads
const leadBody = z.object({ firstName: z.string().min(1).optional(), lastName: z.string().optional(), email: z.string().email().nullable().optional(), phone: nullableStr, title: nullableStr, companyId: nullableStr, statusId: nullableStr, ownerId: nullableStr, source: nullableStr, score: z.number().int().min(0).max(100).optional(), linkedinUrl: linkStr, notes: nullableStr })
api.get('/leads', wrap(leadController.list))
api.post('/leads', validate({ body: leadBody.required({ firstName: true }) }), wrap(leadController.create))
api.get('/leads/:id', validate({ params: id }), wrap(leadController.get))
api.patch('/leads/:id', validate({ params: id, body: leadBody }), wrap(leadController.update))
api.post('/leads/:id/move', validate({ params: id, body: z.object({ statusId: z.string(), dealId: z.string().optional() }) }), wrap(leadController.move))
api.post('/leads/:id/archive', validate({ params: id, body: z.object({ archived: z.boolean() }) }), wrap(leadController.archive))
api.delete('/leads/:id', validate({ params: id }), wrap(leadController.remove))
api.get('/leads/:id/activities', validate({ params: id }), wrap(leadController.activities))
api.post('/leads/:id/activities', validate({ params: id, body: z.object({ text: z.string().min(1) }) }), wrap(leadController.addNote))
api.post('/leads/:id/enrich', validate({ params: id }), wrap(leadController.enrich))
api.post('/leads/import', upload.single('file'), wrap(leadController.importFile))

// ---- companies
const companyBody = z.object({ name: z.string().min(1).optional(), domain: nullableStr, domains: z.array(z.string()).max(20).optional(), website: linkStr, industry: nullableStr, size: nullableStr, location: nullableStr, description: nullableStr, linkedinUrl: linkStr, ownerId: nullableStr, isSupplier: z.boolean().optional() })
api.get('/companies', wrap(companyController.list))
api.get('/companies/check-domain', validate({ query: z.object({ domain: z.string().min(1) }) }), wrap(companyController.checkDomain))
api.post('/companies', validate({ body: companyBody.required({ name: true }) }), wrap(companyController.create))
api.get('/companies/:id', validate({ params: id }), wrap(companyController.get))
api.patch('/companies/:id', validate({ params: id, body: companyBody }), wrap(companyController.update))
api.delete('/companies/:id', validate({ params: id }), wrap(companyController.remove))
api.post('/companies/:id/enrich', validate({ params: id }), wrap(companyController.enrich))
// ---- deals (a company's deals; the default one always exists)
const dealBody = z.object({ name: z.string().min(1).max(120).optional(), statusId: z.string().optional(), ownerId: nullableStr, amount: z.number().min(0).nullable().optional(), expectedCloseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), contactLeadId: nullableStr })
api.post('/companies/:id/deals', validate({ params: id, body: dealBody.extend({ leadIds: z.array(z.string()).optional() }).required({ name: true }) }), wrap(dealController.create))
api.get('/deals', wrap(dealController.list))
api.patch('/deals/:id', validate({ params: id, body: dealBody }), wrap(dealController.update))
api.put('/deals/:id/leads', validate({ params: id, body: z.object({ leadIds: z.array(z.string()) }) }), wrap(dealController.setLeads))
api.delete('/deals/:id', validate({ params: id }), wrap(dealController.remove))
api.get('/companies/:id/suggestions', validate({ params: id }), wrap(companyController.suggestions))
api.post('/companies/:id/suggestions/accept', validate({ params: id, body: z.object({ leadIds: z.array(z.string()).optional(), threadIds: z.array(z.string()).optional() }) }), wrap(companyController.acceptSuggestions))

// ---- google
api.get('/google/oauth-config', authorize('admin'), wrap(googleController.getConfig))
api.put('/google/oauth-config', authorize('admin'), validate({ body: z.object({ clientId: z.string().min(1), clientSecret: z.string().optional(), redirectUri: z.string().url(), pubsubTopic: nullableStr }) }), wrap(googleController.saveConfig))
api.get('/google/connect-url', wrap(googleController.connectUrl))
api.get('/google/account', wrap(googleController.account))
api.delete('/google/account', wrap(googleController.disconnect))
api.get('/google/accounts', authorize('admin'), wrap(googleController.accounts))

// ---- emails
const sendBody = z.object({ to: z.array(z.string().min(3)).min(1), cc: z.array(z.string()).optional(), bcc: z.array(z.string()).optional(), subject: z.string(), bodyText: z.string().min(1), bodyHtml: z.string().optional(), threadId: z.string().optional(), leadId: nullableStr, trackOpens: z.boolean().optional(), trackClicks: z.boolean().optional(), includeSignature: z.boolean().optional() })
api.get('/emails/threads', wrap(emailController.threads))
api.get('/emails/unread', wrap(emailController.unread))
api.get('/emails/threads/:id', validate({ params: id }), wrap(emailController.thread))
api.post('/emails/threads/:id/read', validate({ params: id }), wrap(emailController.markRead))
api.post('/emails/send', validate({ body: sendBody }), wrap(emailController.send))
api.get('/emails/messages/:id/html', validate({ params: id }), wrap(emailController.messageHtml))
api.post('/emails/threads/:id/reply', validate({ params: id, body: sendBody.partial({ to: true, subject: true }) }), wrap(emailController.reply))
api.post('/emails/threads/:id/link', validate({ params: id, body: z.object({ leadId: z.string().nullable().optional(), companyId: z.string().optional(), companyName: z.string().trim().min(1).max(120).optional() }) }), wrap(emailController.link))
api.post('/emails/threads/:id/supplier', validate({ params: id, body: z.object({ companyId: z.string().optional(), companyName: z.string().min(1).max(120).optional() }) }), wrap(emailController.setSupplier))
api.delete('/emails/threads/:id', validate({ params: id }), wrap(emailController.remove))
api.post('/emails/threads/:id/convert', validate({ params: id }), wrap(emailController.convert))
api.post('/emails/threads/:id/archive', validate({ params: id, body: z.object({ archived: z.boolean() }) }), wrap(emailController.archive))
api.post('/emails/sync', wrap(emailController.sync))
api.post('/emails/sync/older', wrap(emailController.syncOlder))

// ---- drafts
api.get('/drafts', wrap(draftController.list))
api.post('/drafts/generate', validate({ body: z.object({ threadId: z.string().optional(), leadId: z.string().optional(), kind: z.enum(['reply', 'new', 'follow_up']), instructions: z.string().optional() }) }), wrap(draftController.generate))
api.patch('/drafts/:id', validate({ params: id, body: z.object({ subject: z.string().optional(), bodyText: z.string().optional() }) }), wrap(draftController.update))
api.post('/drafts/:id/dismiss', validate({ params: id }), wrap(draftController.dismiss))
api.post('/drafts/:id/send', validate({ params: id, body: z.object({ to: z.array(z.string()).optional(), subject: z.string().optional(), bodyText: z.string().optional() }).optional() }), wrap(draftController.send))

// ---- knowledge
api.get('/knowledge/sources', wrap(knowledgeController.list))
api.post('/knowledge/upload', authorize('admin'), upload.array('files', 10), wrap(knowledgeController.upload))
api.post('/knowledge/website', authorize('admin'), validate({ body: z.object({ url: z.string().url(), crawl: z.boolean().optional(), depth: z.number().int().min(0).max(3).optional() }) }), wrap(knowledgeController.website))
api.post('/knowledge/sources/:id/reindex', authorize('admin'), validate({ params: id }), wrap(knowledgeController.reindex))
api.delete('/knowledge/sources/:id', authorize('admin'), validate({ params: id }), wrap(knowledgeController.remove))
api.post('/knowledge/search', validate({ body: z.object({ query: z.string().min(1) }) }), wrap(knowledgeController.search))

// ---- tasks (private to their creator)
const taskBody = z.object({ title: z.string().min(1).max(200).optional(), summary: z.string().max(2000).nullable().optional(), status: z.enum(['open', 'done']).optional(), dueAt: z.string().nullable().optional(), assigneeId: z.string().nullable().optional(), threadId: z.string().nullable().optional(), leadId: z.string().nullable().optional(), companyId: z.string().nullable().optional() })
api.get('/tasks', wrap(taskController.list))
api.get('/tasks/open-count', wrap(taskController.openCount))
api.post('/tasks', validate({ body: taskBody.required({ title: true }) }), wrap(taskController.create))
api.post('/tasks/suggest', validate({ body: z.object({ threadId: z.string() }) }), wrap(taskController.suggest))
api.patch('/tasks/:id', validate({ params: id, body: taskBody }), wrap(taskController.update))
api.delete('/tasks/:id', validate({ params: id }), wrap(taskController.remove))

// ---- document signing (owner side; a request is visible to its owner and to admins)
const signId = id.extend({ docId: z.string().min(1).optional(), rid: z.string().min(1).optional() })
const signDays = z.number().int().min(1).max(60).nullable().optional()
const signRequestBody = z.object({ title: z.string().min(1).max(200).optional(), message: z.string().max(4000).nullable().optional(), companyId: nullableStr, dealId: nullableStr, sequential: z.boolean().optional(), requireCode: z.boolean().optional(), remindAfterDays: signDays, remindEveryDays: signDays, remindMax: z.number().int().min(0).max(10).nullable().optional(), expiresAt: z.string().nullable().optional() })
const signRecipient = z.object({ id: z.string().optional(), role: z.enum(['signer', 'copy']).optional(), name: z.string().min(1).max(120), email: z.string().max(200), leadId: nullableStr, userId: nullableStr })
const signField = z.object({ documentId: z.string(), recipientId: z.string(), type: z.enum(['signature', 'initials', 'name', 'date', 'text', 'checkbox']), page: z.number().int().min(1), x: z.number(), y: z.number(), w: z.number(), h: z.number(), required: z.boolean().optional(), label: z.string().max(80).nullable().optional() })
api.get('/signing/requests', wrap(signingController.list))
api.get('/signing/recipient-suggestions', wrap(signingController.suggestions))
api.post('/signing/requests', validate({ body: z.object({ title: z.string().trim().min(1).max(200), companyId: nullableStr, dealId: nullableStr, threadId: nullableStr, isTemplate: z.boolean().optional() }) }), wrap(signingController.create))
api.get('/signing/requests/:id', validate({ params: id }), wrap(signingController.get))
api.patch('/signing/requests/:id', validate({ params: id, body: signRequestBody }), wrap(signingController.update))
api.delete('/signing/requests/:id', validate({ params: id }), wrap(signingController.remove))
api.post('/signing/requests/:id/documents', validate({ params: id }), upload.array('files', 10), wrap(signingController.addDocuments))
api.post('/signing/requests/:id/documents/reorder', validate({ params: id, body: z.object({ ids: z.array(z.string()).max(10) }) }), wrap(signingController.reorderDocuments))
api.get('/signing/requests/:id/documents/:docId/file', validate({ params: signId }), wrap(signingController.documentFile))
api.delete('/signing/requests/:id/documents/:docId', validate({ params: signId }), wrap(signingController.removeDocument))
api.put('/signing/requests/:id/recipients', validate({ params: id, body: z.object({ recipients: z.array(signRecipient).max(20) }) }), wrap(signingController.setRecipients))
api.put('/signing/requests/:id/fields', validate({ params: id, body: z.object({ fields: z.array(signField).max(500) }) }), wrap(signingController.setFields))
api.post('/signing/requests/:id/send', validate({ params: id }), wrap(signingController.send))
api.post('/signing/requests/:id/void', validate({ params: id, body: z.object({ reason: z.string().max(500).nullable().optional() }) }), wrap(signingController.void))
api.post('/signing/requests/:id/duplicate', validate({ params: id, body: z.object({ asTemplate: z.boolean().optional(), title: z.string().max(200).optional(), companyId: nullableStr }) }), wrap(signingController.duplicate))
api.post('/signing/requests/:id/recipients/:rid/remind', validate({ params: signId }), wrap(signingController.remind))
api.get('/signing/requests/:id/recipients/:rid/link', validate({ params: signId }), wrap(signingController.recipientLink))
api.get('/signing/requests/:id/signed', validate({ params: id }), wrap(signingController.signedFile))

// ---- calendar
api.get('/calendar/week', validate({ query: z.object({ from: z.string(), to: z.string() }) }), wrap(calendarController.week))
api.get('/calendar/slots', wrap(calendarController.slots))
api.post('/calendar/meetings', validate({ body: z.object({ leadId: nullableStr, title: z.string().min(1), start: z.string(), end: z.string(), attendees: z.array(z.string().email()).optional(), description: z.string().optional(), meet: z.boolean().optional() }) }), wrap(calendarController.create))

// ---- misc
api.get('/version', wrap(miscController.version))
api.get('/dashboard', wrap(miscController.dashboard))
api.get('/notifications', wrap(miscController.notifications))
api.post('/notifications/read-all', wrap(miscController.markAllRead))
api.patch('/notifications/:id/read', validate({ params: id }), wrap(miscController.markRead))
api.get('/tracking/overview', wrap(miscController.trackingOverview))
api.get('/settings/ai', authorize('admin'), wrap(miscController.aiSettings))
api.put('/settings/ai', authorize('admin'), validate({ body: z.object({ anthropicApiKey: z.string().optional(), voyageApiKey: z.string().optional(), draftModel: z.string().optional(), enrichModel: z.string().optional() }) }), wrap(miscController.saveAiSettings))
api.get('/settings/workspace', wrap(miscController.workspaceSettings))
api.put('/settings/workspace', authorize('admin'), validate({ body: z.object({ autoCreateLeads: z.boolean().optional(), autoDraftReplies: z.boolean().optional() }) }), wrap(miscController.saveWorkspaceSettings))
