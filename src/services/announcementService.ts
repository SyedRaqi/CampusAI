import { supabase } from '../lib/supabase'

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived' | 'cancelled'
export type AnnouncementCategory = 'academic' | 'events' | 'career' | 'clubs' | 'student_support' | 'general' | 'system'
export interface AnnouncementAudience {
  role?: 'student' | 'faculty' | 'admin' | ''
  department?: string
  semester?: number | ''
  section?: string
}
export interface AnnouncementRecord {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  category: AnnouncementCategory
  priority: 'normal' | 'important' | 'urgent'
  status: AnnouncementStatus
  author_id: string
  published_at: string | null
  scheduled_at: string | null
  expires_at: string | null
  is_pinned: boolean
  requires_acknowledgement: boolean
  attachment_paths: string[]
  created_at: string
  updated_at: string
}

export interface AnnouncementInput extends Omit<AnnouncementRecord, 'id' | 'author_id' | 'published_at' | 'created_at' | 'updated_at'> {
  id?: string
  audiences: AnnouncementAudience[]
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  return supabase
}

export async function getAnnouncements(page = 0, adminMode = false): Promise<AnnouncementRecord[]> {
  let query = client().from('announcements').select('*').order('is_pinned', { ascending: false }).order('published_at', { ascending: false })
  if (!adminMode) query = query.eq('status', 'published')
  const { data, error } = await query.range(page * 20, page * 20 + 19)
  if (error) throw new Error('Unable to load announcements.')
  return (data ?? []) as AnnouncementRecord[]
}

export async function getAnnouncement(id: string): Promise<AnnouncementRecord | null> {
  const { data, error } = await client().from('announcements').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error('Unable to load this announcement.')
  return data as AnnouncementRecord | null
}

export async function getAnnouncementAudience(id: string): Promise<AnnouncementAudience[]> {
  const { data, error } = await client()
    .from('announcement_audiences')
    .select('role,department,semester,section')
    .eq('announcement_id', id)
  if (error) throw new Error('Unable to load the announcement audience.')
  return (data ?? []) as AnnouncementAudience[]
}

export async function saveAnnouncement(input: AnnouncementInput): Promise<string> {
  const { data, error } = await client().rpc('save_announcement', {
    target_id: input.id ?? null,
    announcement_title: input.title.trim(),
    announcement_slug: input.slug.trim(),
    announcement_summary: input.summary.trim(),
    announcement_content: input.content.trim(),
    announcement_category: input.category,
    announcement_priority: input.priority,
    announcement_status: input.status,
    announcement_scheduled_at: input.scheduled_at,
    announcement_expires_at: input.expires_at,
    announcement_is_pinned: input.is_pinned,
    announcement_requires_acknowledgement: input.requires_acknowledgement,
    announcement_attachment_paths: input.attachment_paths,
    announcement_audiences: input.audiences,
  })
  if (error || !data) throw new Error('Unable to save this announcement. Verify the form and administrator permission.')
  return data as string
}

export async function acknowledgeAnnouncement(id: string): Promise<void> {
  const { data: userData, error: userError } = await client().auth.getUser()
  if (userError || !userData.user) throw new Error('Sign in to acknowledge this announcement.')
  const { error } = await client().from('announcement_acknowledgements')
    .upsert({ announcement_id: id, user_id: userData.user.id }, { onConflict: 'announcement_id,user_id', ignoreDuplicates: true })
  if (error) throw new Error('Unable to record acknowledgement.')
}

export async function hasAcknowledgedAnnouncement(id: string): Promise<boolean> {
  const { data, error } = await client().from('announcement_acknowledgements').select('id').eq('announcement_id', id).maybeSingle()
  if (error && error.code !== 'PGRST116') throw new Error('Unable to check acknowledgement status.')
  return Boolean(data)
}

export async function getAcknowledgementCount(id: string): Promise<number> {
  const { count, error } = await client().from('announcement_acknowledgements')
    .select('id', { count: 'exact', head: true }).eq('announcement_id', id)
  if (error) throw new Error('Unable to load acknowledgement metrics.')
  return count ?? 0
}

export async function getAnnouncementAttachmentUrl(path: string): Promise<string> {
  const { data, error } = await client().storage.from('campus-announcements-private').createSignedUrl(path, 90)
  if (error || !data?.signedUrl) throw new Error('This attachment is unavailable or you are not eligible to view it.')
  return data.signedUrl
}

export async function uploadAnnouncementAttachments(files: File[]): Promise<string[]> {
  if (files.length > 10) throw new Error('Choose no more than 10 announcement attachments.')
  const paths: string[] = []
  for (const file of files) {
    if (file.size === 0 || file.size > 10 * 1024 * 1024 || ![
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    ].includes(file.type)) {
      throw new Error('Attachments must be PDF, JPG, PNG, or WebP files under 10 MB.')
    }
    const suffix = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : 'webp'
    const path = `${crypto.randomUUID()}.${suffix}`
    const { error } = await client().storage.from('campus-announcements-private').upload(path, file, { contentType: file.type })
    if (error) {
      if (paths.length) await client().storage.from('campus-announcements-private').remove(paths)
      throw new Error('An announcement attachment could not be uploaded.')
    }
    paths.push(path)
  }
  return paths
}
