import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BellRing, CalendarClock, CheckCircle2, FileText, Pin, Plus, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { useAuth } from '../contexts/AuthContext'
import {
  acknowledgeAnnouncement,
  getAcknowledgementCount,
  getAnnouncement,
  getAnnouncementAttachmentUrl,
  getAnnouncementAudience,
  getAnnouncements,
  hasAcknowledgedAnnouncement,
  saveAnnouncement,
  uploadAnnouncementAttachments,
  type AnnouncementAudience,
  type AnnouncementInput,
  type AnnouncementRecord,
  type AnnouncementStatus,
} from '../services/announcementService'
import './phase10.css'

export function AnnouncementListPage({ admin = false }: { admin?: boolean }) {
  const [items, setItems] = useState<AnnouncementRecord[]>([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function load(targetPage = page) {
    setLoading(true)
    try { setItems(await getAnnouncements(targetPage, admin)); setError('') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load announcements.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load(0) }, [admin])
  return <PageContainer className="phase10-shell">
    <header className="p10-page-heading"><div><p className="p10-eyebrow">{admin ? 'Administration' : 'CampusConnect'}</p><h1>{admin ? 'Announcement management' : 'Campus announcements'}</h1><p>{admin ? 'Draft, schedule and publish verified campus updates.' : 'Updates and opportunities published through the authorized campus workflow.'}</p></div>
      {admin && <Link className="p10-button" to="/admin/announcements/create"><Plus size={16} /> Create announcement</Link>}
    </header>
    {error && <p className="p10-error" role="alert">{error}</p>}
    {loading ? <p className="p10-loading">Loading announcements…</p> : items.length ? <div className="p10-announcement-list">
      {items.map((item) => <AnnouncementCard key={item.id} item={item} admin={admin} />)}
    </div> : <div className="p10-empty"><BellRing size={28} /><h2>No announcements</h2><p>{admin ? 'Create a draft to begin.' : 'There are no announcements available for your account right now.'}</p></div>}
    {items.length === 20 && <div className="p10-pagination"><button type="button" disabled={page === 0 || loading} onClick={() => { const next = page - 1; setPage(next); void load(next) }}>Previous</button><span>Page {page + 1}</span><button type="button" disabled={loading} onClick={() => { const next = page + 1; setPage(next); void load(next) }}>Next</button></div>}
  </PageContainer>
}

function AnnouncementCard({ item, admin }: { item: AnnouncementRecord; admin: boolean }) {
  const [acknowledgements, setAcknowledgements] = useState<number | null>(null)
  useEffect(() => {
    if (!admin || !item.requires_acknowledgement) return
    let active = true
    void getAcknowledgementCount(item.id).then((count) => { if (active) setAcknowledgements(count) })
      .catch((error: unknown) => console.error('Unable to load acknowledgement count:', error))
    return () => { active = false }
  }, [admin, item.id, item.requires_acknowledgement])
  return <article className="p10-announcement-card">
    <div className="p10-announcement-card-top"><span className={`p10-chip p10-priority-${item.priority}`}>{item.priority}</span><span className="p10-chip">{item.category.replaceAll('_', ' ')}</span><span className={`p10-chip p10-status-${item.status}`}>{item.status}</span>{item.is_pinned && <span className="p10-pin"><Pin size={14} /> Pinned</span>}</div>
    <Link to={`/announcements/${item.id}`}><h2>{item.title}</h2></Link>
    <p>{item.summary}</p>
    <div className="p10-announcement-meta"><time>{item.published_at ? new Date(item.published_at).toLocaleString() : item.scheduled_at ? `Scheduled ${new Date(item.scheduled_at).toLocaleString()}` : 'Draft'}</time>{item.expires_at && <span>Expires {new Date(item.expires_at).toLocaleDateString()}</span>}{item.requires_acknowledgement && <span><ShieldCheck size={14} /> Acknowledgement required{admin && acknowledgements !== null ? ` · ${acknowledgements} received` : ''}</span>}</div>
    <div className="p10-announcement-card-actions"><Link className="p10-text-button" to={`/announcements/${item.id}`}>Read announcement <ArrowRight size={14} /></Link>{admin && <Link className="p10-text-button" to={`/admin/announcements/${item.id}/edit`}>Edit <ArrowRight size={14} /></Link>}</div>
  </article>
}

export function AnnouncementDetailPage() {
  const { announcementId = '' } = useParams()
  const { role } = useAuth()
  const admin = role === 'admin'
  const [item, setItem] = useState<AnnouncementRecord | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let active = true
    setLoading(true)
    void Promise.all([getAnnouncement(announcementId), hasAcknowledgedAnnouncement(announcementId)])
      .then(([announcement, hasAck]) => { if (active) { setItem(announcement); setAcknowledged(hasAck) } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load announcement.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [announcementId])

  async function acknowledge() {
    setSaving(true); setError('')
    try { await acknowledgeAnnouncement(announcementId); setAcknowledged(true) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to acknowledge this announcement.') }
    finally { setSaving(false) }
  }

  if (loading) return <PageContainer className="phase10-shell"><p className="p10-loading">Loading announcement…</p></PageContainer>
  if (!item) return <PageContainer className="phase10-shell"><div className="p10-empty"><BellRing size={28} /><h1>Announcement unavailable</h1><p>This announcement may have expired or is not available for your account.</p><Link to="/announcements">Back to announcements</Link></div>{error && <p className="p10-error">{error}</p>}</PageContainer>
  return <PageContainer className="phase10-shell">
    <Link className="p10-back-link" to="/announcements"><ArrowLeft size={15} /> All announcements</Link>
    <article className="p10-announcement-detail">
      <div className="p10-announcement-card-top"><span className="p10-chip">{item.category.replaceAll('_', ' ')}</span><span className={`p10-chip p10-priority-${item.priority}`}>{item.priority}</span>{item.is_pinned && <span className="p10-pin"><Pin size={14} /> Pinned</span>}</div>
      <h1>{item.title}</h1><p className="p10-announcement-summary">{item.summary}</p>
      <div className="p10-announcement-meta"><time>Published {item.published_at ? new Date(item.published_at).toLocaleString() : 'Not yet published'}</time>{item.expires_at && <span>Expires {new Date(item.expires_at).toLocaleString()}</span>}</div>
      <div className="p10-announcement-content">{item.content.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      {item.attachment_paths.length > 0 && <section className="p10-attachments"><h2>Attachments</h2>{item.attachment_paths.map((path) => <AnnouncementAttachment key={path} path={path} />)}</section>}
      {item.requires_acknowledgement && <div className="p10-acknowledgement"><div><ShieldCheck size={20} /><span><strong>Acknowledgement required</strong><small>Confirm that you have read this announcement.</small></span></div><button className="p10-button" type="button" onClick={() => void acknowledge()} disabled={acknowledged || saving}>{acknowledged ? <><CheckCircle2 size={16} /> Acknowledged</> : saving ? 'Saving…' : 'Acknowledge'}</button></div>}
      {admin && <Link className="p10-text-button" to={`/admin/announcements/${item.id}/edit`}>Edit announcement <ArrowRight size={14} /></Link>}
      {error && <p className="p10-error" role="alert">{error}</p>}
    </article>
  </PageContainer>
}

function AnnouncementAttachment({ path }: { path: string }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    void getAnnouncementAttachmentUrl(path).then((signedUrl) => { if (active) setUrl(signedUrl) })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Attachment unavailable.') })
    return () => { active = false }
  }, [path])
  const name = path.split('/').pop() ?? 'Attachment'
  return <div className="p10-attachment"><FileText size={16} />{url ? <a href={url} target="_blank" rel="noreferrer">{name}</a> : <span>{error || 'Preparing secure attachment…'}</span>}</div>
}

export function AnnouncementEditorPage() {
  const { announcementId = '' } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(announcementId)
  const [initial, setInitial] = useState<AnnouncementRecord | null>(null)
  const [audiences, setAudiences] = useState<AnnouncementAudience[]>([])
  const [audienceMode, setAudienceMode] = useState<'all' | 'group'>('all')
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    if (!editing) return
    let active = true
    void Promise.all([getAnnouncement(announcementId), getAnnouncementAudience(announcementId)])
      .then(([item, targets]) => {
        if (!active) return
        if (!item) { setError('Announcement not found or not accessible.'); return }
        setInitial(item)
        setAudiences(targets)
        const allUsers = targets.some((target) => !target.role && !target.department && !target.semester && !target.section)
        setAudienceMode(allUsers ? 'all' : 'group')
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load announcement.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [announcementId, editing])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true); setError('')
    const form = new FormData(event.currentTarget)
    try {
      const uploaded = files.length ? await uploadAnnouncementAttachments(files) : []
      const scope: AnnouncementAudience[] = audienceMode === 'all' ? [] : [{
        role: String(form.get('role') ?? '') as AnnouncementAudience['role'],
        department: String(form.get('department') ?? ''),
        semester: form.get('semester') ? Number(form.get('semester')) : '',
        section: String(form.get('section') ?? ''),
      }]
      const audience = scope.length && !scope[0].role && !scope[0].department && !scope[0].semester && !scope[0].section
        ? [] : scope
      const scheduleValue = String(form.get('scheduled') ?? '')
      const expiryValue = String(form.get('expires') ?? '')
      const status = String(form.get('status')) as AnnouncementStatus
      if (status === 'scheduled' && !scheduleValue) throw new Error('Choose a publication date and time for a scheduled announcement.')
      const input: AnnouncementInput = {
        id: initial?.id,
        title: String(form.get('title')),
        slug: String(form.get('slug')),
        summary: String(form.get('summary')),
        content: String(form.get('content')),
        category: String(form.get('category')) as AnnouncementInput['category'],
        priority: String(form.get('priority')) as AnnouncementInput['priority'],
        status,
        scheduled_at: scheduleValue ? new Date(scheduleValue).toISOString() : null,
        expires_at: expiryValue ? new Date(expiryValue).toISOString() : null,
        is_pinned: form.get('pinned') === 'on',
        requires_acknowledgement: form.get('acknowledgement') === 'on',
        attachment_paths: [...(initial?.attachment_paths ?? []), ...uploaded],
        audiences: audience,
      }
      const id = await saveAnnouncement(input)
      navigate(`/announcements/${id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save announcement.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageContainer className="phase10-shell"><p className="p10-loading">Loading editor…</p></PageContainer>
  return <PageContainer className="phase10-shell">
    <Link className="p10-back-link" to="/admin/announcements"><ArrowLeft size={15} /> Announcement management</Link>
    <header className="p10-page-heading"><div><p className="p10-eyebrow">Admin publisher</p><h1>{editing ? 'Edit announcement' : 'Create announcement'}</h1><p>Only authorized administrators can publish official campus announcements.</p></div></header>
    {error && <p className="p10-error" role="alert">{error}</p>}
    {preview ? <article className="p10-announcement-detail"><button className="p10-text-button" type="button" onClick={() => setPreview(false)}><ArrowLeft size={14} /> Return to editor</button><h1>{initial?.title ?? 'Announcement preview'}</h1><p>{initial?.summary ?? 'Preview uses the saved announcement fields after submitting a draft.'}</p>{initial && <div className="p10-announcement-content">{initial.content}</div>}</article> : <form className="p10-editor" onSubmit={(event) => void submit(event)}>
      <label>Title<input name="title" defaultValue={initial?.title} required minLength={4} maxLength={180} /></label>
      <label>URL slug<input name="slug" defaultValue={initial?.slug} placeholder="campus-update-title" required pattern="[a-z0-9]+(-[a-z0-9]+)*" /></label>
      <label>Summary<textarea name="summary" defaultValue={initial?.summary} required minLength={10} maxLength={500} rows={2} /></label>
      <label>Announcement content<textarea name="content" defaultValue={initial?.content} required minLength={10} maxLength={20000} rows={10} /></label>
      <div className="p10-form-grid"><label>Category<select name="category" defaultValue={initial?.category ?? 'general'}>{['academic', 'events', 'career', 'clubs', 'student_support', 'general', 'system'].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></label><label>Priority<select name="priority" defaultValue={initial?.priority ?? 'normal'}>{['normal', 'important', 'urgent'].map((item) => <option key={item}>{item}</option>)}</select></label><label>Publication state<select name="status" defaultValue={initial?.status ?? 'draft'}>{['draft', 'scheduled', 'published', 'archived', 'cancelled'].map((item) => <option key={item}>{item}</option>)}</select></label></div>
      <div className="p10-form-grid"><label><span><CalendarClock size={15} /> Scheduled publication</span><input type="datetime-local" name="scheduled" defaultValue={initial?.scheduled_at ? new Date(new Date(initial.scheduled_at).getTime() - new Date(initial.scheduled_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} /></label><label><span><CalendarClock size={15} /> Expiration date</span><input type="datetime-local" name="expires" defaultValue={initial?.expires_at ? new Date(new Date(initial.expires_at).getTime() - new Date(initial.expires_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} /></label></div>
      <fieldset className="p10-audience"><legend>Audience targeting</legend><label>Audience<select value={audienceMode} onChange={(event) => setAudienceMode(event.target.value as typeof audienceMode)}><option value="all">All users</option><option value="group">Target an academic group or role</option></select></label>
        {audienceMode === 'group' && <div className="p10-form-grid"><label>Role<select name="role" defaultValue={audiences[0]?.role ?? ''}><option value="">Any role</option><option value="student">Students</option><option value="faculty">Faculty</option><option value="admin">Administrators</option></select></label><label>Department<input name="department" defaultValue={audiences[0]?.department ?? ''} maxLength={120} /></label><label>Semester<select name="semester" defaultValue={audiences[0]?.semester ?? ''}><option value="">Any semester</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((value) => <option key={value}>{value}</option>)}</select></label><label>Section<input name="section" defaultValue={audiences[0]?.section ?? ''} maxLength={40} /></label></div>}
        <p className="p10-muted">A targeted audience is enforced in database access policies. Choose at least one role or academic group field.</p>
      </fieldset>
      <label>Attachments (PDF, JPG, PNG, WebP · up to 10 MB each)<input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
      {!!initial?.attachment_paths.length && <p className="p10-muted">Existing attachments will be retained. {initial.attachment_paths.length} attached.</p>}
      <div className="p10-form-inline"><label className="p10-check"><input type="checkbox" name="pinned" defaultChecked={initial?.is_pinned} /> Pin announcement</label><label className="p10-check"><input type="checkbox" name="acknowledgement" defaultChecked={initial?.requires_acknowledgement} /> Require acknowledgement</label></div>
      <div className="p10-editor-actions"><button type="button" className="p10-button p10-button-secondary" onClick={() => setPreview(true)} disabled={!initial}>Preview saved version</button><button className="p10-button" disabled={saving}>{saving ? 'Saving…' : 'Save announcement'} <ArrowRight size={16} /></button></div>
    </form>}
  </PageContainer>
}
