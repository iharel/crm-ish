/** authController — login/refresh/logout/me/change-password. */
import type { Request, Response } from 'express'
import { signatureManager } from '../managers/signatureManager.ts'
import { CONSTANTS } from '../constants.ts'
import { authManager } from '../managers/authManager.ts'
import { userManager } from '../managers/userManager.ts'
import { requireUser } from '../middleware/authorize.ts'

const COOKIE = 'crm_rt'
function setRefreshCookie(res: Response, token: string) {
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: CONSTANTS.PUBLIC_URL.startsWith('https'), maxAge: CONSTANTS.REFRESH_TTL_SEC * 1000, path: '/api/auth' })
}

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body as { email: string; password: string }
    const r = await authManager.login(email, password)
    setRefreshCookie(res, r.refreshToken)
    res.json({ accessToken: r.accessToken, user: r.user })
  },
  async refresh(req: Request, res: Response) {
    const token = (req.cookies?.[COOKIE] as string | undefined) ?? (req.body?.refreshToken as string | undefined)
    const r = authManager.refresh(token ?? '')
    setRefreshCookie(res, r.refreshToken)
    res.json({ accessToken: r.accessToken, user: r.user })
  },
  async logout(req: Request, res: Response) {
    authManager.logout(req.cookies?.[COOKIE])
    res.clearCookie(COOKIE, { path: '/api/auth' })
    res.json({ ok: true })
  },
  async me(req: Request, res: Response) { res.json(userManager.get(requireUser(req).id)) },
  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string }
    await authManager.changePassword(requireUser(req).id, currentPassword, newPassword)
    res.json({ ok: true })
  },
  async signature(req: Request, res: Response) { res.json(signatureManager.get(requireUser(req).id)) },
  async setSignature(req: Request, res: Response) { res.json(signatureManager.set(requireUser(req).id, req.body)) },
  async updateProfile(req: Request, res: Response) { res.json(userManager.updateProfile(requireUser(req).id, req.body)) },
}
