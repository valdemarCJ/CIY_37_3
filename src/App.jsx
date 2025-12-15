import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [movies, setMovies] = useState([])
  const [movieDetailsData, setMovieDetailsData] = useState([])
  const [movieDetails, setMovieDetails] = useState({})
  const [movieRatings, setMovieRatings] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showSeriesOnly, setShowSeriesOnly] = useState(false)
  const [activeTab, setActiveTab] = useState('movies')

  const fetchData = (page) => {
    setLoading(true)
    setError(null)
    console.log(`Fetching page ${page} from API...`)
    
    if (activeTab === 'movies') {
      // Fetch movies data
      fetch(`https://localhost:7098/api/Movies?page=${page}&pageSize=10`)
        .then(response => {
          console.log('Movies API response status:', response.status)
          if (!response.ok) {
            throw new Error(`Movies API returned status ${response.status}`)
          }
          return response.json()
        })
        .then(moviesData => {
          console.log('Movies received:', moviesData)
          console.log('Movies count:', moviesData.items?.length || 0)
          
          const allMovies = moviesData.items || []
          
          if (moviesData.total) {
            setTotalPages(Math.ceil(moviesData.total / 10))
          }
          
          setMovies(allMovies)
          setLoading(false)
        })
        .catch(error => {
          console.error('Error fetching movies:', error)
          setError(`Fejl ved hentning af movies: ${error.message}`)
          setLoading(false)
        })
    } else {
      // Fetch movie-details data
      fetch(`https://localhost:7098/api/movie-details?page=${page}&pageSize=10`)
        .then(response => {
          console.log('Movie-details API response status:', response.status)
          if (!response.ok) {
            throw new Error(`Movie-details API returned status ${response.status}`)
          }
          return response.json()
        })
        .then(detailsData => {
          console.log('Movie-details received:', detailsData)
          console.log('Movie-details count:', detailsData.items?.length || 0)
          
          const allDetails = detailsData.items || []
          
          if (detailsData.total) {
            setTotalPages(Math.ceil(detailsData.total / 10))
          }
          
          setMovieDetailsData(allDetails)
          setLoading(false)
        })
        .catch(error => {
          console.error('Error fetching movie-details:', error)
          setError(`Fejl ved hentning af movie-details: ${error.message}`)
          setLoading(false)
        })
    }
  }

  useEffect(() => {
    fetchData(currentPage)
  }, [currentPage, activeTab])

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const getFilteredMovies = () => {
    if (activeTab === 'movies') {
      // For movies tab, show basic movie data
      return movies.filter(movie => {
        if (showSeriesOnly) {
          // Only show movies with poster images
          return movie.poster && movie.poster !== 'N/A' && movie.poster.trim() !== ''
        }
        return true
      })
    } else {
      // For movie-details tab, the data is in movieDetailsData
      return movieDetailsData
    }
  }

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Kunne ikke hente film</h4>
          <p>Error: {error}</p>
          <hr />
          <p className="mb-0">Sørg for at API'et kører på https://localhost:7098</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <h1>Movie Database</h1>
      
      {/* Tab Navigation */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'movies' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('movies')
              setCurrentPage(1)
              setShowSeriesOnly(false)
            }}
          >
            Movies
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${activeTab === 'movie-details' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('movie-details')
              setCurrentPage(1)
              setShowSeriesOnly(false)
            }}
          >
            Movie Details
          </button>
        </li>
      </ul>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      {activeTab === 'movies' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Movies Overview</h2>
            <div className="form-check">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="seriesFilter"
                checked={showSeriesOnly}
                onChange={(e) => setShowSeriesOnly(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="seriesFilter">
                Kun serier med poster
              </label>
            </div>
          </div>

          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Poster</th>
                    <th>Title</th>
                    <th>Original Title</th>
                    <th>Start Year</th>
                    <th>Runtime</th>
                    <th>Genres</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredMovies().map((movie, index) => (
                    <tr key={movie.tconst || index}>
                      <td>
                        {movie.poster ? (
                          <img 
                            src={movie.poster} 
                            alt={movie.primaryTitle}
                            className="img-thumbnail"
                            style={{ width: '50px', height: '75px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div 
                            className="bg-light d-flex align-items-center justify-content-center text-muted"
                            style={{ width: '50px', height: '75px', fontSize: '10px' }}
                          >
                            No Image
                          </div>
                        )}
                      </td>
                      <td>{movie.primaryTitle}</td>
                      <td>{movie.originalTitle}</td>
                      <td>{movie.startYear}</td>
                      <td>{movie.runtimeMinutes ? `${movie.runtimeMinutes} min` : 'N/A'}</td>
                      <td>{movie.genres}</td>
                      <td>
                        <span className={`badge ${movie.titleType === 'movie' ? 'bg-primary' : 'bg-success'}`}>
                          {movie.titleType}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {getFilteredMovies().length === 0 && (
                <div className="text-center text-muted py-4">
                  No movies found matching your criteria.
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'movie-details' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Movie Details</h2>
          </div>

          {loading ? (
            <div className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <>
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Title</th>
                    <th>Original Title</th>
                    <th>Type</th>
                    <th>Season</th>
                    <th>Episode</th>
                    <th>Start Year</th>
                    <th>Runtime</th>
                    <th>Genres</th>
                  </tr>
                </thead>
                <tbody>
                  {movieDetailsData.map((detail, index) => (
                    <tr key={detail.tconst || index}>
                      <td>{detail.primaryTitle}</td>
                      <td>{detail.originalTitle}</td>
                      <td>
                        <span className={`badge ${detail.titleType === 'movie' ? 'bg-primary' : 'bg-success'}`}>
                          {detail.titleType}
                        </span>
                      </td>
                      <td>{detail.seasonNumber || 'N/A'}</td>
                      <td>{detail.episodeNumber || 'N/A'}</td>
                      <td>{detail.startYear}</td>
                      <td>{detail.runtimeMinutes ? `${detail.runtimeMinutes} min` : 'N/A'}</td>
                      <td>{detail.genres}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {movieDetailsData.length === 0 && (
                <div className="text-center text-muted py-4">
                  No movie details found.
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="Page navigation" className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
            </li>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber
              if (totalPages <= 5) {
                pageNumber = i + 1
              } else if (currentPage <= 3) {
                pageNumber = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i
              } else {
                pageNumber = currentPage - 2 + i
              }
              
              return (
                <li key={pageNumber} className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                </li>
              )
            })}
            
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button 
                className="page-link" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  )
}

export default App
