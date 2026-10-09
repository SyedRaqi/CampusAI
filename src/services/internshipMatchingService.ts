import type { CareerPreferences, Internship, StudentSkill } from '../types'

export type InternshipMatch = {
  internship: Internship
  matchingSkills: string[]
  skillMatchPercent: number
  eligible: boolean
  locationPreferred: boolean | null
  workModePreferred: boolean | null
  branchPreferred: boolean | null
  typePreferred: boolean | null
}

export function matchInternship(
  internship: Internship,
  skills: StudentSkill[],
  preferences: CareerPreferences | null,
  semester?: number | null,
): InternshipMatch {
  const normalizedSkills = new Set(skills.map((skill) => skill.skill_name.trim().toLowerCase()))
  const matchingSkills = internship.skills.filter((skill) => normalizedSkills.has(skill.trim().toLowerCase()))
  const skillMatchPercent = internship.skills.length ? Math.round((matchingSkills.length / internship.skills.length) * 100) : 0
  const eligible = semester == null || (
    (internship.minimum_semester == null || semester >= internship.minimum_semester)
    && (internship.maximum_semester == null || semester <= internship.maximum_semester)
  )
  const locationPreferred = preferences?.preferred_locations.length
    ? preferences.preferred_locations.some((location) => location.toLowerCase() === internship.location.toLowerCase())
    : null
  const workModePreferred = preferences?.preferred_work_modes.length
    ? preferences.preferred_work_modes.includes(internship.work_mode)
    : null
  const branchPreferred = preferences?.preferred_branches.length
    ? Boolean(internship.branch_id && preferences.preferred_branches.includes(internship.branch_id))
    : null
  const typePreferred = preferences?.preferred_internship_types.length
    ? preferences.preferred_internship_types.includes(internship.internship_type)
    : null

  return { internship, matchingSkills, skillMatchPercent, eligible, locationPreferred, workModePreferred, branchPreferred, typePreferred }
}

export function rankInternships(internships: Internship[], skills: StudentSkill[], preferences: CareerPreferences | null, semester?: number | null): InternshipMatch[] {
  return internships.map((internship) => matchInternship(internship, skills, preferences, semester))
    .sort((left, right) => Number(right.eligible) - Number(left.eligible)
      || Number(right.branchPreferred === true) - Number(left.branchPreferred === true)
      || Number(right.workModePreferred === true) - Number(left.workModePreferred === true)
      || Number(right.locationPreferred === true) - Number(left.locationPreferred === true)
      || Number(right.typePreferred === true) - Number(left.typePreferred === true)
      || right.skillMatchPercent - left.skillMatchPercent)
}
