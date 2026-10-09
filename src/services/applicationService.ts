import { supabase } from '../lib/supabase'
import type { ApplicationStatus, Company, Internship, InternshipApplication, InternshipType, WorkMode } from '../types'

const APPLICATION_SELECT = '*, internship:internships(*, company:companies(*), branch:branches(id,code,name,is_demo,is_active))'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function normalizeApplication(value: unknown): InternshipApplication {
  const row = value as InternshipApplication & { internship?: (Internship & { company?: Company | Company[] }) | (Internship & { company?: Company | Company[] })[] | null }
  const relation = Array.isArray(row.internship) ? row.internship[0] : row.internship
  if (!relation) return { ...row, internship: undefined }
  const company = Array.isArray(relation.company) ? relation.company[0] : relation.company
  return { ...row, internship: { ...relation, company } }
}

export async function getMyApplications(): Promise<InternshipApplication[]> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to view your applications.')
  const { data, error } = await client.from('internship_applications').select(APPLICATION_SELECT)
    .eq('student_id', authData.user.id).order('updated_at', { ascending: false })
  if (error) throw new Error('Unable to load your application tracker.')
  return (data ?? []).map(normalizeApplication)
}

export async function getSavedInternships(): Promise<Internship[]> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to view saved opportunities.')
  const { data, error } = await client.from('internship_bookmarks')
    .select('id,created_at,internship:internships!inner(*, company:companies(*), branch:branches(id,code,name,is_demo,is_active))')
    .eq('student_id', authData.user.id)
    .order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load saved opportunities.')
  return (data ?? []).flatMap((row) => {
    const relation = row.internship as unknown as (Internship & { company?: Company | Company[] }) | null
    if (!relation) return []
    const company = Array.isArray(relation.company) ? relation.company[0] : relation.company
    return [{ ...relation, company, is_bookmarked: true }]
  })
}

export async function markAsApplied(internshipId: string, notes = ''): Promise<void> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to track applications.')
  const { error } = await client.from('internship_applications').upsert({
    internship_id: internshipId,
    student_id: authData.user.id,
    status: 'applied',
    applied_at: new Date().toISOString(),
    notes: notes.trim() || null,
  }, { onConflict: 'internship_id,student_id' })
  if (error) throw new Error('Unable to update the application tracker.')
}

export type ApplicationUpdate = Partial<Pick<InternshipApplication, 'status' | 'notes' | 'interview_date' | 'interview_type' | 'interview_notes' | 'offer_date' | 'offer_start_date' | 'offer_duration' | 'outcome'>>

export async function updateApplication(applicationId: string, values: ApplicationUpdate): Promise<void> {
  const payload: ApplicationUpdate = { ...values }
  if (values.status === 'interview' && !values.interview_date) throw new Error('Add an interview date before selecting Interview.')
  if (values.status === 'selected' && !values.offer_date) payload.offer_date = new Date().toISOString().slice(0, 10)
  const { error } = await requireSupabase().from('internship_applications').update(payload).eq('id', applicationId)
  if (error) throw new Error('Unable to update your tracking status.')
}

export async function withdrawApplication(applicationId: string): Promise<void> {
  const { error } = await requireSupabase().from('internship_applications').update({ status: 'withdrawn' }).eq('id', applicationId)
  if (error) throw new Error('Unable to withdraw this application.')
}

export async function deleteSavedApplication(applicationId: string): Promise<void> {
  const { error } = await requireSupabase().from('internship_applications').delete().eq('id', applicationId).eq('status', 'saved')
  if (error) throw new Error('Only saved tracking entries can be deleted. Other applications can be withdrawn.')
}

export async function getApplicationById(applicationId: string): Promise<InternshipApplication | null> {
  const { data, error } = await requireSupabase().from('internship_applications').select(APPLICATION_SELECT).eq('id', applicationId).maybeSingle()
  if (error) throw new Error('Unable to load this application.')
  return data ? normalizeApplication(data) : null
}

export async function toggleSave(internshipId: string): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc('toggle_internship_save', { target_internship_id: internshipId })
  if (error) throw new Error('Unable to update saved opportunities.')
  return Boolean(data)
}

export type CareerStats = { applications: number; interviews: number; selected: number; saved: number }

export async function getCareerStats(): Promise<CareerStats> {
  const applications = await getMyApplications()
  const saved = await getSavedInternships()
  return {
    applications: applications.filter((application) => !['saved', 'withdrawn'].includes(application.status)).length,
    interviews: applications.filter((application) => application.status === 'interview').length,
    selected: applications.filter((application) => application.status === 'selected').length,
    saved: saved.length,
  }
}

export function getApplicationStatusLabel(status: ApplicationStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function isInternshipType(value: string): value is InternshipType {
  return ['full_time', 'part_time', 'summer', 'winter', 'academic', 'research'].includes(value)
}

export function isWorkMode(value: string): value is WorkMode {
  return ['remote', 'hybrid', 'on_site'].includes(value)
}
