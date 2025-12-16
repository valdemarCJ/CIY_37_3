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

function App() {
  const [currentView, setCurrentView] = useState('home')
  const [viewData, setViewData] = useState({})
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [user, setUser] = useState(null) // null when not logged in

  // URL routing system
  useEffect(() => {
    const updateViewFromURL = () => {
      const hash = window.location.hash.slice(1) // Remove # 
      if (hash) {
        const [view, ...params] = hash.split('/')
        const data = {}
        
        // Parse URL parameters
        if (view === 'movie' && params[0]) {
          data.movieId = params[0]
        } else if (view === 'person' && params[0]) {
          data.personId = params[0]
        } else if (view === 'search' && params[0]) {
          data.query = decodeURIComponent(params[0])
        }
        
        setCurrentView(view)
        setViewData(data)
      }
    }

    // Listen for hash changes
    window.addEventListener('hashchange', updateViewFromURL)
    updateViewFromURL() // Set initial view from URL

    return () => window.removeEventListener('hashchange', updateViewFromURL)
  }, [])

  const handleViewChange = (view, data = {}) => {
    setCurrentView(view)
    setViewData(data)
    
    // Update URL
    let hash = `#${view}`
    if (view === 'movie-details' && data.movieId) {
      hash = `#movie/${data.movieId}`
    } else if (view === 'person' && data.personId) {
      hash = `#person/${data.personId}`
    } else if (view === 'search' && data.query) {
      hash = `#search/${encodeURIComponent(data.query)}`
    } else if (view === 'top-movies') {
      hash = '#top-movies'
    } else if (view === 'top-series') {
      hash = '#top-series'
    } else if (view === 'profile') {
      hash = '#profile'
    } else if (view === 'home') {
      hash = '#home'
    }
    
    window.location.hash = hash
  }

  const handleLogin = (username) => {
    setUser(username)
    setShowLoginModal(false)
  }

  const handleLogout = () => {
    setUser(null)
    setCurrentView('home')
  }

  const renderCurrentView = () => {
    // Map hash-based views back to component views
    const view = currentView === 'movie' ? 'movie-details' : 
                 currentView === 'search' && viewData.query ? 'search' :
                 currentView

    switch (view) {
      case 'home':
        return <Homepage onViewChange={handleViewChange} />
      case 'search':
        return <SearchResults searchQuery={viewData.query} onViewChange={handleViewChange} />
      case 'movie-details':
        return <MovieDetails movieId={viewData.movieId} onViewChange={handleViewChange} />
      case 'profile':
        return <UserProfile user={user} onViewChange={handleViewChange} />
      case 'person':
        return <PersonDetails personId={viewData.personId} onViewChange={handleViewChange} />
      case 'top-movies':
        return <TopMoviesSeriesList isMovies={true} onViewChange={handleViewChange} />
      case 'top-series':
        return <TopMoviesSeriesList isMovies={false} onViewChange={handleViewChange} />
      default:
        return <Homepage onViewChange={handleViewChange} />
    }
  }

  return (
    <div>
      <Navigation 
        currentView={currentView}
        onViewChange={handleViewChange}
        onShowLoginModal={() => setShowLoginModal(true)}
        user={user}
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

export default App
