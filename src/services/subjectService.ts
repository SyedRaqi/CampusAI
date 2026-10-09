import { supabase } from '../lib/supabase'
import type { Branch, ResourceType, Semester, Subject } from '../types'

export type ResourceTypeOption = { code: ResourceType | string; label: string; is_active: boolean; sort_order: number }
export type SubjectInput = Pick<Subject, 'subject_code' | 'subject_name' | 'branch_id' | 'semester' | 'description'>
  & Pick<Required<Subject>, 'credits' | 'subject_type'>

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function getBranches(includeInactive = false): Promise<Branch[]> {
  const client = requireSupabase()
  let query = client.from('branches').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw new Error('Unable to load branches.')
  return (data ?? []) as Branch[]
}

export async function getSemesters(): Promise<Semester[]> {
  const client = requireSupabase()
  const { data, error } = await client.from('semesters').select('number,label').order('number')
  if (error) throw new Error('Unable to load semesters.')
  return (data ?? []) as Semester[]
}

export async function getSubjects(filters: { branchId?: string; semester?: number; includeInactive?: boolean } = {}): Promise<Subject[]> {
  const client = requireSupabase()
  let query = client.from('subjects')
    .select('*, branch:branches(id,code,name,is_demo,is_active)')
    .order('subject_name')
  if (!filters.includeInactive) query = query.eq('is_active', true)
  if (filters.branchId) query = query.eq('branch_id', filters.branchId)
  if (filters.semester) query = query.eq('semester', filters.semester)
  const { data, error } = await query
  if (error) throw new Error('Unable to load subjects.')
  return (data ?? []) as Subject[]
}

export async function getSubjectById(subjectId: string): Promise<Subject | null> {
  const client = requireSupabase()
  const { data, error } = await client.from('subjects')
    .select('*, branch:branches(id,code,name,is_demo,is_active)')
    .eq('id', subjectId)
    .maybeSingle()
  if (error) throw new Error('Unable to load the selected subject.')
  return data as Subject | null
}

export async function getResourceTypes(includeInactive = false): Promise<ResourceTypeOption[]> {
  const client = requireSupabase()
  let query = client.from('resource_types').select('*').order('sort_order')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw new Error('Unable to load resource categories.')
  return (data ?? []) as ResourceTypeOption[]
}

export async function saveSubject(input: SubjectInput, subjectId?: string): Promise<void> {
  const client = requireSupabase()
  const query = subjectId
    ? await client.from('subjects').update(input).eq('id', subjectId)
    : await client.from('subjects').insert({ ...input, is_demo: false })
  if (query.error) throw new Error('Unable to save the subject. Check the code and branch/semester combination.')
}

export async function setSubjectActive(subjectId: string, isActive: boolean): Promise<void> {
  const { error } = await requireSupabase().from('subjects').update({ is_active: isActive }).eq('id', subjectId)
  if (error) throw new Error('Unable to update the subject.')
}

export async function setBranchActive(branchId: string, isActive: boolean): Promise<void> {
  const { error } = await requireSupabase().from('branches').update({ is_active: isActive }).eq('id', branchId)
  if (error) throw new Error('Unable to update the branch.')
}

export async function createBranch(name: string): Promise<void> {
  const cleanName = name.trim()
  const code = cleanName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 20)
  if (!cleanName || !code) throw new Error('Enter a valid branch name.')
  const { error } = await requireSupabase().from('branches').insert({ code, name: cleanName, is_demo: false })
  if (error) throw new Error('Unable to add this branch. The name may already exist.')
}

export async function saveResourceType(input: ResourceTypeOption): Promise<void> {
  const { error } = await requireSupabase().from('resource_types').upsert(input)
  if (error) throw new Error('Unable to save the resource category.')
}

export async function setResourceTypeActive(code: string, isActive: boolean): Promise<void> {
  const { error } = await requireSupabase().from('resource_types').update({ is_active: isActive }).eq('code', code)
  if (error) throw new Error('Unable to update this resource category.')
}
