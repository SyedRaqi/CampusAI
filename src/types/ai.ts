export type AIConversationMode =
  | 'general'
  | 'study'
  | 'career'
  | 'interview'
  | 'project'
  | 'campus'
  | 'resource'

export type AIFeature =
  | 'study_plan'
  | 'quiz'
  | 'notes'
  | 'summary'
  | 'career'
  | 'roadmap'
  | 'interview'
  | 'project'

export interface AIConversation {
  id: string
  title: string
  mode: AIConversationMode
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface AISource {
  source_type: string
  source_id: string | null
  title: string
  relevance_score: number | null
  citation_text: string
  url: string | null
}

export interface AIMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  model: string | null
  tokens_used: number
  created_at: string
  sources: AISource[]
}

export interface AIChatResult {
  conversationId: string
  message: AIMessage
  sources: AISource[]
  knowledgeType: 'verified_and_general' | 'general_ai_knowledge'
}

export interface StudyPlanItem {
  id?: string
  subject: string
  topic: string
  scheduled_date: string
  duration_minutes: number
  priority: 'low' | 'medium' | 'high'
  status?: 'pending' | 'completed' | 'skipped'
  notes: string
}

export interface StudyPlan {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'archived'
  items: StudyPlanItem[]
}

export interface AIQuizQuestion {
  id: string
  question: string
  question_type: 'mcq' | 'true_false' | 'short_answer'
  options: string[]
}

export interface AIQuiz {
  id: string
  title: string
  subject: string
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  question_count: number
  questions: AIQuizQuestion[]
}

export interface AIQuizResult {
  attempt_id: string
  score: number
  total_questions: number
  results: Array<{
    id: string
    question: string
    correct_answer: string
    selected_answer: string | null
    is_correct: boolean
    explanation: string
  }>
}

export interface AISavedContent {
  id: string
  feature: 'notes' | 'summary' | 'career' | 'project'
  title: string
  content: string
  created_at: string
}

export interface CareerRoadmap {
  id: string
  title: string
  target_role: string
  summary: string
  milestones: Array<{
    id?: string
    stage: 'skills' | 'learning' | 'projects' | 'internships' | 'interview' | 'target_role'
    title: string
    description: string
    due_date: string | null
    status: 'pending' | 'in_progress' | 'completed'
    sort_order: number
  }>
}
