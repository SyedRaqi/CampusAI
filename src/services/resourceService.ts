import { supabase } from '../lib/supabase'
import type { Resource, ResourceReport, ResourceReportReason, ResourceStatus } from '../types'
import { getSafeResourceFile } from './resourceFileUtils'
import { getSubjectById } from './subjectService'
import { recordResourceView } from './resourceViewService'
import { normalizeResource, normalizeResources } from '../utils/resourceFormat'

export const RESOURCE_PAGE_SIZE = 12
const RESOURCE_SELECT = 'id,title,description,resource_type,subject_id,branch_id,semester,section,file_name,file_type,file_size,thumbnail_url,uploaded_by,uploader_role,status,visibility,download_count,view_count,save_count,moderation_reason,version,replaces_resource_id,created_at,updated_at,subject:subjects(id,subject_code,subject_name,branch_id,semester,description,is_demo,is_active,branch:branches(id,code,name,is_demo,is_active))'

export type ResourceSort = 'newest' | 'oldest' | 'views' | 'downloads' | 'az'
export type ResourceFileFilter = 'pdf' | 'word' | 'presentation' | 'image' | 'other'

export type ResourceFilters = {
  search?: string
  resourceType?: string
  branchId?: string
  semester?: number
  subjectId?: string
  fileType?: ResourceFileFilter
  sort?: ResourceSort
  page?: number
  pageSize?: number
}

export type ResourceInput = {
  title: string
  description: string
  resource_type: string
  subject_id: string
  section: string
  visibility: 'students' | 'faculty' | 'all'
  version: string
  replaces_resource_id: string | null
}

export type ResourceAnalytics = {
  total_resources: number
  published_resources: number
  pending_resources: number
  total_downloads: number
  total_views: number
  most_downloaded_title: string | null
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function getFileTypeFilter(filter?: ResourceFileFilter): string[] | undefined {
  if (filter === 'pdf') return ['application/pdf']
  if (filter === 'word') return ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (filter === 'presentation') return ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
  if (filter === 'image') return ['image/png', 'image/jpeg', 'image/webp']
  if (filter === 'other') return ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
  return undefined
}

async function getBookmarkedIds(userId: string, resourceIds: string[]): Promise<Set<string>> {
  if (!resourceIds.length) return new Set()
  const { data, error } = await requireSupabase().from('resource_bookmarks')
    .select('resource_id').eq('user_id', userId).in('resource_id', resourceIds)
  if (error) throw new Error('Unable to load bookmark status.')
  return new Set((data ?? []).map((row) => row.resource_id as string))
}

async function getUploaderNames(resources: Resource[]): Promise<Map<string, string>> {
  const userIds = [...new Set(resources.map((resource) => resource.uploaded_by))]
  if (!userIds.length) return new Map()
  const { data, error } = await requireSupabase().from('profiles')
    .select('auth_user_id,full_name').in('auth_user_id', userIds)
  if (error) throw new Error('Unable to load resource authors.')
  return new Map((data ?? []).map((profile) => [profile.auth_user_id as string, profile.full_name as string]))
}

export async function listResources(filters: ResourceFilters = {}): Promise<{ resources: Resource[]; count: number; page: number; pageSize: number }> {
  const client = requireSupabase()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? RESOURCE_PAGE_SIZE))
  let query = client.from('resources').select(RESOURCE_SELECT, { count: 'exact' }).eq('status', 'published')
  if (filters.resourceType) query = query.eq('resource_type', filters.resourceType)
  if (filters.branchId) query = query.eq('branch_id', filters.branchId)
  if (filters.semester) query = query.eq('semester', filters.semester)
  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId)
  const mimeTypes = getFileTypeFilter(filters.fileType)
  if (mimeTypes) query = query.in('file_type', mimeTypes)

  const search = filters.search?.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)
  if (search) {
    const { data: matchingSubjects, error: subjectError } = await client.from('subjects')
      .select('id').or(`subject_name.ilike.%${search}%,subject_code.ilike.%${search}%`).limit(100)
    if (subjectError) throw new Error('Unable to search subjects.')
    const subjectIds = (matchingSubjects ?? []).map((subject) => subject.id as string)
    const directSearch = `title.ilike.%${search}%,description.ilike.%${search}%`
    query = query.or(subjectIds.length ? `${directSearch},subject_id.in.(${subjectIds.join(',')})` : directSearch)
  }

  if (filters.sort === 'oldest') query = query.order('created_at', { ascending: true })
  else if (filters.sort === 'views') query = query.order('view_count', { ascending: false }).order('created_at', { ascending: false })
  else if (filters.sort === 'downloads') query = query.order('download_count', { ascending: false }).order('created_at', { ascending: false })
  else if (filters.sort === 'az') query = query.order('title', { ascending: true })
  else query = query.order('created_at', { ascending: false })

  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1)
  if (error) throw new Error('Unable to load resources. Please retry.')
  const rows = normalizeResources(data as unknown[] | null)
  const { data: authData } = await client.auth.getUser()
  const bookmarked = authData.user ? await getBookmarkedIds(authData.user.id, rows.map((row) => row.id)) : new Set<string>()
  const uploaderNames = await getUploaderNames(rows)
  return {
    resources: rows.map((resource) => ({ ...resource, uploader_name: uploaderNames.get(resource.uploaded_by), is_bookmarked: bookmarked.has(resource.id) })),
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function getResource(resourceId: string): Promise<Resource | null> {
  const client = requireSupabase()
  const { data, error } = await client.from('resources').select(RESOURCE_SELECT).eq('id', resourceId).maybeSingle()
  if (error) throw new Error('Unable to load this resource.')
  if (!data) return null
  const resource = normalizeResource(data)
  const uploaderNames = await getUploaderNames([resource])
  resource.uploader_name = uploaderNames.get(resource.uploaded_by)
  if (resource.status === 'published') {
    try {
      const incremented = await recordResourceView(resourceId)
      if (incremented) resource.view_count += 1
    } catch {
      // Viewing metadata should still work if activity tracking is temporarily unavailable.
    }
  }
  const { data: authData } = await client.auth.getUser()
  if (authData.user) resource.is_bookmarked = (await getBookmarkedIds(authData.user.id, [resource.id])).has(resource.id)
  return resource
}

export async function getFacultyResources(status?: ResourceStatus): Promise<Resource[]> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to manage resources.')
  let query = client.from('resources').select(RESOURCE_SELECT).eq('uploaded_by', authData.user.id).order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw new Error('Unable to load your resources.')
  const resources = normalizeResources(data as unknown[] | null)
  const names = await getUploaderNames(resources)
  return resources.map((resource) => ({ ...resource, uploader_name: names.get(resource.uploaded_by) }))
}

