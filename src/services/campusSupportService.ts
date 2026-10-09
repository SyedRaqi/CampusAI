import { supabase } from '../lib/supabase'
import type {
  CampusService,
  FeedbackSubmission,
  FeedbackStatus,
  LostFoundInput,
  LostFoundItem,
  LostFoundMatch,
  SupportTicket,
  SupportTicketHistory,
  SupportTicketInput,
  SupportTicketInternalNote,
  SupportTicketMessage,
  TicketMessageVisibility,
  TicketStatus,
} from '../types/support'

function client() {
  if (!supabase) throw new Error('Supabase is not configured yet.')
  return supabase
}

async function currentUserId() {
  const { data, error } = await client().auth.getUser()
  if (error || !data.user) throw new Error('Sign in to continue.')
  return data.user.id
}

export async function getLostFoundItems(includeAll = false): Promise<LostFoundItem[]> {
  let query = client()
    .from('lost_found_items')
    .select('id,report_type,title,description,category,location_description,occurred_at,status,resolved_at,created_at')
    .order('created_at', { ascending: false })
    .limit(250)
  if (!includeAll) query = query.in('status', ['open', 'potential_match'])
  const { data, error } = await query
  if (error) throw new Error('Unable to load Lost & Found listings.')
  return (data ?? []).map((item) => ({ ...item, image_paths: [], is_mine: false })) as LostFoundItem[]
}

export async function getMyLostFoundItems(): Promise<LostFoundItem[]> {
  await currentUserId()
  const { data, error } = await client().rpc('get_my_lost_found_items')
  if (error) throw new Error('Unable to load your reports.')
  type LostFoundRpcRow = Omit<LostFoundItem, 'is_mine'>
  return ((data ?? []) as LostFoundRpcRow[]).map((item) => ({ ...item, is_mine: true }))
}

