import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { getMyRegistrations } from '../services/eventService'
import type { RegistrationWithEvent } from '../services/eventService'

export default function MyEventsPage() {
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getMyRegistrations().then(setRegistrations).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your registrations.')
    })
  }, [])

  return (
    <PageContainer className="page-shell">
      <div className="events-page-inner">
        <section className="events-hero compact">
          <div>
            <p className="eyebrow">My events</p>
            <h1>Upcoming, past, and cancelled registrations</h1>
          </div>
        </section>

        <div className="event-list-grid">
          {error && <div className="empty-state" role="alert">{error}</div>}
          {!error && registrations.length === 0 && <div className="empty-state">You have no event registrations yet.</div>}
          {registrations.map(({ event, ticket, registration_number, status }) => (
            <div key={ticket.id} className="glass-panel event-list-card">
              <div>
                <span className="event-badge">{event.category}</span>
                <h3>{event.title}</h3>
                <p>{event.venue}</p>
                <p>Registration {registration_number} · {status}</p>
              </div>
              <div className="event-actions-row stack">
                <span className="registered-chip">Registered</span>
                <Link to={`/events/${event.id}`} className="primary-link">View Event</Link>
                <Link to={`/events/tickets/${ticket.id}`} className="secondary-link">View Ticket</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
