
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import '../App.css'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:5001'
).replace(/\/$/, '')

function formatEventDate(date) {
  if (!date) return { day: '--', month: 'TBA' }

  const parsedDate = new Date(`${String(date).slice(0, 10)}T12:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return { day: '--', month: 'TBA' }
  }

  return {
    day: parsedDate.toLocaleDateString('en-GB', { day: '2-digit' }),
    month: parsedDate
      .toLocaleDateString('en-GB', { month: 'short' })
      .toUpperCase(),
  }
}

function formatEventTime(time) {
  if (!time) return 'Time to be announced'

  const match = String(time).match(/^(\d{1,2}):(\d{2})/)

  if (!match) return String(time)

  const hours = Number(match[1])
  const minutes = match[2]
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes} ${period}`
}

function Home() {
  const { user, isAuthenticated } = useAuth()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    async function loadEvents() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_BASE_URL}/api/events`, {
          signal: controller.signal,
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Could not load events.')
        }

        setEvents(Array.isArray(data.events) ? data.events : [])
      } catch (err) {
        if (err.name === 'AbortError') return

        console.error('Failed to load events:', err)

        setError(
          'Unable to load events right now. Please check your connection and try again.'
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

  const dashboardPath =
    user?.role === 'organizer'
      ? '/organizer-dashboard'
      : '/participant-dashboard'

  const createEventPath =
    isAuthenticated && user?.role === 'organizer'
      ? '/organizer-dashboard'
      : '/login'

  const featuredEvent = events[0]

  return (
    <div className="app">
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
          <Link to="/events">Events</Link>
          <a href="/#about">About</a>
        </div>

        <div className="nav-actions">
          {isAuthenticated ? (
            <Link to={dashboardPath} className="login-btn">
              My Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="login-btn">
                Login
              </Link>

              <Link to="/register" className="nav-register-btn">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              Discover what's happening in Kigali
            </div>

            <h1>
              Your next
              <br />
              <span>experience</span> starts here.
            </h1>

            <p className="hero-description">
              Discover local events, connect with your community, and
              register for experiences that matter to you.
            </p>

            <div className="hero-actions">
              <Link to="/events" className="primary-btn">
                Explore Events <span>→</span>
              </Link>

              <Link to={createEventPath} className="outline-btn">
                Create an Event
              </Link>
            </div>

            <div className="hero-trust">
              <div className="avatar-stack" aria-hidden="true">
                <div>G</div>
                <div>A</div>
                <div>D</div>
                <div>A</div>
              </div>

              <p>
                <strong>Join the community</strong>
                <br />
                Discover events happening around you
              </p>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-label">FEATURED EVENT</div>

            {featuredEvent ? (
              <article className="featured-card">
                <div className="featured-top">
                  <span className="category-pill">
                    {featuredEvent.category || 'EVENT'}
                  </span>
                </div>

                <div className="featured-date">
                  <strong>
                    {formatEventDate(featuredEvent.event_date).day}
                  </strong>
                  <span>
                    {formatEventDate(featuredEvent.event_date).month}
                  </span>
                </div>

                <div className="featured-info">
                  <p>{formatEventTime(featuredEvent.start_time)}</p>
                  <h2>{featuredEvent.title}</h2>
                  <span>
                    📍 {featuredEvent.venue || 'Venue to be announced'}
                  </span>
                </div>

                <div className="featured-footer">
                  <span>Discover this event</span>
                  <Link to={`/events/${featuredEvent.id}`}>
                    View Details →
                  </Link>
                </div>
              </article>
            ) : (
              <div className="featured-card">
                <div className="featured-info">
                  <h2>
                    {loading
                      ? 'Finding events for you...'
                      : error
                        ? 'Events are temporarily unavailable'
                        : 'Your next experience starts here.'}
                  </h2>

                  <p>
                    {loading
                      ? 'Please wait while we load published events.'
                      : error
                        ? 'Please visit the events page and try again shortly.'
                        : 'Be the first to discover new events as organizers publish them.'}
                  </p>
                </div>

                <div className="featured-footer">
                  <Link to="/events">Explore events →</Link>
                </div>
              </div>
            )}

            <div className="floating-card floating-one">
              <span>📍</span>
              <div>
                <strong>Kigali</strong>
                <small>Local events</small>
              </div>
            </div>

            <div className="floating-card floating-two">
              <span>✓</span>
              <div>
                <strong>Easy registration</strong>
                <small>Discover opportunities</small>
              </div>
            </div>
          </div>
        </section>

        <section className="search-section">
          <div className="search-box">
            <div className="search-item">
              <span className="search-icon">⌕</span>
              <div>
                <small>DISCOVER</small>
                <p>Find your next experience</p>
              </div>
            </div>

            <div className="search-divider"></div>

            <div className="search-item">
              <span className="search-icon">◉</span>
              <div>
                <small>LOCATION</small>
                <p>Kigali, Rwanda</p>
              </div>
            </div>

            <Link to="/events" className="search-btn">
              Search Events
            </Link>
          </div>
        </section>

        <section className="events-section" id="events">
          <div className="section-header">
            <div>
              <span className="section-label">DON'T MISS OUT</span>
              <h2>Upcoming events</h2>
              <p>Find something worth showing up for.</p>
            </div>

            <Link to="/events" className="view-all-btn">
              View all events →
            </Link>
          </div>

          {loading ? (
            <p role="status" aria-live="polite">
              Loading published events...
            </p>
          ) : error ? (
            <div className="event-empty-state">
              <h3>Events are temporarily unavailable</h3>
              <p role="alert">{error}</p>

              <button
                type="button"
                className="details-btn"
                onClick={() => window.location.reload()}
              >
                Try again →
              </button>
            </div>
          ) : events.length === 0 ? (
            <div className="event-empty-state">
              <h3>No published events yet</h3>
              <p>
                There are no upcoming published events at the moment.
                Please check back soon.
              </p>

              <Link to={createEventPath} className="primary-btn">
                Create an Event →
              </Link>
            </div>
          ) : (
            <div className="event-grid">
              {events.slice(0, 3).map((event) => {
                const eventDate = formatEventDate(event.event_date)

                return (
                  <article className="event-card" key={event.id}>
                    <div className="event-cover">
                      <span className="event-category">
                        {event.category || 'Event'}
                      </span>

                      <div className="event-date-box">
                        <strong>{eventDate.day}</strong>
                        <span>{eventDate.month}</span>
                      </div>
                    </div>

                    <div className="event-content">
                      <span className="event-time">
                        {eventDate.month} · {formatEventTime(event.start_time)}
                      </span>

                      <h3>{event.title}</h3>

                      <p className="event-location">
                        📍 {event.venue || 'Venue to be announced'}
                      </p>

                      <Link
                        to={`/events/${event.id}`}
                        className="details-btn"
                      >
                        View Details <span>→</span>
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="how-section">
          <div className="section-header centered">
            <span className="section-label">HOW IT WORKS</span>
            <h2>Everything in one place.</h2>
            <p>
              From discovering an event to showing up, Gada keeps it simple.
            </p>
          </div>

          <div className="steps-grid">
            <div className="step">
              <div className="step-number">01</div>
              <div className="step-icon">⌕</div>
              <h3>Discover</h3>
              <p>
                Browse events and find experiences that match your interests.
              </p>
            </div>

            <div className="step">
              <div className="step-number">02</div>
              <div className="step-icon">✓</div>
              <h3>Register</h3>
              <p>
                Secure your spot with a simple and straightforward
                registration process.
              </p>
            </div>

            <div className="step">
              <div className="step-number">03</div>
              <div className="step-icon">♡</div>
              <h3>Experience</h3>
              <p>
                Show up, connect with people, and make the most of your event.
              </p>
            </div>
          </div>
        </section>

        <section className="about-section" id="about">
          <div className="about-card">
            <div className="about-text">
              <span className="section-label">ABOUT GADA</span>

              <h2>
                Bringing people and local events closer together.
              </h2>

              <p>
                Gada Events is a digital platform designed to make it easier
                for people to discover and register for local events while
                giving organizers a simple way to manage their events and
                participants.
              </p>

              <Link to="/events" className="dark-btn">
                Explore Gada Events →
              </Link>
            </div>

            <div className="about-shape">
              <div className="shape-circle"></div>

              <div className="shape-card">
                <span>GADA</span>
                <strong>EVENTS</strong>
                <small>DISCOVER • CONNECT • EXPERIENCE</small>
              </div>
            </div>
          </div>
        </section>
      </main>

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

export default Home
