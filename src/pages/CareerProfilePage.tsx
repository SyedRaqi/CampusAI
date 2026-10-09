import { useCallback, useEffect, useState } from 'react'
import PageContainer from '../components/PageContainer'
import CareerProfileForm from '../components/career/CareerProfileForm'
import ProfileCompletion from '../components/career/ProfileCompletion'
import { useAuth } from '../contexts/AuthContext'
import { getCareerProfile } from '../services/careerProfileService'
import { getBranches } from '../services/subjectService'
import type { Branch, CareerProfile } from '../types'

export default function CareerProfilePage() {
  const { profile: studentProfile } = useAuth()
  const [profile, setProfile] = useState<CareerProfile | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      const [careerProfile, branchOptions] = await Promise.all([getCareerProfile(), getBranches()])
      setProfile(careerProfile)
      setBranches(branchOptions)
      setError('')
    }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load career profile.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  return <PageContainer className="career-page-shell"><div className="career-page-inner"><header className="career-hub-header"><div><p className="eyebrow">Career profile</p><h1>Build your career profile</h1><p>Complete your interests and experience. Matching is transparent and rules-based.</p></div></header>{loading ? <div className="career-skeleton" /> : error ? <div className="career-empty-state" role="alert">{error}</div> : profile && <><ProfileCompletion profile={profile} /><div className="career-profile-identity"><span>{studentProfile?.full_name ?? 'Student'}</span><span>{studentProfile?.department ?? 'Branch not set in student profile'}</span><span>Semester {studentProfile?.semester ?? 'not set'}</span></div><CareerProfileForm profile={profile} branches={branches} onSaved={() => { setLoading(true); void load() }} /></>}</div></PageContainer>
}
