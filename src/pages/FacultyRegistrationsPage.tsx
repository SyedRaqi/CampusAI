import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { getEventById, getEventRegistrations } from '../services/eventService'
import type { EventRecord } from '../types'
import type { ManagedRegistration } from '../services/eventService'

export default function FacultyRegistrationsPage() {
  const { eventId = '' } = useParams()
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [registrations, setRegistrations] = useState<ManagedRegistration[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getEventById(eventId), getEventRegistrations(eventId)])
      .then(([eventData, registrationData]) => {
        if (!active) return
        setEvent(eventData)
        setRegistrations(registrationData)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load registrations.')
      })
    return () => { active = false }
  }, [eventId])

  return (
    <PageContainer className="page-shell">
      <div className="events-page-inner">
        <section className="events-hero compact">
          <div>
            <p className="eyebrow">Registrations</p>
            <h1>{event?.title ?? 'Event Registrations'}</h1>
          </div>
          <Link to={`/faculty/events/${eventId}/check-in`} className="primary-link">Open Check-in</Link>
        </section>

        <div className="glass-panel table-shell">
          {error && <p role="alert" className="form-error">{error}</p>}
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>USN</th>
                <th>Registration</th>
                <th>Status</th>
                <th>Ticket</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((registration) => (
                <tr key={registration.id}>
                  <td>{registration.profile.full_name}</td>
                  <td>{registration.profile.usn ?? 'Not provided'}</td>
                  <td>{registration.registration_number}</td>
                  <td>{registration.status}</td>
                  <td>{registration.ticket?.status ?? 'No ticket'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!error && registrations.length === 0 && <p className="empty-state">No registrations yet.</p>}
        </div>
      </div>
    </PageContainer>
  )
}
