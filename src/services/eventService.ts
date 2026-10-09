import type { EventCategory, EventRecord, EventStatus } from '../types'
import { supabase } from '../lib/supabase'
import type { EventRegistration, EventTicket } from '../types'

export type EventInput = Omit<EventRecord, 'id' | 'created_at' | 'updated_at' | 'registration_count' | 'slug'> & { slug?: string }

export type RegistrationWithEvent = EventRegistration & {
  event: EventRecord
  ticket: EventTicket
}

export type TicketDetails = EventTicket & {
  registration: EventRegistration & {
    event: EventRecord
    profile: { full_name: string; usn: string | null }
  }
}

export type ManagedRegistration = EventRegistration & {
  profile: { full_name: string; usn: string | null; department: string | null }
  ticket: Pick<EventTicket, 'id' | 'status'> | null
}

const demoEvents: EventRecord[] = [
  {
    id: 'evt-1',
    title: 'AI & Machine Learning Workshop',
    slug: 'ai-machine-learning-workshop',
    description:
      'Explore the practical foundations of AI and machine learning with hands-on sessions, demonstrations, and mentoring from industry practitioners.',
    short_description: 'Practical AI workshop with hands-on projects and mentoring.',
    category: 'Technical',
    organizer_name: 'Innovation Cell',
    venue: 'Seminar Hall A',
    event_date: '2026-10-12',
    start_time: '10:00',
    end_time: '13:00',
    registration_deadline: '2026-10-10T18:00:00.000Z',
    capacity: 120,
    banner_image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    is_featured: true,
    registration_count: 86,
  },
  {
    id: 'evt-2',
    title: 'CodeSprint Hackathon',
    slug: 'codesprint-hackathon',
    description:
      'A fast-paced innovation sprint for students to build impactful ideas in teams and pitch to a panel of mentors and judges.',
    short_description: 'Build prototypes, collaborate, and pitch your idea in 24 hours.',
    category: 'Hackathon',
    organizer_name: 'Student Dev Club',
    venue: 'Innovation Hub',
    event_date: '2026-10-18',
    start_time: '09:00',
    end_time: '18:00',
    registration_deadline: '2026-10-15T17:00:00.000Z',
    capacity: 80,
    banner_image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    is_featured: true,
    registration_count: 64,
  },
  {
    id: 'evt-3',
    title: 'Annual Cultural Fest',
    slug: 'annual-cultural-fest',
    description:
      'A vibrant cultural celebration featuring music, dance, art, theatre, and student showcases that bring the campus together.',
    short_description: 'Cultural celebration featuring music, dance, art, and performances.',
    category: 'Cultural',
    organizer_name: 'Cultural Committee',
    venue: 'Open Air Theatre',
    event_date: '2026-11-02',
    start_time: '17:00',
    end_time: '21:30',
    registration_deadline: '2026-10-30T12:00:00.000Z',
    capacity: 200,
    banner_image_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    is_featured: true,
    registration_count: 143,
  },
  {
    id: 'evt-4',
    title: 'Career & Placement Seminar',
    slug: 'career-placement-seminar',
    description:
      'Hear from recruiters and industry leaders about internships, placement expectations, and how to optimize your profile for career readiness.',
    short_description: 'Career readiness seminar with recruiters and placement guidance.',
    category: 'Placement',
    organizer_name: 'Training & Placement Cell',
    venue: 'Main Auditorium',
    event_date: '2026-10-25',
    start_time: '11:00',
    end_time: '13:00',
    registration_deadline: '2026-10-22T17:00:00.000Z',
    capacity: 150,
    banner_image_url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    is_featured: false,
    registration_count: 97,
  },
  {
    id: 'evt-5',
    title: 'Web Development Bootcamp',
    slug: 'web-development-bootcamp',
    description:
      'Build modern web interfaces with workshops on React, responsive design, UX patterns, and hands-on implementation sessions.',
    short_description: 'Hands-on frontend development bootcamp for students building portfolios.',
    category: 'Workshop',
    organizer_name: 'Department of CSE',
    venue: 'Lab 2',
    event_date: '2026-10-08',
    start_time: '09:30',
    end_time: '12:30',
    registration_deadline: '2026-10-05T18:00:00.000Z',
    capacity: 90,
    banner_image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    is_featured: false,
    registration_count: 78,
  },
  {
    id: 'evt-6',
    title: 'Inter-Department Cricket Tournament',
    slug: 'inter-department-cricket-tournament',
    description:
      'Compete across departments in a friendly, high-energy cricket tournament that celebrates teamwork and campus spirit.',
    short_description: 'Friendly sports tournament bringing departments together.',
    category: 'Sports',
    organizer_name: 'Sports Council',
    venue: 'College Ground',
    event_date: '2026-11-15',
    start_time: '08:00',
    end_time: '17:00',
    registration_deadline: '2026-11-10T18:00:00.000Z',
    capacity: 300,
    banner_image_url: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    is_featured: false,
    registration_count: 118,
  },
]

