import { CalendarDays, MapPin, Ticket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { EventRecord } from '../types'
import { formatDate, formatTime, getEventStateLabel, getRegistrationProgress, getRemainingSeats } from '../services/eventService'

type EventCardProps = {
  event: EventRecord
}

export default function EventCard({ event }: EventCardProps) {
  const remainingSeats = getRemainingSeats(event)
  const stateLabel = getEventStateLabel(event)
  const progress = getRegistrationProgress(event)

  return (
    <article className="event-card">
      <div className="event-card-image-wrap">
        <img src={event.banner_image_url ?? ''} alt={event.title} className="event-card-image" />
        <span className="event-badge">{event.category}</span>
        {event.is_demo && <span className="event-demo-badge">DEMO DATA</span>}
      </div>

      <div className="event-card-body">
        <div className="event-card-topline">
          <span className="event-state status-open">{stateLabel}</span>
          <span className="event-date-pill">{formatDate(event.event_date)}</span>
        </div>

        <h3>{event.title}</h3>
        <p>{event.short_description}</p>

        <div className="event-meta-list">
          <span><CalendarDays size={14} /> {formatDate(event.event_date)}</span>
          <span><Ticket size={14} /> {formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
          <span><MapPin size={14} /> {event.venue}</span>
          <span><Users size={14} /> {event.organizer_name}</span>
        </div>

        <div className="event-foot-row">
          <div className="progress-block">
            <div className="progress-label">
              <span>{(event.registration_count ?? 0)} / {event.capacity} registered</span>
              {remainingSeats === 0 ? <strong>Full</strong> : <strong>{remainingSeats} seats left</strong>}
            </div>
            <div className="progress-bar"><span style={{ width: `${Math.max(progress * 100, 8)}%` }} /></div>
          </div>
        </div>

        <div className="event-actions-row">
          <Link to={`/events/${event.id}`} className="primary-link">
            View Details
          </Link>
        </div>
      </div>
    </article>
  )
}
