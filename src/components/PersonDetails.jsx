import { useState, useEffect } from 'react'
import ApiService from '../services/ApiService'

export default function PersonDetails({ personId, onViewChange }) {
  const [person, setPerson] = useState(null)
  const [userRating, setUserRating] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPersonDetails = async () => {
      if (!personId) return
      
      setLoading(true)
      setError(null)

      try {
        // Fetch person data and filmography in parallel
        const [personData, filmography] = await Promise.all([
          ApiService.getNameBasics(personId).catch(() => null),
          ApiService.getPersonFilmography(personId).catch(() => null)
        ])
        
        if (!personData) {
          throw new Error('Person not found')
        }

        // Transform filmography data
        const movies = (filmography?.items || filmography || []).slice(0, 10).map((movie) => ({
          id: movie.tconst,
          tconst: movie.tconst,
          title: movie.primaryTitle || movie.title || 'Unknown Title',
          year: movie.startYear,
          role: movie.category || 'Unknown Role',
          rating: movie.averageRating || 'N/A'
        }))

        setPerson({
          id: personId,
          nconst: personData.nconst || personId,
          name: personData.primaryName || personData.name || 'Unknown Person',
          birthYear: personData.birthYear || 'Unknown',
          deathYear: personData.deathYear || null,
          role: personData.primaryProfession || 'Actor/Actress',
          knownFor: personData.knownForTitles || 'Various works',
          rating: '0.0', // Person ratings may not be available in API
          starringIn: movies,
          isAlive: !personData.deathYear,
          professions: personData.primaryProfession ? 
                      personData.primaryProfession.split(',').map(p => p.trim()) : 
                      ['Actor/Actress']
        })
      } catch (err) {
        console.error('Error fetching person details:', err)
        setError('Failed to load person details')
      } finally {
        setLoading(false)
      }
    }

    fetchPersonDetails()
  }, [personId])

  const handleRatingSubmit = () => {
    if (userRating) {
      alert(`Rating ${userRating} submitted for ${person.name}!`)
      // Here you would typically send the rating to your API
    }
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Person</h4>
          <p>{error || 'Person not found'}</p>
          <button className="btn btn-primary" onClick={() => onViewChange('home')}>
            Go Back to Homepage
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-8">
          {/* Person Info */}
          <h1 className="mb-2">
            {person.name}
            {!person.isAlive && <span className="badge bg-secondary ms-2">Deceased</span>}
          </h1>
          <p className="text-muted mb-4">
            {person.birthYear !== 'Unknown' && (
              <span>
                Born: {person.birthYear}
                {person.deathYear && <span> - Died: {person.deathYear}</span>}
              </span>
            )}
          </p>

          <div className="row mb-4">
            <div className="col-md-6">
              <div className="border p-3">
                <h5>Primary Professions</h5>
                <div>
                  {person.professions.map((profession, index) => (
                    <span key={index} className="badge bg-primary me-1 mb-1">
                      {profession}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border p-3">
                <h5>Known For</h5>
                <p className="small">{person.knownFor}</p>
              </div>
            </div>
          </div>

          {/* Filmography Section */}
          <div className="border p-3">
            <h5 className="mb-3">Filmography:</h5>
            {person.starringIn && person.starringIn.length > 0 ? (
              person.starringIn.map((movie) => (
                <div 
                  key={movie.id}
                  className="border p-3 mb-3 bg-light"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onViewChange('movie-details', { movieId: movie.tconst })}
                >
                  <div className="row align-items-center">
                    <div className="col-md-5">
                      <strong>{movie.title}</strong>
                      {movie.year && <span className="text-muted ms-2">({movie.year})</span>}
                    </div>
                    <div className="col-md-3">
                      <span className="text-primary">Rating: {movie.rating}</span>
                    </div>
                    <div className="col-md-4">
                      <span className="badge bg-info">{movie.role}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted">No filmography data available</div>
            )}
          </div>
        </div>

        {/* Rating Section */}
        <div className="col-md-4">
          <div className="text-center">
            <h3>Rating:</h3>
            <div className="display-4 mb-3">{person.rating}</div>
            
            <div className="border p-3">
              <input 
                type="number" 
                className="form-control mb-2"
                placeholder="Rate this person (1-10)"
                min="1" 
                max="10" 
                step="0.1"
                value={userRating}
                onChange={(e) => setUserRating(e.target.value)}
              />
              <button 
                className="btn btn-primary w-100"
                onClick={handleRatingSubmit}
              >
                Submit Rating
              </button>
            </div>

            {/* Person Photo */}
            <div 
              className="bg-light d-flex align-items-center justify-content-center text-muted border mt-3"
              style={{ height: '200px', width: '100%' }}
            >
              <div className="text-center">
                <i className="bi bi-person fs-1"></i>
                <div>👤</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}