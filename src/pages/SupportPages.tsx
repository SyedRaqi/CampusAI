import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Building2, Clock3, FileText, HeartHandshake, LifeBuoy, MapPin, MessageCircle, Plus, Search, ShieldAlert, Sparkles, ThumbsUp } from 'lucide-react'
import PageContainer from '../components/PageContainer'
import { useAuth } from '../contexts/AuthContext'
import { sendAIMessage } from '../services/aiService'
import {
  addSupportInternalNote,
  findPossibleLostFoundMatches,
  getCampusServices,
  getFeedback,
  getLostFoundItems,
  getMyLostFoundItems,
  getMyLostFoundMatches,
  getMySupportTickets,
  getPublishedFAQs,
  getSupportHistory,
  getSupportAttachmentUrl,
  getSupportInternalNotes,
  getSupportMessages,
  getSupportQueue,
  getSupportStaff,
  getSupportTicket,
  manageSupportTicket,
  reviewFeedback,
  reviewLostFoundMatch,
  saveCampusService,
  sendSupportMessage,
  submitFeedback,
  submitSupportTicket,
  createLostFoundItem,
  suggestLostFoundMatch,
  updateLostFoundItem,
} from '../services/campusSupportService'
import type {
  CampusService,
  FeedbackStatus,
  FeedbackSubmission,
  LostFoundCategory,
  LostFoundMatch,
  LostFoundReportType,
  SupportTicket,
  SupportTicketHistory,
  SupportTicketInternalNote,
  TicketPriority,
  TicketStatus,
} from '../types/support'
import './support.css'

const categoryLabels: Record<LostFoundCategory, string> = {
  electronics: 'Electronics', id_cards: 'ID cards', books_stationery: 'Books & stationery',
  bags: 'Bags', clothing: 'Clothing', keys: 'Keys', accessories: 'Accessories', other: 'Other',
}
const ticketStatuses: TicketStatus[] = ['submitted', 'under_review', 'assigned', 'in_progress', 'awaiting_information', 'resolved', 'closed', 'rejected']

function useLoad<T>(load: () => Promise<T>, dependencies: unknown[] = []) {
  const [value, setValue] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setValue(await load()) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load this information.') }
    finally { setLoading(false) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)
  useEffect(() => { void refresh() }, [refresh])
  return { value, error, loading, refresh }
}

function SupportFrame({ title, subtitle, children, eyebrow = 'CampusConnect support' }: { title: string; subtitle: string; children?: React.ReactNode; eyebrow?: string }) {
  return <PageContainer className="support-shell"><div className="support-page">
    <header className="support-header">
      <Link className="support-back" to="/support"><ArrowLeft size={16} /> Support center</Link>
      <p className="support-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p>
    </header>{children}
  </div></PageContainer>
}

function Notice({ error, success }: { error?: string; success?: string }) {
  return <>{error && <div className="support-notice support-notice-error" role="alert">{error}</div>}{success && <div className="support-notice support-notice-success" role="status">{success}</div>}</>
}

function Busy({ loading, error, empty = 'Nothing to show yet.' }: { loading: boolean; error: string; empty?: string }) {
  if (loading) return <p className="support-empty">Loading…</p>
  if (error) return <Notice error={error} />
  return <p className="support-empty">{empty}</p>
}

export function SupportHomePage() {
  const tickets = useLoad(getMySupportTickets)
  const [lostCount, setLostCount] = useState<number | null>(null)
  useEffect(() => { void getMyLostFoundItems().then((items) => setLostCount(items.filter((item) => ['open', 'potential_match', 'under_review'].includes(item.status)).length)).catch(() => setLostCount(null)) }, [])
  const links = [
    { to: '/lost-found/report-lost', icon: Search, label: 'Report a lost item', text: 'Create a private report and browse possible matches.' },
    { to: '/lost-found/report-found', icon: BadgeCheck, label: 'Report a found item', text: 'Help return an item without publishing your contact details.' },
    { to: '/support/complaints/new', icon: ShieldAlert, label: 'Submit a complaint', text: 'Send a private request to the support team.' },
    { to: '/feedback/new', icon: ThumbsUp, label: 'Give feedback', text: 'Share a suggestion or rate a service.' },
    { to: '/campus-services', icon: Building2, label: 'Campus services', text: 'Browse configured service information and request help.' },
    { to: '/support/my-complaints', icon: Clock3, label: 'Track requests', text: 'See status updates and reply to your open cases.' },
    { to: '/lost-found/my-reports', icon: FileText, label: 'My Lost & Found reports', text: 'Edit or withdraw your reports and review possible matches.' },
    { to: '/support/faq', icon: BookOpen, label: 'Frequently asked questions', text: 'Read answers verified by campus administrators.' },
    { to: '/ai', icon: Sparkles, label: 'Ask CampusConnect AI', text: 'Get help drafting or categorizing a support request.' },
  ]
  return <SupportFrame title="How can we help?" subtitle="Find support, track your requests, or share feedback. Only services configured by your campus are listed." eyebrow="Student support">
    <section className="support-action-grid">{links.map(({ to, icon: Icon, label, text }) => <Link to={to} className="support-action-card" key={to}><span><Icon size={19} /></span><strong>{label}</strong><small>{text}</small><ArrowRight size={16} /></Link>)}</section>
    <section className="support-section"><div className="support-section-heading"><div><p className="support-eyebrow">Your activity</p><h2>Recent requests</h2></div><Link to="/support/my-complaints">View all <ArrowRight size={15} /></Link></div>
      {tickets.loading ? <Busy loading error="" /> : tickets.error ? <Notice error={tickets.error} /> : tickets.value?.length ? <div className="support-case-list">{tickets.value.slice(0, 4).map((ticket) => <TicketCard ticket={ticket} key={ticket.id} />)}</div> : <div className="support-empty-card"><HeartHandshake /><strong>No requests yet</strong><p>Your support cases will appear here after you submit one.</p></div>}
      <p className="support-muted">Active Lost &amp; Found reports: {lostCount === null ? '—' : lostCount}</p>
    </section>
  </SupportFrame>
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  return <Link className="support-case-card" to={`/support/complaints/${ticket.id}`}><div><span className={`support-status status-${ticket.status}`}>{ticket.status.replaceAll('_', ' ')}</span><span className={`support-priority priority-${ticket.priority}`}>{ticket.priority}</span></div><strong>{ticket.subject}</strong><p>{ticket.reference_code} · {ticket.ticket_type === 'service_request' ? ticket.service?.name ?? 'Service request' : ticket.category}</p><small>Updated {new Date(ticket.updated_at).toLocaleDateString()}</small></Link>
}

