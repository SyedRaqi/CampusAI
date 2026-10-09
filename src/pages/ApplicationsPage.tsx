import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import ApplicationCard from '../components/career/ApplicationCard'
import ApplicationPipeline from '../components/career/ApplicationPipeline'
import { deleteSavedApplication, getMyApplications, updateApplication, withdrawApplication } from '../services/applicationService'
import type { ApplicationStatus, InternshipApplication } from '../types'

const columns: ApplicationStatus[] = ['saved', 'applied', 'shortlisted', 'interview', 'offer', 'selected', 'rejected', 'withdrawn']

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<InternshipApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try { setApplications(await getMyApplications()); setError('') }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load applications.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])

  const changeStatus = async (application: InternshipApplication, status: ApplicationStatus) => {
    setError('')
    try {
      await updateApplication(application.id, { status })
      await load()
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Unable to update your tracking status.') }
  }
  const removeSaved = async (application: InternshipApplication) => {
    try { await deleteSavedApplication(application.id); await load() }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to remove this saved item.') }
  }
  const withdraw = async (application: InternshipApplication) => {
    if (!window.confirm('Withdraw this item from your personal tracker?')) return
    try { await withdrawApplication(application.id); await load() }
    catch (withdrawError) { setError(withdrawError instanceof Error ? withdrawError.message : 'Unable to withdraw this item.') }
  }

  return <PageContainer className="career-page-shell"><div className="career-page-inner">
    <header className="career-hub-header"><div><p className="eyebrow">Private to you</p><h1>My Applications</h1><p>Track your own progress. These statuses are not employer-verified.</p></div><Link to="/career-dashboard" className="career-secondary-button">Career Dashboard</Link></header>
    {!loading && <ApplicationPipeline applications={applications} />}
    {error && <p className="career-form-message" role="alert">{error}</p>}
    {loading ? <div className="career-application-board" aria-label="Loading applications">{columns.slice(0, 4).map((column) => <div key={column} className="career-skeleton" />)}</div> : applications.length === 0 ? <div className="career-empty-state">Your application tracker is empty.<Link to="/internships" className="career-primary-button">Explore opportunities</Link></div> : <div className="career-application-board">{columns.map((status) => {
      const rows = applications.filter((application) => application.status === status)
      return <section className="career-board-column" key={status}><header><h2>{status}</h2><span>{rows.length}</span></header>{rows.map((application) => <div key={application.id}><ApplicationCard application={application} onStatusChange={(next) => void changeStatus(application, next)} />{status === 'saved' ? <button type="button" className="career-text-button" onClick={() => void removeSaved(application)}>Remove saved item</button> : status !== 'withdrawn' && <button type="button" className="career-text-button" onClick={() => void withdraw(application)}>Withdraw</button>}</div>)}{rows.length === 0 && <p className="career-column-empty">No {status} items.</p>}</section>
    })}</div>}
  </div></PageContainer>
}
