
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Dashboard.css'

const API_URL = 'http://localhost:5001'

function formatDate(dateValue) {
  if (!dateValue) return 'Date to be announced'

  const date = new Date(`${String(dateValue).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? 'Date to be announced'
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
}

function formatTime(timeValue) {
  if (!timeValue) return 'Time to be announced'

  const match = String(timeValue).match(/^(\d{2}):(\d{2})/)
  if (!match) return String(timeValue)

  const hours = Number(match[1])
  const minutes = match[2]
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  return `${displayHours}:${minutes} ${period}`
}

function ParticipantDashboard() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  
const loadRegistrations = useCallback(async () => {
  setLoading(true)
  setError('')

  try {
    const storedAuth = localStorage.getItem('gada_auth')
    const auth = storedAuth ? JSON.parse(storedAuth) : null
    const token = auth?.token

    if (!token) {
      setError('Please sign in to view your registrations.')
      setLoading(false)
      return
    }

    const response = await fetch(
      `${API_URL}/api/participant/registrations`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await response.json().catch(() => ({}))

    if (response.status === 401) {
      setError('Your session has expired. Please sign in again.')
      return
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || 'Could not load your registrations.'
      )
    }

    setRegistrations(data.registrations || [])
  } catch (err) {
    setError(
      err instanceof SyntaxError
        ? 'Your saved sign-in information is invalid. Please sign in again.'
        : err.message || 'Could not load your registrations.'
    )
  } finally {
    setLoading(false)
  }
}, [])

  useEffect(() => {
    loadRegistrations()
  }, [loadRegistrations])

  function handleSignOut() {
    logout()
    navigate('/', { replace: true })
  }

  const upcomingRegistrations = registrations.filter((event) => {
    if (!event.event_date) return true

    const date = new Date(`${String(event.event_date).slice(0, 10)}T23:59:59`)
    return !Number.isNaN(date.getTime()) && date >= new Date()
  })

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Link to="/" className="dashboard-brand">
          <span className="dashboard-brand-icon">G</span>
          <span>
            <strong>Gada</strong>
            <small>EVENTS</small>
          </span>
        </Link>

        <nav className="dashboard-nav">
          <Link to="/events">Explore events</Link>
          <Link to="/">Home</Link>
          <button
            type="button"
            className="dashboard-logout"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <span className="dashboard-eyebrow">PARTICIPANT SPACE</span>
            <h1>
              Your events, <span>all in one place.</span>
            </h1>
            <p>
              Keep track of your registrations and discover what's
              happening around Kigali.
            </p>
            {user?.name && <p>Welcome back, {user.name}!</p>}
          </div>

          <Link to="/events" className="dashboard-primary-button">
            Explore events <span aria-hidden="true">→</span>
          </Link>
        </section>

        <section className="dashboard-stat-grid">
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon coral">✳</span>
            <div>
              <p>My registrations</p>
              <strong>{loading ? '…' : registrations.length}</strong>
              <small>Events you've signed up for</small>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon green">◷</span>
            <div>
              <p>Upcoming events</p>
              <strong>{loading ? '…' : upcomingRegistrations.length}</strong>
              <small>Your registered upcoming events</small>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon yellow">⌖</span>
            <div>
              <p>Your location</p>
              <strong>Kigali</strong>
              <small>Discover local experiences</small>
            </div>
          </article>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">YOUR SCHEDULE</span>
              <h2>My registrations</h2>
              <p>Events you're planning to attend.</p>
            </div>

            <Link to="/events" className="dashboard-text-link">
              Find more events →
            </Link>
          </div>

          {loading ? (
            <p>Loading your registrations…</p>
          ) : error ? (
            <div role="alert">
              <p>{error}</p>
              <button type="button" onClick={loadRegistrations}>
                Try again
              </button>
            </div>
          ) : registrations.length === 0 ? (
            <div className="dashboard-empty-state">
              <h3>You haven't registered for any events yet.</h3>
              <p>
                Explore events around Kigali and register for something
                that interests you.
              </p>
              <Link to="/events" className="dashboard-primary-button">
                Explore events →
              </Link>
            </div>
          ) : (
            <div className="dashboard-registration-list">
              {registrations.map((event) => (
                <article
                  className="dashboard-event-card"
                  key={event.registration_id}
                >
                  <div className="dashboard-event-symbol coral">
                    ✳
                  </div>

                  <div className="dashboard-event-details">
                    <span className="dashboard-category">
                      {event.category || 'Event'}
                    </span>
                    <h3>{event.title}</h3>
                    <p>
                      {formatDate(event.event_date)} · {formatTime(event.start_time)}
                    </p>
                    <p>{event.venue}</p>
                  </div>

                  <div className="dashboard-event-actions">
                    <span className="dashboard-status">
                      <span />
                      {event.registration_status || 'Registered'}
                    </span>
                    <Link
                      to={`/events/${event.id}`}
                      className="dashboard-outline-button"
                    >
                      View event
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-discovery-banner">
          <div>
            <span className="dashboard-eyebrow">YOUR NEXT EXPERIENCE</span>
            <h2>There's always something happening in Kigali.</h2>
            <p>
              Discover a gathering, learn something new, or meet your people.
            </p>
          </div>
          <Link to="/events" className="dashboard-light-button">
            Browse events →
          </Link>
        </section>
      </main>

      <footer className="dashboard-footer">
        <span>© 2026 Gada Events</span>
        <span>Discover. Register. Experience.</span>
      </footer>
    </div>
  )
}

export default ParticipantDashboard