export async function getAdminResources(filters: { status?: ResourceStatus; resourceType?: string; branchId?: string; semester?: number; subjectId?: string } = {}): Promise<Resource[]> {
  const client = requireSupabase()
  let query = client.from('resources').select(RESOURCE_SELECT).order('created_at', { ascending: false }).limit(250)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.resourceType) query = query.eq('resource_type', filters.resourceType)
  if (filters.branchId) query = query.eq('branch_id', filters.branchId)
  if (filters.semester) query = query.eq('semester', filters.semester)
  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId)
  const { data, error } = await query
  if (error) throw new Error('Unable to load resource management data.')
  const resources = normalizeResources(data as unknown[] | null)
  const names = await getUploaderNames(resources)
  return resources.map((resource) => ({ ...resource, uploader_name: names.get(resource.uploaded_by) }))
}

export async function uploadResource(
  input: ResourceInput,
  file: File,
  status: 'draft' | 'pending_review',
  onProgress: (percentage: number) => void,
): Promise<Resource> {
  const client = requireSupabase()
  const fileInfo = getSafeResourceFile(file)
  const [{ data: authData, error: authError }, subject] = await Promise.all([
    client.auth.getUser(), getSubjectById(input.subject_id),
  ])
  if (authError || !authData.user) throw new Error('Sign in to upload resources.')
  if (!subject?.branch) throw new Error('Choose an active subject before uploading.')

  const { data: profile, error: profileError } = await client.from('profiles').select('role')
    .eq('auth_user_id', authData.user.id).single()
  if (profileError || (profile.role !== 'faculty' && profile.role !== 'admin')) {
    throw new Error('Only faculty and administrators can upload resources.')
  }

  const resourceId = crypto.randomUUID()
  const branchCode = subject.branch.code.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const filePath = `resources/${branchCode}/semester-${subject.semester}/${subject.id}/${resourceId}/${fileInfo.name}`
  const payload = {
    id: resourceId,
    ...input,
    branch_id: subject.branch_id,
    semester: subject.semester,
    file_name: file.name,
    file_path: filePath,
    file_type: fileInfo.mimeType,
    file_size: file.size,
    uploaded_by: authData.user.id,
    uploader_role: profile.role,
    status,
  }
  const { error: insertError } = await client.from('resources').insert(payload)
  if (insertError) throw new Error('Unable to create the resource record.')

  try {
    const { uploadResourceFile } = await import('./storageService')
    await uploadResourceFile(file, filePath, onProgress)
  } catch (uploadError) {
    await client.from('resources').delete().eq('id', resourceId)
    throw uploadError
  }

  const { data, error } = await client.from('resources').select(RESOURCE_SELECT).eq('id', resourceId).single()
  if (error) throw new Error('The file uploaded but the resource could not be reloaded.')
  return normalizeResource(data)
}

