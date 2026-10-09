import { supabase } from '../lib/supabase'
import type {
  AIChatResult,
  AIConversation,
  AIConversationMode,
  AIFeature,
  AIMessage,
  AIQuiz,
  AIQuizResult,
  AISavedContent,
  AISource,
  CareerRoadmap,
  StudyPlan,
} from '../types/ai'

function requireSupabase() {
  if (!supabase) throw new Error('CampusConnect AI is unavailable until Supabase is configured.')
  return supabase
}

async function readableError(error: { message: string; context?: unknown }): Promise<Error> {
  const context = error.context
  if (context instanceof Response) {
    try {
      const body: unknown = await context.clone().json()
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return new Error(body.error)
    } catch {
      return new Error('AI is temporarily unavailable. Please try again.')
    }
    return new Error('AI is temporarily unavailable. Please try again.')
  }
  return new Error('AI is temporarily unavailable. Please try again.')
}

export async function sendAIMessage(input: {
  prompt: string
  conversationId?: string
  mode?: AIConversationMode
  resourceId?: string
  eventId?: string
  internshipId?: string
  clubId?: string
  teamId?: string
}): Promise<AIChatResult> {
  const { data, error } = await requireSupabase().functions.invoke<AIChatResult>('ai-chat', { body: input })
  if (error) throw await readableError(error)
  if (!data?.message?.content || !data.conversationId) throw new Error('AI is temporarily unavailable. Please try again.')
  return data
}

