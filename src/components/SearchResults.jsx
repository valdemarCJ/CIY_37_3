import { useState, useEffect } from 'react'
import ApiService from '../services/ApiService'

export default function SearchResults({ searchQuery, onViewChange }) {
  const [filters, setFilters] = useState({
    releaseYear: '',
    ratings: '',
    genre: '',
    language: ''
  })
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchQuery) return
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await ApiService.searchMovies(searchQuery)
        const items = response.items || response || []
        
        // Enrich search results with additional data
        const enrichedResults = await Promise.all(
          items.map(async (item) => {
            const tconst = item.tconst || item.id
            
            try {
              // Fetch additional data in parallel
              const [movieDetails, imdbRating, cast, genres] = await Promise.all([
                ApiService.getMovieDetails(tconst).catch(() => null),
                ApiService.getImdbRating(tconst).catch(() => null),
                ApiService.getMoviePeople(tconst).catch(() => null),
                ApiService.getMovieGenres(tconst).catch(() => null)
              ])

              return {
                id: tconst,
                tconst: tconst,
                title: item.primaryTitle || item.title || 'Unknown Title',
                type: item.titleType || movieDetails?.titleType || 'movie',
                rating: item.averageRating || movieDetails?.averageRating || 'N/A',
                imdbRating: imdbRating?.averageRating || null,
                imdbVotes: imdbRating?.numVotes || null,
                actors: Array.isArray(cast) ? cast.filter(person => person.role === 'actor').slice(0, 3).map(c => c.primaryName || `Actor ${c.nconst}`) : [],
                plot: movieDetails?.plot || item.plot || 'No plot available...',
                poster: item.poster || movieDetails?.poster,
                year: item.startYear || movieDetails?.startYear,
                runtime: movieDetails?.runtimeMinutes,
                genres: genres?.map(g => g.genre) || [],
                adult: movieDetails?.isAdult
              }
            } catch (error) {
              console.error(`Error enriching data for ${tconst}:`, error)
              // Return basic data if enrichment fails
              return {
                id: tconst,
                tconst: tconst,
                title: item.primaryTitle || item.title || 'Unknown Title',
                type: item.titleType || 'movie',
                rating: item.averageRating || 'N/A',
                actors: [],
                plot: item.plot || 'No plot available...',
                poster: item.poster,
                year: item.startYear
              }
            }
          })
        )
        
        setResults(enrichedResults)
      } catch (err) {
        console.error('Error fetching search results:', err)
        setError('Failed to load search results')
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    fetchSearchResults()
  }, [searchQuery])

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
  }

  return (
    <div className="container mt-4">
      {/* Filter Controls */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex gap-2 mb-3">
            <select 
              className="form-select" 
              value={filters.releaseYear}
              onChange={(e) => handleFilterChange('releaseYear', e.target.value)}
              style={{ maxWidth: '150px' }}
            >
              <option value="">Release year ▼</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
            </select>

            <select 
              className="form-select"
              value={filters.ratings}
              onChange={(e) => handleFilterChange('ratings', e.target.value)}
              style={{ maxWidth: '150px' }}
            >
              <option value="">Ratings ▼</option>
              <option value="9+">9.0+</option>
              <option value="8+">8.0+</option>
              <option value="7+">7.0+</option>
            </select>

            <select 
              className="form-select"
              value={filters.genre}
              onChange={(e) => handleFilterChange('genre', e.target.value)}
              style={{ maxWidth: '150px' }}
            >
              <option value="">Genre ▼</option>
              <option value="action">Action</option>
              <option value="drama">Drama</option>
              <option value="comedy">Comedy</option>
            </select>

            <select 
              className="form-select"
              value={filters.language}
              onChange={(e) => handleFilterChange('language', e.target.value)}
              style={{ maxWidth: '150px' }}
            >
              <option value="">Language ▼</option>
              <option value="en">English</option>
              <option value="da">Danish</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="border p-3">
        <h3 className="mb-3">Result list</h3>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {results.length === 0 ? (
              <div className="text-center py-4 text-muted">
                No results found for "{searchQuery}"
              </div>
            ) : (
              results.map((result) => (
                <div 
                  key={result.id}
                  className="border p-3 mb-3 cursor-pointer"
                  onClick={() => onViewChange('movie-details', { movieId: result.tconst || result.id })}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="row">
                    <div className="col-md-3">
                      <strong>{result.title}</strong>
                      <div className="small text-muted">
                        {result.type} • {result.year}
                        {result.runtime && <span> • {result.runtime} min</span>}
                        {result.adult && <span className="badge bg-warning ms-1">Adult</span>}
                      </div>
                      {result.genres && result.genres.length > 0 && (
                        <div className="mt-1">
                          {result.genres.slice(0, 3).map((genre, idx) => (
                            <span key={idx} className="badge bg-secondary me-1 small">
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="col-md-2">
                      <strong>Rating</strong>
                      <div>
                        {result.rating}
                        {result.imdbRating && result.imdbRating !== result.rating && (
                          <div className="small text-success">IMDB: {result.imdbRating}</div>
                        )}
                        {result.imdbVotes && (
                          <div className="small text-muted">({result.imdbVotes} votes)</div>
                        )}
                      </div>
                    </div>
                    <div className="col-2">
                      <strong>Actors</strong>
                      <div className="small text-muted">Click for cast info</div>
                    </div>
                    <div className="col-2">
                      {result.poster ? (
                        <img 
                          src={result.poster} 
                          alt={result.title}
                          className="img-thumbnail"
                          style={{ height: '80px', width: '60px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div 
                          className="bg-light d-flex align-items-center justify-content-center text-muted"
                          style={{ height: '80px', width: '60px' }}
                        >
                          🖼️
                        </div>
                      )}
                    </div>
                    <div className="col-3">
                      <strong>Plot</strong>
                      <div className="small text-muted">{result.plot}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}