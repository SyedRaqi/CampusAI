import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Archive, ArrowDownToLine, ArrowLeft, ArrowRight, Bot, BookOpenText, BriefcaseBusiness,
  CalendarDays, Check, ChevronDown, CircleHelp, FileText,
  History, Menu, MessageSquarePlus, Mic2, Pencil, Plus, Search, Send, Sparkles, ThumbsDown,
  ThumbsUp, Trash2, Users, WandSparkles, X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  deleteAIConversation, generateAIContent, getAIQuiz, listAIMessages, listAIConversations,
  deleteAISavedContent, listAISavedContent, listCareerRoadmaps, listStudyPlans, saveAIContent,
  searchCampusAI, sendAIMessage, submitAIFeedback, submitAIQuiz, updateAIConversation,
  updateCareerRoadmapMilestone, updateStudyPlanItem,
} from '../services/aiService'
import type {
  AIChatResult, AIConversation, AIConversationMode, AIMessage, AIQuiz, AIQuizResult,
  AISavedContent, AISource, CareerRoadmap, StudyPlan,
} from '../types/ai'
import './ai.css'

const tools = [
  { path: '/ai/study-planner', title: 'Study planner', text: 'Build a realistic schedule around your subjects and exam dates.', icon: CalendarDays, feature: 'study_plan' },
  { path: '/ai/quiz', title: 'Quiz generator', text: 'Practice with questions tailored to a topic or learning resource.', icon: CircleHelp, feature: 'quiz' },
  { path: '/ai/notes', title: 'Notes generator', text: 'Turn a topic or source into structured revision notes.', icon: BookOpenText, feature: 'notes' },
  { path: '/ai/summarizer', title: 'Document summary', text: 'Create a concise, standard, or exam-focused summary.', icon: FileText, feature: 'summary' },
  { path: '/ai/career', title: 'Career advisor', text: 'Explore role directions and the skills to work on next.', icon: BriefcaseBusiness, feature: 'career' },
  { path: '/ai/career-roadmap', title: 'Career roadmap', text: 'Break a target role into practical milestones.', icon: ArrowRight, feature: 'roadmap' },
  { path: '/ai/interview', title: 'Interview practice', text: 'Practice technical, HR, and behavioral questions.', icon: Mic2, feature: 'interview' },
  { path: '/ai/project', title: 'Project assistant', text: 'Structure architecture, milestones, tests, and presentation.', icon: Users, feature: 'project' },
] as const

const quickActions = [
  tools[0], tools[1], tools[3], tools[4], tools[6],
  { path: '/ai/search', title: 'Campus search', text: 'Search verified campus resources and information.', icon: Search },
  tools[7], tools[2],
]

const suggestedPrompts = [
  'Help me create a study plan for my semester.',
  'Explain this topic in simple terms.',
  'Find resources for Machine Learning.',
  'Create a quiz from this topic.',
  'Help me prepare for an interview.',
  'Find internships matching my skills.',
  'Summarize this document.',
  'Help me plan my final-year project.',
]

const chatModes: Array<{ id: AIConversationMode; label: string }> = [
  { id: 'general', label: 'General' }, { id: 'study', label: 'Study' },
  { id: 'career', label: 'Career' }, { id: 'interview', label: 'Interview' },
  { id: 'project', label: 'Project' }, { id: 'campus', label: 'Campus' },
  { id: 'resource', label: 'Resource' },
]

function routeTool(pathname: string) {
  return tools.find((tool) => tool.path === pathname)
}

function groupFor(date: string): string {
  const value = new Date(date)
  const now = new Date()
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(day)
  yesterday.setDate(day.getDate() - 1)
  if (value >= day) return 'Today'
  if (value >= yesterday) return 'Yesterday'
  const lastWeek = new Date(day)
  lastWeek.setDate(day.getDate() - 7)
  return value >= lastWeek ? 'Previous 7 days' : 'Older'
}

