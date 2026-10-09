import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import PageContainer from '../components/PageContainer'
import { formatDate, formatTime, getEventById, getRegistrationProgress, getRemainingSeats, registerForEvent } from '../services/eventService'
import type { EventRecord } from '../types'

export default function EventDetailPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        if (!eventId) {
          setLoading(false)
          return
        }

        const data = await getEventById(eventId)
        if (active) setEvent(data)
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load event.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [eventId])

  const handleRegister = async () => {
    if (!eventId) return
    if (!user) {
      navigate('/login')
      return
    }

    setRegistering(true)
    setError('')
    try {
      const result = await registerForEvent(eventId)
      navigate(`/events/tickets/${result.ticketId}`)
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : 'Registration failed.')
    } finally {
      setRegistering(false)
    }
  }

  if (loading) {
    return <PageContainer className="page-shell"><div className="empty-state">Loading event details...</div></PageContainer>
  }

  if (!event) {
    return (
      <PageContainer className="page-shell">
        <div className="empty-state">{error || 'Event not found.'}</div>
      </PageContainer>
    )
  }

  const remainingSeats = getRemainingSeats(event)
  const progress = getRegistrationProgress(event)

  return (
    <PageContainer className="page-shell event-detail-shell">
      <div className="event-detail-wrap">
        <div className="event-hero-card">
          <img src={event.banner_image_url ?? ''} alt={event.title} className="event-hero-image" />
          <div className="event-hero-overlay" />
          <div className="event-hero-copy">
            <span className="event-badge">{event.category}</span>
            {event.is_demo && <span className="event-demo-badge">DEMO DATA · NOT AN OFFICIAL EVENT</span>}
            <h1>{event.title}</h1>
            <p>{event.short_description}</p>
            <div className="event-meta-row">
              <span>{formatDate(event.event_date)}</span>
              <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
              <span>{event.venue}</span>
            </div>
            <Link className="event-ai-link" to={`/ai?event=${encodeURIComponent(event.id)}`}><Sparkles size={15} /> Ask AI about this event</Link>
          </div>
        </div>

        <div className="event-detail-layout">
          <div className="event-detail-main">
            <section className="glass-panel">
              <h2>About Event</h2>
              <p>{event.description}</p>
            </section>

            <section className="glass-panel">
              <h2>Event Details</h2>
              <div className="detail-grid">
                <div><span className="label">Date</span><strong>{formatDate(event.event_date)}</strong></div>
                <div><span className="label">Start Time</span><strong>{formatTime(event.start_time)}</strong></div>
                <div><span className="label">End Time</span><strong>{formatTime(event.end_time)}</strong></div>
                <div><span className="label">Venue</span><strong>{event.venue}</strong></div>
                <div><span className="label">Organizer</span><strong>{event.organizer_name}</strong></div>
                <div><span className="label">Capacity</span><strong>{event.capacity}</strong></div>
                <div><span className="label">Registration Deadline</span><strong>{new Date(event.registration_deadline).toLocaleString()}</strong></div>
              </div>
            </section>
          </div>

          <aside className="event-cta-panel glass-panel">
            <div className="register-row">
              <span>Registered</span>
              <strong>{event.registration_count ?? 0} / {event.capacity}</strong>
            </div>
            <div className="progress-bar"><span style={{ width: `${Math.max(progress * 100, 8)}%` }} /></div>
            <p className="remaining-seat-copy">{remainingSeats} seats remaining</p>
            <p className="deadline-copy">Registration closes on {new Date(event.registration_deadline).toLocaleDateString()}</p>

            {error && <p role="alert" className="form-error">{error}</p>}
            <button type="button" className="cc-button cc-button-primary" onClick={handleRegister} disabled={event.is_demo || registering || remainingSeats === 0 || event.status !== 'published'}>
              {event.is_demo ? 'Demo event · registration unavailable' : registering ? 'Registering...' : remainingSeats === 0 ? 'Event Full' : 'Register Now'}
            </button>
            <Link to="/events" className="secondary-link">Back to Events</Link>
          </aside>
        </div>
      </div>
    </PageContainer>
  )
}
