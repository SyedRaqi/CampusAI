import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, BriefcaseBusiness, Building2, CalendarDays, Clock3, Search, Trash2, Users } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import {
  clearRecentSearches,
  getRecentSearches,
  searchCampusContent,
  type GlobalSearchResult,
  type RecentSearch,
  type SearchCategory,
  type SearchFilters,
} from '../services/globalSearchService'
import './phase10.css'

const tabs: Array<{ id: SearchCategory | null; label: string }> = [
  { id: null, label: 'All' },
  { id: 'resource', label: 'Resources' },
  { id: 'subject', label: 'Subjects' },
  { id: 'event', label: 'Events' },
  { id: 'internship', label: 'Internships' },
  { id: 'club', label: 'Clubs' },
  { id: 'team', label: 'Teams' },
  { id: 'announcement', label: 'Announcements' },
  { id: 'service', label: 'Campus services' },
  { id: 'lost_found', label: 'Lost & Found' },
  { id: 'faq', label: 'FAQs' },
]

const categoryFromPath: Record<string, SearchCategory> = {
  '/search/resources': 'resource',
  '/search/internships': 'internship',
  '/search/events': 'event',
  '/search/clubs': 'club',
  '/search/teams': 'team',
  '/search/announcements': 'announcement',
}

const categoryIcon: Record<SearchCategory, typeof Search> = {
  resource: BookOpen,
  subject: BookOpen,
  event: CalendarDays,
  internship: BriefcaseBusiness,
  club: Users,
  team: Users,
  announcement: Building2,
  service: Building2,
  lost_found: Search,
  faq: BookOpen,
}

const filterKeys = [
  'resourceSubject', 'resourceSemester', 'resourceDepartment', 'resourceType',
  'eventCategory', 'eventTime', 'internshipWorkMode', 'internshipType', 'internshipSkill',
  'clubCategory', 'announcementCategory', 'announcementFrom', 'announcementTo',
]

