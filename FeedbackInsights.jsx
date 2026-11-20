import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import './Feedback.css'

function formatWhen(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Stars({ value }) {
  return (
    <span className="feedback-star-row" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= Math.round(value) ? 'on' : ''}>★</span>
      ))}
    </span>
  )
}

function InsightList({ title, items, tone }) {
  if (!items?.length) return null
  return (
    <div className={`insight-block ${tone}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}

function FeedbackInsights({ event, onClose }) {
  const { token, apiBaseUrl } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/organizer/events/${event.id}/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.success) throw new Error(body.message || 'Could not load feedback.')
      setData(body)
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [apiBaseUrl, event.id, token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/organizer/events/${event.id}/insights`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.success) throw new Error(body.message || 'Could not summarise feedback.')
      setData((current) => ({ ...current, insights: body.insights }))
    } catch (genError) {
      setError(genError.message)
    } finally {
      setGenerating(false)
    }
  }

  const insights = data?.insights
  const maxCount = Math.max(1, ...(data?.distribution || []).map((d) => d.count))

  return (
    <div className="feedback-backdrop" onClick={onClose}>
      <div
        className="feedback-modal wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insights-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="feedback-close" onClick={onClose} aria-label="Close">×</button>
        <p className="feedback-eyebrow">ATTENDEE FEEDBACK</p>
        <h2 id="insights-title">{event.title}</h2>

        {error && <p className="feedback-error" role="alert">{error}</p>}
        {!data && !error && <p>Loading feedback…</p>}

        {data && data.count === 0 && (
          <p className="feedback-note">
            No feedback yet. Attendees can rate the event from their dashboard once it has taken place.
          </p>
        )}

        {data && data.count > 0 && (
          <>
            <div className="feedback-overview">
              <div className="feedback-score">
                <strong>{data.average}</strong>
                <Stars value={data.average} />
                <span>{data.count} response{data.count === 1 ? '' : 's'}</span>
              </div>
              <div className="feedback-bars">
                {data.distribution.map((d) => (
                  <div key={d.stars} className="feedback-bar">
                    <span>{d.stars}★</span>
                    <div><i style={{ width: `${(d.count / maxCount) * 100}%` }} /></div>
                    <span>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <section className="insights-panel">
              <div className="insights-head">
                <div>
                  <h3>✨ AI insights</h3>
                  <p>A summary of what attendees said, and ideas for your next event.</p>
                </div>
                <button type="button" className="dashboard-primary-button" onClick={generate} disabled={generating}>
                  {generating ? 'Reading feedback…' : insights ? 'Refresh insights' : 'Generate insights'}
                </button>
              </div>

              {insights ? (
                <>
                  <p className="insights-summary">{insights.insights.summary}</p>
                  <div className="insights-grid">
                    <InsightList title="What attendees liked" items={insights.insights.liked} tone="good" />
                    <InsightList title="What to improve" items={insights.insights.improve} tone="fix" />
                    <InsightList title="Ideas for your next event" items={insights.insights.next_ideas} tone="next" />
                  </div>
                  <p className="insights-meta">
                    {insights.source === 'ai' ? 'Summarised by AI' : 'Basic keyword summary (AI not available)'}
                    {' · '}based on {insights.feedback_count} response{insights.feedback_count === 1 ? '' : 's'}
                    {' · '}{formatWhen(insights.generated_at)}
                    {insights.outdated && ' · new feedback has arrived, refresh to include it'}
                  </p>
                </>
              ) : (
                <p className="feedback-note">Click "Generate insights" to summarise the feedback.</p>
              )}
            </section>

            <details className="feedback-raw">
              <summary>Read all {data.count} responses</summary>
              <ul>
                {data.feedback.map((row, i) => (
                  <li key={i}>
                    <Stars value={row.rating} />
                    {row.liked && <p><b>Liked:</b> {row.liked}</p>}
                    {row.improve && <p><b>Could be better:</b> {row.improve}</p>}
                    {row.want_next && <p><b>Wants next:</b> {row.want_next}</p>}
                  </li>
                ))}
              </ul>
            </details>
          </>
        )}
      </div>
    </div>
  )
}

export default FeedbackInsights
