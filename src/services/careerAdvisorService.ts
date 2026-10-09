import { supabase } from '../lib/supabase'

export const careerAdvisorPrompts = [
  'Which skills should I learn for data science?',
  'Improve my internship profile.',
  'What projects should I build?',
  'Prepare me for a software engineering interview.',
  'Analyze my career profile.',
] as const

export type CareerAdvisorPrompt = (typeof careerAdvisorPrompts)[number]

export async function askCareerAdvisor(prompt: CareerAdvisorPrompt): Promise<string> {
  if (!supabase) throw new Error('Career Advisor is unavailable until Supabase is configured.')
  const { data, error } = await supabase.functions.invoke('career-advisor', { body: { prompt } })
  if (error) throw new Error('Career Advisor is not available yet. A secure server-side function must be deployed first.')
  if (!data || typeof data.answer !== 'string') throw new Error('Career Advisor returned an invalid response.')
  return data.answer
}
