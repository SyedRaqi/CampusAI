import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Bell, Command, Search, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { clearRecentSearches, getRecentSearches, type RecentSearch } from '../services/globalSearchService'

const NotificationBell = lazy(() => import('../pages/NotificationPages').then((module) => ({ default: module.NotificationBell })))

export default function Phase10Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, role, signOut } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [recent, setRecent] = useState<RecentSearch[]>([])
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hidden = pathname === '/' || ['/login', '/register', '/forgot-password'].includes(pathname)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    let active = true
    inputRef.current?.focus()
    void getRecentSearches().then((items) => { if (active) setRecent(items) })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load recent searches.') })
    return () => { active = false }
  }, [searchOpen])

  if (hidden) return null

  function submitSearch(searchText = query) {
    const trimmed = searchText.trim()
    if (trimmed.length < 2) {
      setError('Enter at least two characters to search.')
      return
    }
    setSearchOpen(false)
    setQuery(trimmed)
    navigate(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  async function clearHistory() {
    setError('')
    try { await clearRecentSearches(); setRecent([]) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to clear recent searches.') }
  }

  return <>
    <header className="p10-app-header">
      <Link className="p10-brand" to={user ? `/${role ?? 'student'}/dashboard` : '/'}><span className="p10-brand-mark" /> CampusConnect <em>AI</em></Link>
      <nav className="p10-header-nav" aria-label="Workspace navigation">
        <Link to="/search">Explore</Link>
        <Link to="/announcements">Announcements</Link>
        {role === 'admin' && <><Link to="/admin/announcements">Manage announcements</Link><Link to="/admin/analytics">Analytics</Link><Link to="/admin/audit-logs">Audit logs</Link></>}
      </nav>
      <div className="p10-header-actions">
        <button type="button" className="p10-header-search" onClick={() => { setError(''); setSearchOpen(true) }} aria-label="Search CampusConnect">
          <Search size={16} /><span>Search campus content</span><kbd><Command size={11} /> K</kbd>
        </button>
        <Suspense fallback={null}><NotificationBell /></Suspense>
        {user ? <Link className="p10-header-profile" to="/profile">Profile</Link> : <Link className="p10-header-profile" to="/login">Login</Link>}
        {user && <button className="p10-header-signout" type="button" onClick={() => void signOut()}>Sign out</button>}
      </div>
    </header>
    {searchOpen && <div className="p10-command-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false) }}>
      <section className="p10-command-dialog" role="dialog" aria-modal="true" aria-label="Search CampusConnect">
        <div className="p10-command-input"><Search size={19} /><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setError('') }} onKeyDown={(event) => { if (event.key === 'Enter') submitSearch() }} placeholder="Search resources, events, internships…" /><button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={17} /></button></div>
        {error && <p className="p10-error" role="alert">{error}</p>}
        {recent.length > 0 && <div className="p10-command-recents"><div><span>Recent searches</span><button type="button" onClick={() => void clearHistory()}>Clear history</button></div>{recent.map((item) => <button key={item.id} type="button" onClick={() => submitSearch(item.query)}><Search size={14} />{item.query}</button>)}</div>}
        <button className="p10-command-action" type="button" onClick={() => submitSearch()}><Search size={15} /> Search all campus content <span>Enter</span></button>
        <div className="p10-command-footer"><Bell size={13} /> Search uses the access permissions of your account.</div>
      </section>
    </div>}
  </>
}
