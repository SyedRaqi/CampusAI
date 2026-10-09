import { useEffect, useState } from 'react'
import PageContainer from '../components/PageContainer'
import { getAllEvents } from '../services/eventService'
import type { EventRecord } from '../types'

export default function EventsCalendarPage() {
  const [events, setEvents] = useState<EventRecord[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getAllEvents().then(setEvents).catch((loadError: unknown) => {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load events.')
    })
  }, [])

  return (
    <PageContainer className="page-shell">
      <div className="events-page-inner">
        <section className="events-hero compact">
          <div>
            <p className="eyebrow">Calendar view</p>
            <h1>Campus Events Calendar</h1>
          </div>
        </section>

        <div className="calendar-grid">
          {error ? <div className="empty-state" role="alert">{error}</div> : events.length === 0 ? <div className="empty-state">No published events yet.</div> : events.map((event) => (
            <div key={event.id} className="calendar-card glass-panel">
              <span className="calendar-day">{new Date(event.event_date).getDate()}</span>
              <strong>{event.title}</strong>
              <p>{event.venue}</p>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
