import { useState, useEffect } from 'react'
import ApiService from '../services/ApiService'

export default function SearchResults({ searchQuery, onViewChange }) {
  const [sortBy, setSortBy] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [typeFilter, setTypeFilter] = useState('')
  const [votesFilter, setVotesFilter] = useState('')
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
              const [movieData, movieDetails, imdbRating, cast, genres] = await Promise.all([
                ApiService.getMovie(tconst).catch(() => null),
                ApiService.getMovieDetails(tconst).catch(() => null),
                ApiService.getImdbRating(tconst).catch(() => null),
                ApiService.getMoviePeople(tconst).catch(() => null),
                ApiService.getMovieGenres(tconst).catch(() => null)
              ])

              // Get backend person names for cast
              const castWithBackendNames = Array.isArray(cast) ? 
                await Promise.all(
                  cast.filter(person => person.role === 'actor').slice(0, 3).map(async person => {
                    try {
                      const backendPersonData = await ApiService.getPersonDetails(person.nconst)
                      return backendPersonData?.name || person.primaryName || `Actor ${person.nconst}`
                    } catch (error) {
                      return person.primaryName || `Actor ${person.nconst}`
                    }
                  })
                ) : []

              return {
                id: tconst,
                tconst: tconst,
                title: item.primaryTitle || movieData?.primaryTitle || item.title || 'Unknown Title',
                type: item.titleType || movieData?.titleType || movieDetails?.titleType || 'movie',
                rating: item.averageRating || movieData?.averageRating || movieDetails?.averageRating || 'N/A',
                imdbRating: imdbRating?.averageRating || null,
                imdbVotes: imdbRating?.numVotes || null,
                actors: castWithBackendNames,
                plot: movieDetails?.plot || item.plot || 'No plot available...',
                poster: item.poster || movieDetails?.poster,
                year: movieData?.startYear || item.startYear || movieDetails?.startYear,
                runtime: movieDetails?.runtimeMinutes || movieData?.runtimeMinutes,
                genres: genres?.map(g => g.genre) || [],
                adult: movieDetails?.isAdult || movieData?.isAdult
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

  // Sort and filter results based on selected criteria
  const sortedAndFilteredResults = [...results]
    .filter(result => {
      // Filter by type
      if (typeFilter && !result.type?.toLowerCase().includes(typeFilter.toLowerCase())) {
        return false
      }
      
      // Filter by votes
      if (votesFilter) {
        const votes = parseInt(result.imdbVotes) || 0
        switch (votesFilter) {
          case '1+':
            return votes > 1
          case '1000+':
            return votes > 1000
          case '10000+':
            return votes > 10000
          default:
            return true
        }
      }
      
      return true
    })
    .sort((a, b) => {
      if (!sortBy) return 0
      
      let aValue, bValue
      
      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || ''
          bValue = b.title?.toLowerCase() || ''
          break
        case 'year':
          aValue = parseInt(a.year) || 0
          bValue = parseInt(b.year) || 0
          break
        case 'rating':
          aValue = parseFloat(a.imdbRating) || 0
          bValue = parseFloat(b.imdbRating) || 0
          break
        case 'type':
          aValue = a.type?.toLowerCase() || ''
          bValue = b.type?.toLowerCase() || ''
          break
        default:
          return 0
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

  return (
    <div className="container mt-4">
      {/* Sort and Filter Controls */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex gap-2 mb-3 align-items-center flex-wrap">
            <span className="fw-bold me-2">Sort by:</span>
            
            <select 
              className="form-select" 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ maxWidth: '150px' }}
            >
              <option value="">Default</option>
              <option value="title">Title</option>
              <option value="year">Release Year</option>
              <option value="rating">Rating</option>
              <option value="type">Type</option>
            </select>

            {sortBy && (
              <select 
                className="form-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{ maxWidth: '120px' }}
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            )}
            
            <span className="fw-bold me-2 ms-4">Filter by type:</span>
            
            <select 
              className="form-select" 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ maxWidth: '150px' }}
            >
              <option value="">All types</option>
              <option value="movie">Movie</option>
              <option value="tvSeries">TV Series</option>
              <option value="short">Short</option>
              <option value="tvMovie">TV Movie</option>
              <option value="tvMiniSeries">Mini Series</option>
              <option value="tvSpecial">TV Special</option>
            </select>            
            <span className="fw-bold me-2 ms-4">Filter by votes:</span>
            
            <select 
              className="form-select" 
              value={votesFilter}
              onChange={(e) => setVotesFilter(e.target.value)}
              style={{ maxWidth: '150px' }}
            >
              <option value="">Any amount votes</option>
              <option value="1+">More than 1 vote</option>
              <option value="1000+">More than 1,000 votes</option>
              <option value="10000+">More than 10,000 votes</option>
            </select>          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="border p-3">
        <h3 className="mb-3">Search Results</h3>
        
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
          <div>
            {sortedAndFilteredResults.length === 0 ? (
              <div className="text-center py-4 text-muted">
                No results found for "{searchQuery}"
              </div>
            ) : (
              sortedAndFilteredResults.map((result) => (
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
                        {result.imdbRating ? (
                          <div>{result.imdbRating}</div>
                        ) : (
                          <div className="text-muted">No rating</div>
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