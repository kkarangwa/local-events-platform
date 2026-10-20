
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Login.css'

function dashboardForRole(role) {
  return role === 'organizer'
    ? '/organizer-dashboard'
    : '/participant-dashboard'
}

function Register() {
  const { register, isAuthenticated, user, authReady } = useAuth()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'participant',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!authReady) {
    return (
      <main className="auth-loading" aria-live="polite">
        <div className="auth-loading-spinner" />
        <p>Preparing your Gada account...</p>
      </main>
    )
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={dashboardForRole(user?.role)}
        replace
      />
    )
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

    const name = formData.name.trim()
    const email = formData.email.trim()

    if (!name) {
      setError('Please enter your full name.')
      return
    }

    if (formData.password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const newUser = await register({
        name,
        email,
        password: formData.password,
        role: formData.role,
      })

      navigate(dashboardForRole(newUser.role), {
        replace: true,
      })
    } catch (submitError) {
      setError(
        submitError.message ||
          'We could not create your account. Please try again.'
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
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </header>

      <section className="login-layout">
        <div className="login-form-panel">
          <div className="login-intro">
            <span className="login-eyebrow">
              JOIN THE COMMUNITY
            </span>

            <h1>
              Your next <span>experience</span> starts here.
            </h1>

            <p>
              Create your Gada account to discover events,
              connect with your community, and make every
              experience count.
            </p>
          </div>

          <form
            className="gada-login-form"
            onSubmit={handleSubmit}
          >
            <div className="login-field">
              <label htmlFor="register-name">
                Full name
              </label>

              <input
                id="register-name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-email">
                Email address
              </label>

              <input
                id="register-email"
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
              <label htmlFor="register-role">
                I want to
              </label>

              <select
                id="register-role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="participant">
                  Discover and attend events
                </option>

                <option value="organizer">
                  Create and manage events
                </option>
              </select>
            </div>

            <div className="login-field">
              <label htmlFor="register-password">
                Password
              </label>

              <div className="auth-password-wrap">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowPassword((shown) => !shown)
                  }
                  aria-label={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="register-confirm-password">
                Confirm password
              </label>

              <div className="auth-password-wrap">
                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={
                    showConfirmPassword ? 'text' : 'password'
                  }
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((shown) => !shown)
                  }
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
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
              {isSubmitting
                ? 'Creating account...'
                : 'Create account'}

              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="login-bottom">
            <span>ALREADY PART OF GADA?</span>
            <Link to="/login">Sign in to your account</Link>
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
              <span className="login-highlight">
                Experience.
              </span>
            </div>

            <p>
              From creative gatherings to business meetups,
              find the events that bring Kigali together.
            </p>
          </div>

          <div className="login-event-preview">
            <div className="login-event-symbol">✳</div>

            <div className="login-event-copy">
              <span>WELCOME TO GADA</span>
              <strong>Your next event awaits.</strong>
              <small>
                Discover · Register · Experience
              </small>
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

export default Register
