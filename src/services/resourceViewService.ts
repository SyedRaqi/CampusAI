import { supabase } from '../lib/supabase'
import type { Resource, ResourceView } from '../types'
import { normalizeResource } from '../utils/resourceFormat'

const resourceColumns = 'id,title,description,resource_type,subject_id,branch_id,semester,section,file_name,file_type,file_size,thumbnail_url,uploaded_by,uploader_role,status,visibility,download_count,view_count,save_count,moderation_reason,version,replaces_resource_id,created_at,updated_at,subject:subjects(id,subject_code,subject_name,branch_id,semester,description,is_demo,is_active,branch:branches(id,code,name,is_demo,is_active))'

export async function recordResourceView(resourceId: string): Promise<boolean> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('record_resource_view', { target_resource_id: resourceId })
  if (error) throw new Error('Unable to record this resource view.')
  return Boolean(data)
}

export async function getRecentlyViewed(limit = 6): Promise<Resource[]> {
  if (!supabase) return []
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return []

  const { data, error } = await supabase.from('resource_views')
    .select(`viewed_at,resource:resources!inner(${resourceColumns})`)
    .eq('user_id', authData.user.id)
    .eq('resource.status', 'published')
    .order('viewed_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error('Unable to load recently viewed resources.')
  return (data ?? []).flatMap((row) => {
    const resource = row.resource as unknown
    return resource ? [normalizeResource(resource)] : []
  })
}

export async function getResourceViewHistory(): Promise<ResourceView[]> {
  if (!supabase) return []
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return []
  const { data, error } = await supabase.from('resource_views')
    .select('id,resource_id,user_id,viewed_at')
    .eq('user_id', authData.user.id)
    .order('viewed_at', { ascending: false })
  if (error) throw new Error('Unable to load resource history.')
  return (data ?? []) as ResourceView[]
}
