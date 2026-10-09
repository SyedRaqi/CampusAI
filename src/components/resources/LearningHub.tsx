import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Resource } from '../../types'
import { getSavedResources } from '../../services/bookmarkService'
import { getPopularResources } from '../../services/resourceService'
import { getRecentlyViewed } from '../../services/resourceViewService'
import FileTypeIcon from './FileTypeIcon'

type HubTab = 'recent' | 'saved' | 'popular'

export default function LearningHub() {
  const [tab, setTab] = useState<HubTab>('recent')
  const [resources, setResources] = useState<Resource[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const result = tab === 'recent'
          ? await getRecentlyViewed(4)
          : tab === 'saved'
            ? (await getSavedResources({ pageSize: 4 })).resources
            : (await getPopularResources(4)).resources
        if (active) setResources(result)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load learning resources.')
      }
    }
    void load()
    return () => { active = false }
  }, [tab])

  return (
    <section className="learning-hub">
      <div className="learning-hub-heading"><div><p className="eyebrow">Learning Hub</p><h2>Your academic library</h2></div><Link to="/resources" className="resource-action-button">View all resources</Link></div>
      <div className="learning-hub-tabs" role="tablist" aria-label="Learning resources">
        {(['recent', 'saved', 'popular'] as HubTab[]).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'active' : ''} onClick={() => { setError(''); setTab(item) }}>{item === 'recent' ? 'Recent' : item === 'saved' ? 'Saved' : 'Popular'}</button>)}
      </div>
      {error ? <p className="resource-inline-error" role="alert">{error}</p> : resources.length ? <div className="learning-hub-list">{resources.map((resource) => <Link to={`/resources/${resource.id}`} key={resource.id} className="learning-hub-row"><FileTypeIcon mimeType={resource.file_type} /><span><strong>{resource.title}</strong><small>{resource.subject?.subject_name} · {resource.resource_type.replaceAll('_', ' ')}</small></span><span className="learning-hub-row-action">Open</span></Link>)}</div> : <p className="resource-empty-compact">{tab === 'recent' ? 'Resources you open will appear here.' : tab === 'saved' ? 'Save resources here for quick access.' : 'No activity yet. Browse the latest resources.'}</p>}
    </section>
  )
}
