/** Shared backend types (rows are snake_case as stored; DTOs are camelCase). */
export type Role = 'admin' | 'member'

export interface UserRow { id: string; email: string; password_hash: string; name: string; role: Role; avatar_url: string | null; scheduling_link: string | null; timezone: string; working_hours_start: string; working_hours_end: string; is_active: number; must_change_password: number; created_at: string; updated_at: string }
export interface UserDto { id: string; email: string; name: string; role: Role; avatarUrl: string | null; schedulingLink: string | null; timezone: string; workingHoursStart: string; workingHoursEnd: string; isActive: boolean; mustChangePassword: boolean; createdAt: string; gmail?: { email: string; status: string; lastSyncAt: string | null } | null }

export interface AuthUser { id: string; email: string; role: Role; name: string }

export interface LeadStatusRow { id: string; name: string; color: string; sort_order: number; is_won: number; is_lost: number; is_default: number }
export interface CompanyRow { /** 1 = supplier: no default deal; its contacts stay out of the pipeline until they join a deal. */ is_supplier: number; id: string; name: string; domain: string | null; website: string | null; industry: string | null; size: string | null; location: string | null; description: string | null; logo_url: string | null; linkedin_url: string | null; enrichment_json: string | null; enriched_at: string | null; owner_id: string | null; created_at: string; updated_at: string }
/** One domain owned by a company; `domain` is lower-cased and unique across all companies. */
export interface CompanyDomainRow { id: string; company_id: string; domain: string; is_primary: number; created_at: string }
export interface LeadRow { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; title: string | null; company_id: string | null; status_id: string | null; owner_id: string | null; source: string | null; score: number; linkedin_url: string | null; notes: string | null; enrichment_json: string | null; enriched_at: string | null; last_activity_at: string | null; archived_at?: string | null; created_at: string; updated_at: string }
/** A deal with a company; `is_default` marks the company's single default deal. */
export interface DealRow { id: string; company_id: string; name: string; status_id: string | null; owner_id: string | null; amount: number | null; expected_close_date: string | null; /** Chosen contact person (a lead of the deal); null = not chosen. */ contact_lead_id: string | null; is_default: number; closed_at: string | null; created_at: string; updated_at: string }
export interface ActivityRow { id: string; lead_id: string; user_id: string | null; type: string; payload_json: string | null; created_at: string }

export interface GoogleAccountRow { id: string; user_id: string; email: string; access_token_enc: string; refresh_token_enc: string; expiry: string | null; scopes: string | null; history_id: string | null; watch_expiry: string | null; calendar_id: string; status: string; last_sync_at: string | null; last_error: string | null; created_at: string }
export interface ThreadRow { id: string; google_account_id: string; gmail_thread_id: string; subject: string | null; snippet: string | null; lead_id: string | null; company_id: string | null; last_message_at: string | null; unread: number; archived: number; created_at: string }
export interface MessageRow { id: string; thread_id: string; gmail_message_id: string | null; direction: 'in' | 'out'; from_addr: string | null; to_json: string | null; cc_json: string | null; bcc_json: string | null; subject: string | null; body_text: string | null; body_html: string | null; sent_at: string | null; tracking_token: string | null; status: string; attachments_scanned: number; created_at: string }
/** One MIME part of a message with a filename or Content-ID; bytes live on disk at file_path (null when the import download failed). */
export interface AttachmentRow { id: string; message_id: string; gmail_attachment_id: string | null; filename: string | null; mime: string; size: number; content_id: string | null; is_inline: number; file_path: string | null; created_at: string }
export interface EventRow { id: string; message_id: string; type: string; ip: string | null; user_agent: string | null; url: string | null; created_at: string }
export interface DraftRow { id: string; thread_id: string | null; lead_id: string | null; user_id: string; kind: string; subject: string | null; body_html: string | null; body_text: string | null; citations_json: string | null; slots_json: string | null; model: string | null; confidence: number | null; status: string; created_at: string; updated_at: string }
export interface SourceRow { id: string; type: 'document' | 'website'; title: string; url: string | null; file_path: string | null; mime: string | null; status: string; error: string | null; chunk_count: number; created_by: string | null; created_at: string; updated_at: string }
export interface ChunkRow { id: string; source_id: string; chunk_index: number; content: string; token_count: number | null; metadata_json: string | null; embedding: Buffer | null }
export interface MeetingRow { id: string; lead_id: string | null; user_id: string; google_event_id: string | null; title: string; starts_at: string; ends_at: string; meet_link: string | null; status: string; created_at: string }
export interface TaskRow { id: string; title: string; summary: string | null; status: 'open' | 'done'; due_at: string | null; assignee_id: string | null; created_by: string | null; thread_id: string | null; lead_id: string | null; company_id: string | null; completed_at: string | null; created_at: string; updated_at: string }
export interface NotificationRow { id: string; user_id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

export interface Citation { sourceId: string; sourceTitle: string; snippet: string; score: number }

// ---- document signing
export type SignRequestStatus = 'draft' | 'sent' | 'completed' | 'declined' | 'voided' | 'expired'
export type SignRecipientRole = 'signer' | 'copy'
export type SignRecipientStatus = 'pending' | 'sent' | 'opened' | 'signed' | 'declined'
export type SignFieldType = 'signature' | 'initials' | 'name' | 'date' | 'text' | 'checkbox'
/** One signing request: 1+ PDFs, 1+ recipients, the fields, the message and the reminder settings. `is_template` = reusable blueprint, never sent. */
export interface SignRequestRow { id: string; owner_id: string; company_id: string | null; deal_id: string | null; thread_id: string | null; title: string; message: string | null; status: SignRequestStatus; is_template: number; sequential: number; require_code: number; remind_after_days: number | null; remind_every_days: number | null; remind_max: number | null; expires_at: string | null; signed_file_path: string | null; signed_sha256: string | null; void_reason: string | null; sent_at: string | null; completed_at: string | null; created_at: string; updated_at: string }
export interface SignDocumentRow { id: string; request_id: string; filename: string; file_path: string; sha256: string; page_count: number; size: number; sort_order: number }
/** `token_hash` is the SHA-256 of the recipient's link secret; the secret itself is derived, never stored. */
export interface SignRecipientRow { id: string; request_id: string; role: SignRecipientRole; name: string; email: string; lead_id: string | null; user_id: string | null; sort_order: number; token_hash: string; status: SignRecipientStatus; decline_reason: string | null; reminders_sent: number; last_reminded_at: string | null; consented_at: string | null; signed_at: string | null; signed_ip: string | null; signed_user_agent: string | null }
/** A rectangle on one page; x/y/w/h are fractions of the displayed page, origin top-left. `value` is text, 'true' for a ticked box, or a PNG path for drawn signatures. */
export interface SignFieldRow { id: string; request_id: string; document_id: string; recipient_id: string; type: SignFieldType; page: number; x: number; y: number; w: number; h: number; required: number; label: string | null; value: string | null; filled_at: string | null }
export interface SignEventRow { id: string; request_id: string; recipient_id: string | null; type: string; ip: string | null; user_agent: string | null; meta_json: string | null; created_at: string }
