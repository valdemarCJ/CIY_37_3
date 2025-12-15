import { useState } from 'react'
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

  const handleViewChange = (view, data = {}) => {
    setCurrentView(view)
    setViewData(data)
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