export default function GlobalSearchPage() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const currentPage = Math.max(0, Number(searchParams.get('page') ?? 0) || 0)
  const requestedCategory = searchParams.get('category')
  const category = categoryFromPath[location.pathname]
    ?? (tabs.some((tab) => tab.id === requestedCategory) ? requestedCategory as SearchCategory : null)
  const [input, setInput] = useState(query)
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [recent, setRecent] = useState<RecentSearch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [historyWarning, setHistoryWarning] = useState('')
  const [recentError, setRecentError] = useState('')
  const [showRecent, setShowRecent] = useState(false)
  const searchParamsKey = searchParams.toString()
  const filters = useMemo(() => {
    const params = new URLSearchParams(searchParamsKey)
    return Object.fromEntries(filterKeys.flatMap((key) => {
      const value = params.get(key)
      return value ? [[key, value]] : []
    })) as SearchFilters
  }, [searchParamsKey])
  const sort = searchParams.get('sort') ?? 'relevance'

  useEffect(() => setInput(query), [query])

  useEffect(() => {
    if (input.trim() === query) return
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (input.trim()) next.set('q', input.trim())
      else next.delete('q')
      next.delete('category')
      if (input.trim() !== query) next.delete('page')
      setSearchParams(next, { replace: true })
    }, 300)
    return () => window.clearTimeout(timer)
  }, [input, query, searchParams, setSearchParams])

  useEffect(() => {
    let active = true
    if (query.trim().length < 2) {
      setResults([])
      setTotal(0)
      setLoading(false)
      return () => { active = false }
    }
    setLoading(true)
    setError('')
    void searchCampusContent(query, category, currentPage, filters, sort)
      .then((response) => {
        if (!active) return
        setResults(response.results)
        setTotal(response.total)
        setHistoryWarning(response.historyWarning)
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Search is unavailable.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [category, currentPage, filters, query, sort])

  useEffect(() => {
    let active = true
    void getRecentSearches().then((items) => { if (active) setRecent(items) })
      .catch((caught: unknown) => { if (active) setRecentError(caught instanceof Error ? caught.message : 'Unable to load recent searches.') })
    return () => { active = false }
  }, [query])

  const visibleTabs = useMemo(
    () => tabs.map((tab) => ({ ...tab, selected: tab.id === category })),
    [category],
  )

  async function clearHistory() {
    setRecentError('')
    try {
      await clearRecentSearches()
      setRecent([])
    } catch (caught) {
      setRecentError(caught instanceof Error ? caught.message : 'Unable to clear recent searches.')
    }
  }

  function chooseRecent(item: RecentSearch) {
    setInput(item.query)
    setShowRecent(false)
  }

  function updateSearchParam(key: string, value: string) {
    setSearchParams((params) => {
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      return params
    })
  }

  function clearCategoryFilters() {
    setSearchParams((params) => {
      for (const key of filterKeys) params.delete(key)
      params.delete('page')
      return params
    })
  }

  function renderFilters() {
    if (!category || !['resource', 'event', 'internship', 'club', 'announcement'].includes(category)) return null
    const textFilter = (key: string, label: string, placeholder: string) => (
      <label key={key}>{label}<input value={searchParams.get(key) ?? ''} maxLength={120} placeholder={placeholder} onChange={(event) => updateSearchParam(key, event.target.value)} /></label>
    )
    const selectFilter = (key: string, label: string, options: Array<[string, string]>) => (
      <label key={key}>{label}<select value={searchParams.get(key) ?? ''} onChange={(event) => updateSearchParam(key, event.target.value)}>{options.map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label>
    )
    return <div className="p10-filter-row" aria-label="Category search filters">
      {category === 'resource' && <>
        {textFilter('resourceSubject', 'Subject', 'Any subject')}
        {selectFilter('resourceSemester', 'Semester', [['', 'Any semester'], ...[1, 2, 3, 4, 5, 6, 7, 8].map((semester): [string, string] => [String(semester), `Semester ${semester}`])])}
        {textFilter('resourceDepartment', 'Department', 'Any department')}
        {textFilter('resourceType', 'Resource type', 'Any type')}
      </>}
      {category === 'event' && <>
        {textFilter('eventCategory', 'Category', 'Any category')}
        {selectFilter('eventTime', 'Event date', [['', 'Any date'], ['upcoming', 'Upcoming'], ['past', 'Past']])}
      </>}
      {category === 'internship' && <>
        {selectFilter('internshipWorkMode', 'Work mode', [['', 'Any mode'], ['remote', 'Remote'], ['hybrid', 'Hybrid'], ['on_site', 'On site']])}
        {selectFilter('internshipType', 'Type', [['', 'Any type'], ['full_time', 'Full time'], ['part_time', 'Part time'], ['summer', 'Summer'], ['winter', 'Winter'], ['academic', 'Academic'], ['research', 'Research']])}
        {textFilter('internshipSkill', 'Skill', 'Any skill')}
      </>}
      {category === 'club' && textFilter('clubCategory', 'Category', 'Any category')}
      {category === 'announcement' && <>
        {selectFilter('announcementCategory', 'Category', [['', 'Any category'], ['academic', 'Academic'], ['events', 'Events'], ['career', 'Career'], ['clubs', 'Clubs'], ['student_support', 'Student support'], ['general', 'General'], ['system', 'System']])}
        <label>Published from<input type="date" value={searchParams.get('announcementFrom') ?? ''} onChange={(event) => updateSearchParam('announcementFrom', event.target.value)} /></label>
        <label>Published to<input type="date" value={searchParams.get('announcementTo') ?? ''} onChange={(event) => updateSearchParam('announcementTo', event.target.value)} /></label>
      </>}
      <button type="button" className="p10-text-button" onClick={clearCategoryFilters}>Clear filters</button>
    </div>
  }

  return (
    <PageContainer className="phase10-shell">
      <section className="p10-hero">
        <p className="p10-eyebrow">CampusConnect · Search</p>
        <h1>Find your next step.</h1>
        <p>Search campus resources, events, internships, teams, services and more.</p>
        <label className="p10-searchbox p10-searchbox-large">
          <Search size={20} aria-hidden="true" />
          <input
            aria-label="Search campus content"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => setShowRecent(true)}
            onBlur={() => window.setTimeout(() => setShowRecent(false), 150)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const next = new URLSearchParams(searchParams)
                if (input.trim()) next.set('q', input.trim())
                next.delete('page')
                setSearchParams(next)
                setShowRecent(false)
              }
            }}
            placeholder="Try “Machine Learning” or “career workshop”"
          />
          {input && <button type="button" onClick={() => { setInput(''); setSearchParams({}) }} aria-label="Clear search">×</button>}
          {showRecent && !input.trim() && recent.length > 0 && (
            <div className="p10-suggestions" onMouseDown={(event) => event.preventDefault()}>
              <div className="p10-suggestion-heading"><span>Recent searches</span><button type="button" onClick={() => void clearHistory()}><Trash2 size={14} /> Clear</button></div>
              {recent.map((item) => <button type="button" key={item.id} onClick={() => chooseRecent(item)}><Clock3 size={14} /> {item.query}</button>)}
            </div>
          )}
        </label>
      </section>

      <nav className="p10-search-tabs" aria-label="Search categories">
        {visibleTabs.map((tab) => <Link
          key={tab.label}
          className={tab.selected ? 'active' : ''}
          to={tab.id && ['resource', 'internship', 'event', 'club', 'team', 'announcement'].includes(tab.id)
            ? `/search/${tab.id === 'resource' ? 'resources' : tab.id === 'internship' ? 'internships' : tab.id === 'event' ? 'events' : tab.id === 'club' ? 'clubs' : tab.id === 'team' ? 'teams' : 'announcements'}${query ? `?q=${encodeURIComponent(query)}` : ''}`
            : `/search${query ? `?q=${encodeURIComponent(query)}` : ''}${tab.id ? `${query ? '&' : '?'}category=${tab.id}` : ''}`}
        >{tab.label}</Link>)}
      </nav>

      {recentError && <p className="p10-error" role="alert">{recentError}</p>}
      {error && <p className="p10-error" role="alert">{error}</p>}
      {historyWarning && <p className="p10-muted" role="status">{historyWarning}</p>}
      {query.trim().length < 2 ? (
        <div className="p10-empty"><Search size={28} /><h2>Start with a keyword</h2><p>Search public and permission-authorized campus information.</p></div>
      ) : (
        <section className="p10-results">
          {renderFilters()}
          <div className="p10-results-heading"><div><p className="p10-eyebrow">Search results</p><h2>{loading ? 'Searching…' : `${total} result${total === 1 ? '' : 's'}`}</h2></div><label className="p10-sort">Sort<select value={sort} onChange={(event) => updateSearchParam('sort', event.target.value)}><option value="relevance">Relevance</option><option value="newest">Newest</option><option value="oldest">Oldest</option></select></label></div>
          {loading && <div className="p10-loading" role="status">Searching campus content…</div>}
          {!loading && !error && results.length === 0 && <div className="p10-empty"><Search size={28} /><h2>No matching results</h2><p>Try another keyword or choose a different category.</p></div>}
          <div className="p10-result-list">
            {results.map((result) => <SearchResultCard key={`${result.category}-${result.id}`} result={result} query={query} />)}
          </div>
          {total > 20 && <div className="p10-pagination">
            <button type="button" disabled={currentPage === 0 || loading} onClick={() => setSearchParams((params) => { params.set('page', String(currentPage - 1)); return params })}>Previous</button>
            <span>Page {currentPage + 1} of {Math.ceil(total / 20)}</span>
            <button type="button" disabled={(currentPage + 1) * 20 >= total || loading} onClick={() => setSearchParams((params) => { params.set('page', String(currentPage + 1)); return params })}>Next</button>
          </div>}
        </section>
      )}
    </PageContainer>
  )
}

