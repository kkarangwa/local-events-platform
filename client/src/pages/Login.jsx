
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

function dashboardForRole(role) {
  if (role === 'organizer') return '/organizer-dashboard'
  if (role === 'participant') return '/participant-dashboard'
  return '/'
}

function Login() {
  const { login, isAuthenticated, user, authReady } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (authReady && isAuthenticated && user) {
    return <Navigate to={dashboardForRole(user.role)} replace />
  }

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))

    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const signedInUser = await login({
        email: formData.email.trim(),
        password: formData.password,
      })

      if (!signedInUser?.role) {
        throw new Error(
          'Your account role could not be verified. Please sign in again.'
        )
      }

      const destination = dashboardForRole(signedInUser.role)

      if (destination === '/') {
        throw new Error('Your account has an unrecognized role.')
      }

      navigate(destination, { replace: true })
    } catch (submitError) {
      setError(
        submitError.message || 'Could not log in. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="gada-login">
      <header className="login-header">
        <Link to="/" className="login-brand">
          <span className="login-brand-icon">G</span>
          <span className="login-brand-copy">
            <strong>Gada</strong>
            <small>EVENTS</small>
          </span>
        </Link>

        <p>
          New to Gada? <Link to="/register">Create an account</Link>
        </p>
      </header>

      <section className="login-layout">
        <div className="login-form-panel">
          <div className="login-intro">
            <span className="login-eyebrow">WELCOME BACK</span>
            <h1>
              Good to see you <span>again.</span>
            </h1>
            <p>
              Sign in to discover what's happening around Kigali and keep
              your event experiences in one place.
            </p>
          </div>

          <form className="gada-login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="login-field">
              <div className="login-password-heading">
                <label htmlFor="login-password">Password</label>
                <span className="login-forgot-note">Forgot password?</span>
              </div>

              <div className="auth-password-wrap">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p
                className="auth-form-message auth-form-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="login-primary-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}{' '}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="login-bottom">
            <span>DON'T HAVE AN ACCOUNT?</span>
            <Link to="/register">Create your Gada account</Link>
          </div>
        </div>

        <aside className="login-visual-panel">
          <div className="login-visual-top">
            <span className="login-visual-tag">
              <span className="login-live-dot" />
              YOUR CITY. YOUR PEOPLE.
            </span>

            <div className="login-headline">
              <span>Discover.</span>
              <span>Connect.</span>
              <span className="login-highlight">Experience.</span>
            </div>

            <p>
              From creative gatherings to business meetups, find the events
              that bring Kigali together.
            </p>
          </div>

          <div className="login-event-preview">
            <div className="login-event-symbol">✳</div>
            <div className="login-event-copy">
              <span>FEATURED EVENT</span>
              <strong>Tech &amp; Innovation Summit</strong>
              <small>Kigali Convention Centre · Kigali</small>
            </div>
            <span className="login-event-arrow">↗</span>
          </div>

          <div className="login-visual-footer">
            <span>MADE FOR THE MOMENTS THAT MATTER</span>
            <span>01 — KGL</span>
          </div>
        </aside>
      </section>

      <footer className="login-footer">
        <span>© 2026 Gada Events</span>
        <Link to="/">Back to home</Link>
      </footer>
    </main>
  )
}

export default Login