function AIConversationSidebar({
  conversations, activeId, onSelect, onNew, onRefresh, showArchived, onToggleArchived, mobileOpen, onClose,
}: {
  conversations: AIConversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onRefresh: () => void
  showArchived: boolean
  onToggleArchived: () => void
  mobileOpen: boolean
  onClose: () => void
}) {
  const [menuId, setMenuId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const update = async (id: string, action: 'rename' | 'archive' | 'unarchive' | 'delete') => {
    setMenuId(null)
    setError('')
    try {
      if (action === 'rename') {
        const title = window.prompt('Conversation title')
        if (title?.trim()) await updateAIConversation(id, { title: title.trim().slice(0, 120) })
      } else if (action === 'archive' || action === 'unarchive') {
        await updateAIConversation(id, { is_archived: action === 'archive' })
      } else {
        if (!window.confirm('Delete this conversation and its messages?')) return
        await deleteAIConversation(id)
      }
      if (id === activeId && (action === 'delete' || action === 'archive')) onNew()
      onRefresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update conversation.')
    }
  }

  return (
    <aside className={`ai-history ${mobileOpen ? 'mobile-open' : ''}`} aria-label="AI conversation history">
      <div className="ai-history-brand">
        <Link to="/" className="ai-brand-mark" aria-label="CampusConnect home"><Bot size={20} /></Link>
        <div><b>CampusConnect</b><span>AI WORKSPACE</span></div>
        <button className="ai-history-close" type="button" aria-label="Close conversation history" onClick={onClose}><X size={17} /></button>
      </div>
      <button className="ai-new-chat" onClick={onNew} type="button"><MessageSquarePlus size={17} /> New chat</button>
      <button className="ai-archive-toggle" type="button" onClick={onToggleArchived}><Archive size={14} /> {showArchived ? 'Show recent chats' : 'Show archived chats'}</button>
      <div className="ai-history-list">
        {(['Today', 'Yesterday', 'Previous 7 days', 'Older'] as const).map((group) => {
          const rows = conversations.filter((conversation) => groupFor(conversation.updated_at) === group)
          if (!rows.length) return null
          return <section key={group} className="ai-history-group">
            <h3>{group}</h3>
            {rows.map((conversation) => <div key={conversation.id} className={`ai-history-row ${activeId === conversation.id ? 'active' : ''}`}>
              <button type="button" className="ai-history-title" onClick={() => onSelect(conversation.id)} title={conversation.title}>
                <span>{conversation.title}</span><small>{conversation.mode}</small>
              </button>
              <button type="button" className="ai-icon-button ai-history-menu" aria-label={`Conversation actions for ${conversation.title}`} onClick={() => setMenuId(menuId === conversation.id ? null : conversation.id)}><ChevronDown size={14} /></button>
              {menuId === conversation.id && <div className="ai-history-popover">
                <button onClick={() => void update(conversation.id, 'rename')}><Pencil size={14} /> Rename</button>
                <button onClick={() => void update(conversation.id, showArchived ? 'unarchive' : 'archive')}><Archive size={14} /> {showArchived ? 'Unarchive' : 'Archive'}</button>
                <button onClick={() => void update(conversation.id, 'delete')}><Trash2 size={14} /> Delete</button>
              </div>}
            </div>)}
          </section>
        })}
        {!conversations.length && <p className="ai-history-empty">Your conversations will appear here.</p>}
      </div>
      {error && <p className="ai-inline-error">{error}</p>}
      <div className="ai-history-footer">
        <span className="ai-availability-dot" /> Your conversations are private
      </div>
    </aside>
  )
}

function AISourceList({ sources }: { sources: AISource[] }) {
  if (!sources.length) return <p className="ai-muted">No verified campus sources were found for this response. Campus facts may need confirmation.</p>
  return <div className="ai-source-list">
    {sources.map((source, index) => {
      const href = source.url
      const content = <><span className="ai-source-index">S{index + 1}</span><span><b>{source.title}</b><small>{source.citation_text || source.source_type}</small></span><ArrowRight size={14} /></>
      return href ? <Link className="ai-source-card" to={href} key={`${source.source_type}-${source.source_id}-${index}`}>{content}</Link>
        : <div className="ai-source-card" key={`${source.source_type}-${source.source_id}-${index}`}>{content}</div>
    })}
  </div>
}

function AIMessageBubble({ message, onFeedback }: { message: AIMessage; onFeedback: (rating: 'positive' | 'negative', id: string) => void }) {
  const isAssistant = message.role === 'assistant'
  return <article className={`ai-message ${isAssistant ? 'assistant' : 'user'}`}>
    {isAssistant && <div className="ai-message-avatar"><Sparkles size={16} /></div>}
    <div className="ai-message-body">
      <div className="ai-message-label">{isAssistant ? 'CampusConnect AI' : 'You'}{message.model && <span>{message.model}</span>}</div>
      <div className="ai-message-content">{message.content}</div>
      {message.sources.length > 0 && <div className="ai-message-sources"><b>Sources</b><AISourceList sources={message.sources} /></div>}
      {isAssistant && <div className="ai-message-feedback" aria-label="Rate this answer">
        <button type="button" onClick={() => onFeedback('positive', message.id)} aria-label="Helpful"><ThumbsUp size={15} /></button>
        <button type="button" onClick={() => onFeedback('negative', message.id)} aria-label="Not helpful"><ThumbsDown size={15} /></button>
        {message.sources.length === 0 && <small>General AI knowledge · Verify important details</small>}
      </div>}
    </div>
  </article>
}

function AIChatWorkspace() {
  const { profile } = useAuth()
  const [conversations, setConversations] = useState<AIConversation[]>([])
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const initialMode = searchParams.get('mode')
  const [mode, setMode] = useState<AIConversationMode>(() =>
    chatModes.some((item) => item.id === initialMode) ? initialMode as AIConversationMode : 'general'
  )
  const [prompt, setPrompt] = useState(() => searchParams.get('prompt') ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastFailedPrompt, setLastFailedPrompt] = useState('')
  const [search, setSearch] = useState('')
  const [sources, setSources] = useState<AISource[]>([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const localMessageSequence = useRef(0)
  const [showArchived, setShowArchived] = useState(false)
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false)
  useEffect(() => {
    if (!searchParams.has('prompt') && !searchParams.has('mode')) return
    const cleaned = new URLSearchParams(searchParams)
    cleaned.delete('prompt')
    cleaned.delete('mode')
    setSearchParams(cleaned, { replace: true })
  }, [searchParams, setSearchParams])

  const refreshHistory = useCallback(async () => {
    try {
      setConversations(await listAIConversations(showArchived))
      setHistoryError('')
    } catch (caught) {
      setHistoryError(caught instanceof Error ? caught.message : 'Unable to load AI history.')
    }
  }, [showArchived])

  useEffect(() => { void Promise.resolve().then(refreshHistory) }, [refreshHistory])

  const selectConversation = async (id: string) => {
    setActiveId(id)
    setError('')
    const selected = conversations.find((conversation) => conversation.id === id)
    if (selected) setMode(selected.mode)
    try {
      const loadedMessages = await listAIMessages(id)
      setMessages(loadedMessages)
      const lastAssistant = [...loadedMessages].reverse().find((message) => message.role === 'assistant')
      setSources(lastAssistant?.sources ?? [])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load this conversation.')
    }
  }

  const newConversation = () => {
    setShowArchived(false)
    setMobileHistoryOpen(false)
    setActiveId(null)
    setMessages([])
    setSources([])
    setError('')
    setPrompt('')
    setLastFailedPrompt('')
    setMode('general')
  }

  const send = async (value: string) => {
    const clean = value.trim()
    if (!clean || loading) return
    setLoading(true)
    setError('')
    setLastFailedPrompt('')
    const optimistic: AIMessage = {
      id: `local-${++localMessageSequence.current}`, conversation_id: activeId ?? '', role: 'user',
      content: clean, model: null, tokens_used: 0, created_at: '', sources: [],
    }
    setMessages((current) => [...current, optimistic])
    setPrompt('')
    try {
      const result: AIChatResult = await sendAIMessage({
        prompt: clean,
        conversationId: activeId ?? undefined,
        mode,
        resourceId: searchParams.get('resource') ?? undefined,
        eventId: searchParams.get('event') ?? undefined,
        internshipId: searchParams.get('internship') ?? undefined,
        clubId: searchParams.get('club') ?? undefined,
        teamId: searchParams.get('team') ?? undefined,
      })
      setActiveId(result.conversationId)
      setMessages((current) => [...current.filter((message) => message.id !== optimistic.id), optimistic, { ...result.message, sources: result.sources }])
      setSources(result.sources)
      await refreshHistory()
    } catch (caught) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id))
      setError(caught instanceof Error ? caught.message : 'AI is temporarily unavailable. Please try again.')
      setLastFailedPrompt(clean)
    } finally {
      setLoading(false)
    }
  }

  const feedback = async (rating: 'positive' | 'negative', messageId: string) => {
    try {
      await submitAIFeedback(messageId, rating)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your feedback.')
    }
  }

  const runSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!search.trim()) return
    setSearchBusy(true)
    setError('')
    try {
      const results = await searchCampusAI(search.trim())
      setSources(results)
      if (!results.length) setError('No verified campus sources matched that search. Try a different phrase.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Campus search is temporarily unavailable.')
    } finally {
      setSearchBusy(false)
    }
  }

  return <div className="ai-app-shell">
    <AIConversationSidebar conversations={conversations} activeId={activeId} onSelect={(id) => { setMobileHistoryOpen(false); void selectConversation(id) }} onNew={newConversation} onRefresh={() => void refreshHistory()} showArchived={showArchived} onToggleArchived={() => setShowArchived((value) => !value)} mobileOpen={mobileHistoryOpen} onClose={() => setMobileHistoryOpen(false)} />
    <main className="ai-main-column">
      <header className="ai-topbar">
        <div><span className="ai-live-indicator" /> AI workspace <span className="ai-topbar-divider">/</span> {profile?.full_name ?? 'Campus companion'}</div>
        <div className="ai-top-actions"><button type="button" className="ai-history-open" onClick={() => setMobileHistoryOpen(true)}><Menu size={14} /><History size={13} /> History</button><button type="button" onClick={newConversation}><Plus size={14} /> New</button><Link to="/ai/saved" className="ai-exit-link"><FileText size={14} /> Saved</Link><Link to={`/${profile?.role ?? 'student'}/dashboard`} className="ai-exit-link"><ArrowLeft size={15} /> Campus</Link></div>
      </header>
      <div className="ai-thread" aria-live="polite">
        {!messages.length ? <section className="ai-welcome">
          <div className="ai-orb"><Sparkles size={25} /></div>
          <p className="ai-eyebrow">YOUR CAMPUS INTELLIGENCE</p>
          <h1>How can CampusConnect AI help you today?</h1>
          <p className="ai-welcome-subtitle">Your intelligent campus companion for learning, careers, projects and campus life.</p>
          <div className="ai-tool-grid">
            {quickActions.map((tool) => <Link className="ai-tool-card" to={tool.path} key={tool.path}>
              <tool.icon size={19} /><span><b>{tool.title}</b><small>{tool.text}</small></span><ArrowRight size={15} />
            </Link>)}
          </div>
          <div className="ai-suggestions">
            <span>TRY ASKING</span>
            <div>{suggestedPrompts.map((suggestion) => <button key={suggestion} type="button" onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>
          </div>
        </section> : <div className="ai-message-stack">
          {messages.map((message) => <AIMessageBubble key={message.id} message={message} onFeedback={(rating, id) => void feedback(rating, id)} />)}
          {loading && <div className="ai-thinking"><span className="ai-message-avatar"><Sparkles size={16} /></span><span><i /><i /><i /></span> Thinking…</div>}
        </div>}
        {error && <div className="ai-error-box" role="alert"><span>{error}</span>{lastFailedPrompt && <button type="button" onClick={() => void send(lastFailedPrompt)}>Retry</button>}</div>}
        {historyError && <div className="ai-error-box" role="status">{historyError}</div>}
      </div>
      <div className="ai-composer-wrap">
        {(searchParams.get('resource') || searchParams.get('event') || searchParams.get('internship') || searchParams.get('club') || searchParams.get('team')) && <div className="ai-context-chips">{([
          ['resource', 'Resource'], ['internship', 'Internship'], ['event', 'Event'], ['club', 'Club'], ['team', 'Project team'],
        ] as const).filter(([key]) => searchParams.has(key)).map(([key, label]) => <span key={key}>{label} attached <button type="button" aria-label={`Remove ${label} context`} onClick={() => {
          const next = new URLSearchParams(searchParams)
          next.delete(key)
          setSearchParams(next, { replace: true })
        }}><X size={12} /></button></span>)}</div>}
        <div className="ai-mode-row"><span>Conversation mode</span><select value={mode} onChange={(event) => setMode(event.target.value as AIConversationMode)} aria-label="Conversation mode">{chatModes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><small>Responses are AI-generated and may need verification.</small></div>
        <form className="ai-composer" onSubmit={(event) => { event.preventDefault(); void send(prompt) }}>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about studying, careers, resources or campus life…" aria-label="Message CampusConnect AI" maxLength={4000} rows={2} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(prompt) } }} />
          <button type="submit" disabled={loading || !prompt.trim()} aria-label="Send message"><Send size={17} /></button>
        </form>
        <div className="ai-composer-bottom"><span>Enter to send · Shift + Enter for a new line</span><span>{prompt.length}/4000</span></div>
      </div>
    </main>
    <aside className="ai-context-panel">
      <div className="ai-panel-heading"><div><p className="ai-eyebrow">CAMPUS CONTEXT</p><h2>Search & sources</h2></div><BookOpenText size={19} /></div>
      <p className="ai-context-copy">Search published campus resources, FAQs, events, and internships. Results are permission-checked.</p>
      <form className="ai-search-form" onSubmit={(event) => void runSearch(event)}>
        <Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campus knowledge" aria-label="Search campus knowledge" maxLength={1000} />
        <button type="submit" disabled={searchBusy} aria-label="Search">{searchBusy ? '…' : <ArrowRight size={15} />}</button>
      </form>
      <div className="ai-panel-section"><h3>{sources.length ? `${sources.length} verified source${sources.length === 1 ? '' : 's'}` : 'Source transparency'}</h3><AISourceList sources={sources} /></div>
      <div className="ai-trust-note"><Check size={15} /><span>Campus facts are cited when verified data is available. General AI knowledge is labelled separately.</span></div>
      <div className="ai-context-tools"><h3>AI tools</h3>{tools.slice(0, 5).map((tool) => <Link key={tool.path} to={tool.path}><tool.icon size={15} />{tool.title}<ArrowRight size={13} /></Link>)}</div>
      <Link className="ai-saved-link" to="/ai/saved"><FileText size={15} /> Saved AI content <ArrowRight size={13} /></Link>
    </aside>
  </div>
}

type GeneratedResponse = {
  feature: string
  answer?: string
  sources?: AISource[]
  plan?: StudyPlan
  quiz?: AIQuiz
  roadmap?: CareerRoadmap
  interview?: { session_id: string; questions: Array<{ id: string; question: string; topic: string }> }
}

const fieldsByTool: Record<string, Array<{ name: string; label: string; type?: string; placeholder?: string; required?: boolean }>> = {
  study_plan: [
    { name: 'subjects', label: 'Subjects and focus topics', placeholder: 'DBMS, Operating Systems, Machine Learning', required: true },
    { name: 'start_date', label: 'Plan starts', type: 'date', required: true },
    { name: 'end_date', label: 'Plan ends', type: 'date', required: true },
    { name: 'available_hours', label: 'Available study hours per day', type: 'number', placeholder: '3', required: true },
    { name: 'preparation_level', label: 'Current preparation level', placeholder: 'e.g. revise, starting fresh, exam-ready' },
    { name: 'difficult_subjects', label: 'Subjects that need more time', placeholder: 'e.g. Operating Systems' },
    { name: 'preferred_study_times', label: 'Preferred study times', placeholder: 'e.g. mornings and early evenings' },
    { name: 'break_preferences', label: 'Break preferences', placeholder: 'e.g. 10 minutes after each hour' },
    { name: 'target_score', label: 'Target score (optional)', type: 'number', placeholder: '80' },
  ],
  quiz: [
    { name: 'topic', label: 'Topic or subject', placeholder: 'Database normalization' },
    { name: 'content', label: 'Optional source text', placeholder: 'Paste source text to ground questions in your material…' },
    { name: 'question_count', label: 'Number of questions', type: 'select', placeholder: '10', required: true },
    { name: 'question_type', label: 'Question type', type: 'select', placeholder: 'mixed', required: true },
    { name: 'difficulty', label: 'Difficulty', type: 'select', placeholder: 'medium', required: true },
  ],
  notes: [
    { name: 'topic', label: 'Topic', placeholder: 'e.g. Virtual memory' },
    { name: 'subject', label: 'Subject', placeholder: 'e.g. Operating Systems' },
    { name: 'content', label: 'Optional source text', placeholder: 'Paste the source text you want to turn into notes…' },
  ],
  summary: [
    { name: 'content', label: 'Document text', placeholder: 'Paste text to summarize…' },
    { name: 'summary_style', label: 'Summary style', type: 'select', placeholder: 'standard', required: true },
  ],
  career: [
    { name: 'goal', label: 'Career goal or target role', placeholder: 'e.g. Frontend engineer', required: true },
    { name: 'interests', label: 'Interests and preferred work', placeholder: 'What kind of work energizes you?' },
    { name: 'location', label: 'Preferred location or work mode', placeholder: 'e.g. Remote, Bengaluru' },
    { name: 'internshipId', label: 'Internship ID (optional)', placeholder: 'Paste an opportunity ID to explain its match' },
  ],
  roadmap: [
    { name: 'goal', label: 'Target role', placeholder: 'e.g. Machine Learning Engineer', required: true },
    { name: 'current_skills', label: 'Current skills', placeholder: 'Python, SQL, statistics…', required: true },
    { name: 'hours_per_week', label: 'Learning hours per week', type: 'number', placeholder: '6' },
    { name: 'target_date', label: 'Target date (optional)', type: 'date' },
  ],
  interview: [
    { name: 'role', label: 'Role', placeholder: 'e.g. React developer intern', required: true },
    { name: 'technology', label: 'Technology or domain', placeholder: 'e.g. React, TypeScript' },
    { name: 'interview_type', label: 'Interview format', type: 'select', placeholder: 'mixed' },
    { name: 'difficulty', label: 'Difficulty', type: 'select', placeholder: 'medium' },
    { name: 'question_count', label: 'Question count', type: 'number', placeholder: '5' },
  ],
  project: [
    { name: 'title', label: 'Project title', placeholder: 'e.g. Campus resource discovery app', required: true },
    { name: 'domain', label: 'Domain', placeholder: 'e.g. Education, healthcare' },
    { name: 'problem_statement', label: 'Problem statement', placeholder: 'What problem are you trying to solve?', required: true },
    { name: 'technologies', label: 'Technologies', placeholder: 'React, Supabase, TypeScript' },
    { name: 'team_size', label: 'Team size', type: 'number', placeholder: '3' },
    { name: 'requirements', label: 'Requirements or constraints', placeholder: 'Timeline, platform, evaluation criteria…' },
  ],
}

function ToolForm({ tool, onGenerate, busy }: {
  tool: (typeof tools)[number]
  onGenerate: (values: Record<string, unknown>) => Promise<void>
  busy: boolean
}) {
  const fields = fieldsByTool[tool.feature]
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.name, field.type === 'select' ? field.placeholder ?? '' : ''])))
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [inputError, setInputError] = useState('')
  const documentInput = useRef<HTMLInputElement>(null)
  const update = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))
  return <form className="ai-tool-form" onSubmit={(event) => {
    event.preventDefault()
    if (['summary', 'quiz', 'notes'].includes(tool.feature)
      && !values.content?.trim() && !values.topic?.trim() && !documentFile) {
      setInputError('Enter a topic, paste source text, or choose a .txt or .md file.')
      return
    }
    setInputError('')
    void onGenerate({ ...values, ...(documentFile ? { documentFile } : {}) })
  }}>
    {fields.map((field) => <label className={field.name === 'content' || field.name === 'subjects' || field.name === 'problem_statement' ? 'wide' : ''} key={field.name}>
      <span>{field.label}</span>
      {field.type === 'select' ? <select value={values[field.name] ?? ''} required={field.required} onChange={(event) => update(field.name, event.target.value)}>
        {(field.name === 'question_count' ? ['5', '10', '15', '20'] : field.name === 'question_type' ? ['mcq', 'true_false', 'short_answer', 'mixed'] : field.name === 'difficulty' ? ['easy', 'medium', 'hard', 'mixed'] : field.name === 'interview_type' ? ['technical', 'hr', 'behavioral', 'mixed'] : ['brief', 'standard', 'detailed', 'exam_revision']).map((option) => <option value={option} key={option}>{option.replace('_', ' ')}</option>)}
      </select>
        : field.name === 'content' || field.name === 'subjects' || field.name === 'problem_statement' || field.name === 'requirements' || field.name === 'interests' || field.name === 'technologies'
          ? <textarea value={values[field.name] ?? ''} placeholder={field.placeholder} required={field.required} maxLength={field.name === 'content' ? 12_000 : 4000} rows={field.name === 'content' || field.name === 'problem_statement' ? 5 : 3} onChange={(event) => update(field.name, event.target.value)} />
          : <input type={field.type ?? 'text'} value={values[field.name] ?? ''} placeholder={field.placeholder} required={field.required} min={field.type === 'number' ? 1 : undefined} max={field.type === 'number' ? 24 : undefined} onChange={(event) => update(field.name, event.target.value)} />}
    </label>)}
    {['summary', 'quiz', 'notes'].includes(tool.feature) && <label className="ai-document-upload wide">
      <span>Or upload a text document</span>
      <input ref={documentInput} type="file" accept=".txt,.md,text/plain,text/markdown" onChange={(event) => {
        setDocumentFile(event.target.files?.[0] ?? null)
        if (event.target.files?.[0]) update('content', '')
        setInputError('')
      }} />
      {documentFile && <button className="ai-secondary-button" type="button" onClick={() => {
        setDocumentFile(null)
        if (documentInput.current) documentInput.current.value = ''
      }}>Remove {documentFile.name}</button>}
      <small>Private, owner-only upload. TXT or Markdown, up to 256 KB; the file is removed after processing.</small>
    </label>}
    {inputError && <p className="ai-inline-error wide">{inputError}</p>}
    <div className="ai-tool-submit wide">
      <button className="ai-primary-button" type="submit" disabled={busy}>{busy ? <><span className="ai-button-spinner" /> Working…</> : <><WandSparkles size={17} /> Generate with AI</>}</button>
      <small>Generated suggestions are not official advice or guarantees.</small>
    </div>
  </form>
}

