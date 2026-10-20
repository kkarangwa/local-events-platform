import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '')
const STORAGE_KEY = 'gada_auth'

function readStoredAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { token: '', user: null }
    const parsed = JSON.parse(stored)
    if (!parsed?.token || !parsed?.user) return { token: '', user: null }
    return parsed
  } catch {
    return { token: '', user: null }
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth())
  const [authReady, setAuthReady] = useState(false)

  const saveAuth = useCallback((data) => {
    const next = { token: data.token, user: data.user }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setAuth(next)
    return next.user
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth({ token: '', user: null })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function verifySession() {
      if (!auth.token) {
        setAuthReady(true)
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) {
          if (!cancelled) clearAuth()
        } else if (!cancelled) {
          setAuth((current) => ({ ...current, user: data.user }))
        }
      } catch {
        // Keep the saved session if the API is temporarily unavailable.
        // Protected API requests will still be checked by the server.
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    }

    verifySession()
    return () => { cancelled = true }
  }, [auth.token, clearAuth])

  const requestAuth = useCallback(async (endpoint, payload) => {
    let response
    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      throw new Error(`Cannot reach the Gada API at ${API_BASE_URL}. Start the backend and try again.`)
    }

    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Authentication failed. Please try again.')
    }
    if (!data.token || !data.user) {
      throw new Error('The server response is missing session information. Please check the backend response.')
    }
    saveAuth(data)
    return data.user
  }, [saveAuth])

  const register = useCallback((details) => requestAuth('/api/auth/register', details), [requestAuth])
  const login = useCallback((credentials) => requestAuth('/api/auth/login', credentials), [requestAuth])

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const value = useMemo(() => ({
    user: auth.user,
    token: auth.token,
    isAuthenticated: Boolean(auth.token && auth.user),
    authReady,
    register,
    login,
    logout,
    apiBaseUrl: API_BASE_URL,
  }), [auth, authReady, register, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export { API_BASE_URL }
