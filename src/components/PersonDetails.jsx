import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import ApiService from '../services/ApiService'

export default function PersonDetails({ personId, onViewChange }) {
  const { isAuthenticated } = useAuth()
  const [person, setPerson] = useState(null)
  const [userRating, setUserRating] = useState('')
  const [existingRating, setExistingRating] = useState(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null) // Get user ID from token

  useEffect(() => {
    const fetchPersonDetails = async () => {
      if (!personId) return
      
      setLoading(true)
      setError(null)

      try {
        console.log('Fetching person data for:', personId)
        
        // Extract user ID from token if authenticated
        if (isAuthenticated) {
          const token = sessionStorage.getItem('authToken')
          if (token) {
            try {
              const payload = token.split('.')[1]
              const decoded = JSON.parse(atob(payload))
              setUserId(decoded.sub)
            } catch (err) {
              console.warn('Could not extract user ID from token:', err)
            }
          }
        }
        
        // Check if user already rated this person (if authenticated)
        if (isAuthenticated) {
          try {
            // Get current authenticated user's person rating history
            const userPersonRatingsResponse = await ApiService.getMyPersonRatingHistory(1, 100)
            console.log('Person rating history response:', userPersonRatingsResponse)
            if (userPersonRatingsResponse && userPersonRatingsResponse.items) {
              const personNconst = personId
              const existingRate = userPersonRatingsResponse.items.find(r => {
                return r.nconst === personNconst || r.nconst === `nm${personNconst}`
              })
              if (existingRate) {
                setExistingRating(existingRate.value)
              }
            }
          } catch (err) {
            console.warn('Could not fetch user person rating history:', err)
          }
        }
        
        // Fetch both backend person data and TMDB data in parallel
        const [personData, tmdbPersonData] = await Promise.all([
          ApiService.getPersonDetails(personId).catch(err => {
            console.error('Error fetching backend person data:', err)
            return null
          }),
          ApiService.getPersonFromTMDB(personId).catch(err => {
            console.error('Error fetching TMDB data:', err)
            return null
          })
        ])
        
        console.log('Backend person data received:', personData)
        console.log('TMDB data received:', tmdbPersonData)
        
        if (!personData && !tmdbPersonData) {
          throw new Error('Person not found')
        }

        // Get person images from TMDB if available
        let personImages = []
        let tmdbName = null
        if (tmdbPersonData && tmdbPersonData.id) {
          console.log('TMDB Person found:', tmdbPersonData)
          tmdbName = tmdbPersonData.name
          console.log('TMDB Name:', tmdbName)
          try {
            personImages = await ApiService.getPersonImages(tmdbPersonData.id)
            console.log('TMDB Images fetched:', personImages.length, 'images')
            if (personImages.length > 0) {
              console.log('First image:', personImages[0])
            }
          } catch (error) {
            console.error('Error fetching person images:', error)
          }
        }

        // Get person's movies from backend
        let backendMovies = []
        try {
          const personMoviesResponse = await ApiService.getPersonMovies(personId)
          console.log('Person movies received:', personMoviesResponse)
          
          if (personMoviesResponse && personMoviesResponse.length > 0) {
            // Get details for each movie and filter out those that can't be found
            const moviePromises = personMoviesResponse.slice(0, 6).map(async (tconst) => {
              try {
                const [movieData, imdbRating, movieDetails] = await Promise.all([
                  ApiService.getMovie(tconst).catch(() => null),
                  ApiService.getImdbRating(tconst).catch(() => null),
                  ApiService.getMovieDetails(tconst).catch(() => null)
                ])
                
                // Only return movie if we have some data for it
                if (movieData || movieDetails || imdbRating) {
                  return {
                    id: tconst,
                    tconst: tconst,
                    title: movieData?.primaryTitle || movieData?.title || movieDetails?.title || `Movie ${tconst}`,
                    year: movieData?.startYear || movieDetails?.startYear || 'Unknown',
                    rating: imdbRating?.averageRating || movieData?.averageRating || movieDetails?.averageRating || 'N/A',
                    poster: movieDetails?.poster || movieData?.poster || null
                  }
                } else {
                  console.log(`No data found for movie ${tconst} - skipping`)
                  return null // Return null for movies that can't be found
                }
              } catch (error) {
                console.error(`Error fetching movie details for ${tconst}:`, error)
                return null // Return null for movies with errors
              }
            })
            
            // Wait for all promises and filter out null values
            const movieResults = await Promise.all(moviePromises)
            backendMovies = movieResults.filter(movie => movie !== null)
          }
        } catch (error) {
          console.error('Error fetching person movies:', error)
        }

        setPerson({
          id: personId,
          nconst: personId,
          name: personData?.name || 'Unknown Person',
          birthYear: personData?.birthYear || 'Unknown',
          deathYear: personData?.deathYear || null,
          role: personData?.primaryProfession || 'Unknown',
          knownFor: backendMovies.length > 0 ? 
            backendMovies.slice(0, 3).map(movie => movie.title).join(', ') : 
            'Information from backend database',
          rating: personData?.nameRating ? personData.nameRating.toFixed(1) : '0.0',
          starringIn: backendMovies,
          isAlive: !personData?.deathYear || personData?.deathYear === '',
          professions: personData?.primaryProfession ? 
                      personData.primaryProfession.split(',').map(prof => prof.trim()) : 
                      ['Unknown'],
          images: personImages,
          backendName: personData?.name // Only store backend name
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

  // Check bookmark status separately
  useEffect(() => {
    const fetchBookmarkStatus = async () => {
      if (!userId || !personId || !isAuthenticated) {
        setIsBookmarked(false)
        return
      }

      try {
        const bookmarks = await ApiService.getUserPersonBookmarks(userId, 1, 100)
        if (bookmarks && bookmarks.items) {
          const isCurrentlyBookmarked = bookmarks.items.some(bookmark => 
            bookmark.nconst === personId || bookmark.nconst === `nm${personId}`
          )
          setIsBookmarked(isCurrentlyBookmarked)
        } else {
          setIsBookmarked(false)
        }
      } catch (err) {
        console.error('Error fetching person bookmarks:', err)
        setIsBookmarked(false)
      }
    }

    fetchBookmarkStatus()
  }, [userId, personId, isAuthenticated])

  const handleRatingSubmit = async () => {
    if (!isAuthenticated) {
      alert('Please log in to rate people')
      return
    }

    if (existingRating !== null) {
      alert('You have already rated this person')
      return
    }

    if (!userRating || !person) {
      alert('Please select a rating')
      return
    }

    try {
      const ratingValue = parseInt(userRating)
      await ApiService.ratePerson(person.nconst, ratingValue)
      
      // Success - update UI
      setExistingRating(ratingValue)
      setUserRating('')
      alert(`Rating ${ratingValue} submitted!`)
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert('Failed to submit rating. You may have already rated this person.')
    }
  }

  const togglePersonBookmark = async () => {
    if (!isAuthenticated) {
      alert('Please log in to bookmark people')
      return
    }

    if (!userId) {
      alert('User not found')
      return
    }

    try {
      if (isBookmarked) {
        await ApiService.removePersonBookmark(userId, personId)
        setIsBookmarked(false)
        alert('Person removed from bookmarks')
      } else {
        await ApiService.addPersonBookmark(userId, personId, '')
        setIsBookmarked(true)
        alert('Person added to bookmarks')
      }
    } catch (error) {
      console.error('Error toggling person bookmark:', error)
      alert('Failed to update bookmark')
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
        <div className="col-md-4">
          {/* Person Image */}
          <div className="mb-4">
            {person.images && person.images.length > 0 ? (
              <img 
                src={`https://image.tmdb.org/t/p/w500${person.images[0].file_path}`}
                alt={person.backendName || person.name}
                className="img-fluid rounded shadow"
                style={{ maxHeight: '500px', width: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center bg-light rounded shadow" style={{ height: '300px' }}>
                <i className="bi bi-person-circle text-muted" style={{ fontSize: '5rem' }}></i>
              </div>
            )}
          </div>
        </div>
        <div className="col-md-8">
          {/* Person Info */}
          <h1 className="mb-2">
            {person.backendName || person.name}
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

          {/* Rating Section */}
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="border p-3">
                <h5>Rating</h5>
                <div className="fs-4 text-primary fw-bold mb-3">{person.rating || '0.0'}</div>
                
                {isAuthenticated ? (
                  existingRating !== null ? (
                    <div className="alert alert-success small mb-0">
                      ✓ You rated: <strong>{existingRating}</strong>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="personRatingInput" className="form-label mb-2">Your Rating (1-10)</label>
                      <div className="d-flex gap-2">
                        <input
                          id="personRatingInput"
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="0-10"
                          min="1"
                          max="10"
                          step="0.1"
                          value={userRating}
                          onChange={(e) => setUserRating(e.target.value)}
                        />
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={handleRatingSubmit}
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="alert alert-warning small mb-0">
                    ⚠ Please log in to rate
                  </div>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <div className="border p-3">
                <h5>Actions</h5>
                {isAuthenticated ? (
                  <button 
                    className={`btn w-100 ${isBookmarked ? 'btn-warning' : 'btn-outline-warning'}`}
                    onClick={togglePersonBookmark}
                  >
                    <i className={`bi ${isBookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'} me-2`}></i>
                    {isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
                  </button>
                ) : (
                  <div className="alert alert-warning small mb-0">
                    ⚠ Please log in to bookmark
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-md-12">
              <div className="border p-3">
                <h5>Known For</h5>
                <div className="small">
                  {person.starringIn && person.starringIn.length > 0 ? (
                    <div>
                      <strong>Top rated movie/series:</strong>
                      <div className="mt-2">
                        {person.starringIn
                          .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
                          .slice(0, 3)
                          .map((movie, index) => (
                            <div key={movie.id} className="mb-1">
                              <button 
                                className="btn btn-link p-0 text-start text-decoration-none small fw-bold"
                                onClick={() => onViewChange('movie-details', { movieId: movie.tconst })}
                              >
                                {movie.title}
                              </button>
                              <span className="text-muted ms-1">({movie.year}) - {movie.rating}</span>
                            </div>
                          ))
                        }
                      </div>
                      
                      {/* Movie posters */}
                      <div className="mt-3">
                        <div className="row">
                          {person.starringIn.slice(0, 6).map((movie) => (
                            <div key={movie.id} className="col-4 col-md-4 mb-2">
                              <div 
                                className="movie-poster-small"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onViewChange('movie-details', { movieId: movie.tconst })}
                              >
                                {movie.poster ? (
                                  <img 
                                    src={movie.poster}
                                    alt={movie.title}
                                    className="img-fluid rounded"
                                    style={{ height: '80px', width: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div className="bg-light d-flex align-items-center justify-content-center rounded" 
                                       style={{ height: '80px' }}>
                                    <i className="bi bi-film text-muted"></i>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="small">{person.knownFor}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}