export async function generateAIContent<T>(feature: AIFeature, input: Record<string, unknown>): Promise<T> {
  const client = requireSupabase()
  const payload = { ...input }
  const file = payload.documentFile
  delete payload.documentFile
  let uploadedPath: string | null = null
  let result: T | null = null
  let requestError: Error | null = null
  if (file !== undefined) {
    if (!['summary', 'quiz', 'notes'].includes(feature)) throw new Error('Document upload is only supported for study tools.')
    if (typeof File === 'undefined' || !(file instanceof File)
      || !/\.(txt|md)$/i.test(file.name) || file.size === 0 || file.size > 262_144) {
      throw new Error('Choose a non-empty .txt or .md file smaller than 256 KB.')
    }
    const { data: authData, error: authError } = await client.auth.getUser()
    if (authError || !authData.user) throw new Error('Sign in to summarize a document.')
    const extension = file.name.toLowerCase().endsWith('.md') ? 'md' : 'txt'
    uploadedPath = `${authData.user.id}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await client.storage.from('ai-uploads').upload(uploadedPath, file, {
      contentType: extension === 'md' ? 'text/markdown' : 'text/plain',
      cacheControl: '0',
      upsert: false,
    })
    if (uploadError) throw new Error('Unable to securely upload this document. Apply the Phase 7 storage migration and try again.')
    payload.storage_path = uploadedPath
  }
  try {
    const { data, error } = await client.functions.invoke<T>('ai-generate', {
      body: { feature, input: payload },
    })
    if (error) requestError = await readableError(error)
    else if (!data) requestError = new Error('AI is temporarily unavailable. Please try again.')
    else result = data
  } catch {
    requestError = new Error('AI is temporarily unavailable. Please try again.')
  }
  if (uploadedPath) {
    const { error: cleanupError } = await client.storage.from('ai-uploads').remove([uploadedPath])
    if (cleanupError) {
      throw new Error('The document is still private, but could not be removed after processing. Please retry or contact an administrator.')
    }
  }
  if (requestError) throw requestError
  if (!result) throw new Error('AI is temporarily unavailable. Please try again.')
  return result
}

export async function searchCampusAI(query: string): Promise<AISource[]> {
  const { data, error } = await requireSupabase().functions.invoke<{ sources: AISource[] }>('ai-search', {
    body: { query },
  })
  if (error) throw await readableError(error)
  return data?.sources ?? []
}

export async function listAIConversations(includeArchived = false): Promise<AIConversation[]> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to view your AI history.')
  const { data, error } = await client.from('ai_conversations')
    .select('id,title,mode,is_archived,created_at,updated_at')
    .eq('user_id', authData.user.id)
    .eq('is_archived', includeArchived)
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) throw new Error('Unable to load your AI conversations.')
  return (data ?? []) as AIConversation[]
}

export async function listAIMessages(conversationId: string): Promise<AIMessage[]> {
  const client = requireSupabase()
  const { data, error } = await client.from('ai_messages')
    .select('id,conversation_id,role,content,model,tokens_used,created_at,ai_message_sources(source_type,source_id,title,relevance_score,citation_text)')
    .eq('conversation_id', conversationId)
    .neq('role', 'system')
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) throw new Error('Unable to load this AI conversation.')
  return (data ?? []).map((row) => {
    const { ai_message_sources, ...message } = row
    const sources = (ai_message_sources ?? []).map((source) => ({
      ...source,
      url: source.source_id && source.source_type === 'resource' ? `/resources/${source.source_id}`
        : source.source_id && source.source_type === 'event' ? `/events/${source.source_id}`
        : source.source_id && source.source_type === 'internship' ? `/internships/${source.source_id}`
        : source.source_id && source.source_type === 'club' ? `/clubs/${source.source_id}`
        : source.source_id && source.source_type === 'database' ? `/teams/${source.source_id}`
        : source.source_type === 'faq' ? `/ai/search?query=${encodeURIComponent(source.title)}`
        : null,
    })) as AISource[]
    return { ...message, sources } as AIMessage
  })
}

export async function updateAIConversation(id: string, changes: { title?: string; is_archived?: boolean }): Promise<void> {
  const { error } = await requireSupabase().from('ai_conversations').update(changes).eq('id', id)
  if (error) throw new Error('Unable to update this AI conversation.')
}

export async function deleteAIConversation(id: string): Promise<void> {
  const { error } = await requireSupabase().from('ai_conversations').delete().eq('id', id)
  if (error) throw new Error('Unable to delete this AI conversation.')
}

export async function submitAIFeedback(messageId: string, rating: 'positive' | 'negative', feedback?: string): Promise<void> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to send feedback.')
  const { error } = await client.from('ai_feedback').upsert({
    message_id: messageId,
    user_id: authData.user.id,
    rating,
    feedback: feedback?.slice(0, 1000) ?? null,
  }, { onConflict: 'message_id,user_id' })
  if (error) throw new Error('Unable to save your feedback.')
}

export async function listStudyPlans(): Promise<StudyPlan[]> {
  const client = requireSupabase()
  const { data, error } = await client.from('study_plans')
    .select('id,title,description,start_date,end_date,status,study_plan_items(id,subject,topic,scheduled_date,duration_minutes,priority,status,notes)')
    .order('updated_at', { ascending: false })
    .limit(25)
  if (error) throw new Error('Unable to load your study plans.')
  return (data ?? []).map((row) => {
    const { study_plan_items, ...plan } = row
    return { ...plan, items: study_plan_items ?? [] } as StudyPlan
  })
}

export async function updateStudyPlanItem(id: string, changes: Partial<Pick<StudyPlan['items'][number], 'status' | 'scheduled_date' | 'duration_minutes' | 'notes'>>): Promise<void> {
  const { error } = await requireSupabase().from('study_plan_items').update(changes).eq('id', id)
  if (error) throw new Error('Unable to update this study session.')
}

export async function listAIQuizzes(): Promise<AIQuiz[]> {
  const { data, error } = await requireSupabase().from('ai_quizzes')
    .select('id,title,subject,difficulty,question_count')
    .order('created_at', { ascending: false })
    .limit(25)
  if (error) throw new Error('Unable to load your quizzes.')
  return (data ?? []) as AIQuiz[]
}

export async function getAIQuiz(id: string): Promise<AIQuiz> {
  const { data: quiz, error } = await requireSupabase().from('ai_quizzes')
    .select('id,title,subject,difficulty,question_count')
    .eq('id', id)
    .single()
  if (error || !quiz) throw new Error('Unable to load this quiz.')
  const { data: questions, error: questionError } = await requireSupabase().rpc('get_ai_quiz_questions', { target_quiz_id: id })
  if (questionError) throw new Error('Unable to load this quiz.')
  return { ...quiz, questions: (questions ?? []) as AIQuiz['questions'] }
}

export async function submitAIQuiz(id: string, answers: Record<string, string>): Promise<AIQuizResult> {
  const { data, error } = await requireSupabase().rpc('submit_ai_quiz_attempt', {
    target_quiz_id: id,
    submitted_answers: answers,
  })
  if (error || !data) throw new Error('Unable to submit this quiz.')
  return data as AIQuizResult
}

export async function listCareerRoadmaps(): Promise<CareerRoadmap[]> {
  const { data, error } = await requireSupabase().from('career_roadmaps')
    .select('id,title,target_role,summary,career_roadmap_milestones(id,stage,title,description,due_date,status,sort_order)')
    .order('updated_at', { ascending: false })
    .limit(20)
  if (error) throw new Error('Unable to load your career roadmaps.')
  return (data ?? []).map((row) => {
    const { career_roadmap_milestones, ...roadmap } = row
    return { ...roadmap, milestones: career_roadmap_milestones ?? [] } as CareerRoadmap
  })
}

export async function updateCareerRoadmapMilestone(id: string, status: CareerRoadmap['milestones'][number]['status']): Promise<void> {
  const { error } = await requireSupabase().from('career_roadmap_milestones').update({ status }).eq('id', id)
  if (error) throw new Error('Unable to update this roadmap milestone.')
}

export async function saveAIContent(feature: AISavedContent['feature'], title: string, content: string): Promise<void> {
  const client = requireSupabase()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError || !authData.user) throw new Error('Sign in to save AI content.')
  const { error } = await client.from('ai_saved_content').insert({
    user_id: authData.user.id,
    feature,
    title: title.trim().slice(0, 200) || 'AI-generated content',
    content: content.trim().slice(0, 12_000),
  })
  if (error) throw new Error('Unable to save this AI content.')
}

export async function listAISavedContent(): Promise<AISavedContent[]> {
  const { data, error } = await requireSupabase().from('ai_saved_content')
    .select('id,feature,title,content,created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error('Unable to load your saved AI content.')
  return (data ?? []) as AISavedContent[]
}

export async function deleteAISavedContent(id: string): Promise<void> {
  const { error } = await requireSupabase().from('ai_saved_content').delete().eq('id', id)
  if (error) throw new Error('Unable to delete saved AI content.')
}
