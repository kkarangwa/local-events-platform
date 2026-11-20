import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Privacy.css'

function DeleteAccount() {
  const { token, logout, apiBaseUrl, user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isOrganizer = user?.role === 'organizer'

  async function handleDelete(event) {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Could not delete the account.')
      }

      logout()
      navigate('/', { replace: true })
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="delete-account" aria-labelledby="delete-account-title">
      <h2 id="delete-account-title">Delete my account</h2>
      <p>
        This permanently removes your account and your event registrations
        {isOrganizer ? ', plus the events you created and their registrations' : ''}.
        It cannot be undone. Read how we handle your data in our{' '}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>

      {!open ? (
        <button
          type="button"
          className="delete-account-button secondary"
          onClick={() => setOpen(true)}
        >
          Delete my account
        </button>
      ) : (
        <form className="delete-account-form" onSubmit={handleDelete}>
          <label htmlFor="delete-password" className="visually-hidden">
            Password
          </label>
          <input
            id="delete-password"
            type="password"
            placeholder="Enter your password to confirm"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="delete-account-button" disabled={busy}>
            {busy ? 'Deleting…' : 'Permanently delete'}
          </button>
          <button
            type="button"
            className="delete-account-button secondary"
            onClick={() => { setOpen(false); setPassword(''); setError('') }}
          >
            Cancel
          </button>
        </form>
      )}

      {error && <p className="delete-account-error" role="alert">{error}</p>}
    </section>
  )
}

export default DeleteAccount