function SearchResultCard({ result, query }: { result: GlobalSearchResult; query: string }) {
  const Icon = categoryIcon[result.category]
  const metadata = Object.entries(result.metadata).filter(([, value]) => value !== null && value !== '')
  return <Link to={result.href} className="p10-result-card">
    <span className="p10-result-icon"><Icon size={18} /></span>
    <span className="p10-result-body">
      <span className="p10-result-top"><span>{result.category.replace('_', ' ')}</span>{result.created_at && <time>{new Date(result.created_at).toLocaleDateString()}</time>}</span>
      <strong>{highlightMatch(result.title, query)}</strong>
      <span className="p10-result-description">{highlightMatch(result.description, query)}</span>
      {metadata.length > 0 && <span className="p10-result-meta">{metadata.slice(0, 3).map(([key, value]) => <span key={key}>{key.replaceAll('_', ' ')}: {String(value)}</span>)}</span>}
    </span>
    <ArrowRight size={16} className="p10-result-arrow" />
  </Link>
}

function highlightMatch(text: string, query: string) {
  const words = query.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return text
  const expression = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig')
  return text.split(expression).map((part, index) => words.some((word) => part.toLowerCase() === word.toLowerCase())
    ? <mark className="p10-match" key={`${index}-${part}`}>{part}</mark>
    : part)
}
