import { useState } from 'react'
import { useParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { verifyEventTicket } from '../services/eventService'

export default function FacultyCheckInPage() {
  const { eventId = '' } = useParams()
  const [qrPayload, setQrPayload] = useState('')
  const [result, setResult] = useState<{ registrationNumber: string; studentName: string; usn: string | null } | null>(null)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const handleVerify = async (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault()
    setVerifying(true)
    setError('')
    setResult(null)
    try {
      setResult(await verifyEventTicket(eventId, qrPayload.trim()))
      setQrPayload('')
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Unable to verify ticket.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <PageContainer className="page-shell">
      <div className="events-page-inner">
        <section className="events-hero compact">
          <div>
            <p className="eyebrow">Attendance check-in</p>
            <h1>Scan or verify ticket</h1>
          </div>
        </section>

        <div className="glass-panel checkin-shell">
          <div className="manual-checkin-box">
            <form onSubmit={(event) => void handleVerify(event)}>
            <label>
              <span>Ticket QR payload</span>
              <input required value={qrPayload} onChange={(event) => setQrPayload(event.target.value)} placeholder="Paste the scanned ticket value" />
            </label>
            <button type="submit" className="cc-button cc-button-primary" disabled={verifying}>{verifying ? 'Verifying...' : 'Verify Attendance'}</button>
            </form>
            {error && <p role="alert" className="form-error">{error}</p>}
            {result && <div className="registered-chip" role="status">Checked in: {result.studentName} ({result.usn ?? 'No USN'}) · {result.registrationNumber}</div>}
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