export async function createLostFoundItem(input: LostFoundInput): Promise<string> {
  const userId = await currentUserId()
  if ((input.images?.length ?? 0) > 5) throw new Error('Choose no more than 5 item photos.')
  const imagePaths: string[] = []
  for (const file of input.images ?? []) {
    if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new Error('Photos must be JPG, PNG, or WebP files smaller than 5 MB.')
    }
    const path = `${userId}/lost-found/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const { error: uploadError } = await client().storage.from('campus-support-private').upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) {
      if (imagePaths.length) await client().storage.from('campus-support-private').remove(imagePaths)
      throw new Error('A photo could not be uploaded. Please try again.')
    }
    imagePaths.push(path)
  }
  const { data: itemId, error } = await client().rpc('create_lost_found_report', {
    report_type: input.report_type,
    report_title: input.title.trim(),
    report_description: input.description.trim(),
    report_category: input.category,
    report_location_description: input.location_description?.trim() || null,
    report_occurred_at: input.occurred_at || null,
    report_image_paths: imagePaths,
    report_contact_method: input.contact_method.trim(),
  })
  if (error || !itemId) {
    if (imagePaths.length) await client().storage.from('campus-support-private').remove(imagePaths)
    throw new Error(error?.code === '23505' ? 'A similar report already exists.' : 'Unable to submit this report.')
  }
  return itemId as string
}

async function uploadSupportFiles(files: File[]): Promise<string[]> {
  if (files.length > 5) throw new Error('Choose no more than 5 attachments.')
  const paths: string[] = []
  for (const file of files) {
    if (file.size === 0 || file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      if (paths.length) await client().storage.from('campus-support-private').remove(paths)
      throw new Error('Attachments must be JPG, PNG, WebP, or PDF files smaller than 5 MB.')
    }
    const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'pdf'
    const path = `${crypto.randomUUID()}.${extension}`
    const { error } = await client().storage.from('campus-support-private').upload(path, file, { contentType: file.type, upsert: false })
    if (error) {
      if (paths.length) await client().storage.from('campus-support-private').remove(paths)
      throw new Error('An attachment could not be uploaded. Please try again.')
    }
    paths.push(path)
  }
  return paths
}

export async function updateLostFoundItem(id: string, patch: Pick<LostFoundInput, 'title' | 'description' | 'category' | 'location_description' | 'occurred_at'> & { status?: 'open' | 'closed' }): Promise<void> {
  const { error } = await client().from('lost_found_items').update({
    title: patch.title.trim(),
    description: patch.description.trim(),
    category: patch.category,
    location_description: patch.location_description?.trim() || null,
    occurred_at: patch.occurred_at || null,
    ...(patch.status ? { status: patch.status } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) throw new Error('Unable to update this report. It may no longer be editable.')
}

export async function suggestLostFoundMatch(lostItemId: string, foundItemId: string): Promise<string> {
  const { data, error } = await client().rpc('suggest_lost_found_match', {
    target_lost_id: lostItemId,
    target_found_id: foundItemId,
  })
  if (error || !data) throw new Error('Unable to suggest this match. It must include one of your own open reports.')
  return data as string
}

export async function getMyLostFoundMatches(): Promise<LostFoundMatch[]> {
  const { data, error } = await client()
    .from('lost_found_matches')
    .select('id,lost_item_id,found_item_id,status,created_at,lost_item:lost_found_items!lost_item_id(id,title,description,category,occurred_at,location_description),found_item:lost_found_items!found_item_id(id,title,description,category,occurred_at,location_description)')
    .order('created_at', { ascending: false })
  if (error) throw new Error('Unable to load possible matches.')
  return (data ?? []) as unknown as LostFoundMatch[]
}

export async function reviewLostFoundMatch(matchId: string, decision: 'accepted' | 'rejected' | 'resolved'): Promise<void> {
  const { error } = await client().rpc('review_lost_found_match', { target_match_id: matchId, decision })
  if (error) throw new Error('Unable to update this match. Only a report owner or administrator can review it.')
}

export function findPossibleLostFoundMatches(items: LostFoundItem[], ownItemId: string): Array<{ item: LostFoundItem; score: number }> {
  const own = items.find((item) => item.id === ownItemId)
  if (!own) return []
  const ownWords = new Set(`${own.title} ${own.description}`.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2))
  return items
    .filter((item) => item.id !== own.id && item.report_type !== own.report_type && item.status === 'open')
    .map((item) => {
      const words = `${item.title} ${item.description}`.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2)
      const overlap = new Set(words.filter((word) => ownWords.has(word))).size
      const similarDate = own.occurred_at && item.occurred_at
        ? Math.abs(Date.parse(own.occurred_at) - Date.parse(item.occurred_at)) <= 7 * 86400000
        : false
      const similarLocation = Boolean(own.location_description && item.location_description
        && own.location_description.toLowerCase().split(/\W+/).some((word) => word.length > 3 && item.location_description?.toLowerCase().includes(word)))
      const score = (own.category === item.category ? 0.4 : 0) + Math.min(overlap / Math.max(ownWords.size, 1), 1) * 0.4 + (similarDate ? 0.1 : 0) + (similarLocation ? 0.1 : 0)
      return { item, score }
    })
    .filter(({ score }) => score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
}

export async function getCampusServices(includeInactive = false): Promise<CampusService[]> {
  let query = client().from('campus_services').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw new Error('Unable to load campus services.')
  return (data ?? []) as CampusService[]
}

export async function saveCampusService(input: Omit<CampusService, 'id' | 'created_at' | 'updated_at'>, id?: string): Promise<void> {
  const values = {
    name: input.name,
    slug: input.slug,
    category: input.category,
    description: input.description,
    location_description: input.location_description,
    opening_hours: input.opening_hours,
    contact_information: input.contact_information,
    service_type: input.service_type,
    is_active: input.is_active,
  }
  const query = id
    ? client().from('campus_services').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id)
    : client().from('campus_services').insert(values)
  const { error } = await query
  if (error) throw new Error('Unable to save the campus service. Check the fields and administrator access.')
}

export async function submitSupportTicket(input: SupportTicketInput): Promise<SupportTicket> {
  const userId = await currentUserId()
  const attachmentPaths = await uploadSupportFiles(input.attachments ?? [])
  const { data, error } = await client()
    .from('support_tickets')
    .insert({
      ticket_type: input.ticket_type,
      service_id: input.ticket_type === 'service_request' ? input.service_id : null,
      created_by: userId,
      category: input.category,
      subject: input.subject.trim(),
      description: input.description.trim(),
      priority: input.priority,
      is_anonymous: input.is_anonymous,
      location_description: input.location_description?.trim() || null,
      contact_method: input.contact_method?.trim() || null,
    })
    .select('id,reference_code,ticket_type,service_id,category,subject,description,priority,status,assigned_to,is_anonymous,location_description,resolution_summary,resolved_at,created_at,updated_at')
    .single()
  if (error || !data) {
    if (attachmentPaths.length) await client().storage.from('campus-support-private').remove(attachmentPaths)
    throw new Error('Unable to submit your request. Check the form and try again.')
  }
  if (attachmentPaths.length) {
    const { error: attachmentError } = await client().from('support_ticket_messages').insert({
      ticket_id: data.id,
      sender_id: userId,
      message: 'Attachments submitted with this request.',
      visibility: 'public',
      attachment_paths: attachmentPaths,
    })
    if (attachmentError) {
      await client().storage.from('campus-support-private').remove(attachmentPaths)
      throw new Error('Your request was submitted, but its attachments could not be linked. Open the request and add them again.')
    }
  }
  return data as SupportTicket
}

export async function getMySupportTickets(type?: SupportTicket['ticket_type']): Promise<SupportTicket[]> {
  let query = client()
    .from('support_tickets')
    .select('id,reference_code,ticket_type,service_id,category,subject,description,priority,status,assigned_to,is_anonymous,location_description,resolution_summary,resolved_at,created_at,updated_at,service:campus_services(name,category)')
    .order('updated_at', { ascending: false })
    .limit(250)
  if (type) query = query.eq('ticket_type', type)
  const { data, error } = await query
  if (error) throw new Error('Unable to load your support requests.')
  return (data ?? []) as unknown as SupportTicket[]
}

export async function getSupportTicket(ticketId: string): Promise<SupportTicket | null> {
  const { data, error } = await client()
    .from('support_tickets')
    .select('id,reference_code,ticket_type,service_id,category,subject,description,priority,status,assigned_to,is_anonymous,location_description,resolution_summary,resolved_at,created_at,updated_at,service:campus_services(name,category)')
    .eq('id', ticketId)
    .maybeSingle()
  if (error) throw new Error('Unable to load this request.')
  if (!data) return null
  const { data: contactMethod, error: contactError } = await client().rpc('get_support_ticket_contact', { target_ticket_id: ticketId })
  if (contactError) throw new Error('Unable to load the private contact method.')
  return { ...data, contact_method: contactMethod } as unknown as SupportTicket
}

export async function getSupportHistory(ticketId: string): Promise<SupportTicketHistory[]> {
  const { data, error } = await client().from('support_ticket_history').select('*').eq('ticket_id', ticketId).order('created_at')
  if (error) throw new Error('Unable to load the request history.')
  return (data ?? []) as SupportTicketHistory[]
}

export async function getSupportMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  const { data, error } = await client().rpc('get_support_ticket_messages', { target_ticket_id: ticketId })
  if (error) throw new Error('Unable to load request messages.')
  return (data ?? []) as SupportTicketMessage[]
}

export async function sendSupportMessage(ticketId: string, message: string, visibility: TicketMessageVisibility = 'public', files: File[] = []): Promise<void> {
  const senderId = await currentUserId()
  if (!message.trim() && files.length === 0) throw new Error('Write a reply or attach a file before sending.')
  const attachmentPaths = await uploadSupportFiles(files)
  const { error } = await client().from('support_ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: senderId,
    message: message.trim() || 'Attachments added to this request.',
    visibility,
    attachment_paths: attachmentPaths,
  })
  if (error) {
    if (attachmentPaths.length) await client().storage.from('campus-support-private').remove(attachmentPaths)
    throw new Error('Unable to send this message. Check your access and try again.')
  }
}

export async function getSupportAttachmentUrl(path: string): Promise<string> {
  const { data, error } = await client().storage.from('campus-support-private').createSignedUrl(path, 90)
  if (error || !data?.signedUrl) throw new Error('This attachment is unavailable or you do not have access.')
  return data.signedUrl
}

export async function getSupportInternalNotes(ticketId: string): Promise<SupportTicketInternalNote[]> {
  const { data, error } = await client().from('support_ticket_internal_notes').select('*').eq('ticket_id', ticketId).order('created_at')
  if (error) throw new Error('Unable to load internal notes.')
  return (data ?? []) as SupportTicketInternalNote[]
}

export async function addSupportInternalNote(ticketId: string, note: string): Promise<void> {
  const authorId = await currentUserId()
  const { error } = await client().from('support_ticket_internal_notes').insert({ ticket_id: ticketId, author_id: authorId, note: note.trim() })
  if (error) throw new Error('Unable to add an internal note. Confirm you are assigned to this case.')
}

export async function manageSupportTicket(input: {
  ticketId: string
  status?: TicketStatus
  assignedTo?: string | null
  updateAssignment?: boolean
  resolution?: string
  comment?: string
}): Promise<void> {
  const { error } = await client().rpc('manage_support_ticket', {
    target_ticket_id: input.ticketId,
    next_status: input.status ?? null,
    next_assignee: input.assignedTo ?? null,
    resolution: input.resolution ?? null,
    update_assignment: input.updateAssignment ?? false,
    history_comment: input.comment ?? null,
  })
  if (error) throw new Error('Unable to update this case. Check your permissions and workflow status.')
}

export async function getSupportQueue(type?: SupportTicket['ticket_type']): Promise<SupportTicket[]> {
  let query = client()
    .from('support_tickets')
    .select('id,reference_code,ticket_type,service_id,category,subject,description,priority,status,assigned_to,is_anonymous,location_description,resolution_summary,resolved_at,created_at,updated_at')
    .order('updated_at', { ascending: false })
    .limit(250)
  if (type) query = query.eq('ticket_type', type)
  const { data, error } = await query
  if (error) throw new Error('Unable to load the case queue.')
  return (data ?? []) as SupportTicket[]
}

export async function getSupportStaff(): Promise<Array<{ auth_user_id: string; full_name: string; role: 'faculty' | 'admin' }>> {
  const { data, error } = await client().from('profiles').select('auth_user_id,full_name,role').in('role', ['faculty', 'admin']).order('full_name')
  if (error) throw new Error('Unable to load authorized staff for assignment.')
  return (data ?? []) as Array<{ auth_user_id: string; full_name: string; role: 'faculty' | 'admin' }>
}

export async function getFeedback(): Promise<FeedbackSubmission[]> {
  const { data, error } = await client().from('feedback_submissions').select('*').order('created_at', { ascending: false }).limit(250)
  if (error) throw new Error('Unable to load feedback.')
  return (data ?? []) as FeedbackSubmission[]
}

export async function getPublishedFAQs(): Promise<Array<{ id: string; question: string; answer: string; category: string }>> {
  const { data, error } = await client().from('campus_faqs').select('id,question,answer,category').eq('status', 'published').order('category').order('question')
  if (error) throw new Error('Unable to load verified campus FAQs.')
  return (data ?? []) as Array<{ id: string; question: string; answer: string; category: string }>
}

export async function submitFeedback(input: Pick<FeedbackSubmission, 'category' | 'title' | 'message' | 'rating' | 'is_anonymous'>): Promise<void> {
  const submittedBy = await currentUserId()
  const { error } = await client().from('feedback_submissions').insert({ ...input, submitted_by: submittedBy })
  if (error) throw new Error('Unable to submit feedback. Check the form and try again.')
}

export async function reviewFeedback(id: string, status: FeedbackStatus, response: string): Promise<void> {
  const { error } = await client().rpc('review_feedback', { target_feedback_id: id, next_status: status, response_text: response.trim() || null })
  if (error) throw new Error('Unable to update feedback. Administrator access is required.')
}
