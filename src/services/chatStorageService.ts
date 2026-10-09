import { supabase } from '../lib/supabase'
export const CHAT_BUCKET = 'chat-attachments'
export async function uploadChatAttachment(conversationId: string, file: File): Promise<{ path: string; name: string; type: string; size: number }> {
  if (!supabase) throw new Error('Supabase is not configured.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Attachments must be 10 MB or smaller.')
  const allowed = ['image/png','image/jpeg','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','application/zip']
  if (!allowed.includes(file.type)) throw new Error('This attachment type is not supported.')
  const path = `${conversationId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw new Error('Unable to upload attachment.')
  return { path, name: file.name, type: file.type, size: file.size }
}
export async function getChatAttachmentUrl(path: string): Promise<string> { if (!supabase) throw new Error('Supabase is not configured.'); const { data, error } = await supabase.storage.from(CHAT_BUCKET).createSignedUrl(path, 90); if (error || !data?.signedUrl) throw new Error('Unable to open attachment.'); return data.signedUrl }
