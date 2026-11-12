/** attachmentRepository — email_attachments rows (metadata; bytes live on disk). */
import { nanoid } from 'nanoid'
import { all, get, nowIso, run } from '../db/dbAccessor.ts'
import type { AttachmentRow } from '../types/index.ts'

export const attachmentRepository = {
  byId(id: string) { return get<AttachmentRow>('SELECT * FROM email_attachments WHERE id = ?', id) },
  byMessage(messageId: string): AttachmentRow[] { return all<AttachmentRow>('SELECT * FROM email_attachments WHERE message_id = ? ORDER BY is_inline, filename', messageId) },
  byThread(threadId: string): AttachmentRow[] { return all<AttachmentRow>('SELECT a.* FROM email_attachments a JOIN email_messages m ON m.id = a.message_id WHERE m.thread_id = ?', threadId) },
  create(d: Omit<AttachmentRow, 'id' | 'created_at'>) {
    const id = nanoid(14)
    run('INSERT INTO email_attachments (id,message_id,gmail_attachment_id,filename,mime,size,content_id,is_inline,file_path,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', id, d.message_id, d.gmail_attachment_id, d.filename, d.mime, d.size, d.content_id, d.is_inline, d.file_path, nowIso())
    return this.byId(id)!
  },
  setFilePath(id: string, filePath: string | null) { run('UPDATE email_attachments SET file_path = ? WHERE id = ?', filePath, id) },
}
