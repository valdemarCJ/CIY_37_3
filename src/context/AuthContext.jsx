import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

// Token expiration time in minutes (refresh before expiry)
const TOKEN_REFRESH_INTERVAL = 5 // minutes before expiration to refresh

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [isTokenExpired, setIsTokenExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  // Initialize token from sessionStorage on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem('authToken')
    const storedExpiresAt = sessionStorage.getItem('authExpiresAt')

    if (storedToken && storedExpiresAt) {
      setToken(storedToken)
      setExpiresAt(storedExpiresAt)
      checkTokenExpiration(storedExpiresAt)
    }
    setLoading(false)
  }, [])

  // Check token expiration periodically and refresh if needed
  useEffect(() => {
    if (!expiresAt) return

    const checkExpiration = () => {
      checkTokenExpiration(expiresAt)
    }

    // Check every 30 seconds for expiration
    const interval = setInterval(checkExpiration, 30000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const checkTokenExpiration = (expDate) => {
    const now = new Date()
    const expiration = new Date(expDate)
    const minutesUntilExpiry = (expiration - now) / (1000 * 60)
    
    if (now >= expiration) {
      // Token expired
      setIsTokenExpired(true)
      logout() // Auto-logout on expiration
    } else if (minutesUntilExpiry <= TOKEN_REFRESH_INTERVAL) {
      // Token expiring soon - show warning but don't logout yet
      console.warn(`Token expiring in ${Math.round(minutesUntilExpiry)} minutes`)
      setIsTokenExpired(false)
    } else {
      setIsTokenExpired(false)
    }
  }

  const login = useCallback(async (username, password) => {
    try {
      const response = await fetch('https://localhost:7098/api/Auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid credentials')
        }
        throw new Error(`Login failed: ${response.status}`)
      }

      const data = await response.json()
      
      // Store token and expiration in sessionStorage (survives refresh, not persistent)
      sessionStorage.setItem('authToken', data.token)
      sessionStorage.setItem('authExpiresAt', data.expiresAt)

      setToken(data.token)
      setExpiresAt(data.expiresAt)
      setIsTokenExpired(false)

      return { success: true, token: data.token }
    } catch (error) {
      const errorMessage = error.message === 'Invalid credentials' 
        ? 'Invalid credentials' 
        : error.message
      return { success: false, error: errorMessage }
    }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('authToken')
    sessionStorage.removeItem('authExpiresAt')
    setToken(null)
    setExpiresAt(null)
    setIsTokenExpired(false)
  }, [])

  // Refresh token logic - can be called manually or automatically
  const refreshToken = useCallback(async () => {
    if (!token) return { success: false, error: 'No token to refresh' }

    try {
      // Try to get new token using current token
      const response = await fetch('https://localhost:7098/api/Auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          logout()
          throw new Error('Token refresh failed - please login again')
        }
        throw new Error(`Refresh failed: ${response.status}`)
      }

      const data = await response.json()
      
      // Update with new token
      sessionStorage.setItem('authToken', data.token)
      sessionStorage.setItem('authExpiresAt', data.expiresAt)

      setToken(data.token)
      setExpiresAt(data.expiresAt)
      setIsTokenExpired(false)

      return { success: true, token: data.token }
    } catch (error) {
      console.error('Token refresh error:', error)
      return { success: false, error: error.message }
    }
  }, [token])

  const isAuthenticated = !!token && !isTokenExpired

  const value = {
    token,
    expiresAt,
    isTokenExpired,
    isAuthenticated,
    loading,
    login,
    logout,
    refreshToken
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
