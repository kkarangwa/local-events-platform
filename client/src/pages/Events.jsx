
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5001'
).replace(/\/$/, '')

const CATEGORIES = [
  'All Events',
  'Technology',
  'Business',
  'Creative',
  'Community',
  'Education',
  'Networking',
]

const QUICK_FILTERS = ['All', 'Today', 'Tomorrow', 'This Weekend']

function formatEventDate(dateValue) {
  if (!dateValue) {
    return {
      day: '--',
      month: 'TBA',
      fullDate: 'Date to be announced',
    }
  }

  const date = new Date(`${String(dateValue).slice(0, 10)}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return {
      day: '--',
      month: 'TBA',
      fullDate: 'Date to be announced',
    }
  }

  return {
    day: date.toLocaleDateString('en-GB', { day: '2-digit' }),
    month: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    fullDate: date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }
}

function formatEventTime(timeValue) {
  if (!timeValue) return 'Time to be announced'

  const match = String(timeValue).match(/^(\d{1,2}):(\d{2})/)

  if (!match) return String(timeValue)

  const hours = Number(match[1])
  const minutes = match[2]
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes} ${period}`
}

function Events() {
  const [events, setEvents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Events')
  const [selectedQuickFilter, setSelectedQuickFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadEvents() {
      setLoading(true)
      setErrorMessage('')

      try {
        const response = await fetch(`${API_BASE_URL}/api/events`, {
          signal: controller.signal,
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to load events right now.')
        }

        // Display published events returned by the database.
        setEvents(Array.isArray(data.events) ? data.events : [])
      } catch (error) {
        if (error.name === 'AbortError') return

        console.error('Failed to load events:', error)

        setErrorMessage(
          'We could not load events. Please check your connection and try again.'
        )
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadEvents()

    return () => controller.abort()
  }, [])

  const filteredEvents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const monday = new Date(today)
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return events.filter((event) => {
      const title = event.title || ''
      const description = event.description || ''
      const venue = event.venue || ''
      const category = event.category || ''

      const matchesSearch =
        title.toLowerCase().includes(search) ||
        description.toLowerCase().includes(search) ||
        venue.toLowerCase().includes(search) ||
        category.toLowerCase().includes(search)

      const matchesCategory =
        selectedCategory === 'All Events' ||
        category.toLowerCase() === selectedCategory.toLowerCase()

      const eventDate = event.event_date
        ? new Date(`${String(event.event_date).slice(0, 10)}T12:00:00`)
        : null

      let matchesQuickFilter = true

      if (selectedQuickFilter !== 'All') {
        if (!eventDate || Number.isNaN(eventDate.getTime())) {
          matchesQuickFilter = false
        } else if (selectedQuickFilter === 'Today') {
          matchesQuickFilter =
            eventDate.toDateString() === today.toDateString()
        } else if (selectedQuickFilter === 'Tomorrow') {
          matchesQuickFilter =
            eventDate.toDateString() === tomorrow.toDateString()
        } else if (selectedQuickFilter === 'This Weekend') {
          matchesQuickFilter =
            eventDate >= today &&
            eventDate <= sunday &&
            (eventDate.getDay() === 0 || eventDate.getDay() === 6)
        }
      }

      return matchesSearch && matchesCategory && matchesQuickFilter
    })
  }, [events, searchTerm, selectedCategory, selectedQuickFilter])

  function clearFilters() {
    setSearchTerm('')
    setSelectedCategory('All Events')
    setSelectedQuickFilter('All')
  }

  return (
    <div className="events-page">
      <nav className="navbar">
        <Link to="/" className="brand">
          <div className="brand-icon">G</div>
          <div>
            <span className="brand-name">Gada</span>
            <span className="brand-subtitle">EVENTS</span>
          </div>
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/events" className="active-link">
            Events
          </Link>
          <a href="/#about">About</a>
        </div>

        <div className="nav-actions">
          <Link to="/login" className="login-btn">
            Login
          </Link>
          <Link to="/register" className="nav-register-btn">
            Get Started
          </Link>
        </div>
      </nav>

      <section className="events-hero">
        <div className="events-hero-content">
          <span className="section-label">EXPLORE GADA</span>

          <h1>
            Find something
            <br />
            <span>worth showing up for.</span>
          </h1>

          <p>
            Discover published events around Kigali, connect with communities,
            and find experiences that interest you.
          </p>
        </div>
      </section>

      <section className="event-discovery">
        <div className="event-search">
          <span aria-hidden="true">⌕</span>

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search events, topics or places..."
            aria-label="Search events"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div
          className="event-quick-filters"
          aria-label="Filter events by date"
        >
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={
                selectedQuickFilter === filter
                  ? 'quick-filter active-quick-filter'
                  : 'quick-filter'
              }
              onClick={() => setSelectedQuickFilter(filter)}
              aria-pressed={selectedQuickFilter === filter}
            >
              {filter === 'All' ? 'All Events' : filter}
            </button>
          ))}
        </div>

        <div
          className="event-filters"
          aria-label="Filter events by category"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory === category
                  ? 'filter active-filter'
                  : 'filter'
              }
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="all-events-section">
        <div className="events-page-heading">
          <div>
            <span className="section-label">DISCOVER</span>
            <h2>Events happening soon</h2>
          </div>

          {!loading && !errorMessage && (
            <span className="event-count">
              {filteredEvents.length}{' '}
              {filteredEvents.length === 1 ? 'event' : 'events'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="no-events" role="status" aria-live="polite">
            <h3>Loading events...</h3>
            <p>Finding published events for you.</p>
          </div>
        ) : errorMessage ? (
          <div className="no-events" role="alert">
            <h3>Events are temporarily unavailable</h3>
            <p>{errorMessage}</p>

            <button
              type="button"
              className="primary-btn"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="events-page-grid">
            {filteredEvents.map((event) => {
              const date = formatEventDate(event.event_date)

              return (
                <article className="large-event-card" key={event.id}>
                  <div className="large-event-cover">
                    <span className="large-event-category">
                      {event.category || 'Event'}
                    </span>

                    <div className="large-date-box">
                      <strong>{date.day}</strong>
                      <span>{date.month}</span>
                    </div>
                  </div>

                  <div className="large-event-content">
                    <span className="event-time">
                      {date.fullDate} · {formatEventTime(event.start_time)}
                    </span>

                    <h3>{event.title}</h3>

                    <p className="large-event-description">
                      {event.description ||
                        'More information about this event will be available soon.'}
                    </p>

                    <p className="event-location">
                      📍 {event.venue || 'Venue to be announced'}
                    </p>

                    <div className="large-event-footer">
                      <Link
                        to={`/events/${event.id}`}
                        className="details-btn"
                      >
                        View Details <span>→</span>
                      </Link>

                      <a
                        className="details-btn"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${event.venue || ''}, Kigali, Rwanda`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Find venue <span>↗</span>
                      </a>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="no-events">
            <h3>
              {events.length === 0
                ? 'No published events yet'
                : 'No events found'}
            </h3>

            <p>
              {events.length === 0
                ? 'There are currently no published events. Please check back when organizers publish their listings.'
                : 'Try another search term or choose a different category or date filter.'}
            </p>

            {events.length > 0 && (
              <button
                type="button"
                className="primary-btn"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      <section className="organizer-cta">
        <div>
          <span className="section-label">ARE YOU AN ORGANIZER?</span>
          <h2>Have an event to share?</h2>
          <p>
            Publish your event on Gada and help people discover what is
            happening in their community.
          </p>
        </div>

        <Link to="/login" className="cta-button">
          Create an Event →
        </Link>
      </section>

      <footer>
        <div className="footer-brand">
          <div className="brand-icon">G</div>
          <div>
            <strong>Gada</strong>
            <span>EVENTS</span>
          </div>
        </div>

        <p>© 2026 Gada Events. Discover. Register. Experience.</p>

        <div className="footer-links">
          <Link to="/">Home</Link>
          <Link to="/events">Events</Link>
          <a href="/#about">About</a>
        </div>
      </footer>
    </div>
  )
}

export default Events
