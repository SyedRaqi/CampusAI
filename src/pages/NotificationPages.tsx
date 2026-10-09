import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, ChevronDown, ExternalLink, Settings2, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import PageContainer from '../components/PageContainer'
import { useAuth } from '../contexts/AuthContext'
import {
  dismissNotification,
  getNotificationPath,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  removeNotificationSubscription,
  subscribeToNotifications,
  type NotificationRecord,
} from '../services/notificationService'
import {
  getNotificationPreferences,
  notificationCategories,
  saveNotificationPreferences,
  type NotificationPreference,
} from '../services/notificationPreferenceService'
import './phase10.css'

type NotificationScope = 'all' | 'academic' | 'events' | 'resources' | 'internships' | 'clubs' | 'project_teams' | 'chat' | 'career' | 'support' | 'attendance' | 'announcements'

export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!user?.id) return
    try {
      const [notifications, unread] = await Promise.all([getNotifications(0, 6), getUnreadNotificationCount()])
      setItems(notifications)
      setCount(unread)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to refresh notifications.')
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    void refresh()
    const channel = subscribeToNotifications(user.id, () => void refresh(), (status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setError('Live updates are reconnecting. You can refresh notifications manually.')
    })
    return () => { void removeNotificationSubscription(channel).catch((caught: unknown) => console.error('Notification subscription cleanup failed:', caught)) }
  }, [refresh, user?.id])

  async function openNotification(item: NotificationRecord) {
    if (!item.is_read) {
      try { await markNotificationRead(item.id); await refresh() }
      catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update notification.') }
    }
    const path = getNotificationPath(item)
    if (path) {
      setOpen(false)
      navigate(path)
    }
  }

  async function markAll() {
    try { await markAllNotificationsRead(); await refresh() }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update notifications.') }
  }

  if (!user) return null
  return <div className="p10-notification-bell">
    <button className="p10-icon-button" type="button" aria-label={`${count} unread notifications`} aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) void refresh() }}>
      <Bell size={18} />{count > 0 && <span className="p10-unread-badge">{count > 99 ? '99+' : count}</span>}
    </button>
    {open && <div className="p10-notification-popover">
      <div className="p10-popover-header"><div><strong>Notifications</strong><span>{count} unread</span></div><button type="button" onClick={() => void markAll()} disabled={!count} aria-label="Mark all notifications read"><CheckCheck size={16} /></button></div>
      {error && <p className="p10-error">{error}</p>}
      <div className="p10-popover-list">
        {items.map((item) => <button key={item.id} className={`p10-popover-item ${item.is_read ? '' : 'unread'}`} type="button" onClick={() => void openNotification(item)}>
          <span><strong>{item.title}</strong><span>{item.message}</span><time>{new Date(item.created_at).toLocaleString()}</time></span>
          <ExternalLink size={14} />
        </button>)}
        {items.length === 0 && <p className="p10-muted">You’re all caught up.</p>}
      </div>
      <div className="p10-popover-footer"><Link to="/notifications" onClick={() => setOpen(false)}>View all notifications</Link><Link to="/settings/notifications" aria-label="Notification preferences" onClick={() => setOpen(false)}><Settings2 size={15} /></Link></div>
    </div>}
  </div>
}

const scopes: Array<{ id: NotificationScope; label: string }> = [
  { id: 'all', label: 'All notifications' },
  { id: 'academic', label: 'Academic' },
  { id: 'events', label: 'Events' },
  { id: 'resources', label: 'Resources' },
  { id: 'internships', label: 'Internships' },
  { id: 'clubs', label: 'Clubs' },
  { id: 'project_teams', label: 'Project teams' },
  { id: 'chat', label: 'Chat' },
  { id: 'career', label: 'Career' },
  { id: 'support', label: 'Support' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'announcements', label: 'Announcements' },
]

