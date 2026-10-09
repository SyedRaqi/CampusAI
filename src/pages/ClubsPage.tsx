import { useCallback, useEffect, useState } from 'react'
import PageContainer from '../components/PageContainer'
import ClubCard from '../components/community/ClubCard'
import { joinClub, listClubs } from '../services/clubService'
import type { Club } from '../types'

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setClubs(await listClubs({ search, category }))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load clubs.')
    }
  }, [category, search])

  useEffect(() => {
    const timer = setTimeout(() => {
      void load()
    }, 250)
    return () => clearTimeout(timer)
  }, [load])

  const join = async (id: string) => {
    try {
      await joinClub(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to join club.')
    }
  }

  return (
    <PageContainer className="community-page-shell">
      <div className="community-page-inner">
        <header className="community-hero">
          <div>
            <p className="eyebrow">Campus communities</p>
            <h1>Find your people</h1>
            <p>Discover clubs, activities and communities built around campus life.</p>
          </div>
          <span className="community-note">Demo records are clearly labeled.</span>
        </header>

        <div className="community-search-row">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clubs…" aria-label="Search clubs" />
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Club category">
            <option value="">All categories</option>
            {['Technical','Cultural','Sports','Arts','Literary','Entrepreneurship','Innovation','Social Service','Photography','Robotics','AI & Data Science','Coding','Media'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {error && <p className="community-error">{error}</p>}

        <div className="community-grid">
          {clubs.map((club) => (
            <ClubCard key={club.id} club={club} onJoin={() => void join(club.id)} />
          ))}
          {!clubs.length && !error && (
            <div className="community-empty">You haven&apos;t joined any clubs yet. Discover a community that matches your interests.</div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
