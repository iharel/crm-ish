/** calendarController — availability, slots, meetings. */
import type { Request, Response } from 'express'
import { calendarManager } from '../managers/calendarManager.ts'
import { requireUser } from '../middleware/authorize.ts'

export const calendarController = {
  async week(req: Request, res: Response) { const q = req.query as Record<string, string>; res.json(await calendarManager.week(requireUser(req).id, q.from, q.to)) },
  async slots(req: Request, res: Response) { res.json(await calendarManager.proposeSlots(requireUser(req).id, Number(req.query.n ?? 3))) },
  async create(req: Request, res: Response) { res.json(await calendarManager.createMeeting(requireUser(req).id, req.body)) },
}