export async function updateResource(resourceId: string, input: ResourceInput, status: 'draft' | 'pending_review'): Promise<void> {
  const client = requireSupabase()
  const subject = await getSubjectById(input.subject_id)
  if (!subject) throw new Error('Choose an active subject.')
  const { error } = await client.from('resources').update({
    ...input,
    branch_id: subject.branch_id,
    semester: subject.semester,
    status,
    moderation_reason: null,
  }).eq('id', resourceId)
  if (error) throw new Error('Unable to update this resource.')
}

export async function moderateResource(resourceId: string, status: 'published' | 'rejected' | 'archived', reason = ''): Promise<void> {
  const client = requireSupabase()
  if (status === 'rejected' && !reason.trim()) throw new Error('Please provide a reason for rejection.')
  const { error } = await client.from('resources').update({
    status,
    moderation_reason: status === 'rejected' ? reason.trim() : null,
  }).eq('id', resourceId)
  if (error) throw new Error('Unable to update resource moderation status.')
}

export async function deleteResource(resourceId: string): Promise<void> {
  const client = requireSupabase()
  const { data: resource, error: readError } = await client.from('resources').select('file_path').eq('id', resourceId).single()
  if (readError || !resource) throw new Error('Unable to find this resource.')
  const { error: storageError } = await client.storage.from('academic-resources').remove([resource.file_path])
  if (storageError) throw new Error('The stored file could not be removed.')
  const { error } = await client.from('resources').delete().eq('id', resourceId)
  if (error) throw new Error('The file was removed but the resource record could not be deleted.')
}

export async function getResourceAnalytics(): Promise<ResourceAnalytics> {
  const { data, error } = await requireSupabase().rpc('get_resource_analytics')
  if (error) throw new Error('Unable to load resource analytics.')
  return (data?.[0] ?? {
    total_resources: 0,
    published_resources: 0,
    pending_resources: 0,
    total_downloads: 0,
    total_views: 0,
    most_downloaded_title: null,
  }) as ResourceAnalytics
}

export async function getPopularResources(limit = 6): Promise<{ resources: Resource[]; isFallback: boolean }> {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_popular_resource_ids', { result_limit: limit })
  if (error) throw new Error('Unable to load popular resources.')
  const rankedIds = (data ?? []) as { resource_id: string; activity_count: number }[]
  if (rankedIds.length >= 3 && rankedIds.some((row) => row.activity_count > 0)) {
    const { data: resources, error: resourceError } = await client.from('resources').select(RESOURCE_SELECT)
      .in('id', rankedIds.map((row) => row.resource_id))
    if (resourceError) throw new Error('Unable to load popular resources.')
    const byId = new Map(normalizeResources(resources as unknown[] | null).map((resource) => [resource.id, resource]))
    return { resources: rankedIds.flatMap((row) => byId.get(row.resource_id) ?? []), isFallback: false }
  }
  const latest = await listResources({ pageSize: limit })
  return { resources: latest.resources, isFallback: true }
}

export async function getSubjectResourceCounts(): Promise<Record<string, number>> {
  const { data, error } = await requireSupabase().rpc('get_subject_resource_counts')
  if (error) throw new Error('Unable to load subject resource counts.')
  return Object.fromEntries(((data ?? []) as { subject_id: string; resource_count: number }[]).map((row) => [row.subject_id, row.resource_count]))
}

export async function getResourceReports(status?: ResourceReport['status']): Promise<ResourceReport[]> {
  const client = requireSupabase()
  let query = client.from('resource_reports')
    .select('*, resource:resources(id,title,resource_type,subject:subjects(subject_code,subject_name))')
    .order('created_at', { ascending: false }).limit(200)
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw new Error('Unable to load resource reports.')
  return (data ?? []) as ResourceReport[]
}

export async function reportResource(resourceId: string, reason: ResourceReportReason, description: string): Promise<void> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to report a resource.')
  const { error } = await client.from('resource_reports').insert({
    resource_id: resourceId,
    reported_by: authData.user.id,
    reason,
    description: description.trim() || null,
  })
  if (error) throw new Error('Unable to send this report. You may have already reported this issue.')
}

export async function updateResourceReport(reportId: string, status: ResourceReport['status']): Promise<void> {
  const { error } = await requireSupabase().from('resource_reports').update({ status }).eq('id', reportId)
  if (error) throw new Error('Unable to update this report.')
}
