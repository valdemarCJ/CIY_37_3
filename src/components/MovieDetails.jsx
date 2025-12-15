import { useState, useEffect } from 'react'
import ApiService from '../services/ApiService'

export default function MovieDetails({ movieId, onViewChange }) {
  const [movie, setMovie] = useState(null)
  const [cast, setCast] = useState([])
  const [userRating, setUserRating] = useState('')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMovieDetails = async () => {
      if (!movieId) return
      
      setLoading(true)
      setError(null)

      try {
        // Fetch comprehensive movie data in parallel
        const [movieData, castData, imdbRating, genres, similarMovies] = await Promise.all([
          ApiService.getMovie(movieId).catch(() => null),
          ApiService.getMoviePeople(movieId).catch(() => null),
          ApiService.getImdbRating(movieId).catch(() => null),
          ApiService.getMovieGenres(movieId).catch(() => null),
          ApiService.getSimilarMovies(movieId).catch(() => null)
        ])

        // Get additional movie details
        let movieDetails = null
        try {
          movieDetails = await ApiService.getMovieDetails(movieId)
        } catch (error) {
          console.error('Error fetching detailed movie info:', error)
        }

        // Transform cast data
        const transformedCast = Array.isArray(castData) ? castData.slice(0, 6).map((person, index) => ({
          id: person.nconst || `person-${index}`,
          nconst: person.nconst,
          name: person.primaryName || person.name || `Person ${person.nconst}`,
          role: person.characters ? person.characters.replace(/[\[\]']/g, '') : person.category || person.role || 'Cast Member'
        })) : []

        // Combine all movie information
        const combinedMovie = movieData || movieDetails || {}
        const detailedInfo = movieDetails || {}

        setMovie({
          id: movieId,
          tconst: combinedMovie.tconst || movieId,
          title: combinedMovie.primaryTitle || combinedMovie.title || detailedInfo.primaryTitle || 'Unknown Movie',
          genres: genres?.map(g => g.genre) || 
                  (combinedMovie.genres ? combinedMovie.genres.split(',').map(g => g.trim()) : ['Unknown']),
          playtime: (combinedMovie.runtimeMinutes || detailedInfo.runtimeMinutes) ? 
                   `${combinedMovie.runtimeMinutes || detailedInfo.runtimeMinutes} min` : 'Unknown',
          type: combinedMovie.titleType || detailedInfo.titleType || 'movie',
          seasons: combinedMovie.titleType === 'tvSeries' ? 1 : null,
          episodes: combinedMovie.titleType === 'tvSeries' ? 10 : null,
          rating: imdbRating?.averageRating || combinedMovie.averageRating || '0.0',
          imdbVotes: imdbRating?.numVotes,
          plot: detailedInfo.plot || combinedMovie.plot || 'No plot description available.',
          poster: combinedMovie.poster || detailedInfo.poster,
          year: combinedMovie.startYear || detailedInfo.startYear,
          adult: combinedMovie.isAdult || detailedInfo.isAdult,
          similarMovies: similarMovies || []
        })
        
        setCast(transformedCast)
      } catch (err) {
        console.error('Error fetching movie details:', err)
        setError('Failed to load movie details')
      } finally {
        setLoading(false)
      }
    }

    fetchMovieDetails()
  }, [movieId])

  const handleRatingSubmit = async () => {
    if (userRating && movie) {
      try {
        await ApiService.rateMovie(movie.tconst || movie.id, parseInt(userRating))
        alert(`Rating ${userRating} submitted!`)
        setUserRating('')
      } catch (error) {
        console.error('Error submitting rating:', error)
        alert('Failed to submit rating. Please try again.')
      }
    }
  }

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    // Here you would typically update the bookmark status in your API
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

  if (error || !movie) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Movie</h4>
          <p>{error || 'Movie not found'}</p>
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
          {/* Movie Info and Poster */}
          <div className="d-flex mb-4">
            <div className="me-3">
              <button 
                className={`btn ${isBookmarked ? 'btn-success' : 'btn-outline-secondary'} mb-2`}
                onClick={toggleBookmark}
              >
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
            </div>
            <div className="flex-grow-1">
              <h1 className="mb-2">
                {movie.title}
                {movie.year && <span className="text-muted ms-2">({movie.year})</span>}
                {movie.adult && <span className="badge bg-warning ms-2">Adult</span>}
              </h1>
              <p className="text-muted mb-2">
                {movie.genres.join(', ')} • {movie.playtime}
                {movie.type && movie.type !== 'movie' && (
                  <span className="badge bg-info ms-2">{movie.type}</span>
                )}
              </p>
              
              {/* Rating Information */}
              <div className="mb-3">
                <span className="h5 text-primary">Rating: {movie.rating}</span>
                {movie.imdbVotes && (
                  <span className="text-muted ms-2">({movie.imdbVotes} votes)</span>
                )}
              </div>
              
              {movie.type === 'series' && (
                <div className="mb-3">
                  <select className="form-select mb-2" style={{ maxWidth: '200px' }}>
                    <option>Choose season ▼</option>
                    {Array.from({ length: movie.seasons }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Season {i + 1}</option>
                    ))}
                  </select>
                  <select className="form-select" style={{ maxWidth: '200px' }}>
                    <option>Choose episode ▼</option>
                    {Array.from({ length: movie.episodes }, (_, i) => (
                      <option key={i + 1} value={i + 1}>Episode {i + 1}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="row">
            {/* Movie Poster */}
            <div className="col-md-4">
              {movie.poster ? (
                <img 
                  src={movie.poster} 
                  alt={movie.title}
                  className="img-fluid border"
                  style={{ maxHeight: '400px', width: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div 
                  className="bg-light d-flex align-items-center justify-content-center text-muted border"
                  style={{ height: '400px' }}
                >
                  <div className="text-center">
                    <i className="bi bi-image fs-1"></i>
                    <div>🖼️</div>
                    <div className="small">No poster available</div>
                  </div>
                </div>
              )}
            </div>

            {/* Movie Details */}
            <div className="col-md-8">
              {/* Plot Section */}
              <div className="border p-3 mb-3" style={{ height: '200px' }}>
                <h5>Plot</h5>
                <p className="small">{movie.plot}</p>
              </div>

              {/* Cast Section */}
              <div className="border p-3 mb-3" style={{ height: '180px', overflowY: 'auto' }}>
                <h5>Cast</h5>
                <div className="row">
                  {cast.length > 0 ? (
                    cast.map((actor) => (
                      <div key={actor.id} className="col-md-6 mb-2">
                        <button 
                          className="btn btn-link p-0 text-start text-decoration-none"
                          onClick={() => onViewChange('person', { personId: actor.nconst || actor.id })}
                        >
                          {actor.name}
                        </button>
                        <div className="small text-muted">{actor.role}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">Cast information not available</div>
                  )}
                </div>
              </div>

              {/* Similar Movies Section */}
              {movie.similarMovies && movie.similarMovies.length > 0 && (
                <div className="border p-3">
                  <h5>Similar Movies</h5>
                  <div className="row">
                    {movie.similarMovies.slice(0, 4).map((similar, index) => (
                      <div key={index} className="col-md-6 mb-2">
                        <button 
                          className="btn btn-link p-0 text-start text-decoration-none small"
                          onClick={() => onViewChange('movie-details', { movieId: similar.tconst || similar.id })}
                        >
                          {similar.title || similar.primaryTitle || `Similar Movie ${index + 1}`}
                          {similar.rating && <span className="text-muted"> ({similar.rating})</span>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rating Section */}
        <div className="col-md-4">
          <div className="text-end mb-3">
            <button className="btn btn-dark">Rate</button>
          </div>
          
          <div className="text-center">
            <h3>Rating:</h3>
            <div className="display-4 mb-3">{movie.rating}</div>
            
            <div className="border p-3">
              <input 
                type="number" 
                className="form-control mb-2"
                placeholder="Your rating (1-10)"
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
          </div>
        </div>
      </div>
    </div>
  )
}