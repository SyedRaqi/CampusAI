import { supabase } from '../lib/supabase'
import type { Resource, ResourceType } from '../types'
import { normalizeResource } from '../utils/resourceFormat'

const resourceColumns = 'id,title,description,resource_type,subject_id,branch_id,semester,section,file_name,file_type,file_size,thumbnail_url,uploaded_by,uploader_role,status,visibility,download_count,view_count,save_count,moderation_reason,version,replaces_resource_id,created_at,updated_at,subject:subjects(id,subject_code,subject_name,branch_id,semester,description,is_demo,is_active,branch:branches(id,code,name,is_demo,is_active))'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

async function currentUserId(): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('Sign in to use saved resources.')
  return data.user.id
}

export async function toggleBookmark(resourceId: string): Promise<boolean> {
  const client = requireSupabase()
  const userId = await currentUserId()
  const { data: bookmark, error: readError } = await client.from('resource_bookmarks')
    .select('id').eq('resource_id', resourceId).eq('user_id', userId).maybeSingle()
  if (readError) throw new Error('Unable to update this bookmark.')

  if (bookmark) {
    const { error } = await client.from('resource_bookmarks').delete().eq('id', bookmark.id)
    if (error) throw new Error('Unable to remove this bookmark.')
    return false
  }

  const { error } = await client.from('resource_bookmarks').insert({ resource_id: resourceId, user_id: userId })
  if (error) throw new Error('Unable to save this resource.')
  return true
}

export async function getSavedResources(filters: {
  page?: number
  pageSize?: number
  branchId?: string
  semester?: number
  subjectId?: string
  resourceType?: string
} = {}): Promise<{ resources: Resource[]; count: number }> {
  const client = requireSupabase()
  const userId = await currentUserId()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 12
  let query = client.from('resource_bookmarks')
    .select(`id,created_at,resource:resources!inner(${resourceColumns})`, { count: 'exact' })
    .eq('user_id', userId)
    .eq('resource.status', 'published')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)
  if (filters.branchId) query = query.eq('resource.branch_id', filters.branchId)
  if (filters.semester) query = query.eq('resource.semester', filters.semester)
  if (filters.subjectId) query = query.eq('resource.subject_id', filters.subjectId)
  if (filters.resourceType) query = query.eq('resource.resource_type', filters.resourceType)

  const { data, error, count } = await query
  if (error) throw new Error('Unable to load saved resources.')
  const resources = (data ?? []).flatMap((row) => {
    const resource = row.resource as unknown
    return resource ? [{ ...normalizeResource(resource), is_bookmarked: true }] : []
  })
  return { resources, count: count ?? 0 }
}

export async function isBookmarked(resourceId: string): Promise<boolean> {
  const client = requireSupabase()
  const userId = await currentUserId()
  const { data, error } = await client.from('resource_bookmarks')
    .select('id').eq('resource_id', resourceId).eq('user_id', userId).maybeSingle()
  if (error) throw new Error('Unable to check saved status.')
  return Boolean(data)
}

export function isResourceType(value: string): value is ResourceType {
  return ['notes', 'question_paper', 'lab_manual', 'assignment', 'presentation', 'study_material', 'reference_document', 'ebook', 'syllabus', 'important_questions', 'other'].includes(value)
}
