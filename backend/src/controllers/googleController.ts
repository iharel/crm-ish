/** googleController — OAuth config (admin), connect flow, account status. */
import type { Request, Response } from 'express'
import { CONSTANTS } from '../constants.ts'
import { googleManager } from '../managers/googleManager.ts'
import { emailManager } from '../managers/emailManager.ts'
import { requireUser } from '../middleware/authorize.ts'

export const googleController = {
  async getConfig(_req: Request, res: Response) { res.json(googleManager.getConfig()) },
  async saveConfig(req: Request, res: Response) { res.json(googleManager.saveConfig(req.body, requireUser(req).id)) },
  async connectUrl(req: Request, res: Response) { res.json({ url: googleManager.connectUrl(requireUser(req).id) }) },
  async callback(req: Request, res: Response) {
    const { code, state, error } = req.query as Record<string, string | undefined>
    if (error || !code || !state) { res.redirect(`${CONSTANTS.FRONTEND_URL}/settings?google=error&reason=${encodeURIComponent(error ?? 'missing_code')}`); return }
    try {
      const r = await googleManager.handleCallback(code, state)
      emailManager.syncUser(r.userId).catch(() => undefined)
      res.redirect(`${CONSTANTS.FRONTEND_URL}/settings?google=connected`)
    } catch (e) { res.redirect(`${CONSTANTS.FRONTEND_URL}/settings?google=error&reason=${encodeURIComponent((e as Error).message)}`) }
  },
  async account(req: Request, res: Response) { res.json(googleManager.account(requireUser(req).id)) },
  async disconnect(req: Request, res: Response) { googleManager.disconnect(requireUser(req).id); res.json({ ok: true }) },
  async accounts(_req: Request, res: Response) { res.json(googleManager.accountsOverview()) },
}
