import { supabase } from '../lib/supabase'
import type { Company, Internship, InternshipStatus, InternshipType, WorkMode } from '../types'

export const INTERNSHIP_PAGE_SIZE = 12
const INTERNSHIP_SELECT = '*, company:companies(*), branch:branches(id,code,name,is_demo,is_active)'

export type InternshipSort = 'deadline' | 'newest' | 'updated' | 'company' | 'role'
export type DeadlineWindow = 'week' | 'month' | 'later'
export type DurationWindow = 'under_one' | 'one_to_three' | 'three_to_six' | 'six_plus'

export type InternshipFilters = {
  search?: string
  workMode?: WorkMode
  paid?: boolean
  internshipType?: InternshipType
  location?: string
  durationWindow?: DurationWindow
  branchId?: string
  semester?: number
  deadlineWindow?: DeadlineWindow
  sort?: InternshipSort
  page?: number
  pageSize?: number
}

export type InternshipInput = {
  company_id: string
  role_title: string
  description: string
  short_description: string
  location: string
  work_mode: WorkMode
  internship_type: InternshipType
  duration: string
  duration_months: number
  stipend: number | null
  stipend_currency: string
  is_paid: boolean
  skills: string[]
  eligibility: string
  branch_id: string | null
  minimum_semester: number | null
  maximum_semester: number | null
  application_url: string | null
  official_source_url: string | null
  application_deadline: string | null
  start_date: string | null
  end_date: string | null
}

export type CareerAnalytics = {
  total_opportunities: number
  published_opportunities: number
  pending_review: number
  closed_opportunities: number
  total_applications: number
  interviews: number
  selected_students: number
}

export type CareerChartSeries = { label: string; count: number }
export type CareerChartData = {
  applications_by_month: (CareerChartSeries & { month: string })[]
  internships_by_work_mode: CareerChartSeries[]
  internships_by_type: CareerChartSeries[]
  application_pipeline: CareerChartSeries[]
}

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function normalizeInternship(value: unknown): Internship {
  const row = value as Internship & { company?: Company | Company[] | null }
  const company = Array.isArray(row.company) ? row.company[0] : row.company
  return { ...row, company: company ?? undefined }
}

function normalizeInternships(values: unknown[] | null): Internship[] {
  return (values ?? []).map(normalizeInternship)
}

function safeSearch(value: string): string {
  return value.trim().replace(/[,%()]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)
}

