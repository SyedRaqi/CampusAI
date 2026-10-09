import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { useAuth } from '../contexts/AuthContext'
import { eventCategories, getEventById, saveEvent, uploadEventBanner } from '../services/eventService'
import type { EventCategory, EventStatus } from '../types'

type EventFormState = {
  title: string
  description: string
  short_description: string
  category: EventCategory
  organizer_name: string
  venue: string
  event_date: string
  start_time: string
  end_time: string
  registration_deadline: string
  capacity: string
  banner_image_url: string
}

const emptyForm: EventFormState = {
  title: '',
  description: '',
  short_description: '',
  category: 'Technical',
  organizer_name: '',
  venue: '',
  event_date: '',
  start_time: '09:00',
  end_time: '10:00',
  registration_deadline: '',
  capacity: '100',
  banner_image_url: '',
}

export default function FacultyEventFormPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [form, setForm] = useState<EventFormState>({ ...emptyForm, organizer_name: profile?.full_name ?? '' })
  const [loading, setLoading] = useState(Boolean(eventId))
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!eventId) return

    let active = true
    getEventById(eventId)
      .then((event) => {
        if (!active) return
        if (!event) {
          setError('Event not found.')
          return
        }
        setForm({
          title: event.title,
          description: event.description,
          short_description: event.short_description,
          category: event.category,
          organizer_name: event.organizer_name,
          venue: event.venue,
          event_date: event.event_date,
          start_time: event.start_time.slice(0, 5),
          end_time: event.end_time.slice(0, 5),
          registration_deadline: new Date(event.registration_deadline).toISOString().slice(0, 16),
          capacity: String(event.capacity),
          banner_image_url: event.banner_image_url ?? '',
        })
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : 'Unable to load event.'))
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [eventId, profile?.full_name])

  const handleSave = async (status: Extract<EventStatus, 'draft' | 'published'>) => {
    setSaving(true)
    setError('')
    try {
      await saveEvent({
        ...form,
        registration_deadline: new Date(form.registration_deadline).toISOString(),
        capacity: Number(form.capacity),
        banner_image_url: form.banner_image_url || null,
        status,
        is_featured: false,
      }, eventId)
      navigate('/faculty/events')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save event.')
    } finally {
      setSaving(false)
    }
  }

  const handleBannerUpload = async (file: File | undefined) => {
    if (!file) return
    setUploadingBanner(true)
    setError('')
    try {
      updateField('banner_image_url', await uploadEventBanner(file))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload banner.')
    } finally {
      setUploadingBanner(false)
    }
  }

  const updateField = <Key extends keyof EventFormState>(key: Key, value: EventFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  if (loading) return <PageContainer className="page-shell"><div className="empty-state">Loading event...</div></PageContainer>

  return (
    <PageContainer className="page-shell">
      <div className="form-shell glass-panel">
        <h1>{eventId ? 'Edit Event' : 'Create Event'}</h1>
        <form className="event-form" onSubmit={(submitEvent) => { submitEvent.preventDefault(); void handleSave('published') }}>
          <label>
            <span>Event Title</span>
            <input required value={form.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Event title" />
          </label>
          <label>
            <span>Short Description</span>
            <input required value={form.short_description} onChange={(event) => updateField('short_description', event.target.value)} placeholder="A concise event summary" />
          </label>
          <label>
            <span>Description</span>
            <textarea required value={form.description} onChange={(event) => updateField('description', event.target.value)} rows={5} />
          </label>
          <label>
            <span>Category</span>
            <select value={form.category} onChange={(event) => updateField('category', event.target.value as EventCategory)}>
              {eventCategories.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}
            </select>
          </label>
          <label>
            <span>Venue</span>
            <input required value={form.venue} onChange={(event) => updateField('venue', event.target.value)} placeholder="Venue" />
          </label>
          <label>
            <span>Organizer</span>
            <input required value={form.organizer_name} onChange={(event) => updateField('organizer_name', event.target.value)} />
          </label>
          <label>
            <span>Capacity</span>
            <input required type="number" value={form.capacity} min={1} onChange={(event) => updateField('capacity', event.target.value)} />
          </label>
          <label><span>Event Date</span><input required type="date" value={form.event_date} onChange={(event) => updateField('event_date', event.target.value)} /></label>
          <label><span>Start Time</span><input required type="time" value={form.start_time} onChange={(event) => updateField('start_time', event.target.value)} /></label>
          <label><span>End Time</span><input required type="time" value={form.end_time} onChange={(event) => updateField('end_time', event.target.value)} /></label>
          <label><span>Registration Deadline</span><input required type="datetime-local" value={form.registration_deadline} onChange={(event) => updateField('registration_deadline', event.target.value)} /></label>
          <label><span>Event Banner (JPG, PNG, WebP; max 5 MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleBannerUpload(event.target.files?.[0])} /></label>
          {form.banner_image_url && <img className="event-banner-preview" src={form.banner_image_url} alt="Uploaded event banner preview" />}
          {error && <p role="alert" className="form-error">{error}</p>}
          <div className="form-actions-row">
            <button type="button" className="cc-button cc-button-secondary" disabled={saving || uploadingBanner} onClick={() => void handleSave('draft')}>Save Draft</button>
            <button type="submit" className="cc-button cc-button-primary" disabled={saving || uploadingBanner}>{saving ? 'Saving...' : uploadingBanner ? 'Uploading banner...' : 'Publish Event'}</button>
          </div>
        </form>
      </div>
    </PageContainer>
  )
}