export function NotificationCenterPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationRecord[]>([])
  const [page, setPage] = useState(0)
  const [scope, setScope] = useState<NotificationScope>('all')
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  const load = useCallback(async (requestedPage = 0, append = false) => {
    setLoading(true)
    try {
      const data = await getNotifications(requestedPage, 20, {
        category: scope === 'all' ? undefined : scope,
        unread: readFilter === 'all' ? undefined : readFilter === 'unread',
      })
      setItems((previous) => append
        ? [...new Map([...previous, ...data].map((item) => [item.id, item])).values()]
        : data)
      setMore(data.length === 20)
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [readFilter, scope])

  useEffect(() => { setPage(0); void load(0) }, [load])
  useEffect(() => {
    if (!user?.id) return
    const channel = subscribeToNotifications(user.id, () => void load(0))
    return () => { void removeNotificationSubscription(channel).catch((caught: unknown) => console.error('Notification subscription cleanup failed:', caught)) }
  }, [load, user?.id])

  async function markRead(id: string) {
    try { await markNotificationRead(id); await load(0) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to mark notification read.') }
  }

  async function openNotification(item: NotificationRecord) {
    await markRead(item.id)
    const path = getNotificationPath(item)
    if (path) navigate(path)
  }

  async function dismiss(id: string) {
    try { await dismissNotification(id); setItems((current) => current.filter((item) => item.id !== id)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to dismiss notification.') }
  }

  async function markAll() {
    try { await markAllNotificationsRead(); await load(0) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to mark notifications read.') }
  }

  return <PageContainer className="phase10-shell">
    <header className="p10-page-heading"><div><p className="p10-eyebrow">Your campus updates</p><h1>Notifications</h1><p>Stay current on events, academics, support and campus activity.</p></div><button className="p10-button p10-button-secondary" type="button" onClick={() => void markAll()} disabled={!items.some((item) => !item.is_read)}><CheckCheck size={16} /> Mark all read</button></header>
    <div className="p10-filter-row"><label>Category<select value={scope} onChange={(event) => setScope(event.target.value as NotificationScope)}>{scopes.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label>Read status<select value={readFilter} onChange={(event) => setReadFilter(event.target.value as typeof readFilter)}><option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option></select></label><Link to="/settings/notifications"><Settings2 size={16} /> Preferences</Link></div>
    {error && <p className="p10-error" role="alert">{error}</p>}
    <div className="p10-notification-list">
      {items.map((item) => <article key={item.id} className={`p10-notification-card ${item.is_read ? 'read' : 'unread'}`}>
        <span className="p10-notification-dot" aria-hidden="true" />
        <div className="p10-notification-copy"><div><span className="p10-chip">{item.type.replaceAll('_', ' ')}</span><time>{new Date(item.created_at).toLocaleString()}</time></div><strong>{item.title}</strong><p>{item.message}</p>
          {getNotificationPath(item) && <button className="p10-text-button" type="button" onClick={() => void openNotification(item)}>Open update <ExternalLink size={14} /></button>}
        </div>
        <div className="p10-notification-actions">{!item.is_read && <button className="p10-icon-button" type="button" aria-label="Mark read" onClick={() => void markRead(item.id)}><CheckCheck size={16} /></button>}<button className="p10-icon-button" type="button" aria-label="Dismiss notification" onClick={() => void dismiss(item.id)}><Trash2 size={16} /></button></div>
      </article>)}
      {!loading && !error && items.length === 0 && <div className="p10-empty"><Bell size={28} /><h2>No notifications here</h2><p>Try another filter or check back later.</p></div>}
      {loading && <p className="p10-loading">Loading notifications…</p>}
    </div>
    {more && items.length >= 20 && <button className="p10-button p10-load-more" type="button" disabled={loading} onClick={() => { const next = page + 1; setPage(next); void load(next, true) }}>Load more <ChevronDown size={16} /></button>}
  </PageContainer>
}

export function NotificationPreferencesPage() {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    void getNotificationPreferences().then((data) => { if (active) setPreferences(data) })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Unable to load preferences.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function update(category: NotificationPreference['category'], key: 'in_app_enabled' | 'email_enabled', checked: boolean) {
    setPreferences((current) => current.map((item) => item.category === category ? { ...item, [key]: checked } : item))
    setNotice('')
  }

  async function save() {
    setSaving(true); setError(''); setNotice('')
    try { await saveNotificationPreferences(preferences); setNotice('Your in-app preferences have been saved.') }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save preferences.') }
    finally { setSaving(false) }
  }

  return <PageContainer className="phase10-shell">
    <header className="p10-page-heading"><div><p className="p10-eyebrow">Settings</p><h1>Notification preferences</h1><p>Choose which campus updates appear in your notification center.</p></div></header>
    <div className="p10-preference-card"><div className="p10-preference-head"><span>Category</span><span>In-app</span><span>Email</span></div>
      {loading ? <p className="p10-loading">Loading preferences…</p> : notificationCategories.map((category) => {
        const preference = preferences.find((item) => item.category === category.id)
        if (!preference) return null
        return <div className="p10-preference-row" key={category.id}><span><strong>{category.label}</strong><small>{category.id === 'system' ? 'Important account and product updates' : 'Notifications related to this area'}</small></span>
          <label className="p10-switch"><input type="checkbox" checked={preference.in_app_enabled} onChange={(event) => update(category.id, 'in_app_enabled', event.target.checked)} aria-label={`${category.label} in-app notifications`} /><span /></label>
          <label className="p10-switch p10-switch-disabled" title="Email delivery is not configured"><input type="checkbox" checked={false} disabled aria-label={`${category.label} email notifications unavailable`} /><span /></label>
        </div>
      })}
      <p className="p10-muted">Email notification delivery is not configured. Critical account and safety notifications may still be delivered under campus policy.</p>
      {error && <p className="p10-error" role="alert">{error}</p>}{notice && <p className="p10-success" role="status">{notice}</p>}
      <button className="p10-button" type="button" onClick={() => void save()} disabled={loading || saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
    </div>
  </PageContainer>
}
