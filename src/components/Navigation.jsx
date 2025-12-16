import { useState } from 'react'

export default function Navigation({ currentView, onViewChange, onShowLoginModal, user, onLogout }) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onViewChange('search', { query: searchQuery })
    }
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom">
      <div className="container-fluid">
        {/* Logo/Home Button */}
        <button 
          className="navbar-brand btn btn-link text-decoration-none p-0"
          onClick={() => onViewChange('home')}
          style={{ border: 'none', background: 'none', fontSize: '1.25rem', fontWeight: 'bold' }}
        >
          Logo
        </button>

        {/* Search Bar */}
        <form className="d-flex mx-4" onSubmit={handleSearch} style={{ flex: 1, maxWidth: '400px' }}>
          <input 
            className="form-control" 
            type="search" 
            placeholder="Searchbar" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: '2px solid #000' }}
          />
        </form>

        {/* Navigation Links */}
        <div className="d-flex align-items-center gap-3">
          <button 
            className="btn btn-link text-decoration-none text-dark"
            onClick={() => onViewChange('top-movies')}
          >
            Top movies
          </button>
          <button 
            className="btn btn-link text-decoration-none text-dark"
            onClick={() => onViewChange('top-series')}
          >
            Top series
          </button>
          <button 
            className="btn btn-link text-decoration-none text-dark"
            onClick={() => onViewChange('user-profile')}
          >
            User page
          </button>
          {user ? (
            <div className="d-flex align-items-center gap-2">
              <span className="text-dark" style={{ fontSize: '0.9rem' }}>
                Welcome, <strong>{user}</strong>
              </span>
              <button 
                className="btn btn-outline-dark px-3"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              className="btn btn-dark px-3"
              onClick={onShowLoginModal}
            >
              Login/ signup
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}