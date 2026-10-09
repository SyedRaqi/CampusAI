import type { CareerProfile } from '../../types'

type ProfileCompletionProps = { profile: CareerProfile }

export default function ProfileCompletion({ profile }: ProfileCompletionProps) {
  const preferences = profile.preferences
  const checks = [Boolean(profile.career_goal), Boolean(profile.skills?.length), Boolean(preferences?.interests.length), Boolean(profile.resume_path), Boolean(profile.github_url), Boolean(profile.linkedin_url), Boolean(profile.portfolio_url), Boolean(preferences?.preferred_locations.length), Boolean(preferences?.preferred_work_modes.length)]
  const percent = Math.round((checks.filter(Boolean).length / checks.length) * 100)
  return <div className="career-profile-completion"><div><span>Career Profile</span><strong>{percent}% complete</strong></div><progress value={percent} max={100} aria-label={`Career profile ${percent}% complete`} /></div>
}
