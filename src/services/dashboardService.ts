import { supabase } from '../lib/supabase'

export type DashboardMetric = {
  label: string
  value: string
  change?: string
}

function requireSupabase() {
  if (!supabase) throw new Error('Campus dashboards are unavailable until Supabase is configured.')
  return supabase
}

export async function getStudentDashboardData(userId: string) {
  const client = requireSupabase()
  const { data: profile, error: profileError } = await client.from('profiles')
    .select('id').eq('auth_user_id', userId).maybeSingle()
  if (profileError || !profile) throw new Error('Unable to load your campus profile.')

  const [events, savedInternships, unreadNotifications, registrations] = await Promise.all([
    client.from('events').select('id', { count: 'exact', head: true })
      .eq('status', 'published').gte('event_date', new Date().toISOString().slice(0, 10)),
    client.from('internship_bookmarks').select('id', { count: 'exact', head: true }).eq('student_id', userId),
    client.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false),
    client.from('event_registrations').select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id).neq('status', 'cancelled'),
  ])
  if (events.error || savedInternships.error || unreadNotifications.error || registrations.error) {
    throw new Error('Unable to load your dashboard information.')
  }

  return {
    metrics: [
      { label: 'Registered Events', value: String(registrations.count ?? 0) },
      { label: 'Upcoming Campus Events', value: String(events.count ?? 0) },
      { label: 'Saved Internships', value: String(savedInternships.count ?? 0) },
      { label: 'Unread Notifications', value: String(unreadNotifications.count ?? 0) },
    ] satisfies DashboardMetric[],
  }
}

export async function getAdminDashboardData() {
  const client = requireSupabase()
  const [students, faculty, events, resources, internships, clubs, registrations] = await Promise.all([
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    client.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'faculty'),
    client.from('events').select('id', { count: 'exact', head: true }),
    client.from('resources').select('id', { count: 'exact', head: true }),
    client.from('internships').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    client.from('clubs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    client.from('event_registrations').select('id', { count: 'exact', head: true }).neq('status', 'cancelled'),
  ])
  if ([students, faculty, events, resources, internships, clubs, registrations].some((result) => result.error)) {
    throw new Error('Unable to load administrator dashboard counts.')
  }

  return {
    metrics: [
      { label: 'Total Students', value: String(students.count ?? 0) },
      { label: 'Total Faculty', value: String(faculty.count ?? 0) },
      { label: 'Total Events', value: String(events.count ?? 0) },
      { label: 'Total Resources', value: String(resources.count ?? 0) },
      { label: 'Active Internships', value: String(internships.count ?? 0) },
      { label: 'Active Clubs', value: String(clubs.count ?? 0) },
    ] satisfies DashboardMetric[],
    analytics: [
      { label: 'Event Registrations', value: String(registrations.count ?? 0) },
    ],
  }
}
