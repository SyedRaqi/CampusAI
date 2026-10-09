import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import PageContainer from '../components/PageContainer'
import { formatDate, getTicket } from '../services/eventService'
import type { TicketDetails } from '../services/eventService'

export default function EventTicketPage() {
  const { ticketId } = useParams()
  const [ticket, setTicket] = useState<TicketDetails | null>(null)
  const [loading, setLoading] = useState(Boolean(ticketId))
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!ticketId) return
    getTicket(ticketId)
      .then((value) => { if (active) setTicket(value) })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load ticket.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [ticketId])

  if (loading) return <PageContainer className="page-shell"><div className="empty-state">Loading ticket...</div></PageContainer>
  if (error || !ticket) return <PageContainer className="page-shell"><div className="empty-state" role="alert">{error || 'Ticket not found or you do not have access.'}</div></PageContainer>

  const { event, profile } = ticket.registration

  return (
    <PageContainer className="page-shell">
      <div className="ticket-card-wrap">
        <div className="ticket-card glass-panel">
          <div className="ticket-header">
            <div className="brand-mark large" aria-hidden="true">
              <div className="brand-mark-core" />
            </div>
            <div>
              <p className="eyebrow">CampusConnect AI</p>
              <h2>Event Ticket</h2>
            </div>
          </div>

          <div className="ticket-detail-grid">
            <div><span>Event</span><strong>{event.title}</strong></div>
            <div><span>Student</span><strong>{profile.full_name}</strong></div>
            <div><span>USN</span><strong>{profile.usn ?? 'Not provided'}</strong></div>
            <div><span>Registration</span><strong>{ticket.registration.registration_number}</strong></div>
            <div><span>Date</span><strong>{formatDate(event.event_date)}</strong></div>
            <div><span>Venue</span><strong>{event.venue}</strong></div>
          </div>

          <div className="qr-box" aria-label="Ticket QR code">
            <QRCodeSVG value={ticket.qr_payload} size={168} level="H" />
          </div>

          <p className="ticket-status">Ticket status: {ticket.status}</p>
          <Link to="/my-events" className="primary-link">Back to My Events</Link>
        </div>
      </div>
    </PageContainer>
  )
}
