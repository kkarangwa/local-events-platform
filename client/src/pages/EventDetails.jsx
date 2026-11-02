import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './EventDetails.css'
import { useAuth } from '../auth/AuthContext'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001'

function formatDate(dateValue) {
  if (!dateValue) return 'Date to be announced'

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return dateValue

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(timeValue) {
  if (!timeValue) return 'Time to be announced'

  const match = String(timeValue).match(/^(\d{1,2}):(\d{2})/)
  if (!match) return timeValue

  const hours = Number(match[1])
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? 'PM' : 'AM'}`
}

function getSessionToken() {
  try {
    const storedAuth = JSON.parse(localStorage.getItem('gada_auth') || 'null')
    return storedAuth?.token || ''
  } catch {
    return ''
  }
}

function EventLocationMap({ venue, title }) {
  const searchText = [venue, 'Kigali', 'Rwanda']
    .filter(Boolean)
    .join(', ')

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(searchText)}&z=14&output=embed`
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(searchText)}`

  return (
    <div className="event-map-section">
      <div className="event-map-preview">
        <iframe
          title={`Map showing ${title || 'event'} location`}
          src={mapUrl}
          className="event-real-map"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />

        <div className="event-map-label">
          <span className="event-map-marker">⌖</span>
          <span>
            <strong>{venue || 'Kigali, Rwanda'}</strong>
            <small>Event venue · Kigali, Rwanda</small>
          </span>
        </div>
      </div>

      <p className="event-map-caption">
        Check the venue on the map before heading to the event.
        If the venue name is not recognised precisely, confirm its address
        with the organizer.
      </p>

      <a
        href={directionsUrl}
        target="_blank"
        rel="noreferrer"
        className="event-map-directions"
      >
        Get directions <span aria-hidden="true">↗</span>
      </a>
    </div>
  )
}

function RegistrationModal({ event, formData, onChange, onClose, onSubmit, submitting, error }) {
  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-modal-title"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
        <button
          type="button"
          className="event-modal-close"
          onClick={onClose}
          aria-label="Close registration form"
        >
          ×
        </button>

        <span className="event-modal-icon" aria-hidden="true">✳</span>

        <p className="event-section-eyebrow">CONFIRM YOUR SPOT</p>
        <h2 id="registration-modal-title" className="event-modal-title">
          Register for {event.title}
        </h2>
        <p className="event-modal-subtitle">
          Share your contact details so the organizer can reach you about
          this event.
        </p>

        <form className="event-modal-form" onSubmit={onSubmit}>
          <div className="event-form-field">
            <label htmlFor="register-full-name">Full name</label>
            <input
              id="register-full-name"
              name="full_name"
              value={formData.full_name}
              onChange={onChange}
              maxLength={100}
              placeholder="Your full name"
              required
            />
          </div>

          <div className="event-form-field">
            <label htmlFor="register-email">Email address</label>
            <input
              id="register-email"
              name="email"
              type="email"
              value={formData.email}
              onChange={onChange}
              maxLength={255}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="event-form-field">
            <label htmlFor="register-phone">Phone number</label>
            <input
              id="register-phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={onChange}
              maxLength={20}
              placeholder="e.g. 078 123 4567"
              required
            />
          </div>

          {error && (
            <p className="event-modal-error" role="alert">{error}</p>
          )}

          <div className="event-modal-actions">
            <button
              type="button"
              className="event-modal-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="event-primary-button"
              disabled={submitting}
            >
              {submitting ? 'Registering…' : 'Confirm registration'}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EventDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    let cancelled = false

    async function fetchEvent() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/events/${encodeURIComponent(id)}`,
        )

        const data = await response.json()

        if (!response.ok || data.success === false || !data.event) {
          throw new Error(data.message || 'We could not find this event.')
        }

        if (!cancelled) setEvent(data.event)
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              'Unable to load this event. Please check your connection and try again.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchEvent()

    return () => {
      cancelled = true
    }
  }, [id])

  function openRegistration() {
    if (!user) {
      navigate('/login', {
        state: { from: `/events/${id}` },
      })
      return
    }

    if (user.role === 'organizer') {
      navigate('/organizer-dashboard')
      return
    }

    setRegisterForm({
      full_name: user.name || '',
      email: user.email || '',
      phone: '',
    })
    setRegisterError('')
    setShowRegisterModal(true)
  }

  function closeRegistration() {
    if (registering) return
    setShowRegisterModal(false)
    setRegisterError('')
  }

  function handleRegisterFormChange(changeEvent) {
    const { name, value } = changeEvent.target
    setRegisterForm((previous) => ({ ...previous, [name]: value }))
    setRegisterError('')
  }

  async function submitRegistration(submitEvent) {
    submitEvent.preventDefault()
    setRegisterError('')

    const fullName = registerForm.full_name.trim()
    const email = registerForm.email.trim()
    const phone = registerForm.phone.trim()

    if (!fullName) {
      setRegisterError('Please enter your full name.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRegisterError('Please enter a valid email address.')
      return
    }

    if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) {
      setRegisterError('Please enter a valid phone number.')
      return
    }

    const token = getSessionToken()

    if (!token) {
      navigate('/login', {
        state: { from: `/events/${id}` },
      })
      return
    }

    setRegistering(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/events/${id}/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            email,
            phone,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.')
      }

      setShowRegisterModal(false)
      alert(data.message || 'You have successfully registered for this event!')
      navigate('/participant-dashboard')
    } catch (err) {
      setRegisterError(
        err.message || 'Could not register for this event. Please try again.'
      )
    } finally {
      setRegistering(false)
    }
  }

  if (error || !event) {
    return (
      <main className="event-page">
        <div className="event-state-card">
          <span className="event-state-icon">✦</span>
          <h2>We couldn't load this event</h2>
          <p>{error || 'This event may no longer be available.'}</p>
          <Link className="event-primary-button" to="/events">
            Back to events
          </Link>
        </div>
      </main>
    )
  }

  const organizerName =
    event.organizer_name ||
    event.organizer_company ||
    event.company_name ||
    'Gada Events Organizer'

  const organizerDescription =
    event.company_description ||
    event.organizer_description ||
    'Discover experiences and connect with the Kigali community.'

  const organizerWebsite =
    event.company_website || event.organizer_website || ''

  const organizerEmail =
    event.company_email || event.organizer_email || ''

  const venue = event.venue || 'Kigali, Rwanda'
  const dateText = formatDate(event.event_date)
  const timeText = formatTime(event.start_time)
  const category = event.category || 'Community'

  return (
    <div className="event-page">
      <header className="event-navbar">
        <Link to="/" className="event-brand">
          <span className="event-brand-mark">G</span>
          <span>Gada Events</span>
        </Link>

        <nav className="event-nav-links" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/events" className="event-nav-active">
            Explore Events
          </Link>
          {user ? (
            <Link
              to={
                user.role === 'organizer'
                  ? '/organizer-dashboard'
                  : '/participant-dashboard'
              }
            >
              Dashboard
            </Link>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>

        <Link
          to={user ? '/events' : '/register'}
          className="event-nav-cta"
        >
          {user ? 'Explore more' : 'Join Gada'}
        </Link>
      </header>

      <main>
        <section className="event-hero">
          <div className="event-hero-inner">
            <Link to="/events" className="event-back-link">
              <span aria-hidden="true">←</span> Back to events
            </Link>

            <div className="event-hero-copy">
              <span className="event-category-pill">{category}</span>

              <p className="event-eyebrow">
                YOUR NEXT EXPERIENCE STARTS HERE
              </p>

              <h1>{event.title}</h1>

              <p className="event-hero-description">
                {event.description ||
                  'Discover this experience and connect with people in Kigali.'}
              </p>

              <div className="event-hero-meta">
                <span><span aria-hidden="true">▦</span> {dateText}</span>
                <span><span aria-hidden="true">◷</span> {timeText}</span>
                <span><span aria-hidden="true">⌖</span> {venue}</span>
              </div>

              <button
                type="button"
                className="event-primary-button"
                onClick={openRegistration}
              >
                {user?.role === 'organizer' ? 'Go to dashboard' : 'Get involved'}
                <span aria-hidden="true">↗</span>
              </button>
            </div>

            <div className="event-hero-art" aria-hidden="true">
              <div className="event-art-orbit event-art-orbit-one" />
              <div className="event-art-orbit event-art-orbit-two" />
              <div className="event-art-card">
                <span className="event-art-sparkle">✳</span>
                <span className="event-art-small-label">MAKE IT A MOMENT</span>
                <strong>Meet.<br />Discover.<br />Experience.</strong>
                <span className="event-art-bottom">
                  KIGALI, RWANDA · GADA EVENTS
                </span>
              </div>
              <span className="event-art-dot event-art-dot-one" />
              <span className="event-art-dot event-art-dot-two" />
            </div>
          </div>
        </section>

        <section className="event-details-layout">
          <div className="event-details-main">
            <section className="event-content-card event-about-card">
              <p className="event-section-eyebrow">GET TO KNOW THE EVENT</p>
              <h2>About this event</h2>
              <p className="event-about-description">
                {event.description ||
                  'Join this event to discover new experiences, meet people, and participate in the Kigali community.'}
              </p>

              <div className="event-highlights">
                <article className="event-highlight">
                  <span className="event-highlight-icon">✦</span>
                  <div>
                    <h3>Discover</h3>
                    <p>Explore experiences and events in Kigali.</p>
                  </div>
                </article>

                <article className="event-highlight">
                  <span className="event-highlight-icon">◎</span>
                  <div>
                    <h3>Connect</h3>
                    <p>Meet people who share your interests.</p>
                  </div>
                </article>

                <article className="event-highlight">
                  <span className="event-highlight-icon">↗</span>
                  <div>
                    <h3>Participate</h3>
                    <p>Find opportunities to get involved.</p>
                  </div>
                </article>
              </div>
            </section>

            <section className="event-content-card event-location-card">
              <div className="event-section-heading">
                <div>
                  <p className="event-section-eyebrow">PLAN YOUR VISIT</p>
                  <h2>Location</h2>
                </div>
                <span className="event-location-badge">
                  <span aria-hidden="true">⌖</span> Event venue
                </span>
              </div>

              <div className="event-venue-details">
                <span className="event-venue-icon">⌖</span>
                <div>
                  <h3>{venue}</h3>
                  <p>Kigali, Rwanda</p>
                </div>
              </div>

              <EventLocationMap venue={venue} title={event.title} />
            </section>

            <section className="event-content-card event-organizer-card">
              <p className="event-section-eyebrow">THE PEOPLE BEHIND IT</p>
              <h2>Meet the organizer</h2>

              <div className="event-organizer-info">
                <div className="event-organizer-avatar">
                  {organizerName.charAt(0).toUpperCase()}
                </div>

                <div className="event-organizer-copy">
                  <h3>{organizerName}</h3>
                  <p>{organizerDescription}</p>

                  <div className="event-organizer-links">
                    {organizerEmail && (
                      <a href={`mailto:${organizerEmail}`}>
                        Contact organizer ↗
                      </a>
                    )}

                    {organizerWebsite && (
                      <a
                        href={
                          organizerWebsite.startsWith('http')
                            ? organizerWebsite
                            : `https://${organizerWebsite}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit website ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="event-sidebar">
            <section className="event-booking-card">
              <p className="event-section-eyebrow">MAKE IT HAPPEN</p>
              <h2>Be part of the experience.</h2>
              <p className="event-booking-description">
                Save your spot and get ready for something worth showing up for.
              </p>

              <div className="event-booking-divider" />

              <div className="event-booking-detail">
                <span className="event-booking-icon">▦</span>
                <div><small>DATE</small><strong>{dateText}</strong></div>
              </div>

              <div className="event-booking-detail">
                <span className="event-booking-icon">◷</span>
                <div><small>TIME</small><strong>{timeText}</strong></div>
              </div>

              <div className="event-booking-detail">
                <span className="event-booking-icon">⌖</span>
                <div><small>LOCATION</small><strong>{venue}</strong></div>
              </div>

              {event.capacity != null && (
                <div className="event-booking-detail">
                  <span className="event-booking-icon">♧</span>
                  <div>
                    <small>CAPACITY</small>
                    <strong>{event.capacity} attendees</strong>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="event-primary-button event-booking-button"
                onClick={openRegistration}
              >
                {user?.role === 'organizer' ? 'Go to dashboard' : 'Get involved'}
                <span aria-hidden="true">↗</span>
              </button>

              <p className="event-booking-note">
                <span aria-hidden="true">♡</span> Find your people. Make a moment.
              </p>
            </section>

            <div className="event-sidebar-note">
              <span>✦</span>
              <p>
                Great experiences begin with showing up. Discover more events
                happening around Kigali.
              </p>
              <Link to="/events">Explore more events ↗</Link>
            </div>
          </aside>
        </section>
      </main>

      <footer className="event-footer">
        <Link to="/" className="event-footer-brand">
          <span className="event-brand-mark">G</span>
          <span>Gada Events</span>
        </Link>
        <p>Discover your next experience in Kigali.</p>
        <Link to="/events">Explore events ↗</Link>
      </footer>

      {showRegisterModal && (
        <RegistrationModal
          event={event}
          formData={registerForm}
          onChange={handleRegisterFormChange}
          onClose={closeRegistration}
          onSubmit={submitRegistration}
          submitting={registering}
          error={registerError}
        />
      )}
    </div>
  )
}

export default EventDetails
