import { supabase } from '../lib/supabase'
import type { CareerPreferences, CareerProfile, StudentSkill } from '../types'

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

async function currentStudentId(): Promise<string> {
  const client = requireSupabase()
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('Sign in to manage your career profile.')
  return data.user.id
}

export async function getCareerProfile(): Promise<CareerProfile> {
  const client = requireSupabase()
  const studentId = await currentStudentId()
  const [profileResult, skillsResult, preferencesResult] = await Promise.all([
    client.from('career_profiles').select('*').eq('student_id', studentId).maybeSingle(),
    client.from('student_skills').select('*').eq('student_id', studentId).order('skill_name'),
    client.from('career_preferences').select('*').eq('student_id', studentId).maybeSingle(),
  ])
  if (profileResult.error || skillsResult.error || preferencesResult.error) throw new Error('Unable to load your career profile.')
  return {
    student_id: studentId,
    career_goal: profileResult.data?.career_goal ?? null,
    github_url: profileResult.data?.github_url ?? null,
    linkedin_url: profileResult.data?.linkedin_url ?? null,
    portfolio_url: profileResult.data?.portfolio_url ?? null,
    resume_path: profileResult.data?.resume_path ?? null,
    resume_file_name: profileResult.data?.resume_file_name ?? null,
    updated_at: profileResult.data?.updated_at ?? new Date().toISOString(),
    skills: (skillsResult.data ?? []) as StudentSkill[],
    preferences: (preferencesResult.data as CareerPreferences | null) ?? null,
  }
}

export async function saveCareerProfile(values: Pick<CareerProfile, 'career_goal' | 'github_url' | 'linkedin_url' | 'portfolio_url'>): Promise<void> {
  const client = requireSupabase()
  const studentId = await currentStudentId()
  for (const [label, value] of [['GitHub', values.github_url], ['LinkedIn', values.linkedin_url], ['Portfolio', values.portfolio_url]] as const) {
    if (!value?.trim()) continue
    let url: URL
    try { url = new URL(value) } catch { throw new Error(`${label} must be a valid HTTPS URL.`) }
    if (url.protocol !== 'https:') throw new Error(`${label} must use HTTPS.`)
  }
  const { error } = await client.from('career_profiles').upsert({ student_id: studentId, ...values }, { onConflict: 'student_id' })
  if (error) throw new Error('Unable to save career profile links.')
}

export async function saveCareerPreferences(values: Omit<CareerPreferences, 'id' | 'student_id' | 'created_at' | 'updated_at'>): Promise<void> {
  const client = requireSupabase()
  const studentId = await currentStudentId()
  const { error } = await client.from('career_preferences').upsert({ student_id: studentId, ...values }, { onConflict: 'student_id' })
  if (error) throw new Error('Unable to save your career preferences.')
}

export async function saveSkill(skillName: string, skillLevel: StudentSkill['skill_level']): Promise<void> {
  const client = requireSupabase()
  const studentId = await currentStudentId()
  const name = skillName.trim()
  if (!name || name.length > 60) throw new Error('Enter a skill name of 1–60 characters.')
  const { error } = await client.from('student_skills').upsert({ student_id: studentId, skill_name: name, skill_level: skillLevel }, { onConflict: 'student_id,skill_name' })
  if (error) throw new Error('Unable to save this skill.')
}

export async function deleteSkill(skillId: string): Promise<void> {
  const { error } = await requireSupabase().from('student_skills').delete().eq('id', skillId)
  if (error) throw new Error('Unable to remove this skill.')
}

export async function uploadResume(file: File): Promise<{ path: string; fileName: string }> {
  const client = requireSupabase()
  const studentId = await currentStudentId()
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.includes(file.type)) throw new Error('Resume must be a PDF, DOC, or DOCX file.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Resume file is too large. Maximum size is 10 MB.')
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100)
  const path = `${studentId}/${crypto.randomUUID()}/${safeName}`
  const { data: currentProfile } = await client.from('career_profiles').select('resume_path').eq('student_id', studentId).maybeSingle()
  const { error } = await client.storage.from('student-resumes').upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error('Unable to upload your resume. Please retry.')
  const { error: profileError } = await client.from('career_profiles').upsert({ student_id: studentId, resume_path: path, resume_file_name: file.name }, { onConflict: 'student_id' })
  if (profileError) {
    await client.storage.from('student-resumes').remove([path])
    throw new Error('Resume uploaded but your profile could not be updated.')
  }
  if (currentProfile?.resume_path) await client.storage.from('student-resumes').remove([currentProfile.resume_path])
  return { path, fileName: file.name }
}

export async function getResumeDownloadUrl(): Promise<string> {
  const client = requireSupabase()
  const studentId = await currentStudentId()
  const { data, error } = await client.from('career_profiles').select('resume_path').eq('student_id', studentId).maybeSingle()
  if (error || !data?.resume_path) throw new Error('No resume is available on your profile.')
  const { data: signed, error: storageError } = await client.storage.from('student-resumes').createSignedUrl(data.resume_path, 90, { download: true })
  if (storageError || !signed?.signedUrl) throw new Error('Unable to prepare your resume download.')
  return signed.signedUrl
}

export async function deleteResume(): Promise<void> {
  const client = requireSupabase()
  const studentId = await currentStudentId()
  const { data, error } = await client.from('career_profiles').select('resume_path').eq('student_id', studentId).maybeSingle()
  if (error || !data?.resume_path) return
  const { error: removeError } = await client.storage.from('student-resumes').remove([data.resume_path])
  if (removeError) throw new Error('Unable to delete your resume file.')
  const { error: updateError } = await client.from('career_profiles').update({ resume_path: null, resume_file_name: null }).eq('student_id', studentId)
  if (updateError) throw new Error('Resume file removed but profile could not be updated.')
}