function ToolOutput({ result, onInterviewEvaluate, busy }: {
  result: GeneratedResponse
  onInterviewEvaluate: (answer: string, question: string, sessionId: string) => Promise<void>
  busy: boolean
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quiz, setQuiz] = useState<AIQuiz | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [attempt, setAttempt] = useState<AIQuizResult | null>(null)
  const [answer, setAnswer] = useState('')
  const [selectedInterviewQuestion, setSelectedInterviewQuestion] = useState('')
  const [localError, setLocalError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [savedPlan, setSavedPlan] = useState<StudyPlan | null>(result.plan ?? null)
  const [savedRoadmap, setSavedRoadmap] = useState<CareerRoadmap | null>(result.roadmap ?? null)

  useEffect(() => {
    let active = true
    if (result.quiz?.id) {
      void getAIQuiz(result.quiz.id).then((value) => { if (active) setQuiz(value) }).catch((error: unknown) => {
        if (active) setLocalError(error instanceof Error ? error.message : 'Unable to load quiz questions.')
      })
    }
    if (result.plan?.id) {
      void listStudyPlans().then((value) => {
        if (active) setSavedPlan(value.find((plan) => plan.id === result.plan?.id) ?? result.plan ?? null)
      }).catch(() => undefined)
    }
    if (result.roadmap?.id) {
      void listCareerRoadmaps().then((value) => {
        if (active) setSavedRoadmap(value.find((roadmap) => roadmap.id === result.roadmap?.id) ?? result.roadmap ?? null)
      }).catch(() => undefined)
    }
    return () => { active = false }
  }, [result])

  const savePlanItem = async (id: string, changes: Partial<Pick<StudyPlan['items'][number], 'status' | 'scheduled_date' | 'duration_minutes' | 'notes'>>) => {
    setLocalError('')
    try {
      await updateStudyPlanItem(id, changes)
      setSavedPlan((current) => current ? ({
        ...current,
        items: current.items.map((item) => item.id === id ? { ...item, ...changes } : item),
      }) : current)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to update the session.')
    }
  }

  const saveGeneratedContent = async () => {
    if (!result.answer || !['notes', 'summary', 'career', 'project'].includes(result.feature)) return
    setLocalError('')
    try {
      const feature = result.feature as AISavedContent['feature']
      await saveAIContent(feature, result.answer.split('\n').find((line) => line.trim())?.slice(0, 200) || feature, result.answer)
      setSaveMessage('Saved to your private AI library.')
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Unable to save this content.')
    }
  }

  const copyGeneratedContent = async () => {
    try {
      await navigator.clipboard.writeText(result.answer ?? '')
      setSaveMessage('Copied to clipboard.')
    } catch {
      setLocalError('Clipboard access is unavailable. Select and copy the text instead.')
    }
  }

  if (result.quiz) {
    const questions = quiz?.questions ?? []
    const question = questions[questionIndex]
    const submit = async () => {
      if (!quiz) return
      setLocalError('')
      try { setAttempt(await submitAIQuiz(quiz.id, answers)) } catch (error) {
        setLocalError(error instanceof Error ? error.message : 'Unable to submit this quiz.')
      }
    }
    return <section className="ai-output-card">
      <div className="ai-output-title"><div><span className="ai-output-tag">PRACTICE QUIZ</span><h2>{result.quiz.title}</h2><p>{result.quiz.subject} · {result.quiz.difficulty} · {result.quiz.question_count} questions</p></div><CircleHelp size={22} /></div>
      {!quiz && <p className="ai-muted">Loading your quiz…</p>}
      {attempt ? <div className="ai-quiz-results"><div className="ai-score">{attempt.score}<span> / {attempt.total_questions}</span><small>Your score</small></div>
        {attempt.results.map((item, index) => <article className={`ai-result-item ${item.is_correct ? 'correct' : 'incorrect'}`} key={item.id}><b>{index + 1}. {item.question}</b><p>Your answer: {item.selected_answer ?? 'Not answered'}</p><p>Correct answer: {item.correct_answer}</p><small>{item.explanation}</small></article>)}
      </div> : question ? <div className="ai-question-card">
        <div className="ai-quiz-progress"><span>Question {questionIndex + 1} of {questions.length}</span><div><i style={{ width: `${(questionIndex + 1) / questions.length * 100}%` }} /></div></div>
        <h3>{question.question}</h3>
        {question.question_type === 'short_answer'
          ? <label className="ai-short-answer"><span>Your answer</span><input value={answers[question.id] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} maxLength={500} /></label>
          : <div className="ai-answer-options">{question.options.map((option, index) => <label className={answers[question.id] === option ? 'selected' : ''} key={`${index}-${option}`}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option }))} /><span>{option}</span></label>)}</div>}
        <div className="ai-quiz-controls"><button className="ai-secondary-button" type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((value) => value - 1)}>Previous</button>{questionIndex < questions.length - 1 ? <button className="ai-primary-button" type="button" onClick={() => setQuestionIndex((value) => value + 1)}>Next <ArrowRight size={15} /></button> : <button className="ai-primary-button" type="button" disabled={Object.keys(answers).length !== questions.length} onClick={() => void submit()}>Submit quiz <Check size={15} /></button>}</div>
      </div> : null}
      {localError && <p className="ai-inline-error">{localError}</p>}
    </section>
  }
  if (result.plan && savedPlan) return <section className="ai-output-card">
    <div className="ai-output-title"><div><span className="ai-output-tag">PERSONAL STUDY SCHEDULE</span><h2>{savedPlan.title}</h2><p>{savedPlan.start_date} — {savedPlan.end_date}</p></div><CalendarDays size={22} /></div>
    <p>{savedPlan.description}</p>
    <div className="ai-plan-list">{savedPlan.items.map((item, index) => <div className="ai-plan-item" key={item.id ?? `${item.scheduled_date}-${index}`}>
      <input type="checkbox" aria-label={`Mark ${item.subject} session complete`} checked={item.status === 'completed'} onChange={(event) => { if (item.id) void savePlanItem(item.id, { status: event.target.checked ? 'completed' : 'pending' }) }} />
      <span><b>{item.subject}</b><small>{item.topic || item.notes}</small></span>
      <label>Study date<input type="date" defaultValue={item.scheduled_date} onBlur={(event) => { if (item.id && event.target.value && event.target.value !== item.scheduled_date) void savePlanItem(item.id, { scheduled_date: event.target.value }) }} /></label>
      <label>Minutes<input type="number" min={5} max={720} defaultValue={item.duration_minutes} onBlur={(event) => {
        const duration = Number(event.target.value)
        if (item.id && Number.isInteger(duration) && duration >= 5 && duration <= 720 && duration !== item.duration_minutes) void savePlanItem(item.id, { duration_minutes: duration })
      }} /></label>
    </div>)}</div>
    <p className="ai-muted">AI-generated schedule. Adjust sessions to your workload; it cannot guarantee a target score.</p>
    {localError && <p className="ai-inline-error">{localError}</p>}
    <small>Saved to your study plans.</small>
  </section>
  if (result.roadmap && savedRoadmap) return <section className="ai-output-card">
    <div className="ai-output-title"><div><span className="ai-output-tag">CAREER ROADMAP</span><h2>{savedRoadmap.title}</h2><p>Target role: {savedRoadmap.target_role}</p></div><BriefcaseBusiness size={22} /></div>
    <p>{savedRoadmap.summary}</p>
    <div className="ai-roadmap">{savedRoadmap.milestones.map((milestone, index) => <article key={milestone.id ?? `${milestone.stage}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><small>{milestone.stage.replace('_', ' ')}</small><h3>{milestone.title}</h3><p>{milestone.description}</p>{milestone.due_date && <time>{milestone.due_date}</time>}{milestone.id && <label className="ai-roadmap-status"><input type="checkbox" checked={milestone.status === 'completed'} onChange={async (event) => {
      const status = event.target.checked ? 'completed' : 'pending'
      try {
        await updateCareerRoadmapMilestone(milestone.id ?? '', status)
        setSavedRoadmap((current) => current ? ({ ...current, milestones: current.milestones.map((item) => item.id === milestone.id ? { ...item, status } : item) }) : current)
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : 'Unable to update the roadmap milestone.')
      }
    }} /> Mark complete</label>}</div></article>)}</div>
    <p className="ai-muted">Generated recommendations are not a guarantee of employment.</p>
  </section>
  if (result.interview) return <section className="ai-output-card">
    <div className="ai-output-title"><div><span className="ai-output-tag">INTERVIEW PRACTICE</span><h2>Your practice questions</h2></div><Mic2 size={22} /></div>
    {result.interview.questions.map((item, index) => <button type="button" className={`ai-interview-question ${selectedInterviewQuestion === item.id ? 'selected' : ''}`} key={item.id} onClick={() => setSelectedInterviewQuestion(item.id)}><span>QUESTION {index + 1} · {item.topic}</span><p>{item.question}</p></button>)}
    <label className="ai-interview-answer"><span>Your answer to the selected question</span><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Write or dictate your practice answer here…" maxLength={4000} rows={6} /><button className="ai-primary-button" type="button" disabled={busy || !answer.trim() || !selectedInterviewQuestion} onClick={() => {
      const selected = result.interview?.questions.find((item) => item.id === selectedInterviewQuestion)
      if (selected && result.interview) void onInterviewEvaluate(answer, selected.question, result.interview.session_id)
    }}>{busy ? 'Reviewing…' : 'Get coaching feedback'}</button></label>
    {localError && <p className="ai-inline-error">{localError}</p>}
  </section>
  return <section className="ai-output-card">
    <div className="ai-output-title"><div><span className="ai-output-tag">AI-GENERATED</span><h2>Here’s a starting point</h2></div><Sparkles size={22} /></div>
    <div className="ai-markdown">{result.answer}</div>
    {result.sources && result.sources.length > 0 && <div className="ai-message-sources"><b>Sources</b><AISourceList sources={result.sources} /></div>}
    {localError && <p className="ai-inline-error">{localError}</p>}
    {saveMessage && <p className="ai-muted" role="status">{saveMessage}</p>}
    <div className="ai-output-actions"><button type="button" onClick={() => void copyGeneratedContent()}><FileText size={15} /> Copy</button>
      {['notes', 'summary', 'career', 'project'].includes(result.feature) && <button type="button" onClick={() => void saveGeneratedContent()}><Check size={15} /> Save</button>}
      <button type="button" onClick={() => {
      const blob = new Blob([result.answer ?? ''], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'campusconnect-ai-notes.md'
      anchor.click()
      URL.revokeObjectURL(url)
    }}><ArrowDownToLine size={15} /> Download</button></div>
  </section>
}

function AIToolWorkspace({ tool }: { tool: (typeof tools)[number] }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [result, setResult] = useState<GeneratedResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const quizId = params.get('quiz')
    if (!quizId || tool.feature !== 'quiz') return
    let active = true
    void getAIQuiz(quizId).then((quiz) => {
      if (active) setResult({ feature: 'quiz', quiz })
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load quiz.'))
    return () => { active = false }
  }, [params, tool.feature])

  const generate = async (values: Record<string, unknown>) => {
    setBusy(true)
    setError('')
    try {
      const response = await generateAIContent<GeneratedResponse>(tool.feature, {
        ...values,
        ...(params.get('resource') ? { resourceId: params.get('resource') } : {}),
        ...(params.get('event') ? { eventId: params.get('event') } : {}),
        ...(params.get('internship') ? { internshipId: params.get('internship') } : {}),
        ...(params.get('club') ? { clubId: params.get('club') } : {}),
        ...(params.get('team') ? { teamId: params.get('team') } : {}),
      })
      setResult(response)
      if (response.quiz?.id) navigate(`/ai/quiz?quiz=${encodeURIComponent(response.quiz.id)}`, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI is temporarily unavailable. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const evaluateInterview = async (answer: string, question: string, sessionId: string) => {
    setBusy(true)
    setError('')
    try {
      const response = await generateAIContent<GeneratedResponse>('interview', { answer, question, session_id: sessionId })
      setResult((current) => current ? { ...current, answer: response.answer, interview: undefined } : response)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI is temporarily unavailable. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="ai-tool-shell">
    <header className="ai-topbar"><div><span className="ai-live-indicator" /> AI workspace <span className="ai-topbar-divider">/</span> {tool.title}</div><Link to="/ai" className="ai-exit-link"><ArrowLeft size={15} /> Back to assistant</Link></header>
    <div className="ai-tool-content">
      <div className="ai-tool-hero"><span className="ai-tool-hero-icon"><tool.icon size={23} /></span><p className="ai-eyebrow">CAMPUSCONNECT AI · {tool.feature.replace('_', ' ').toUpperCase()}</p><h1>{tool.title}</h1><p>{tool.text}</p></div>
      {!result && <ToolForm tool={tool} onGenerate={generate} busy={busy} />}
      {busy && <div className="ai-tool-loading"><span className="ai-button-spinner" /> CampusConnect AI is preparing this for you…</div>}
      {error && <div className="ai-error-box" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')}>Dismiss</button></div>}
      {result && <ToolOutput key={result.quiz?.id ?? result.plan?.id ?? result.roadmap?.id ?? result.feature} result={result} onInterviewEvaluate={evaluateInterview} busy={busy} />}
      {result && <button className="ai-secondary-button ai-new-generation" type="button" onClick={() => { setResult(null); setError(''); if (tool.feature === 'quiz') navigate('/ai/quiz', { replace: true }) }}><Plus size={15} /> Start another</button>}
      <div className="ai-related-tools"><h2>Continue with another AI tool</h2><div>{tools.filter((item) => item.path !== tool.path).slice(0, 4).map((item) => <Link key={item.path} to={item.path}><item.icon size={16} />{item.title}<ArrowRight size={13} /></Link>)}</div></div>
    </div>
  </div>
}

function AICampusSearch() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('query') ?? '')
  const [sources, setSources] = useState<AISource[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!query.trim()) return
    setBusy(true)
    setError('')
    try { setSources(await searchCampusAI(query)) } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Campus search is temporarily unavailable.')
    } finally { setBusy(false) }
  }
  return <div className="ai-tool-shell"><header className="ai-topbar"><div><span className="ai-live-indicator" /> AI workspace / Campus search</div><Link to="/ai" className="ai-exit-link"><ArrowLeft size={15} /> Back to assistant</Link></header><div className="ai-tool-content">
    <div className="ai-tool-hero"><span className="ai-tool-hero-icon"><Search size={23} /></span><p className="ai-eyebrow">VERIFIED CAMPUS INFORMATION</p><h1>Campus search</h1><p>Search published academic resources, FAQs, events and internships. Results only include information your account can access.</p></div>
    <form className="ai-search-page-form" onSubmit={(event) => void search(event)}><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={1000} placeholder="e.g. Operating Systems resources" aria-label="Search campus information" /><button className="ai-primary-button" type="submit" disabled={busy}>{busy ? 'Searching…' : <><Search size={16} /> Search campus</>}</button></form>
    {error && <div className="ai-error-box" role="alert">{error}</div>}
    {sources.length > 0 && <section className="ai-output-card"><h2>Verified campus results</h2><AISourceList sources={sources} /></section>}
    {!busy && query && !sources.length && !error && <p className="ai-muted">No verified campus sources found. Try a broader search phrase.</p>}
  </div></div>
}

export default function AIWorkspacePage() {
  const location = useLocation()
  const tool = useMemo(() => routeTool(location.pathname), [location.pathname])
  if (location.pathname === '/ai/search') return <AICampusSearch />
  if (location.pathname === '/ai/saved') return <AISavedContentPage />
  return tool ? <AIToolWorkspace key={tool.path} tool={tool} /> : <AIChatWorkspace />
}

function AISavedContentPage() {
  const [items, setItems] = useState<AISavedContent[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    void listAISavedContent().then((saved) => { if (active) setItems(saved) }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : 'Unable to load saved content.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const remove = async (item: AISavedContent) => {
    try {
      await deleteAISavedContent(item.id)
      setItems((current) => current.filter((saved) => saved.id !== item.id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete saved content.')
    }
  }
  return <div className="ai-tool-shell"><header className="ai-topbar"><div><span className="ai-live-indicator" /> AI workspace / Saved content</div><Link to="/ai" className="ai-exit-link"><ArrowLeft size={15} /> Back to assistant</Link></header>
    <div className="ai-tool-content"><div className="ai-tool-hero"><span className="ai-tool-hero-icon"><FileText size={23} /></span><p className="ai-eyebrow">PRIVATE LIBRARY</p><h1>Saved AI content</h1><p>Your notes, summaries, and recommendations are visible only to you.</p></div>
      {loading && <p>Loading saved content…</p>}{error && <p className="ai-inline-error">{error}</p>}
      {!loading && !items.length && !error && <div className="ai-output-card"><p>No saved AI content yet. Save notes or summaries to keep them here.</p></div>}
      <div className="ai-saved-list">{items.map((item) => <article className="ai-output-card" key={item.id}><div className="ai-output-title"><div><span className="ai-output-tag">{item.feature}</span><h2>{item.title}</h2><small>{new Date(item.created_at).toLocaleDateString()}</small></div><button className="ai-icon-button" type="button" aria-label={`Delete ${item.title}`} onClick={() => void remove(item)}><Trash2 size={17} /></button></div><div className="ai-markdown">{item.content}</div><div className="ai-output-actions"><button type="button" onClick={() => void navigator.clipboard.writeText(item.content)}><FileText size={15} /> Copy</button></div></article>)}</div>
    </div>
  </div>
}

export function AdminAIAnalyticsPage() {
  const [rows, setRows] = useState<Array<{ day: string; feature: string; requests: number; tokens: number; users: number }>>([])
  const [quality, setQuality] = useState<{ requests: number; completed_requests: number; failed_requests: number; average_response_ms: number; positive_feedback: number; negative_feedback: number } | null>(null)
  const [faqs, setFaqs] = useState<Array<{ id: string; question: string; answer: string; category: string; status: string }>>([])
  const [error, setError] = useState('')
  const [qualityError, setQualityError] = useState('')
  const [faqError, setFaqError] = useState('')
  const [loading, setLoading] = useState(true)
  const [faqLoading, setFaqLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [category, setCategory] = useState('general')
  const [editingFaq, setEditingFaq] = useState<string | null>(null)
  const [savingFaq, setSavingFaq] = useState(false)
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!supabase) {
        setError('Supabase is not configured.')
        setFaqError('Supabase is not configured.')
        setLoading(false)
        setFaqLoading(false)
        return
      }
      const [analytics, qualityResult, faqResult] = await Promise.all([
        supabase.rpc('get_ai_usage_analytics'),
        supabase.rpc('get_ai_quality_analytics'),
        supabase.from('campus_faqs').select('id,question,answer,category,status').order('updated_at', { ascending: false }).limit(100),
      ])
      if (!active) return
      if (analytics.error) setError('Unable to load aggregate AI analytics. Confirm your admin account and apply the Phase 7 migration.')
      else setRows((analytics.data ?? []) as typeof rows)
      if (qualityResult.error) setQualityError('Quality metrics require the latest Phase 7 migration.')
      else {
        const row = qualityResult.data?.[0]
        if (row) setQuality({
          requests: Number(row.requests),
          completed_requests: Number(row.completed_requests),
          failed_requests: Number(row.failed_requests),
          average_response_ms: Number(row.average_response_ms),
          positive_feedback: Number(row.positive_feedback),
          negative_feedback: Number(row.negative_feedback),
        })
      }
      if (faqResult.error) setFaqError('Unable to load verified campus FAQs.')
      else setFaqs(faqResult.data ?? [])
      setLoading(false)
      setFaqLoading(false)
    }
    void load()
    return () => { active = false }
  }, [])
  const saveFaq = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || savingFaq) return
    const client = supabase
    setSavingFaq(true)
    setFaqError('')
    try {
      const values = { question: question.trim(), answer: answer.trim(), category: category.trim() || 'general' }
      const result = editingFaq
        ? await client.from('campus_faqs').update(values).eq('id', editingFaq)
        : await client.auth.getUser().then(({ data, error: authError }) => {
          if (authError || !data.user) throw new Error('Sign in as an administrator to manage FAQs.')
          return client.from('campus_faqs').insert({ ...values, created_by: data.user.id, status: 'draft' })
        })
      if (result.error) throw new Error('Unable to save this FAQ.')
      const { data, error: loadError } = await client.from('campus_faqs').select('id,question,answer,category,status').order('updated_at', { ascending: false }).limit(100)
      if (loadError) throw new Error('FAQ saved but the list could not be refreshed.')
      setFaqs(data ?? [])
      setQuestion('')
      setAnswer('')
      setCategory('general')
      setEditingFaq(null)
    } catch (caught) {
      setFaqError(caught instanceof Error ? caught.message : 'Unable to save this FAQ.')
    } finally {
      setSavingFaq(false)
    }
  }
  const changeFaqStatus = async (faq: (typeof faqs)[number]) => {
    if (!supabase) return
    const nextStatus = faq.status === 'published' ? 'archived' : 'published'
    const { error: updateError } = await supabase.from('campus_faqs').update({ status: nextStatus }).eq('id', faq.id)
    if (updateError) {
      setFaqError('Unable to update this FAQ status.')
      return
    }
    setFaqs((current) => current.map((item) => item.id === faq.id ? { ...item, status: nextStatus } : item))
  }
  const totals = rows.reduce((acc, row) => ({ requests: acc.requests + row.requests, tokens: acc.tokens + row.tokens, users: Math.max(acc.users, row.users) }), { requests: 0, tokens: 0, users: 0 })
  const feedbackCount = (quality?.positive_feedback ?? 0) + (quality?.negative_feedback ?? 0)
  const positiveRate = feedbackCount ? Math.round((quality?.positive_feedback ?? 0) / feedbackCount * 100) : null
  const failureRate = quality?.requests ? Math.round(quality.failed_requests / quality.requests * 100) : 0
  return <main className="ai-admin-page"><header><div><span className="ai-eyebrow">ADMIN · AGGREGATE ONLY</span><h1>AI usage analytics</h1><p>Operational usage totals only. Conversation content and personal prompts are not shown.</p></div><Link className="ai-secondary-button" to="/admin/dashboard"><ArrowLeft size={15} /> Admin dashboard</Link></header>
    {loading && <p>Loading analytics…</p>}{error && <p className="ai-error-box">{error}</p>}
    {!loading && !error && <><div className="ai-admin-stats"><article><span>Requests · 30 days</span><b>{totals.requests.toLocaleString()}</b></article><article><span>Distinct active users · peak daily</span><b>{totals.users.toLocaleString()}</b></article><article><span>Tokens used · 30 days</span><b>{totals.tokens.toLocaleString()}</b></article></div>
      {qualityError && <p className="ai-inline-error">{qualityError}</p>}
      {quality && <div className="ai-admin-stats"><article><span>Average response · 30 days</span><b>{quality.average_response_ms.toLocaleString()} ms</b></article><article><span>Request error rate</span><b>{failureRate}%</b></article><article><span>Positive feedback</span><b>{positiveRate === null ? 'No ratings' : `${positiveRate}%`}</b></article></div>}
      <div className="ai-admin-table-wrap"><table><thead><tr><th>Date</th><th>Feature</th><th>Requests</th><th>Tokens</th><th>Active users</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.day}-${row.feature}`}><td>{row.day}</td><td>{row.feature.replace('_', ' ')}</td><td>{row.requests}</td><td>{row.tokens.toLocaleString()}</td><td>{row.users}</td></tr>)}</tbody></table>{!rows.length && <p>No AI usage has been recorded yet.</p>}</div>
    </>}
    <section className="ai-admin-faqs">
      <div><span className="ai-eyebrow">VERIFIED CAMPUS KNOWLEDGE</span><h2>Campus FAQs</h2><p>Published FAQs are prioritized for campus-specific AI answers. Drafts are not searchable.</p></div>
      <form className="ai-faq-form" onSubmit={(event) => void saveFaq(event)}>
        <label>Question<input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={1000} required /></label>
        <label>Category<input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} required /></label>
        <label>Verified answer<textarea value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={12_000} rows={4} required /></label>
        <div><button className="ai-primary-button" disabled={savingFaq}>{savingFaq ? 'Saving…' : editingFaq ? 'Update FAQ' : 'Save FAQ as draft'}</button>{editingFaq && <button className="ai-secondary-button" type="button" onClick={() => { setEditingFaq(null); setQuestion(''); setAnswer(''); setCategory('general') }}>Cancel</button>}</div>
      </form>
      {faqError && <p className="ai-inline-error">{faqError}</p>}
      {faqLoading ? <p>Loading FAQs…</p> : <div className="ai-faq-list">{faqs.map((faq) => <article key={faq.id}>
        <div><span className={`ai-faq-status ${faq.status}`}>{faq.status}</span><small>{faq.category}</small><h3>{faq.question}</h3><p>{faq.answer}</p></div>
        <div><button className="ai-secondary-button" type="button" onClick={() => { setEditingFaq(faq.id); setQuestion(faq.question); setAnswer(faq.answer); setCategory(faq.category) }}>Edit</button><button className="ai-secondary-button" type="button" onClick={() => void changeFaqStatus(faq)}>{faq.status === 'published' ? 'Archive' : 'Publish'}</button></div>
      </article>)}{!faqs.length && <p>No FAQs yet. Add a verified answer above.</p>}</div>}
    </section>
  </main>
}
