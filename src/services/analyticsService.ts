import { supabase } from '../lib/supabase'

export interface AnalyticsFilters {
  fromDate: string
  toDate: string
  department?: string
  semester?: number
}

export type Phase10Analytics = Record<string, number>

export interface AnalyticsTrendPoint {
  period_start: string
  metric: string
  value: number
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  return supabase
}

export async function getPhase10Analytics(filters: AnalyticsFilters): Promise<Phase10Analytics> {
  const { data, error } = await client().rpc('get_phase10_analytics', {
    from_date: filters.fromDate,
    to_date: filters.toDate,
    department_filter: filters.department?.trim() || null,
    semester_filter: filters.semester ?? null,
  })
  if (error) throw new Error(error.message || 'Unable to load campus analytics.')
  return data as Phase10Analytics
}

export async function getPhase10AnalyticsTrend(
  filters: AnalyticsFilters,
  module: string,
): Promise<AnalyticsTrendPoint[]> {
  const { data, error } = await client().rpc('get_phase10_analytics_trend', {
    from_date: filters.fromDate,
    to_date: filters.toDate,
    module_filter: module,
    department_filter: filters.department?.trim() || null,
    semester_filter: filters.semester ?? null,
  })
  if (error) throw new Error(error.message || 'Unable to load the analytics trend.')
  return (data ?? []) as AnalyticsTrendPoint[]
}

export interface AuditLogRecord {
  id: string
  actor_id: string | null
  action: string
  target_type: string
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export async function getAuditLogs(filters: {
  page: number
  actor?: string
  action?: string
  targetType?: string
  fromDate?: string
  toDate?: string
}): Promise<AuditLogRecord[]> {
  let query = client().from('audit_logs')
    .select('id,actor_id,action,target_type,target_id,metadata,created_at')
    .order('created_at', { ascending: false })
    .range(filters.page * 30, filters.page * 30 + 29)
  if (filters.actor?.trim()) query = query.eq('actor_id', filters.actor.trim())
  if (filters.action?.trim()) query = query.ilike('action', `%${filters.action.trim()}%`)
  if (filters.targetType?.trim()) query = query.eq('target_type', filters.targetType.trim())
  if (filters.fromDate) query = query.gte('created_at', `${filters.fromDate}T00:00:00`)
  if (filters.toDate) query = query.lt('created_at', `${filters.toDate}T23:59:59.999`)
  const { data, error } = await query
  if (error) throw new Error('Unable to load audit-log records.')
  return (data ?? []) as AuditLogRecord[]
}
