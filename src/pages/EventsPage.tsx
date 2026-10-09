import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import PageContainer from '../components/PageContainer'
import { eventCategories, getAllEvents, getFeaturedEvents } from '../services/eventService'

export default function EventsPage() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [events, setEvents] = useState<Awaited<ReturnType<typeof getAllEvents>>>([])
  const [featured, setFeatured] = useState<Awaited<ReturnType<typeof getFeaturedEvents>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getAllEvents(), getFeaturedEvents()])
      .then(([allEvents, featuredEvents]) => {
        if (!active) return
        setEvents(allEvents)
        setFeatured(featuredEvents)
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load events.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase()

    return events.filter((event) => {
      const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory
      const matchesQuery =
        !term ||
        event.title.toLowerCase().includes(term) ||
        event.category.toLowerCase().includes(term) ||
        event.organizer_name.toLowerCase().includes(term) ||
        event.venue.toLowerCase().includes(term)

      return matchesCategory && matchesQuery
    })
  }, [events, query, selectedCategory])

  return (
    <PageContainer className="events-page-shell">
      <div className="events-page-inner">
        <section className="events-hero">
          <div>
            <p className="eyebrow">Campus events</p>
            <h1>Discover What's Happening on Campus</h1>
            <p className="events-subtitle">Explore workshops, hackathons, cultural events, sports, seminars, and more.</p>
          </div>
          <div className="events-hero-actions">
            <Link to="/my-events" className="primary-link">My Events</Link>
          </div>
        </section>

        <div className="search-bar-wrap">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events..."
            aria-label="Search events"
          />
        </div>

        <div className="event-filter-row">
          <button type="button" className={selectedCategory === 'All' ? 'filter-pill active' : 'filter-pill'} onClick={() => setSelectedCategory('All')}>
            All
          </button>
          {eventCategories.map((category) => (
            <button
              key={category.name}
              type="button"
              className={selectedCategory === category.name ? 'filter-pill active' : 'filter-pill'}
              onClick={() => setSelectedCategory(category.name)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <section className="featured-section">
          <h2>Featured Events</h2>
          <div className="featured-grid">
            {featured.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`} className="featured-event-card">
                <img src={event.banner_image_url ?? ''} alt={event.title} />
                <div>
                  <span>{event.category}</span>
                  {event.is_demo && <span className="event-demo-badge">DEMO DATA</span>}
                  <h3>{event.title}</h3>
                  <p>{event.short_description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="events-grid-section">
          <h2>Upcoming Events</h2>
          <div className="events-grid">
            {loading ? (
              <div className="empty-state">Loading events...</div>
            ) : error ? (
              <div className="empty-state" role="alert">{error}</div>
            ) : filteredEvents.length > 0 ? (
              filteredEvents.map((event) => <EventCard key={event.id} event={event} />)
            ) : (
              <div className="empty-state">We couldn't find any events matching your search.</div>
            )}
          </div>
        </section>
      </div>
    </PageContainer>
  )
}
