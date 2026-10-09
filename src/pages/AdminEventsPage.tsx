import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { getAllEvents } from '../services/eventService'
import type { EventRecord } from '../types'

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getAllEvents(true).then(setEvents).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load events.')
    })
  }, [])

  return (
    <PageContainer className="page-shell">
      <div className="events-page-inner">
        <section className="events-hero compact">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>All Campus Events</h1>
          </div>
          <Link to="/faculty/events/create" className="primary-link">Create Event</Link>
        </section>

        <div className="event-list-grid">
          {error && <div className="empty-state" role="alert">{error}</div>}
          {!error && events.length === 0 && <div className="empty-state">No events found.</div>}
          {events.map((event) => (
            <div key={event.id} className="glass-panel event-list-card">
              <div>
                <span className="event-badge">{event.category}</span>
                <h3>{event.title}</h3>
                <p>{event.venue}</p>
              </div>
              <div className="event-actions-row stack">
                <span className="status-pill">{event.status}</span>
                <span>{event.registration_count ?? 0} / {event.capacity} registered</span>
                <Link to={`/events/${event.id}`} className="primary-link">View</Link>
                <Link to={`/faculty/events/${event.id}/registrations`} className="secondary-link">Manage</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
