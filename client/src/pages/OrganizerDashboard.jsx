
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Dashboard.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'Technology',
  event_date: '',
  start_time: '09:00',
  venue: '',
  capacity: '100',
}

function getSessionToken() {
  try {
    const session = JSON.parse(localStorage.getItem('gada_auth') || 'null')
    return session?.token || ''
  } catch {
    return ''
  }
}

function formatDate(date) {
  if (!date) return 'Date not set'

  const normalized = String(date).slice(0, 10)
  const parsed = new Date(`${normalized}T12:00:00`)

  if (Number.isNaN(parsed.getTime())) return normalized

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function OrganizerDashboard() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({ ...EMPTY_FORM })

  const [profile, setProfile] = useState({
    company_name: user?.company_name || '',
    company_website: user?.company_website || '',
    company_email: user?.company_email || '',
    company_description: user?.company_description || '',
  })

  const [profileSaving, setProfileSaving] = useState(false)

  const handleSignOut = () => {
    logout()
    navigate('/', { replace: true })
  }

  const request = useCallback(async (path, options = {}) => {
    const token = getSessionToken()

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok || data.success === false) {
      if (response.status === 401) logout()
      throw new Error(data.message || 'The request could not be completed.')
    }

    return data
  }, [logout])

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const data = await request('/api/organizer/events')
      setEvents(Array.isArray(data.events) ? data.events : [])
    } catch (err) {
      setError(err.message || 'Could not load your events.')
    } finally {
      setLoading(false)
    }
  }, [request])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const publishedEvents = events.filter(
    (event) => event.status === 'published'
  )

  const totalRegistrations = events.reduce(
    (total, event) => total + Number(event.registrations || 0),
    0
  )

  function resetEventForm() {
    setFormData({ ...EMPTY_FORM })
    setEditingEventId(null)
    setShowForm(false)
  }

  function handleChange(event) {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
    setMessage('')
    setError('')
  }

  function startEditing(event) {
    setEditingEventId(event.id)
    setFormData({
      title: event.title || '',
      description: event.description || '',
      category: event.category || 'Technology',
      event_date: event.event_date
        ? String(event.event_date).slice(0, 10)
        : '',
      start_time: event.start_time
        ? String(event.start_time).slice(0, 5)
        : '09:00',
      venue: event.venue || '',
      capacity: String(event.capacity ?? ''),
    })

    setShowForm(true)
    setMessage('')
    setError('')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    const capacity = Number(formData.capacity)

    if (!Number.isSafeInteger(capacity) || capacity < 1) {
      setError('Capacity must be a whole number greater than zero.')
      return
    }

    if (!formData.event_date) {
      setError('Please select an event date.')
      return
    }

    setSaving(true)

    try {
      const isEditing = editingEventId !== null

      const data = await request(
        isEditing ? `/api/events/${editingEventId}` : '/api/events',
        {
          method: isEditing ? 'PATCH' : 'POST',
          body: JSON.stringify({
            title: formData.title.trim(),
            description: formData.description.trim(),
            category: formData.category,
            event_date: formData.event_date,
            start_time: formData.start_time,
            venue: formData.venue.trim(),
            capacity,
          }),
        }
      )

      resetEventForm()

      setMessage(
        data.message ||
        (isEditing
          ? 'Event details updated successfully.'
          : 'Your draft was saved to the database.')
      )

      await loadEvents()
    } catch (err) {
      setError(err.message || 'Could not save the event.')
    } finally {
      setSaving(false)
    }
  }

  async function publishEvent(id) {
    setMessage('')
    setError('')

    try {
      await request(`/api/events/${id}/publish`, { method: 'PATCH' })
      setMessage('Event published successfully.')
      await loadEvents()
    } catch (err) {
      setError(err.message || 'Could not publish the event.')
    }
  }

  async function deleteEvent(id) {
    const confirmed = window.confirm(
      'Are you sure you want to permanently remove this event from the database?'
    )

    if (!confirmed) return

    setMessage('')
    setError('')

    try {
      await request(`/api/events/${id}`, { method: 'DELETE' })
      setMessage('Event removed.')
      await loadEvents()
    } catch (err) {
      setError(err.message || 'Could not remove the event.')
    }
  }

  function handleProfileChange(event) {
    const { name, value } = event.target
    setProfile((previous) => ({ ...previous, [name]: value }))
  }

  async function saveProfile(event) {
    event.preventDefault()
    setProfileSaving(true)
    setMessage('')
    setError('')

    try {
      const data = await request('/api/organizer/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      })

      setProfile({
        company_name: data.user.company_name || '',
        company_website: data.user.company_website || '',
        company_email: data.user.company_email || '',
        company_description: data.user.company_description || '',
      })

      setMessage('Your public organizer profile has been saved.')
    } catch (err) {
      setError(err.message || 'Could not save your company profile.')
    } finally {
      setProfileSaving(false)
    }
  }

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
            <span className="dashboard-eyebrow">ORGANIZER SPACE</span>
            <h1>Make it happen, <span>together.</span></h1>
            <p>
              Create events, keep an eye on registrations, and bring
              your community together.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-primary-button"
            onClick={() => {
              if (showForm) {
                resetEventForm()
              } else {
                setEditingEventId(null)
                setFormData({ ...EMPTY_FORM })
                setShowForm(true)
              }

              setMessage('')
              setError('')
            }}
          >
            {showForm ? 'Close form' : '+ Create an event'}
          </button>
        </section>

        {message && (
          <p className="dashboard-feedback" role="status">{message}</p>
        )}

        {error && (
          <p className="dashboard-feedback" role="alert">{error}</p>
        )}

        {showForm && (
          <section className="dashboard-create-panel">
            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-eyebrow">
                  {editingEventId !== null ? 'EDIT LISTING' : 'NEW LISTING'}
                </span>
                <h2>
                  {editingEventId !== null ? 'Edit event details' : 'Create an event'}
                </h2>
                <p>
                  {editingEventId !== null
                    ? 'Update the details below and save your changes.'
                    : 'New events are saved as drafts until you publish them.'}
                </p>
              </div>
            </div>

            <form className="dashboard-event-form" onSubmit={handleSubmit}>
              <div className="dashboard-form-field full-width">
                <label htmlFor="event-title">Event title</label>
                <input
                  id="event-title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  maxLength={200}
                  placeholder="e.g. Kigali Design Meetup"
                  required
                />
              </div>

              <div className="dashboard-form-field">
                <label htmlFor="event-category">Category</label>
                <select
                  id="event-category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option>Technology</option>
                  <option>Business</option>
                  <option>Arts & Culture</option>
                  <option>Education</option>
                  <option>Community</option>
                  <option>Music & Entertainment</option>
                </select>
              </div>

              <div className="dashboard-form-field">
                <label htmlFor="event-date">Event date</label>
                <input
                  id="event-date"
                  name="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dashboard-form-field">
                <label htmlFor="event-time">Start time</label>
                <input
                  id="event-time"
                  name="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dashboard-form-field">
                <label htmlFor="event-capacity">Participant capacity</label>
                <input
                  id="event-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.capacity}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="dashboard-form-field full-width">
                <label htmlFor="event-venue">Venue</label>
                <input
                  id="event-venue"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  maxLength={200}
                  placeholder="Venue name in Kigali"
                  required
                />
              </div>

              <div className="dashboard-form-field full-width">
                <label htmlFor="event-description">Description</label>
                <textarea
                  id="event-description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  maxLength={10000}
                  rows="4"
                  placeholder="Tell participants what the event is about."
                />
              </div>

              <div className="dashboard-form-actions full-width">
                <button
                  type="button"
                  className="dashboard-outline-button"
                  onClick={resetEventForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="dashboard-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving…'
                    : editingEventId !== null
                      ? 'Save changes'
                      : 'Save draft'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="dashboard-stat-grid">
          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon coral">✳</span>
            <div>
              <p>Total events</p>
              <strong>{loading ? '—' : events.length}</strong>
              <small>From your database</small>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon green">↗</span>
            <div>
              <p>Published events</p>
              <strong>{loading ? '—' : publishedEvents.length}</strong>
              <small>Available to the public</small>
            </div>
          </article>

          <article className="dashboard-stat-card">
            <span className="dashboard-stat-icon yellow">◎</span>
            <div>
              <p>Total registrations</p>
              <strong>{loading ? '—' : totalRegistrations}</strong>
              <small>Recorded in the database</small>
            </div>
          </article>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">YOUR LISTINGS</span>
              <h2>Manage your events</h2>
              <p>Review your event details and publication status.</p>
            </div>
          </div>

          {loading ? (
            <p>Loading your events…</p>
          ) : events.length === 0 ? (
            <div className="no-events">
              <h3>You haven't created any events yet.</h3>
              <p>Create your first event to get started.</p>
            </div>
          ) : (
            <div className="dashboard-organizer-list">
              {events.map((event) => {
                const registrationCount = Number(event.registrations || 0)
                const capacity = Number(event.capacity || 0)
                const percentage = capacity > 0
                  ? Math.min((registrationCount / capacity) * 100, 100)
                  : 0

                return (
                  <article className="organizer-event-card" key={event.id}>
                    <div className="organizer-event-top">
                      <span className="dashboard-category">
                        {event.category || 'General'}
                      </span>

                      <span
                        className={`organizer-status ${
                          event.status === 'published' ? 'published' : 'draft'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>

                    <h3>{event.title}</h3>
                    <p className="organizer-event-date">
                      {formatDate(event.event_date)}
                    </p>
                    <p>{event.venue}</p>

                    <div className="organizer-capacity">
                      <div>
                        <span>Registrations</span>
                        <strong>
                          {registrationCount} / {capacity || 'Not set'}
                        </strong>
                      </div>

                      <div className="organizer-progress">
                        <span style={{ width: `${percentage}%` }} />
                      </div>
                    </div>

                    <div className="organizer-event-actions">
                      <button
                        type="button"
                        className="dashboard-outline-button"
                        onClick={() => startEditing(event)}
                      >
                        Edit
                      </button>

                      {event.status === 'draft' && (
                        <button
                          type="button"
                          className="dashboard-primary-button"
                          onClick={() => publishEvent(event.id)}
                        >
                          Publish
                        </button>
                      )}

                      {event.status === 'published' && (
                        <Link
                          to={`/events/${event.id}`}
                          className="dashboard-outline-button"
                        >
                          View event
                        </Link>
                      )}

                      <button
                        type="button"
                        className="dashboard-outline-button"
                        onClick={() => deleteEvent(event.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="dashboard-create-panel">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-eyebrow">ORGANIZER PROFILE</span>
              <h2>Your company details</h2>
              <p>
                These details can appear on public event pages.
                Only enter contact details you want participants to see.
              </p>
            </div>
          </div>

          <form className="dashboard-event-form" onSubmit={saveProfile}>
            <div className="dashboard-form-field full-width">
              <label htmlFor="company-name">Company or organization name</label>
              <input
                id="company-name"
                name="company_name"
                value={profile.company_name}
                onChange={handleProfileChange}
                maxLength={200}
                placeholder="e.g. MININFRA"
              />
            </div>

            <div className="dashboard-form-field">
              <label htmlFor="company-website">Official website</label>
              <input
                id="company-website"
                name="company_website"
                type="url"
                value={profile.company_website}
                onChange={handleProfileChange}
                maxLength={500}
                placeholder="https://example.gov.rw"
              />
            </div>

            <div className="dashboard-form-field">
              <label htmlFor="company-email">Public contact email</label>
              <input
                id="company-email"
                name="company_email"
                type="email"
                value={profile.company_email}
                onChange={handleProfileChange}
                maxLength={255}
                placeholder="events@example.gov.rw"
              />
            </div>

            <div className="dashboard-form-field full-width">
              <label htmlFor="company-description">About the organization</label>
              <textarea
                id="company-description"
                name="company_description"
                value={profile.company_description}
                onChange={handleProfileChange}
                maxLength={5000}
                rows="4"
                placeholder="Describe your company or organization."
              />
            </div>

            <div className="dashboard-form-actions full-width">
              <button
                type="submit"
                className="dashboard-primary-button"
                disabled={profileSaving}
              >
                {profileSaving ? 'Saving…' : 'Save company profile'}
              </button>
            </div>
          </form>
        </section>
      </main>

      <footer className="dashboard-footer">
        <span>© 2026 Gada Events</span>
        <span>Discover. Register. Experience.</span>
      </footer>
    </div>
  )
}

export default OrganizerDashboard
