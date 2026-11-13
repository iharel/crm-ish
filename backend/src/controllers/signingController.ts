/** signingController — document signing: the owner's API (authenticated) and the signer's API (public, by link secret). */
import type { Request, Response } from 'express'
import { signingManager, type SignerContext } from '../managers/signingManager.ts'
import { badRequest } from '../middleware/errors.ts'
import { requireUser } from '../middleware/authorize.ts'

const id = (req: Request, key = 'id') => req.params[key] as string
/** Who is on the other end of a public call (recorded with every step) plus their code session. */
const ctx = (req: Request): SignerContext => ({ ip: req.ip, userAgent: req.headers['user-agent'], session: typeof req.headers['x-sign-session'] === 'string' ? req.headers['x-sign-session'] : undefined })
/** PDFs are always handed over as downloads from our origin, never rendered by it. */
function sendPdf(res: Response, file: { path: string; filename: string }) {
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`)
  return new Promise<void>((resolve, reject) => { res.sendFile(file.path, (err) => (err ? reject(err) : resolve())) })
}

export const signingController = {
  // ---- owner
  async list(req: Request, res: Response) { const q = req.query as Record<string, string | undefined>; res.json(signingManager.list(requireUser(req), { companyId: q.companyId || undefined, template: q.template === 'true' })) },
  async create(req: Request, res: Response) { res.json(signingManager.create(requireUser(req), req.body)) },
  async get(req: Request, res: Response) { res.json(signingManager.get(requireUser(req), id(req))) },
  async update(req: Request, res: Response) { res.json(signingManager.update(requireUser(req), id(req), req.body)) },
  async remove(req: Request, res: Response) { await signingManager.remove(requireUser(req), id(req)); res.json({ ok: true }) },
  async addDocuments(req: Request, res: Response) {
    const files = (req.files as Express.Multer.File[] | undefined) ?? []
    if (!files.length) throw badRequest('No files uploaded')
    res.json(await signingManager.addDocuments(requireUser(req), id(req), files))
  },
  async removeDocument(req: Request, res: Response) { res.json(await signingManager.removeDocument(requireUser(req), id(req), id(req, 'docId'))) },
  async reorderDocuments(req: Request, res: Response) { res.json(signingManager.reorderDocuments(requireUser(req), id(req), (req.body as { ids: string[] }).ids)) },
  async documentFile(req: Request, res: Response) { await sendPdf(res, signingManager.documentFile(requireUser(req), id(req), id(req, 'docId'))) },
  async setRecipients(req: Request, res: Response) { res.json(signingManager.setRecipients(requireUser(req), id(req), (req.body as { recipients: never[] }).recipients)) },
  async setFields(req: Request, res: Response) { res.json(signingManager.setFields(requireUser(req), id(req), (req.body as { fields: never[] }).fields)) },
  async send(req: Request, res: Response) { res.json(await signingManager.send(requireUser(req), id(req))) },
  async void(req: Request, res: Response) { res.json(await signingManager.void(requireUser(req), id(req), (req.body as { reason?: string | null }).reason ?? null)) },
  async duplicate(req: Request, res: Response) { res.json(await signingManager.duplicate(requireUser(req), id(req), req.body ?? {})) },
  async remind(req: Request, res: Response) { res.json(await signingManager.remind(requireUser(req), id(req), id(req, 'rid'))) },
  async recipientLink(req: Request, res: Response) { res.json(signingManager.recipientLink(requireUser(req), id(req), id(req, 'rid'))) },
  async signedFile(req: Request, res: Response) { await sendPdf(res, signingManager.signedFile(requireUser(req), id(req))) },
  async suggestions(req: Request, res: Response) { const q = req.query as Record<string, string | undefined>; res.json(signingManager.suggestions(requireUser(req), { companyId: q.companyId || undefined, q: q.q })) },

  // ---- signer (no login: the link secret in the path is the credential)
  async view(req: Request, res: Response) { res.json(await signingManager.view(id(req, 'token'), ctx(req))) },
  async sendCode(req: Request, res: Response) { res.json(await signingManager.sendCode(id(req, 'token'), ctx(req))) },
  async verifyCode(req: Request, res: Response) { res.json(signingManager.verifyCode(id(req, 'token'), (req.body as { code: string }).code, ctx(req))) },
  async publicDocument(req: Request, res: Response) { await sendPdf(res, signingManager.publicDocument(id(req, 'token'), id(req, 'docId'), ctx(req))) },
  async consent(req: Request, res: Response) { res.json(signingManager.consent(id(req, 'token'), ctx(req))) },
  async setField(req: Request, res: Response) { res.json(await signingManager.setField(id(req, 'token'), id(req, 'fieldId'), (req.body as { value: string | null }).value, ctx(req))) },
  async finish(req: Request, res: Response) { res.json(await signingManager.finish(id(req, 'token'), ctx(req))) },
  async decline(req: Request, res: Response) { res.json(await signingManager.decline(id(req, 'token'), (req.body as { reason?: string | null }).reason ?? null, ctx(req))) },
  async publicSigned(req: Request, res: Response) { await sendPdf(res, signingManager.publicSigned(id(req, 'token'), ctx(req))) },
}