export function LostFoundPage({ ownOnly = false, admin = false }: { ownOnly?: boolean; admin?: boolean }) {
  const list = useLoad(async () => {
    if (ownOnly) return getMyLostFoundItems()
    const items = await getLostFoundItems(admin)
    if (admin) return items
    const ownItems = new Map((await getMyLostFoundItems()).map((item) => [item.id, item]))
    return items.map((item) => ownItems.has(item.id) ? { ...item, ...ownItems.get(item.id), is_mine: true } : item)
  }, [ownOnly, admin])
  const matches = useLoad(getMyLostFoundMatches)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [occurredDate, setOccurredDate] = useState('')
  const [itemStatus, setItemStatus] = useState('')
  const [matchFor, setMatchFor] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const candidates = useMemo(() => matchFor ? findPossibleLostFoundMatches(list.value ?? [], matchFor) : [], [list.value, matchFor])
  const filtered = useMemo(() => (list.value ?? []).filter((item) =>
    (!category || item.category === category)
      && (!occurredDate || item.occurred_at === occurredDate)
      && (!itemStatus || item.status === itemStatus)
      && (!location || (item.location_description ?? '').toLowerCase().includes(location.toLowerCase()))
      && `${item.title} ${item.description} ${item.location_description ?? ''}`.toLowerCase().includes(search.toLowerCase())),
  [list.value, category, occurredDate, location, itemStatus, search])
  const confirmMatch = async (lostId: string, foundId: string) => {
    setBusy(foundId); setError(''); setSuccess('')
    try { await suggestLostFoundMatch(lostId, foundId); setSuccess('Possible match sent to the report owner for review.'); await Promise.all([list.refresh(), matches.refresh()]) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to suggest this match.') }
    finally { setBusy('') }
  }
  const decideMatch = async (id: string, decision: 'accepted' | 'rejected' | 'resolved') => {
    setBusy(id); setError('')
    try { await reviewLostFoundMatch(id, decision); await Promise.all([matches.refresh(), list.refresh()]) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update match.') }
    finally { setBusy('') }
  }
  const title = ownOnly ? 'My Lost & Found reports' : admin ? 'Lost & Found review' : 'Lost & Found'
  return <SupportFrame title={title} subtitle="Public listings never show private contact details. Possible matches are suggestions only and require confirmation." eyebrow="Lost & Found">
    <Notice error={error || list.error || matches.error} success={success} />
    {!ownOnly && <div className="support-toolbar"><label className="support-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search item name or description" /></label><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option>{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input aria-label="Filter by location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" /><input aria-label="Filter by date" type="date" value={occurredDate} onChange={(event) => setOccurredDate(event.target.value)} />{admin && <select aria-label="Filter by status" value={itemStatus} onChange={(event) => setItemStatus(event.target.value)}><option value="">All statuses</option>{['open', 'potential_match', 'under_review', 'recovered', 'closed', 'rejected'].map((status) => <option key={status}>{status}</option>)}</select>}{!admin && <><Link className="support-button" to="/lost-found/report-lost"><Plus size={16} /> Lost item</Link><Link className="support-button support-button-secondary" to="/lost-found/report-found"><Plus size={16} /> Found item</Link></>}</div>}
    {list.loading ? <Busy loading error="" /> : !filtered.length ? <div className="support-empty-card"><Search /><strong>No listings match</strong><p>Try changing the search or category filter.</p></div> : <div className="support-listing-grid">{filtered.map((item) => <article className="support-listing-card" key={item.id}>
      <div className="support-listing-top"><span className={`support-kind kind-${item.report_type}`}>{item.report_type === 'lost' ? 'Lost' : 'Found'}</span><span>{categoryLabels[item.category]}</span></div>
      <Link to={`/lost-found/${item.id}`}><h2>{item.title}</h2></Link><p>{item.description}</p>
      {item.location_description && <small className="support-location"><MapPin size={13} /> {item.location_description}</small>}
      <small>{item.occurred_at ? new Date(`${item.occurred_at}T00:00:00`).toLocaleDateString() : 'Date not provided'} · {new Date(item.created_at).toLocaleDateString()}</small>
      {item.is_mine && <button type="button" className="support-text-button" onClick={() => setMatchFor((current) => current === item.id ? '' : item.id)}>{matchFor === item.id ? 'Hide possible matches' : 'Find possible matches'}</button>}
      {!item.is_mine && list.value?.some((own) => own.is_mine && own.report_type !== item.report_type) &&
        <button disabled={!!busy} className="support-text-button" onClick={() => {
          const own = list.value?.find((report) => report.is_mine && report.report_type !== item.report_type)
          if (own) void confirmMatch(own.report_type === 'lost' ? own.id : item.id, own.report_type === 'found' ? own.id : item.id)
        }}>{busy ? 'Sending…' : 'Suggest possible match'}</button>}
      {matchFor === item.id && <div className="support-match-list"><strong>Possible matches — suggestions, not confirmed</strong>{candidates.length ? candidates.map(({ item: candidate, score }) => <div key={candidate.id}><span>{candidate.title} · {Math.round(score * 100)}% similar</span><button disabled={!!busy} onClick={() => void confirmMatch(candidate.report_type === 'lost' ? candidate.id : item.id, candidate.report_type === 'found' ? candidate.id : item.id)}>{busy === candidate.id ? 'Sending…' : 'Suggest'}</button></div>) : <p>No similar reports found yet.</p>}</div>}
      {ownOnly && item.status !== 'closed' && item.status !== 'recovered' && <button className="support-text-button" disabled={!!busy} onClick={() => void updateLostFoundItem(item.id, { title: item.title, description: item.description, category: item.category, location_description: item.location_description ?? '', occurred_at: item.occurred_at ?? '', status: 'closed' }).then(() => list.refresh()).catch((caught: Error) => setError(caught.message))}>Withdraw report</button>}
      {admin && item.status === 'open' && <button className="support-text-button" onClick={() => void updateLostFoundItem(item.id, { title: item.title, description: item.description, category: item.category, location_description: item.location_description ?? '', occurred_at: item.occurred_at ?? '', status: 'closed' }).then(() => list.refresh()).catch((caught: Error) => setError(caught.message))}>Close listing</button>}
    </article>)}</div>}
    {(ownOnly || admin) && <section className="support-section"><div className="support-section-heading"><h2>Possible matches needing review</h2></div>{matches.loading ? <Busy loading error="" /> : matches.value?.filter((match) => match.status === 'suggested' || match.status === 'accepted').map((match) => <MatchCard match={match} key={match.id} onDecision={decideMatch} busy={busy === match.id} />) ?? <p className="support-muted">No suggested matches.</p>}</section>}
  </SupportFrame>
}

function MatchCard({ match, onDecision, busy }: { match: LostFoundMatch; onDecision: (id: string, decision: 'accepted' | 'rejected' | 'resolved') => void; busy: boolean }) {
  return <article className="support-match-card"><strong>{match.status === 'accepted' ? 'Both report owners confirmed' : 'Possible match suggested'}</strong><p>Lost: {match.lost_item?.title ?? 'Listing unavailable'} · Found: {match.found_item?.title ?? 'Listing unavailable'}</p><small>Compare the descriptions carefully. The system does not verify matches automatically.</small><div>{match.status === 'suggested' && <button disabled={busy} onClick={() => onDecision(match.id, 'accepted')}>Confirm possible match</button>}<button disabled={busy} onClick={() => onDecision(match.id, 'rejected')}>Not a match</button>{match.status === 'accepted' && <button disabled={busy} onClick={() => onDecision(match.id, 'resolved')}>Confirm recovered</button>}</div></article>
}

export function LostFoundReportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const kind: LostFoundReportType = location.pathname.endsWith('report-found') ? 'found' : 'lost'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      await createLostFoundItem({
        report_type: kind,
        title: String(form.get('title') ?? ''),
        description: String(form.get('description') ?? ''),
        category: String(form.get('category') ?? 'other') as LostFoundCategory,
        location_description: String(form.get('location') ?? ''),
        occurred_at: String(form.get('date') ?? ''),
        contact_method: String(form.get('contact') ?? ''),
        images: photos,
      })
      navigate('/lost-found/my-reports')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit report.') }
    finally { setBusy(false) }
  }
  return <SupportFrame title={`Report ${kind} item`} subtitle="Share enough detail to help identify the item. Avoid posting sensitive ID numbers or personal information. Contact details are stored privately." eyebrow="Lost & Found">
    <Notice error={error} /><form className="support-form" onSubmit={(event) => void submit(event)}>
      <label>Item name<input name="title" required minLength={3} maxLength={120} placeholder="For example, blue water bottle" /></label>
      <label>Category<select name="category">{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Description<textarea name="description" required minLength={10} maxLength={3000} rows={5} placeholder="Describe visible features without including sensitive identifying details." /></label>
      <label>General location (optional)<input name="location" maxLength={300} placeholder="Area or building name, if comfortable sharing" /></label>
      <label>Date (optional)<input type="date" name="date" /></label>
      <label>Private contact method<input name="contact" required minLength={2} maxLength={300} placeholder="A way for the support team to contact you" /></label>
      <label>Item photos (optional, up to 5)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setPhotos(Array.from(event.target.files ?? []).slice(0, 5))} /><small>JPG, PNG, WebP · 5 MB max per image · stored in private campus storage</small></label>
      <button className="support-button" disabled={busy}>{busy ? 'Submitting…' : 'Submit report'} <ArrowRight size={16} /></button>
    </form>
  </SupportFrame>
}

export function LostFoundDetailPage() {
  const { itemId = '' } = useParams()
  const navigate = useNavigate()
  const list = useLoad(async () => {
    const [items, ownItems] = await Promise.all([getLostFoundItems(true), getMyLostFoundItems()])
    const ownById = new Map(ownItems.map((item) => [item.id, item]))
    return items.map((item) => ownById.has(item.id) ? { ...item, ...ownById.get(item.id), is_mine: true } : item)
  }, [])
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const item = list.value?.find((entry) => entry.id === itemId)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try { await updateLostFoundItem(itemId, { title: String(form.get('title')), description: String(form.get('description')), category: String(form.get('category')) as LostFoundCategory, location_description: String(form.get('location')), occurred_at: String(form.get('date')) }); setEditing(false); await list.refresh() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update report.') }
  }
  if (list.loading) return <SupportFrame title="Loading report…" subtitle="" />
  if (!item) return <SupportFrame title="Report unavailable" subtitle="This report may have been withdrawn or you may not have access."><Link className="support-button" to="/lost-found">Browse Lost &amp; Found</Link></SupportFrame>
  const isOwner = item.is_mine === true
  return <SupportFrame title={item.title} subtitle={`Reported ${item.report_type} · ${categoryLabels[item.category]} · ${item.status.replaceAll('_', ' ')}`} eyebrow={isOwner ? 'Your report' : 'Lost & Found listing'}>
    <Notice error={error || list.error} />
    <article className="support-detail-card"><p>{item.description}</p>{item.location_description && <p><MapPin size={15} /> {item.location_description}</p>}<p>Occurred: {item.occurred_at ?? 'Not provided'}</p><p>Created: {new Date(item.created_at).toLocaleString()}</p>
      {isOwner && item.image_paths.map((path) => <PrivateAttachment key={path} path={path} />)}
      {isOwner && item.status === 'open' && <button className="support-button support-button-secondary" onClick={() => setEditing((value) => !value)}>{editing ? 'Cancel edit' : 'Edit report'}</button>}
    </article>
    {editing && <form className="support-form" onSubmit={(event) => void submit(event)}><label>Item name<input name="title" defaultValue={item.title} required minLength={3} /></label><label>Category<select name="category" defaultValue={item.category}>{Object.entries(categoryLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Description<textarea name="description" defaultValue={item.description} required minLength={10} rows={4} /></label><label>Location<input name="location" defaultValue={item.location_description ?? ''} /></label><label>Date<input type="date" name="date" defaultValue={item.occurred_at ?? ''} /></label><button className="support-button">Save changes</button></form>}
    <button className="support-text-button" onClick={() => navigate('/lost-found/my-reports')}>Back to my reports</button>
  </SupportFrame>
}

export function NewSupportTicketPage() {
  const navigate = useNavigate()
  const services = useLoad(getCampusServices)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [description, setDescription] = useState('')
  const [aiBusy, setAIBusy] = useState(false)
  const [aiError, setAIError] = useState('')
  async function improveDraft() {
    if (!description.trim()) { setAIError('Write a draft first so AI can help improve it.'); return }
    setAIBusy(true); setAIError('')
    try {
      const result = await sendAIMessage({
        mode: 'campus',
        prompt: `Help edit this student's support-request draft for clarity and a constructive tone. Preserve the facts exactly, do not invent campus policy or decide the request's validity, do not submit anything, and return only an editable draft:\n\n${description}`,
      })
      setDescription(result.message.content)
    } catch (caught) { setAIError(caught instanceof Error ? caught.message : 'AI drafting is unavailable. You can still submit your own text.') }
    finally { setAIBusy(false) }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    const form = new FormData(event.currentTarget)
    const serviceId = String(form.get('service_id') ?? '')
    const ticketType = serviceId ? 'service_request' : 'complaint'
    try {
      const ticket = await submitSupportTicket({
        ticket_type: ticketType,
        service_id: serviceId || undefined,
        category: String(form.get('category')),
        subject: String(form.get('subject')),
        description: String(form.get('description')),
        priority: String(form.get('priority')) as TicketPriority,
        is_anonymous: form.get('anonymous') === 'on',
        location_description: String(form.get('location') ?? ''),
        contact_method: String(form.get('contact') ?? ''),
        attachments: Array.from((form.getAll('attachments') as File[]).filter((file) => file.size > 0)),
      })
      navigate(`/support/complaints/${ticket.id}`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit request.') }
    finally { setBusy(false) }
  }
  return <SupportFrame title="Submit a support request" subtitle="Describe what happened and choose the closest category. Staff decisions remain with authorized people; AI will not submit anything automatically." eyebrow="Complaints & requests">
    <Notice error={error || services.error} />
    <form className="support-form" onSubmit={(event) => void submit(event)}>
      <label>Request type<select name="category" id="request-category"><option value="Academic">Academic</option><option value="Facilities">Facilities</option><option value="IT and technical issues">IT and technical issues</option><option value="Library">Library</option><option value="Timetable">Timetable</option><option value="Attendance">Attendance</option><option value="Campus safety">Campus safety</option><option value="Accessibility">Accessibility</option><option value="Other">Other</option></select></label>
      <label>Campus service (optional) — select to create a service request<select name="service_id" defaultValue=""><option value="">General complaint</option>{(services.value ?? []).filter((service) => service.service_type === 'request').map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}</select></label>
      <label>Subject<input name="subject" minLength={4} maxLength={180} required placeholder="Briefly describe your request" /></label>
      <label>Description<textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} maxLength={8000} required rows={6} placeholder="Include relevant details. Do not include passwords or sensitive personal information." /></label>
      <div><button type="button" className="support-button support-button-secondary" disabled={aiBusy} onClick={() => void improveDraft()}><Sparkles size={15} /> {aiBusy ? 'Reviewing draft…' : 'Improve draft with AI'}</button><small>AI suggestions are editable and never submit the request. Avoid including sensitive personal details.</small><Notice error={aiError} /></div>
      <label>Priority<select name="priority"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
      <label>Location (optional)<input name="location" maxLength={300} /></label>
      <label>Preferred contact method (optional)<input name="contact" maxLength={300} /></label>
      <label>Attachments (optional, up to 5)<input type="file" name="attachments" accept="image/jpeg,image/png,image/webp,application/pdf" multiple /><small>Images or PDFs · 5 MB max per file. Attachments are visible only to you and authorized case staff.</small></label>
      <label className="support-check"><input type="checkbox" name="anonymous" /> Submit anonymously to ordinary case views</label>
      <small>Anonymous requests retain a private reporter link for secure tracking and abuse prevention. Assigned staff do not see your identity from the ticket record.</small>
      <button className="support-button" disabled={busy || services.loading}>{busy ? 'Submitting…' : 'Submit request'} <ArrowRight size={16} /></button>
    </form>
  </SupportFrame>
}

export function MySupportTicketsPage() {
  const tickets = useLoad(getMySupportTickets)
  return <SupportFrame title="My support requests" subtitle="Track updates to your complaints and campus service requests. Reference codes are unique and non-sequential." eyebrow="Request tracking">
    {tickets.loading ? <Busy loading error="" /> : tickets.error ? <Notice error={tickets.error} /> : tickets.value?.length ? <div className="support-case-list">{tickets.value.map((ticket) => <TicketCard ticket={ticket} key={ticket.id} />)}</div> : <div className="support-empty-card"><FileText /><strong>No requests submitted</strong><Link to="/support/complaints/new">Create a request <ArrowRight size={14} /></Link></div>}
  </SupportFrame>
}

export function SupportTicketDetailPage() {
  const { complaintId = '' } = useParams()
  const { role, user } = useAuth()
  const isStaff = role === 'admin' || role === 'faculty'
  const ticket = useLoad(() => getSupportTicket(complaintId), [complaintId])
  const history = useLoad(() => getSupportHistory(complaintId), [complaintId])
  const messages = useLoad(() => getSupportMessages(complaintId), [complaintId])
  const notes = useLoad(() => isStaff ? getSupportInternalNotes(complaintId) : Promise.resolve([] as SupportTicketInternalNote[]), [complaintId, isStaff])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState('')
  const [summaryBusy, setSummaryBusy] = useState(false)
  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = new FormData(event.currentTarget)
    try {
      await sendSupportMessage(complaintId, String(form.get('message') ?? ''), 'public', Array.from((form.getAll('attachments') as File[]).filter((file) => file.size > 0)))
      event.currentTarget.reset()
      await messages.refresh()
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to send reply.') }
    finally { setBusy(false) }
  }
  async function sendNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = new FormData(event.currentTarget)
    try { await addSupportInternalNote(complaintId, String(form.get('note'))); event.currentTarget.reset(); await notes.refresh() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to add note.') }
    finally { setBusy(false) }
  }
  async function summarizeWithAI() {
    if (!ticket.value) return
    setSummaryBusy(true); setError('')
    try {
      const result = await sendAIMessage({
        mode: 'campus',
        prompt: `Summarize only the following support-request information I am authorized to view. Do not infer official campus policy, make a decision, or invent facts. State that this is an AI-generated summary.\n\n${JSON.stringify({
          reference: ticket.value.reference_code,
          subject: ticket.value.subject,
          description: ticket.value.description,
          status: ticket.value.status,
          timeline: history.value?.map(({ old_status, new_status, comment, created_at }) => ({ old_status, new_status, comment, created_at })),
          publicMessages: messages.value?.map(({ message, created_at }) => ({ message, created_at })),
        })}`,
      })
      setSummary(result.message.content)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'AI could not summarize this request.'); }
    finally { setSummaryBusy(false) }
  }
  if (ticket.loading) return <SupportFrame title="Loading request…" subtitle="" />
  if (!ticket.value) return <SupportFrame title="Request unavailable" subtitle="This request may not exist or you may not have permission to view it."><Notice error={ticket.error} /><Link to="/support/my-complaints">Back to my requests</Link></SupportFrame>
  const row = ticket.value
  return <SupportFrame title={row.subject} subtitle={`${row.reference_code} · ${row.category}`} eyebrow="Request details">
    <Notice error={error || history.error || messages.error} />
    <div className="support-detail-layout"><div>
      <article className="support-detail-card"><div><span className={`support-status status-${row.status}`}>{row.status.replaceAll('_', ' ')}</span><span className={`support-priority priority-${row.priority}`}>{row.priority}</span></div><p>{row.description}</p>{row.location_description && <p><MapPin size={15} /> {row.location_description}</p>}{row.contact_method && <p><strong>Private follow-up contact:</strong> {row.contact_method}</p>}<small>Submitted {new Date(row.created_at).toLocaleString()}{row.is_anonymous ? ' · Anonymous to ordinary case views' : ''}</small>
        <button type="button" className="support-button support-button-secondary" onClick={() => void summarizeWithAI()} disabled={summaryBusy}><Sparkles size={15} /> {summaryBusy ? 'Summarizing…' : 'Summarize visible history with AI'}</button>
        {summary && <div className="support-resolution"><strong>AI-generated summary</strong><p>{summary}</p></div>}
        {row.resolution_summary && <div className="support-resolution"><strong>Resolution</strong><p>{row.resolution_summary}</p></div>}
      </article>
      <section className="support-section"><h2><MessageCircle size={18} /> Conversation</h2>{messages.loading ? <Busy loading error="" /> : messages.value?.map((message) => <article className={`support-message ${message.sender_id === user?.id ? 'mine' : ''}`} key={message.id}><p>{message.message}</p>{message.attachment_paths.map((path) => <PrivateAttachment key={path} path={path} />)}<small>{new Date(message.created_at).toLocaleString()}</small></article>)}
        {!['closed', 'rejected'].includes(row.status) && <form className="support-inline-form" onSubmit={(event) => void sendMessage(event)}><textarea name="message" maxLength={4000} placeholder="Write a reply visible to the requester and assigned staff" /><label className="support-file-label">Attachments<input type="file" name="attachments" accept="image/jpeg,image/png,image/webp,application/pdf" multiple /></label><button className="support-button" disabled={busy}>Send reply</button></form>}
      </section>
    </div><aside className="support-side-panel"><h2>Case timeline</h2>{history.loading ? <Busy loading error="" /> : (history.value ?? []).map((entry) => <TimelineEntry entry={entry} key={entry.id} />)}{!history.loading && !history.value?.length && <p className="support-muted">No status updates yet.</p>}
      {isStaff && <section className="support-internal"><h2>Internal notes <ShieldAlert size={16} /></h2>{notes.loading ? <Busy loading error="" /> : (notes.value ?? []).map((note) => <article key={note.id}><p>{note.note}</p><small>{new Date(note.created_at).toLocaleString()}</small></article>)}<form className="support-inline-form" onSubmit={(event) => void sendNote(event)}><textarea name="note" required maxLength={4000} placeholder="Private staff-only note" /><button className="support-button support-button-secondary" disabled={busy}>Add internal note</button></form></section>}
    </aside></div>
  </SupportFrame>
}

function TimelineEntry({ entry }: { entry: SupportTicketHistory }) {
  return <div className="support-timeline-entry"><span /><strong>{entry.new_status?.replaceAll('_', ' ') ?? (entry.new_assignee ? 'Assignment updated' : 'Case updated')}</strong>{entry.comment && <p>{entry.comment}</p>}<small>{new Date(entry.created_at).toLocaleString()}</small></div>
}

function PrivateAttachment({ path }: { path: string }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  async function open() {
    try { setUrl(await getSupportAttachmentUrl(path)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to open this attachment.') }
  }
  return <span className="support-attachment">{url ? <a href={url} target="_blank" rel="noreferrer">Open private attachment</a> : <button type="button" onClick={() => void open()}>Load private attachment</button>}{error && <small role="alert">{error}</small>}</span>
}

export function FeedbackPage({ admin = false, mine = false }: { admin?: boolean; mine?: boolean }) {
  const navigate = useNavigate()
  const feedback = useLoad(getFeedback)
  const { role } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy('new')
    const form = new FormData(event.currentTarget)
    try {
      await submitFeedback({
        category: String(form.get('category')) as FeedbackSubmission['category'],
        title: String(form.get('title')),
        message: String(form.get('message')),
        rating: form.get('rating') ? Number(form.get('rating')) : null,
        is_anonymous: form.get('anonymous') === 'on',
      })
      navigate('/feedback/my-feedback')
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit feedback.') }
    finally { setBusy('') }
  }
  async function update(id: string, status: FeedbackStatus, response: string) {
    setBusy(id)
    try { await reviewFeedback(id, status, response); await feedback.refresh() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update feedback.') }
    finally { setBusy('') }
  }
  if (!admin && !mine && locationIsFeedbackNew()) return <SupportFrame title="Share feedback" subtitle="Suggestions are private by default. A rating is optional." eyebrow="Suggestions & feedback">
    <form className="support-form" onSubmit={(event) => void submit(event)}><label>Category<select name="category"><option value="general">General suggestion</option><option value="academic">Academic improvement</option><option value="facilities">Campus facilities</option><option value="events">Events</option><option value="website_app">Website or app</option><option value="services">Services</option></select></label><label>Title<input name="title" required minLength={4} maxLength={160} /></label><label>Suggestion<textarea name="message" required minLength={10} maxLength={4000} rows={5} /></label><label>Rating (optional)<select name="rating"><option value="">Not applicable</option>{[1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value} / 5</option>)}</select></label><label className="support-check"><input name="anonymous" type="checkbox" /> Hide my identity from ordinary review views</label><button className="support-button" disabled={busy === 'new'}>{busy ? 'Sending…' : 'Submit feedback'} <ArrowRight size={16} /></button><Notice error={error} /></form>
  </SupportFrame>
  const title = admin ? 'Feedback review' : 'My feedback'
  const values = feedback.value ?? []
  return <SupportFrame title={title} subtitle={admin ? 'Review suggestions and respond without publishing private submissions.' : 'Review the status and any authorized response to your suggestions.'} eyebrow="Suggestions & feedback">
    <Notice error={error || feedback.error} />
    {!admin && <div className="support-toolbar"><Link className="support-button" to="/feedback/new"><Plus size={16} /> Share feedback</Link><Link className="support-button support-button-secondary" to="/feedback/my-feedback">My feedback</Link></div>}
    {feedback.loading ? <Busy loading error="" /> : (mine ? values : admin ? values : []).map((item) => <article className="support-feedback-card" key={item.id}><div><span className={`support-status status-${item.status}`}>{item.status.replaceAll('_', ' ')}</span>{item.rating && <span>Rating {item.rating}/5</span>}</div><strong>{item.title}</strong><small>{item.category} · {new Date(item.created_at).toLocaleDateString()}{item.is_anonymous ? ' · Anonymous' : ''}</small><p>{item.message}</p>{item.admin_response && <div className="support-resolution"><strong>Response</strong><p>{item.admin_response}</p></div>}
      {admin && role === 'admin' && <FeedbackReview item={item} busy={busy === item.id} onUpdate={update} />}
    </article>)}
    {!feedback.loading && !feedback.error && !values.length && <div className="support-empty-card"><ThumbsUp /><strong>No feedback records</strong><p>There are no submissions in this view yet.</p></div>}
  </SupportFrame>
}

function locationIsFeedbackNew() { return window.location.pathname === '/feedback/new' }

function FeedbackReview({ item, busy, onUpdate }: { item: FeedbackSubmission; busy: boolean; onUpdate: (id: string, status: FeedbackStatus, response: string) => void }) {
  const [status, setStatus] = useState(item.status)
  const [response, setResponse] = useState(item.admin_response ?? '')
  return <div className="support-review-controls"><select aria-label="Feedback status" value={status} onChange={(event) => setStatus(event.target.value as FeedbackStatus)}>{(['submitted', 'under_review', 'planned', 'implemented', 'declined', 'closed'] as FeedbackStatus[]).map((value) => <option key={value}>{value}</option>)}</select><input value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Optional private response" maxLength={3000} /><button disabled={busy} onClick={() => onUpdate(item.id, status, response)}>{busy ? 'Saving…' : 'Save review'}</button></div>
}

export function CampusServicesPage({ admin = false }: { admin?: boolean }) {
  const services = useLoad(() => getCampusServices(admin), [admin])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<CampusService | null>(null)
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name'))
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    try {
      await saveCampusService({
        name, slug, category: String(form.get('category')) as CampusService['category'],
        description: String(form.get('description')), location_description: String(form.get('location')) || null,
        opening_hours: String(form.get('hours')) || null, contact_information: String(form.get('contact')) || null,
        service_type: form.get('requestable') === 'on' ? 'request' : 'information',
        is_active: editing?.is_active ?? true,
      }, editing?.id)
      event.currentTarget.reset(); setEditing(null); await services.refresh()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save service.') }
    finally { setBusy(false) }
  }
  return <SupportFrame title={admin ? 'Manage campus services' : 'Campus services'} subtitle={admin ? 'Only add verified information supplied by the institution. Leave hours, location, and contacts blank until confirmed.' : 'Service information shown here has been configured by an administrator; an empty directory means none have been published yet.'} eyebrow="Campus services">
    <Notice error={error || services.error} />
    {admin && <form className="support-form support-service-form" onSubmit={(event) => void create(event)}><h2>{editing ? 'Edit verified service' : 'Add a verified service'}</h2><label>Name<input name="name" defaultValue={editing?.name} required minLength={2} /></label><label>Category<select name="category" defaultValue={editing?.category ?? 'general'}>{['it_support', 'library_assistance', 'facilities', 'student_support', 'academic_assistance', 'accessibility', 'general'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Description<textarea name="description" defaultValue={editing?.description} required minLength={10} rows={3} /></label><label>Location, if verified<input name="location" defaultValue={editing?.location_description ?? ''} /></label><label>Opening hours, if verified<input name="hours" defaultValue={editing?.opening_hours ?? ''} /></label><label>Contact information, if verified<input name="contact" defaultValue={editing?.contact_information ?? ''} /></label><label className="support-check"><input type="checkbox" name="requestable" defaultChecked={editing?.service_type === 'request'} /> Accept service requests</label><div className="support-toolbar"><button className="support-button" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save service' : 'Add service'}</button>{editing && <button type="button" className="support-button support-button-secondary" onClick={() => setEditing(null)}>Cancel</button>}</div></form>}
    {services.loading ? <Busy loading error="" /> : services.value?.length ? <div className="support-service-grid">{services.value.map((service) => <article className="support-service-card" key={service.id}><Building2 /><span>{service.category.replaceAll('_', ' ')}</span><h2>{service.name}</h2><p>{service.description}</p>{service.location_description && <small><MapPin size={13} /> {service.location_description}</small>}{service.opening_hours && <small>{service.opening_hours}</small>}{service.contact_information && <small>{service.contact_information}</small>}    <Link className="support-text-button" to={`/campus-services/${service.id}`}>View service details <ArrowRight size={14} /></Link>
    {admin && <button className="support-text-button" onClick={() => { setEditing(service); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit service</button>}
    {service.service_type === 'request' && <Link className="support-button" to={`/campus-services/${service.id}/request`}>Request service <ArrowRight size={15} /></Link>}{admin && <button className="support-text-button" onClick={() => void saveCampusService({ ...service, is_active: !service.is_active }).then(() => services.refresh()).catch((caught: Error) => setError(caught.message))}>{service.is_active ? 'Deactivate service' : 'Activate service'}</button>}</article>)}</div> : <div className="support-empty-card"><Building2 /><strong>No campus services configured</strong><p>Ask an administrator to add verified campus information. This page does not invent services or contact details.</p></div>}
  </SupportFrame>
}

export function AdminSupportPage({ faculty = false }: { faculty?: boolean }) {
  const queue = useLoad(() => getSupportQueue(), [faculty])
  const staff = useLoad(() => faculty ? Promise.resolve([]) : getSupportStaff(), [faculty])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [caseCategory, setCaseCategory] = useState('')
  const [search, setSearch] = useState('')
  const [createdDate, setCreatedDate] = useState('')
  const [page, setPage] = useState(0)
  const [busy, setBusy] = useState('')
  const visible = (queue.value ?? []).filter((ticket) =>
    (!filter || ticket.ticket_type === filter)
      && (!status || ticket.status === status)
      && (!priority || ticket.priority === priority)
      && (!caseCategory || ticket.category === caseCategory)
      && (!createdDate || ticket.created_at.startsWith(createdDate))
      && (!search || `${ticket.reference_code} ${ticket.subject} ${ticket.category}`.toLowerCase().includes(search.toLowerCase())))
  const pageSize = 20
  const pageRows = visible.slice(page * pageSize, (page + 1) * pageSize)
  async function save(ticket: SupportTicket, event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(ticket.id)
    const form = new FormData(event.currentTarget)
    const nextStatus = String(form.get('status')) as TicketStatus
    try {
      await manageSupportTicket({
        ticketId: ticket.id,
        status: nextStatus,
        assignedTo: String(form.get('assigned_to')) || null,
        updateAssignment: !faculty,
        resolution: String(form.get('resolution')),
        comment: String(form.get('comment')),
      })
      await queue.refresh()
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update case.') }
    finally { setBusy('') }
  }
  const stats = {
    open: (queue.value ?? []).filter((ticket) => !['closed', 'resolved', 'rejected'].includes(ticket.status)).length,
    unassigned: (queue.value ?? []).filter((ticket) => !ticket.assigned_to).length,
    priority: (queue.value ?? []).filter((ticket) => ticket.priority === 'urgent' || ticket.priority === 'high').length,
  }
  return <SupportFrame title={faculty ? 'My assigned support cases' : 'Support case management'} subtitle={faculty ? 'Only requests assigned to your account appear in this queue.' : 'Manage complaints, service requests and referrals. Access is enforced by database permissions, not this interface.'} eyebrow={faculty ? 'Faculty & staff' : 'Administration'}>
    <Notice error={error || queue.error || (!faculty ? staff.error : '')} />
    {!faculty && <><div className="support-stats"><div><strong>{stats.open}</strong><span>Open cases</span></div><div><strong>{stats.unassigned}</strong><span>Unassigned</span></div><div><strong>{stats.priority}</strong><span>High priority</span></div><div><strong>{(queue.value ?? []).filter((ticket) => ticket.status === 'awaiting_information').length}</strong><span>Awaiting information</span></div><div><strong>{(queue.value ?? []).filter((ticket) => ticket.status === 'resolved').length}</strong><span>Resolved</span></div></div><nav className="support-admin-tabs" aria-label="Support administration"><Link to="/admin/complaints">Complaints &amp; service requests</Link><Link to="/admin/lost-found">Lost &amp; Found</Link><Link to="/admin/feedback">Feedback</Link><Link to="/admin/campus-services">Campus services</Link></nav></>}
    <div className="support-toolbar"><label>Search reference or subject<input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} placeholder="CC-… or words" /></label><label>Type<select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0) }}><option value="">All cases</option><option value="complaint">Complaints</option><option value="service_request">Service requests</option></select></label><label>Category<select value={caseCategory} onChange={(event) => { setCaseCategory(event.target.value); setPage(0) }}><option value="">All categories</option>{[...new Set((queue.value ?? []).map((ticket) => ticket.category))].sort().map((value) => <option key={value}>{value}</option>)}</select></label><label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0) }}><option value="">All statuses</option>{ticketStatuses.map((value) => <option key={value}>{value}</option>)}</select></label><label>Priority<select value={priority} onChange={(event) => { setPriority(event.target.value); setPage(0) }}><option value="">All priorities</option>{['low', 'normal', 'high', 'urgent'].map((value) => <option key={value}>{value}</option>)}</select></label><label>Date<input type="date" value={createdDate} onChange={(event) => { setCreatedDate(event.target.value); setPage(0) }} /></label></div>
    {queue.loading ? <Busy loading error="" /> : visible.length ? <><div className="support-admin-list">{pageRows.map((ticket) => <article className="support-admin-card" key={ticket.id}><div className="support-admin-card-heading"><div><span className={`support-status status-${ticket.status}`}>{ticket.status.replaceAll('_', ' ')}</span><span className={`support-priority priority-${ticket.priority}`}>{ticket.priority}</span></div><strong>{ticket.subject}</strong><small>{ticket.reference_code} · {ticket.category} · {ticket.is_anonymous ? 'Anonymous' : 'Identified'} · {new Date(ticket.created_at).toLocaleDateString()}</small></div><p>{ticket.description}</p><Link to={`/support/complaints/${ticket.id}`}>Open case conversation and notes <ArrowRight size={14} /></Link>
      <form className="support-review-controls" onSubmit={(event) => void save(ticket, event)}><select name="status" defaultValue={ticket.status}>{ticketStatuses.map((value) => <option key={value}>{value}</option>)}</select>{!faculty && <select name="assigned_to" defaultValue={ticket.assigned_to ?? ''}><option value="">Unassigned</option>{(staff.value ?? []).map((person) => <option value={person.auth_user_id} key={person.auth_user_id}>{person.full_name} · {person.role}</option>)}</select>}<input name="resolution" placeholder="Resolution summary (required to resolve)" maxLength={3000} /><input name="comment" placeholder="Public history update (optional)" maxLength={2000} /><button disabled={busy === ticket.id}>{busy === ticket.id ? 'Saving…' : 'Update case'}</button></form>
    </article>)}</div><div className="support-pagination"><button disabled={page === 0} onClick={() => setPage((value) => Math.max(value - 1, 0))}>Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(visible.length / pageSize))} · {visible.length} cases</span><button disabled={(page + 1) * pageSize >= visible.length} onClick={() => setPage((value) => value + 1)}>Next</button></div></> : <div className="support-empty-card"><LifeBuoy /><strong>No cases in this view</strong><p>Cases appear when a user submits a request or a staff member is assigned.</p></div>}
  </SupportFrame>
}

export function LostFoundAdminPage() { return <LostFoundPage admin /> }

export function CampusServiceDetailPage() {
  const { serviceId = '' } = useParams()
  const services = useLoad(getCampusServices)
  const service = services.value?.find((entry) => entry.id === serviceId)
  return <SupportFrame title={service?.name ?? 'Campus service'} subtitle="Only configured, verified campus details are shown here." eyebrow="Campus services">
    {services.loading ? <Busy loading error="" /> : service ? <article className="support-detail-card"><p>{service.description}</p>{service.location_description && <p><MapPin size={15} /> {service.location_description}</p>}{service.opening_hours && <p>Hours: {service.opening_hours}</p>}{service.contact_information && <p>Contact: {service.contact_information}</p>}{service.service_type === 'request' && <Link className="support-button" to={`/campus-services/${service.id}/request`}>Request this service <ArrowRight size={15} /></Link>}</article> : <Busy loading={false} error={services.error} empty="This service is not available." />}
  </SupportFrame>
}

export function ServiceRequestPage() {
  const { serviceId = '' } = useParams()
  const services = useLoad(getCampusServices)
  const navigate = useNavigate()
  const service = services.value?.find((item) => item.id === serviceId)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true)
    const form = new FormData(event.currentTarget)
    try {
      const ticket = await submitSupportTicket({
        ticket_type: 'service_request', service_id: serviceId, category: service?.category ?? 'service',
        subject: String(form.get('subject')), description: String(form.get('description')),
        priority: String(form.get('priority')) as TicketPriority, is_anonymous: false,
      })
      navigate(`/support/complaints/${ticket.id}`)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to submit service request.') }
    finally { setBusy(false) }
  }
  return <SupportFrame title={service ? `Request ${service.name}` : 'Request a service'} subtitle="Your request is visible only to you and authorized staff." eyebrow="Campus services"><Notice error={error || services.error} />{service ? <form className="support-form" onSubmit={(event) => void submit(event)}><label>Subject<input name="subject" required minLength={4} /></label><label>Description<textarea name="description" required minLength={10} rows={5} /></label><label>Priority<select name="priority"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></label><button className="support-button" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</button></form> : <Busy loading={services.loading} error={services.error} empty="This service is unavailable or does not accept requests." />}</SupportFrame>
}

export function AdminFeedbackPage() { return <FeedbackPage admin /> }
export function MyFeedbackPage() { return <FeedbackPage mine /> }
export function SupportFAQPage() {
  const faqs = useLoad(getPublishedFAQs)
  return <SupportFrame title="Frequently asked questions" subtitle="These answers are maintained by administrators and shown only when published. CampusConnect AI may help with general questions but is not an official policy source." eyebrow="Verified campus information">
    {faqs.loading ? <Busy loading error="" /> : faqs.error ? <Notice error={faqs.error} /> : faqs.value?.length ? <div className="support-faq-list">{faqs.value.map((faq) => <details key={faq.id}><summary>{faq.question}<small>{faq.category}</small></summary><p>{faq.answer}</p></details>)}</div> : <div className="support-empty-card"><BookOpen /><strong>No verified FAQs published</strong><p>Administrators have not published campus answers yet. Do not rely on generated content as official policy.</p><Link to="/ai/search">Search verified campus information <ArrowRight size={14} /></Link></div>}
  </SupportFrame>
}
export function MyServiceRequestsPage() {
  const tickets = useLoad(() => getMySupportTickets('service_request'))
  return <SupportFrame title="My service requests" subtitle="Track requests submitted to configured campus services." eyebrow="Request tracking">
    {tickets.loading ? <Busy loading error="" /> : tickets.error ? <Notice error={tickets.error} /> : tickets.value?.length ? <div className="support-case-list">{tickets.value.map((ticket) => <TicketCard ticket={ticket} key={ticket.id} />)}</div> : <div className="support-empty-card"><Building2 /><strong>No service requests</strong><p>Requests you submit to a campus service will appear here.</p></div>}
  </SupportFrame>
}
