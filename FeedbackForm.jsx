import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import './Feedback.css'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

function FeedbackForm({ event, onClose, onSaved }) {
  const { token, apiBaseUrl } = useAuth()
  const [rating, setRating] = useState(event.feedback_rating || 0)
  const [hover, setHover] = useState(0)
  const [liked, setLiked] = useState(event.feedback_liked || '')
  const [improve, setImprove] = useState(event.feedback_improve || '')
  const [wantNext, setWantNext] = useState(event.feedback_want_next || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!rating) {
      setError('Please choose a star rating.')
      return
    }

    setBusy(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/events/${event.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, liked, improve, want_next: wantNext }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not send your feedback.')
      }

      setDone(data.message)
      onSaved?.({ rating, liked, improve, want_next: wantNext })
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  const shown = hover || rating

  return (
    <div className="feedback-backdrop" onClick={onClose}>
      <div
        className="feedback-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="feedback-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <p className="feedback-eyebrow">HOW WAS IT?</p>
        <h2 id="feedback-title">{event.title}</h2>
        <p className="feedback-note">
          Your feedback goes to the organizer without your name, to help them plan better events.
        </p>

        {done ? (
          <div className="feedback-done">
            <p>{done}</p>
            <button type="button" className="dashboard-primary-button" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <fieldset className="feedback-stars" onMouseLeave={() => setHover(0)}>
              <legend>Your rating</legend>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className={star <= shown ? 'on' : ''}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                  aria-pressed={rating === star}
                >
                  ★
                </button>
              ))}
              <span>{LABELS[shown]}</span>
            </fieldset>

            <label htmlFor="fb-liked">What did you like most?</label>
            <textarea id="fb-liked" maxLength={500} rows={2} value={liked} onChange={(e) => setLiked(e.target.value)} />

            <label htmlFor="fb-improve">What could be better?</label>
            <textarea id="fb-improve" maxLength={500} rows={2} value={improve} onChange={(e) => setImprove(e.target.value)} />

            <label htmlFor="fb-next">What kind of event would you like next?</label>
            <textarea id="fb-next" maxLength={500} rows={2} value={wantNext} onChange={(e) => setWantNext(e.target.value)} />

            {error && <p className="feedback-error" role="alert">{error}</p>}

            <button type="submit" className="dashboard-primary-button feedback-submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default FeedbackForm