export const eventCategories: { name: EventCategory; description: string; icon: string }[] = [
  { name: 'Technical', description: 'Tech-focused sessions and coding opportunities.', icon: '⚙️' },
  { name: 'Workshop', description: 'Hands-on learning experiences.', icon: '🛠️' },
  { name: 'Seminar', description: 'Expert talks and academic learning.', icon: '🎤' },
  { name: 'Hackathon', description: 'Build and compete in rapid innovation sprints.', icon: '💡' },
  { name: 'Cultural', description: 'Art, music, dance, and campus culture events.', icon: '🎭' },
  { name: 'Sports', description: 'Athletics and games across campus.', icon: '🏆' },
  { name: 'Academic', description: 'Academic learning and intellectual growth.', icon: '📚' },
  { name: 'Club', description: 'Community projects and student groups.', icon: '👥' },
  { name: 'Placement', description: 'Career, internships, and recruitment events.', icon: '💼' },
  { name: 'Other', description: 'Miscellaneous campus activities.', icon: '✨' },
]

export async function getAllEvents(includeDrafts = false): Promise<EventRecord[]> {
  if (!supabase) return demoEvents.map((event) => ({ ...event, is_demo: true }))

  let query = supabase.from('events').select('*').order('event_date', { ascending: true })
  if (!includeDrafts) query = query.eq('status', 'published')
  const { data, error } = await query

  if (error) throw new Error(error.message)

  return (data ?? []) as EventRecord[]
}

export async function getFeaturedEvents(): Promise<EventRecord[]> {
  const events = await getAllEvents()
  return events.filter((event) => event.is_featured && event.status === 'published').slice(0, 3)
}

export async function getManagedEvents(): Promise<EventRecord[]> {
  if (!supabase) return []

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error('Sign in to manage campus events.')

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', authData.user.id)
    .order('event_date', { ascending: true })
  if (error) throw new Error(error.message)

  return (data ?? []) as EventRecord[]
}

export async function getEventById(eventId: string): Promise<EventRecord | null> {
  if (!supabase) {
    const event = demoEvents.find((item) => item.id === eventId)
    return event ? { ...event, is_demo: true } : null
  }

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return data as EventRecord
}

