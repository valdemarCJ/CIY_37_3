import { useState, useEffect } from 'react'
import './App.css'

// Import components
import Navigation from './components/Navigation'
import Homepage from './components/Homepage'
import SearchResults from './components/SearchResults'
import MovieDetails from './components/MovieDetails'
import UserProfile from './components/UserProfile'
import PersonDetails from './components/PersonDetails'
import LoginModal from './components/LoginModal'
import TopMoviesSeriesList from './components/TopMoviesSeriesList'
import AuthDebug from './components/AuthDebug'

// Import Auth
import { AuthProvider, useAuth } from './context/AuthContext'

function AppContent() {
  const [currentView, setCurrentView] = useState('home')
  const [viewData, setViewData] = useState({})
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showExpirationWarning, setShowExpirationWarning] = useState(false)
  const [username, setUsername] = useState(null)

  const { isTokenExpired, logout, isAuthenticated } = useAuth()

  // Check if token expired and redirect to login
  useEffect(() => {
    if (isTokenExpired && username) {
      setShowExpirationWarning(true)
      handleLogout()
      setShowLoginModal(true)
    }
  }, [isTokenExpired, username])

  // Listen for unauthorized logout events from API
  useEffect(() => {
    const handleUnauthorized = () => {
      handleLogout()
      setShowLoginModal(true)
    }

    window.addEventListener('auth:logout', handleUnauthorized)
    return () => window.removeEventListener('auth:logout', handleUnauthorized)
  }, [])

  const handleViewChange = (view, data = {}) => {
    setCurrentView(view)
    setViewData(data)
  }

  const handleLogin = (loginUsername) => {
    setUsername(loginUsername)
    setShowLoginModal(false)
    setShowExpirationWarning(false)
  }

  const handleLogout = () => {
    setUsername(null)
    logout()
    setCurrentView('home')
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <Homepage onViewChange={handleViewChange} />
      case 'search':
        return <SearchResults searchQuery={viewData.query} onViewChange={handleViewChange} />
      case 'movie-details':
        return <MovieDetails movieId={viewData.movieId} onViewChange={handleViewChange} />
      case 'user-profile':
        return <UserProfile user={user} onViewChange={handleViewChange} />
      case 'person':
        return <PersonDetails personId={viewData.personId} onViewChange={handleViewChange} />
      case 'top-movies':
        return <TopMoviesSeriesList type="movies" onViewChange={handleViewChange} />
      case 'top-series':
        return <TopMoviesSeriesList type="series" onViewChange={handleViewChange} />
      default:
        return <Homepage onViewChange={handleViewChange} />
    }
  }

  return (
    <div>
      {showExpirationWarning && (
        <div className="alert alert-warning alert-dismissible fade show" role="alert">
          <strong>Session Expired:</strong> Your login session has expired. Please login again.
          <button type="button" className="btn-close" onClick={() => setShowExpirationWarning(false)}></button>
        </div>
      )}

      <AuthDebug />
      
      <Navigation 
        currentView={currentView}
        onViewChange={handleViewChange}
        onShowLoginModal={() => setShowLoginModal(true)}
        user={username}
        onLogout={handleLogout}
      />
      
      {renderCurrentView()}
      
      <LoginModal 
        show={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