export async function listInternships(filters: InternshipFilters = {}): Promise<{ internships: Internship[]; count: number; page: number; pageSize: number }> {
  const client = requireSupabase()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? INTERNSHIP_PAGE_SIZE))
  let query = client.from('internships').select(INTERNSHIP_SELECT, { count: 'exact' }).eq('status', 'published')
  if (filters.workMode) query = query.eq('work_mode', filters.workMode)
  if (filters.paid !== undefined) query = query.eq('is_paid', filters.paid)
  if (filters.internshipType) query = query.eq('internship_type', filters.internshipType)
  if (filters.location) query = query.ilike('location', `%${safeSearch(filters.location)}%`)
  if (filters.branchId) query = query.or(`branch_id.eq.${filters.branchId},branch_id.is.null`)
  if (filters.semester) query = query.or(`and(minimum_semester.is.null,maximum_semester.is.null),and(minimum_semester.lte.${filters.semester},maximum_semester.gte.${filters.semester}),and(minimum_semester.is.null,maximum_semester.gte.${filters.semester}),and(minimum_semester.lte.${filters.semester},maximum_semester.is.null)`)
  if (filters.durationWindow === 'under_one') query = query.lt('duration_months', 1)
  if (filters.durationWindow === 'one_to_three') query = query.gte('duration_months', 1).lte('duration_months', 3)
  if (filters.durationWindow === 'three_to_six') query = query.gt('duration_months', 3).lte('duration_months', 6)
  if (filters.durationWindow === 'six_plus') query = query.gt('duration_months', 6)
  if (filters.deadlineWindow) {
    const now = new Date()
    const until = new Date(now)
    if (filters.deadlineWindow === 'week') until.setDate(until.getDate() + 7)
    else if (filters.deadlineWindow === 'month') until.setMonth(until.getMonth() + 1)
    else until.setMonth(until.getMonth() + 1)
    query = filters.deadlineWindow === 'later'
      ? query.gt('application_deadline', until.toISOString())
      : query.lte('application_deadline', until.toISOString()).gte('application_deadline', now.toISOString())
  }

  const search = filters.search ? safeSearch(filters.search) : ''
  if (search) {
    const { data: companies, error: companyError } = await client.from('companies').select('id').ilike('name', `%${search}%`).limit(100)
    if (companyError) throw new Error('Unable to search companies.')
    const companyIds = (companies ?? []).map((company) => company.id as string)
    const safeSkillsSearch = search.replace(/[{}]/g, ' ')
    const direct = `role_title.ilike.%${search}%,description.ilike.%${search}%,short_description.ilike.%${search}%,location.ilike.%${search}%,skills.cs.{${safeSkillsSearch}}`
    query = query.or(companyIds.length ? `${direct},company_id.in.(${companyIds.join(',')})` : direct)
  }

  if (filters.sort === 'newest') query = query.order('created_at', { ascending: false })
  else if (filters.sort === 'updated') query = query.order('updated_at', { ascending: false })
  else if (filters.sort === 'company') query = query.order('name', { foreignTable: 'company', ascending: true }).order('role_title')
  else if (filters.sort === 'role') query = query.order('role_title', { ascending: true })
  else query = query.order('application_deadline', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })

  const { data, error, count } = await query.range((page - 1) * pageSize, page * pageSize - 1)
  if (error) throw new Error('Unable to load opportunities. Please retry.')
  const rows = normalizeInternships(data as unknown[] | null)
  const { data: authData } = await client.auth.getUser()
  if (!authData.user || rows.length === 0) return { internships: rows, count: count ?? 0, page, pageSize }
  const ids = rows.map((row) => row.id)
  const [{ data: bookmarks, error: bookmarkError }, { data: applications, error: applicationError }] = await Promise.all([
    client.from('internship_bookmarks').select('internship_id').eq('student_id', authData.user.id).in('internship_id', ids),
    client.from('internship_applications').select('internship_id,status').eq('student_id', authData.user.id).in('internship_id', ids),
  ])
  if (bookmarkError || applicationError) throw new Error('Unable to load your saved opportunity status.')
  const saved = new Set((bookmarks ?? []).map((row) => row.internship_id as string))
  const statuses = new Map((applications ?? []).map((row) => [row.internship_id as string, row.status as Internship['application_status']]))
  return {
    internships: rows.map((internship) => ({ ...internship, is_bookmarked: saved.has(internship.id), application_status: statuses.get(internship.id) ?? null })),
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function getInternship(internshipId: string): Promise<Internship | null> {
  const client = requireSupabase()
  const { data, error } = await client.from('internships').select(INTERNSHIP_SELECT).eq('id', internshipId).maybeSingle()
  if (error) throw new Error('Unable to load this opportunity.')
  if (!data) return null
  const internship = normalizeInternship(data)
  const { data: authData } = await client.auth.getUser()
  if (authData.user) {
    const [{ data: bookmark }, { data: application }] = await Promise.all([
      client.from('internship_bookmarks').select('id').eq('student_id', authData.user.id).eq('internship_id', internshipId).maybeSingle(),
      client.from('internship_applications').select('status').eq('student_id', authData.user.id).eq('internship_id', internshipId).maybeSingle(),
    ])
    internship.is_bookmarked = Boolean(bookmark)
    internship.application_status = application?.status as Internship['application_status'] ?? null
  }
  return internship
}

export async function toggleInternshipBookmark(internshipId: string): Promise<boolean> {
  const { data, error } = await requireSupabase().rpc('toggle_internship_save', { target_internship_id: internshipId })
  if (error) throw new Error('Unable to update saved opportunities.')
  return Boolean(data)
}

export async function getFacultyInternships(): Promise<Internship[]> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to manage submitted opportunities.')
  const { data, error } = await client.from('internships').select(INTERNSHIP_SELECT).eq('created_by', authData.user.id).order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load your submitted opportunities.')
  return normalizeInternships(data as unknown[] | null)
}