export async function saveEvent(input: EventInput, eventId?: string): Promise<EventRecord> {
  if (!supabase) throw new Error('Configure the Supabase environment variables to manage events.')

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error('Sign in to manage campus events.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle()

  if (profileError) throw new Error(profileError.message)

  const payload = {
    ...input,
    slug: input.slug || `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`,
    organizer_profile_id: profile?.id ?? null,
  }

  const result = eventId
    ? await supabase.from('events').update(payload).eq('id', eventId).select().single()
    : await supabase.from('events').insert({ ...payload, created_by: authData.user.id }).select().single()

  if (result.error) throw new Error(result.error.message)
  return { ...result.data, registration_count: 0 } as EventRecord
}

export async function uploadEventBanner(file: File): Promise<string> {
  if (!supabase) throw new Error('Configure Supabase to upload event banners.')
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP image.')
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Event banners must be 5 MB or smaller.')

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error('Sign in to upload an event banner.')

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${authData.user.id}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('event-banners').upload(path, file, { contentType: file.type })
  if (error) throw new Error(error.message)
  return supabase.storage.from('event-banners').getPublicUrl(path).data.publicUrl
}

export async function registerForEvent(eventId: string): Promise<{ ticketId: string; registrationNumber: string }> {
  if (!supabase) throw new Error('Configure Supabase and sign in to register for an event.')

  const { data, error } = await supabase.rpc('register_for_event', { target_event_id: eventId })
  if (error) throw new Error(error.message)
  const registration = data?.[0]
  if (!registration) throw new Error('Registration did not return a ticket.')

  return { ticketId: registration.ticket_id, registrationNumber: registration.registration_number }
}

export async function getMyRegistrations(): Promise<RegistrationWithEvent[]> {
  if (!supabase) return []

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(authError.message)
  if (!authData.user) throw new Error('Sign in to view your event registrations.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authData.user.id)
    .single()
  if (profileError) throw new Error(profileError.message)

  const { data, error } = await supabase
    .from('event_registrations')
    .select('*, event:events(*), ticket:event_tickets(*)')
    .eq('profile_id', profile.id)
    .neq('status', 'cancelled')
    .order('registered_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).flatMap((registration) => {
    const event = registration.event as unknown as EventRecord | null
    const ticket = registration.ticket as unknown as EventTicket | null
    if (!event || !ticket) return []
    return [{ ...registration, event, ticket } as RegistrationWithEvent]
  })
}

export async function getTicket(ticketId: string): Promise<TicketDetails | null> {
  if (!supabase) return null

  const { data, error } = await supabase
    .from('event_tickets')
    .select('*, registration:event_registrations(*, event:events(*), profile:profiles(full_name, usn))')
    .eq('id', ticketId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  const registration = data.registration as unknown as TicketDetails['registration'] | null
  if (!registration?.event || !registration.profile) return null
  return { ...data, registration } as TicketDetails
}

export async function getEventRegistrations(eventId: string): Promise<ManagedRegistration[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*, profile:profiles(full_name, usn, department), ticket:event_tickets(id, status)')
    .eq('event_id', eventId)
    .order('registered_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((registration) => ({
    ...registration,
    profile: registration.profile as unknown as ManagedRegistration['profile'],
    ticket: registration.ticket as unknown as ManagedRegistration['ticket'],
  })) as ManagedRegistration[]
}

export async function verifyEventTicket(eventId: string, qrPayload: string): Promise<{ registrationNumber: string; studentName: string; usn: string | null }> {
  if (!supabase) throw new Error('Configure Supabase to verify event tickets.')
  const { data, error } = await supabase.rpc('verify_event_ticket', {
    target_event_id: eventId,
    target_qr_payload: qrPayload,
  })
  if (error) throw new Error(error.message)
  const result = data?.[0]
  if (!result) throw new Error('Ticket verification returned no attendee.')
  return {
    registrationNumber: result.registration_number,
    studentName: result.student_name,
    usn: result.student_usn,
  }
}

export async function getEventStatus(event: EventRecord): Promise<EventStatus> {
  if (event.status === 'cancelled') return 'cancelled'
  if (event.status === 'draft') return 'draft'
  if (event.status === 'completed') return 'completed'

  const deadlineMs = new Date(event.registration_deadline).getTime()
  const now = Date.now()

  if (deadlineMs <= now) {
    return 'registration_closed'
  }

  return 'published'
}

export function getRegistrationProgress(event: EventRecord): number {
  if (!event.capacity) return 0
  return Math.min((event.registration_count ?? 0) / event.capacity, 1)
}

export function getRemainingSeats(event: EventRecord): number {
  return Math.max(event.capacity - (event.registration_count ?? 0), 0)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function getEventStateLabel(event: EventRecord): string {
  const remaining = getRemainingSeats(event)
  const now = Date.now()
  const deadline = new Date(event.registration_deadline).getTime()

  if (event.status === 'cancelled') return 'Cancelled'
  if (event.status === 'draft') return 'Draft'
  if (remaining === 0) return 'Event Full'
  if (deadline <= now) return 'Registration Closed'
  return 'Registration Open'
}
