import { useCallback, useEffect, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import PageContainer from '../components/PageContainer'
import CompanyCard from '../components/career/CompanyCard'
import { getCompanies, saveCompany, setCompanyActive } from '../services/companyService'
import type { Company } from '../types'

type CompanyForm = Pick<Company, 'name' | 'logo_url' | 'website_url' | 'description' | 'industry' | 'location'>
const emptyForm: CompanyForm = { name: '', logo_url: null, website_url: null, description: null, industry: null, location: null }

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState<CompanyForm>(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const load = useCallback(async () => {
    try { setCompanies(await getCompanies(true)); setError('') }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load companies.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])

  const edit = (company: Company) => {
    setEditingId(company.id)
    setForm({ name: company.name, logo_url: company.logo_url, website_url: company.website_url, description: company.description, industry: company.industry, location: company.location })
    setShowForm(true)
  }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(''); setSuccess('')
    try { await saveCompany(form, editingId || undefined); setSuccess(editingId ? 'Company updated.' : 'Company added.'); setEditingId(''); setForm(emptyForm); setShowForm(false); await load() }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save company.') }
  }
  const toggle = async (company: Company) => {
    try { await setCompanyActive(company.id, !company.is_active); await load() }
    catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Unable to change company status.') }
  }

  return <PageContainer className="career-page-shell"><div className="career-page-inner"><header className="career-hub-header"><div><p className="eyebrow">Administration</p><h1>Companies</h1><p>Manage company records used by faculty and published listings.</p></div><button type="button" className="career-primary-button" onClick={() => { setForm(emptyForm); setEditingId(''); setShowForm((current) => !current) }}><Plus size={16} /> Add Company</button></header>
    {error && <p className="career-form-error" role="alert">{error}</p>}{success && <p className="career-form-success" role="status">{success}</p>}
    {showForm && <form className="career-profile-form" onSubmit={(event) => void submit(event)}><div className="career-form-grid"><label><span>Company name</span><input required maxLength={180} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label><span>Website URL</span><input type="url" value={form.website_url ?? ''} onChange={(event) => setForm((current) => ({ ...current, website_url: event.target.value || null }))} placeholder="https://" /></label><label><span>Logo URL</span><input type="url" value={form.logo_url ?? ''} onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value || null }))} placeholder="https://" /></label><label><span>Industry</span><input value={form.industry ?? ''} onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value || null }))} /></label><label><span>Location</span><input value={form.location ?? ''} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value || null }))} /></label><label className="career-form-wide"><span>Description</span><textarea rows={3} value={form.description ?? ''} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value || null }))} /></label></div><div className="career-form-actions"><button type="submit" className="career-primary-button">{editingId ? <Check size={16} /> : <Plus size={16} />}{editingId ? 'Save Company' : 'Add Company'}</button><button type="button" className="career-secondary-button" onClick={() => setShowForm(false)}><X size={16} /> Cancel</button></div></form>}
    {loading ? <div className="career-skeleton" /> : <div className="career-company-grid">{companies.map((company) => <CompanyCard key={company.id} company={company} onEdit={() => edit(company)} onToggleActive={() => void toggle(company)} />)}{!companies.length && <div className="career-empty-state">No companies have been configured.</div>}</div>}
  </div></PageContainer>
}