export async function getAdminInternships(filters: { status?: InternshipStatus; companyId?: string; workMode?: WorkMode; branchId?: string; paid?: boolean; deadlineWindow?: DeadlineWindow } = {}): Promise<Internship[]> {
  let query = requireSupabase().from('internships').select(INTERNSHIP_SELECT).order('created_at', { ascending: false }).limit(250)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.companyId) query = query.eq('company_id', filters.companyId)
  if (filters.workMode) query = query.eq('work_mode', filters.workMode)
  if (filters.branchId) query = query.eq('branch_id', filters.branchId)
  if (filters.paid !== undefined) query = query.eq('is_paid', filters.paid)
  if (filters.deadlineWindow) {
    const now = new Date()
    const until = new Date(now)
    if (filters.deadlineWindow === 'week') until.setDate(until.getDate() + 7)
    else until.setMonth(until.getMonth() + 1)
    query = filters.deadlineWindow === 'later'
      ? query.gt('application_deadline', until.toISOString())
      : query.lte('application_deadline', until.toISOString()).gte('application_deadline', now.toISOString())
  }
  const { data, error } = await query
  if (error) throw new Error('Unable to load internship management data.')
  return normalizeInternships(data as unknown[] | null)
}

export async function saveInternship(input: InternshipInput, status: InternshipStatus, internshipId?: string): Promise<void> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to submit an opportunity.')
  validateExternalUrl(input.application_url, 'application URL')
  validateExternalUrl(input.official_source_url, 'source URL')
  const { data: profile, error: profileError } = await client.from('profiles').select('role').eq('auth_user_id', authData.user.id).single()
  if (profileError || (profile.role !== 'faculty' && profile.role !== 'admin')) throw new Error('Only faculty and administrators can submit opportunities.')
  const payload = {
    ...input,
    branch_id: input.branch_id || null,
    minimum_semester: input.minimum_semester || null,
    maximum_semester: input.maximum_semester || null,
    application_deadline: input.application_deadline || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    status,
    moderation_reason: null,
  }
  const result = internshipId
    ? await client.from('internships').update(payload).eq('id', internshipId)
    : await client.from('internships').insert({ ...payload, source_type: profile.role === 'admin' ? 'admin_added' : 'faculty_added', created_by: authData.user.id })
  if (result.error) throw new Error('Unable to save this opportunity. Verify all required fields and company.')
}

export async function moderateInternship(internshipId: string, status: 'published' | 'rejected' | 'closed' | 'archived', reason = ''): Promise<void> {
  if (status === 'rejected' && !reason.trim()) throw new Error('Please provide a reason for rejecting this submission.')
  const { error } = await requireSupabase().from('internships').update({ status, moderation_reason: status === 'rejected' ? reason.trim() : null }).eq('id', internshipId)
  if (error) throw new Error('Unable to update internship review status.')
}

export async function deleteInternship(internshipId: string): Promise<void> {
  const { error } = await requireSupabase().from('internships').delete().eq('id', internshipId)
  if (error) throw new Error('Unable to delete this opportunity.')
}

export async function getCareerAnalytics(): Promise<CareerAnalytics> {
  const { data, error } = await requireSupabase().rpc('get_career_analytics')
  if (error) throw new Error('Unable to load career analytics.')
  return (data?.[0] ?? { total_opportunities: 0, published_opportunities: 0, pending_review: 0, closed_opportunities: 0, total_applications: 0, interviews: 0, selected_students: 0 }) as CareerAnalytics
}

export async function getCareerChartData(): Promise<CareerChartData> {
  const { data, error } = await requireSupabase().rpc('get_career_chart_data')
  if (error) throw new Error('Unable to load career analytics charts.')
  return (data ?? {
    applications_by_month: [],
    internships_by_work_mode: [],
    internships_by_type: [],
    application_pipeline: [],
  }) as CareerChartData
}

export function validateExternalUrl(value: string | null, label: string): void {
  if (!value?.trim()) return
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') throw new Error()
  } catch {
    throw new Error(`Enter a valid HTTPS ${label}.`)
  }
}
