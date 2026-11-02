import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const AUDIENCE_TAGS = [
  'Students',
  'Entrepreneurs',
  'Tech Professionals',
  'Government & NGO',
  'General Public',
  'Women',
  'Youth (18-25)',
  'Business Leaders',
  'Artists & Creatives',
  'Researchers & Academics',
]
const AGE_RANGES = ['18-25', '26-35', '36-45', '46+']
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Professional']

function getSessionToken() {
  try {
    const session = JSON.parse(localStorage.getItem('gada_auth') || 'null')
    return session?.token || ''
  } catch {
    return ''
  }
}

function formatDate(value) {
  if (!value) return 'Date to be announced'

  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? 'Date to be announced'
    : date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}

function matchLabel(score) {
  if (score >= 75) return { text: 'Great match', level: '' }
  if (score >= 50) return { text: 'Good match', level: 'medium' }
  return { text: 'Might interest you', level: 'low' }
}

function RecommendedEvents() {
  const [recommendations, setRecommendations] = useState([])
  const [profile, setProfile] = useState({
    interests: [],
    age_range: '',
    experience_level: '',
  })
  const [profileComplete, setProfileComplete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/recommendations`, {
        headers: { Authorization: `Bearer ${getSessionToken()}` },
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not load recommendations.')
      }

      setProfile(data.profile)
      setProfileComplete(data.profile_complete)
      setRecommendations(data.recommendations || [])
    } catch (err) {
      setError(err.message || 'Could not load recommendations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function toggleInterest(tag) {
    setProfile((previous) => ({
      ...previous,
      interests: previous.interests.includes(tag)
        ? previous.interests.filter((item) => item !== tag)
        : [...previous.interests, tag],
    }))
    setError('')
  }

  function handleSelect(event) {
    const { name, value } = event.target
    setProfile((previous) => ({ ...previous, [name]: value }))
    setError('')
  }

  async function saveProfile(event) {
    event.preventDefault()

    if (profile.interests.length === 0 || !profile.age_range || !profile.experience_level) {
      setError('Please answer all three questions.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/participant/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getSessionToken()}`,
        },
        body: JSON.stringify(profile),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not save your answers.')
      }

      setEditing(false)
      await load()
    } catch (err) {
      setError(err.message || 'Could not save your answers.')
    } finally {
      setSaving(false)
    }
  }

  const showForm = !loading && (!profileComplete || editing)

  return (
    <section className="dashboard-section">
      <div className="dashboard-section-heading">
        <div>
          <span className="dashboard-eyebrow">MADE FOR YOU</span>
          <h2>Recommended for you</h2>
          <p>Events that fit your interests, age and experience.</p>
        </div>

        {profileComplete && !editing && (
          <button
            type="button"
            className="dashboard-outline-button"
            onClick={() => setEditing(true)}
          >
            Edit my answers
          </button>
        )}
      </div>

      {error && (
        <p className="dashboard-feedback" role="alert">{error}</p>
      )}

      {loading && <p>Finding events for you…</p>}

      {showForm && (
        <div className="dashboard-create-panel">
          <form className="dashboard-event-form" onSubmit={saveProfile}>
            <div className="dashboard-form-field full-width">
              <label>1. What are you interested in?</label>
              <div className="audience-chip-group">
                {AUDIENCE_TAGS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    className={`audience-chip ${
                      profile.interests.includes(tag) ? 'selected' : ''
                    }`}
                    onClick={() => toggleInterest(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="dashboard-form-field">
              <label htmlFor="profile-age">2. Your age range</label>
              <select
                id="profile-age"
                name="age_range"
                value={profile.age_range}
                onChange={handleSelect}
              >
                <option value="">Select…</option>
                {AGE_RANGES.map((range) => (
                  <option key={range}>{range}</option>
                ))}
              </select>
            </div>

            <div className="dashboard-form-field">
              <label htmlFor="profile-level">3. Your experience level</label>
              <select
                id="profile-level"
                name="experience_level"
                value={profile.experience_level}
                onChange={handleSelect}
              >
                <option value="">Select…</option>
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </div>

            <div className="dashboard-form-actions full-width">
              {profileComplete && (
                <button
                  type="button"
                  className="dashboard-outline-button"
                  onClick={() => {
                    setEditing(false)
                    load()
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="dashboard-primary-button"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Show me events'}
              </button>
            </div>
          </form>
        </div>
      )}

      {!loading && profileComplete && !editing && (
        recommendations.length === 0 ? (
          <div className="dashboard-empty-state">
            <h3>No upcoming events to recommend right now.</h3>
            <p>Check back soon, or browse everything that is open.</p>
            <Link to="/events" className="dashboard-primary-button">
              Explore events →
            </Link>
          </div>
        ) : (
          <div className="dashboard-registration-list">
            {recommendations.map((event) => {
              const label = matchLabel(event.match_score)

              return (
                <article className="dashboard-event-card" key={event.id}>
                  <div className="dashboard-event-symbol green">✦</div>

                  <div className="dashboard-event-details">
                    <span className="dashboard-category">
                      {event.category || 'Event'}
                    </span>
                    <h3>{event.title}</h3>
                    <p>{formatDate(event.event_date)} · {event.venue}</p>
                    <p className="recommended-price">
                      {event.price_type === 'paid'
                        ? `${event.currency || 'RWF'} ${event.price}`
                        : 'Free'}
                    </p>
                  </div>

                  <div className="dashboard-event-actions">
                    <span className={`match-badge ${label.level}`}>
                      {event.match_score}% · {label.text}
                    </span>
                    <Link
                      to={`/events/${event.id}`}
                      className="dashboard-outline-button"
                    >
                      View event
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )
      )}
    </section>
  )
}

export default RecommendedEvents
