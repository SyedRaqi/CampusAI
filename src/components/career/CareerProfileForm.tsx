import { useState } from 'react'
import { ExternalLink, FileUp, Trash2 } from 'lucide-react'
import type { Branch, CareerPreferences, CareerProfile, InternshipType, SkillLevel, WorkMode } from '../../types'
import { deleteResume, deleteSkill, getResumeDownloadUrl, saveCareerPreferences, saveCareerProfile, saveSkill, uploadResume } from '../../services/careerProfileService'

type CareerProfileFormProps = { profile: CareerProfile; branches: Branch[]; onSaved: () => void }
const goals = ['Software Engineer', 'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'Web Developer', 'Cybersecurity', 'Product', 'Research', 'Other']

export default function CareerProfileForm({ profile, branches, onSaved }: CareerProfileFormProps) {
  const preferences: CareerPreferences = profile.preferences ?? {
    id: '', student_id: profile.student_id, target_role: profile.career_goal, preferred_industries: [], preferred_locations: [],
    preferred_work_modes: [], preferred_internship_types: [], preferred_branches: [], expected_duration: null, interests: [], created_at: '', updated_at: '',
  }
  const [careerGoal, setCareerGoal] = useState(profile.career_goal ?? '')
  const [github, setGithub] = useState(profile.github_url ?? '')
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? '')
  const [portfolio, setPortfolio] = useState(profile.portfolio_url ?? '')
  const [targetRole, setTargetRole] = useState(preferences.target_role ?? '')
  const [industries, setIndustries] = useState(preferences.preferred_industries.join(', '))
  const [locations, setLocations] = useState(preferences.preferred_locations.join(', '))
  const [duration, setDuration] = useState(preferences.expected_duration ?? '')
  const [interests, setInterests] = useState(preferences.interests.join(', '))
  const [workModes, setWorkModes] = useState<WorkMode[]>(preferences.preferred_work_modes)
  const [internshipTypes, setInternshipTypes] = useState<InternshipType[]>(preferences.preferred_internship_types)
  const [preferredBranches, setPreferredBranches] = useState<string[]>(preferences.preferred_branches ?? [])
  const [skillName, setSkillName] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const skillRows = profile.skills ?? []

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await Promise.all([
        saveCareerProfile({ career_goal: careerGoal || null, github_url: github || null, linkedin_url: linkedin || null, portfolio_url: portfolio || null }),
        saveCareerPreferences({
          target_role: targetRole || null,
          preferred_industries: industries.split(',').map((value) => value.trim()).filter(Boolean),
          preferred_locations: locations.split(',').map((value) => value.trim()).filter(Boolean),
          preferred_work_modes: workModes,
          preferred_internship_types: internshipTypes,
          preferred_branches: preferredBranches,
          expected_duration: duration || null,
          interests: interests.split(',').map((value) => value.trim()).filter(Boolean),
        }),
      ])
      setMessage('Career profile saved.')
      onSaved()
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save your career profile.') }
    finally { setBusy(false) }
  }

  const toggleValue = <Value extends string>(values: Value[], value: Value, setter: (next: Value[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }

  const handleSkill = async () => {
    setBusy(true)
    setError('')
    try { await saveSkill(skillName, skillLevel); setSkillName(''); onSaved() }
    catch (skillError) { setError(skillError instanceof Error ? skillError.message : 'Unable to save skill.') }
    finally { setBusy(false) }
  }

  const handleResume = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setError('')
    try { await uploadResume(file); setMessage('Resume uploaded privately.'); onSaved() }
    catch (resumeError) { setError(resumeError instanceof Error ? resumeError.message : 'Resume upload failed.') }
    finally { setBusy(false) }
  }

  const handleResumeDownload = async () => {
    try { const url = await getResumeDownloadUrl(); window.open(url, '_blank', 'noopener,noreferrer') }
    catch (resumeError) { setError(resumeError instanceof Error ? resumeError.message : 'Unable to download resume.') }
  }

  const handleResumeDelete = async () => {
    if (!window.confirm('Delete your private resume?')) return
    try { await deleteResume(); setMessage('Resume deleted.'); onSaved() }
    catch (resumeError) { setError(resumeError instanceof Error ? resumeError.message : 'Unable to delete resume.') }
  }

  return <div className="career-profile-content">
    <section className="career-description-panel"><h2>Skills</h2><div className="career-skill-manager">{skillRows.map((skill) => <div key={skill.id} className="career-managed-skill"><span>{skill.skill_name}<small>{skill.skill_level}</small></span><button type="button" aria-label={`Remove ${skill.skill_name}`} onClick={() => void deleteSkill(skill.id).then(onSaved).catch((deleteError: unknown) => setError(deleteError instanceof Error ? deleteError.message : 'Unable to remove skill.'))}><Trash2 size={15} /></button></div>)}{skillRows.length === 0 && <p className="career-muted">Add skills to see transparent opportunity matches.</p>}</div><div className="career-add-skill"><input value={skillName} onChange={(event) => setSkillName(event.target.value)} maxLength={60} placeholder="e.g. SQL" aria-label="Skill name" /><select value={skillLevel} onChange={(event) => setSkillLevel(event.target.value as SkillLevel)} aria-label="Skill level"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select><button type="button" className="career-secondary-button" disabled={busy || !skillName.trim()} onClick={() => void handleSkill()}>Add skill</button></div></section>
    <form className="career-profile-form" onSubmit={(event) => void submit(event)}>
      <h2>Career goals & preferences</h2>
      <div className="career-form-grid"><label><span>Career goal</span><select value={careerGoal} onChange={(event) => { setCareerGoal(event.target.value); setTargetRole(event.target.value) }}><option value="">Choose a goal</option>{goals.map((goal) => <option key={goal}>{goal}</option>)}</select></label><label><span>Target role</span><input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} placeholder="Role you're exploring" /></label><label><span>Industries <small>Comma separated</small></span><input value={industries} onChange={(event) => setIndustries(event.target.value)} placeholder="Software, healthcare" /></label><label><span>Preferred locations <small>Comma separated</small></span><input value={locations} onChange={(event) => setLocations(event.target.value)} placeholder="Remote, Bengaluru" /></label><label><span>Expected duration</span><input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="e.g. 8–12 weeks" /></label><label><span>Interests <small>Comma separated</small></span><input value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="Data, product design" /></label></div>
      <fieldset className="career-choice-fieldset"><legend>Preferred work modes</legend>{(['remote', 'hybrid', 'on_site'] as WorkMode[]).map((mode) => <label key={mode}><input type="checkbox" checked={workModes.includes(mode)} onChange={() => toggleValue(workModes, mode, setWorkModes)} />{mode.replace('_', '-')}</label>)}</fieldset>
      <fieldset className="career-choice-fieldset"><legend>Preferred branches</legend>{branches.length ? branches.map((branch) => <label key={branch.id}><input type="checkbox" checked={preferredBranches.includes(branch.id)} onChange={() => toggleValue(preferredBranches, branch.id, setPreferredBranches)} />{branch.name}{branch.is_demo ? ' · Demo' : ''}</label>) : <p className="career-muted">Branches will appear after administrators configure the catalog.</p>}</fieldset>
      <fieldset className="career-choice-fieldset"><legend>Internship types</legend>{(['full_time', 'part_time', 'summer', 'winter', 'academic', 'research'] as InternshipType[]).map((type) => <label key={type}><input type="checkbox" checked={internshipTypes.includes(type)} onChange={() => toggleValue(internshipTypes, type, setInternshipTypes)} />{type.replace('_', ' ')}</label>)}</fieldset>
      <div className="career-form-grid"><label><span>GitHub URL</span><input type="url" value={github} onChange={(event) => setGithub(event.target.value)} placeholder="https://github.com/..." /></label><label><span>LinkedIn URL</span><input type="url" value={linkedin} onChange={(event) => setLinkedin(event.target.value)} placeholder="https://linkedin.com/in/..." /></label><label className="career-form-wide"><span>Portfolio URL</span><input type="url" value={portfolio} onChange={(event) => setPortfolio(event.target.value)} placeholder="https://" /></label></div>
      <div className="career-resume-control"><div><strong>Private resume</strong><span>{profile.resume_file_name || 'No resume uploaded'}</span><small>Private to your account · PDF, DOC, DOCX · maximum 10 MB</small></div><div><label className="career-secondary-button"><FileUp size={16} /> {profile.resume_path ? 'Replace resume' : 'Upload resume'}<input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden disabled={busy} onChange={(event) => void handleResume(event.target.files?.[0])} /></label>{profile.resume_path && <><button type="button" className="career-icon-button" title="Download your resume" aria-label="Download your resume" onClick={() => void handleResumeDownload()}><ExternalLink size={16} /></button><button type="button" className="career-icon-button" title="Delete your resume" aria-label="Delete your resume" onClick={() => void handleResumeDelete()}><Trash2 size={16} /></button></>}</div></div>
      {error && <p className="career-form-error" role="alert">{error}</p>}{message && <p className="career-form-success" role="status">{message}</p>}<button type="submit" className="career-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save Career Profile'}</button>
    </form>
  </div>
}
