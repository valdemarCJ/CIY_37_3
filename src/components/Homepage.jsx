import { useState, useEffect } from 'react'
import ApiService from '../services/ApiService'

export default function Homepage({ onViewChange }) {
  const [topMovies, setTopMovies] = useState([])
  const [featuredContent, setFeaturedContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchHomePageData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Get movies directly using new endpoint
        const moviesResponse = await ApiService.getMoviesOnly(1, 10)
        const movies = moviesResponse.items || moviesResponse || []
        console.log('Homepage - Movies received:', movies.length)
        
        // Enrich movies with additional data (using built-in data from movies API)
        const enrichedMovies = await Promise.all(
          movies.map(async (movie, index) => {
            try {
              // Fetch missing data including plot from MovieDetails
              const [imdbRating, movieGenres, cast, movieDetails] = await Promise.all([
                ApiService.getImdbRating(movie.tconst).catch(() => null),
                ApiService.getMovieGenres(movie.tconst).catch(() => null),
                ApiService.getMoviePeople(movie.tconst).catch(() => null),
                ApiService.getMovieDetails(movie.tconst).catch(() => null)
              ])

              console.log('Cast data for', movie.tconst, ':', cast)

              // Process genres data
              const genresArray = movieGenres?.items || movieGenres || []
              const genresString = genresArray.length > 0 
                ? genresArray.map(g => g.genre || g).join(', ')
                : 'Unknown'

              return {
                id: movie.tconst || movie.id,
                tconst: movie.tconst,
                title: movie.primaryTitle || movie.title || `Movie ${index + 1}`,
                originalTitle: movie.originalTitle,
                rating: imdbRating?.averageRating || movie.averageRating || '0.0',
                originalRating: movie.averageRating,
                imdbRating: imdbRating?.averageRating,
                imdbVotes: imdbRating?.numVotes,
                plot: movieDetails?.plot || 'Plot information not available',
                genres: genresString,
                genresArray: genresArray,
                year: movie.startYear,
                endYear: movie.endYear,
                runtime: movie.runtimeMinutes,
                titleType: movie.titleType,
                cast: Array.isArray(cast) ? cast : [],
                isAdult: movie.isAdult
              }
            } catch (error) {
              console.error(`Error enriching movie ${movie.tconst}:`, error)
              return {
                id: movie.tconst || movie.id,
                tconst: movie.tconst,
                title: movie.primaryTitle || movie.title || `Movie ${index + 1}`,
                rating: movie.averageRating || '0.0'
              }
            }
          })
        )

        setTopMovies(enrichedMovies)

        // Set featured content with ALL enriched data
        if (enrichedMovies.length > 0) {
          const featured = enrichedMovies[0]
          
          // Get additional analytics data for featured movie
          try {
            const [similarMovies, popularActors] = await Promise.all([
              ApiService.getSimilarMovies(featured.tconst).catch(() => null),
              ApiService.getPopularActors(featured.tconst).catch(() => null)
            ])

            // Process cast with backend person names and TMDB images
            console.log('Featured movie cast:', featured.cast)
            const detailedCast = await Promise.all(
              (featured.cast || [])
                .filter(person => person.role === 'actor') // Only actors for featured section
                .slice(0, 4)
                .map(async person => {
                  // Get backend person data and TMDB data for this person
                  let backendPersonData = null
                  let tmdbData = null
                  let personImages = []
                  let tmdbName = null
                  
                  if (person.nconst) {
                    try {
                      // Get backend person data for the name
                      backendPersonData = await ApiService.getPersonDetails(person.nconst)
                      
                      // Get TMDB data for images only
                      tmdbData = await ApiService.getPersonFromTMDB(person.nconst)
                      if (tmdbData && tmdbData.id) {
                        tmdbName = tmdbData.name
                        personImages = await ApiService.getPersonImages(tmdbData.id)
                      }
                    } catch (error) {
                      console.error(`Error fetching data for ${person.nconst}:`, error)
                    }
                  }

                  return {
                    name: backendPersonData?.name || person.primaryName || person.name || `Actor ${person.nconst}`,
                    category: person.category || 'Actor',
                    characters: person.characters ? person.characters.replace(/[\[\]']/g, '') : '',
                    nconst: person.nconst,
                    role: person.role,
                    images: personImages,
                    tmdbData: tmdbData,
                    tmdbName: tmdbName,
                    backendName: backendPersonData?.name
                  }
                })
            )
            
            setFeaturedContent({
              title: featured.title,
              plot: featured.plot || 'Plot information from our top-rated collection.',
              actors: detailedCast.length > 0 ? detailedCast : [{ name: 'Cast information not available', category: '', characters: '' }],
              rating: featured.rating,
              imdbVotes: featured.imdbVotes ? `${featured.imdbVotes} votes` : null,
              genres: featured.genres,
              genresArray: featured.genresArray,
              year: featured.year,
              runtime: featured.runtime ? `${featured.runtime} min` : null,
              titleType: featured.titleType,
              isAdult: featured.isAdult,
              tconst: featured.tconst,
              similarMovies: similarMovies?.items || similarMovies || [],
              popularActors: popularActors?.items || popularActors || []
            })
          } catch (enrichError) {
            console.error('Error fetching additional data for featured movie:', enrichError)
            
            // Fallback with basic enriched data
            const detailedCast = featured.cast
              .slice(0, 4)
              .map(person => ({
                name: person.primaryName || person.name || 'Unknown Actor',
                category: person.category || 'Actor',
                characters: person.characters || '',
                nconst: person.nconst
              }))
            
            setFeaturedContent({
              title: featured.title,
              plot: featured.plot || 'Featured content from our top-rated collection.',
              actors: detailedCast.length > 0 ? detailedCast : [{ name: 'Cast information not available', category: '', characters: '' }],
              rating: featured.rating,
              genres: featured.genres,
              year: featured.year,
              runtime: featured.runtime ? `${featured.runtime} min` : null,
              titleType: featured.titleType,
              tconst: featured.tconst
            })
          }
        }
      } catch (err) {
        console.error('Error fetching homepage data:', err)
        setError('Failed to load data')
        
        // Fallback to some default data
        setTopMovies([
          { id: 1, title: 'Loading...', rating: '0.0' }
        ])
        setFeaturedContent({
          title: 'Featured Content',
          plot: 'Please check your connection.',
          actors: ['Unable to load']
        })
      } finally {
        setLoading(false)
      }
    }

    fetchHomePageData()
  }, [])

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

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Homepage</h4>
          <p>{error}</p>
          <hr />
          <p className="mb-0">Please check if the API server is running on https://localhost:7098</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row">
        {/* Top 10 Rated Movies */}
        <div className="col-md-6">
          <div className="border p-3 h-100">
            <h3 className="mb-3">Top 10 rated movies</h3>
            <div className="border p-2" style={{ height: '300px', overflowY: 'auto' }}>
              <ul className="list-unstyled mb-0">
                {topMovies.map((movie) => (
                  <li 
                    key={movie.id} 
                    className="mb-2 d-flex align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewChange('movie-details', { movieId: movie.tconst || movie.id })}
                  >
                    <span className="me-2">●</span>
                    <span>
                      {movie.title} 
                      {movie.year && <span className="text-muted"> ({movie.year})</span>}
                      {movie.endYear && movie.endYear !== movie.year && (
                        <span className="text-muted">-{movie.endYear}</span>
                      )}
                      {movie.titleType && (
                        <span className={`badge ms-2 small ${
                          movie.titleType === 'movie' ? 'bg-success' : 
                          movie.titleType === 'tvSeries' ? 'bg-primary' : 
                          movie.titleType === 'tvMiniSeries' ? 'bg-warning text-dark' : 
                          movie.titleType === 'tvMovie' ? 'bg-info' :
                          movie.titleType === 'tvSpecial' ? 'bg-secondary' :
                          movie.titleType === 'tvShort' ? 'bg-light text-dark' :
                          movie.titleType === 'tvEpisode' ? 'bg-primary' :
                          movie.titleType === 'short' ? 'bg-light text-dark' :
                          movie.titleType === 'video' ? 'bg-dark' :
                          movie.titleType === 'videoGame' ? 'bg-danger' : 'bg-secondary'
                        }`}>
                          {movie.titleType === 'tvSeries' ? 'TV Series' : 
                           movie.titleType === 'tvMiniSeries' ? 'Mini Series' :
                           movie.titleType === 'tvMovie' ? 'TV Movie' :
                           movie.titleType === 'tvSpecial' ? 'TV Special' :
                           movie.titleType === 'tvShort' ? 'TV Short' :
                           movie.titleType === 'tvEpisode' ? 'TV Episode' :
                           movie.titleType === 'videoGame' ? 'Video Game' :
                           movie.titleType === 'movie' ? 'Movie' :
                           movie.titleType === 'short' ? 'Short' :
                           movie.titleType === 'video' ? 'Video' :
                           movie.titleType}
                        </span>
                      )}
                      {movie.runtime && (
                        <span className="small text-muted"> • {movie.runtime}min</span>
                      )}
                      {movie.isAdult && (
                        <span className="badge bg-danger ms-1 small">18+</span>
                      )}
                      <span className="fw-bold text-primary"> - {movie.rating}</span>
                      {movie.imdbRating && movie.imdbRating !== movie.originalRating && (
                        <span className="small text-success"> (IMDB: {movie.imdbRating})</span>
                      )}
                      {movie.imdbVotes && (
                        <span className="small text-muted"> ({movie.imdbVotes} votes)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Random Featured Movie/Series */}
        <div className="col-md-6">
          <div className="border p-3 h-100">
            <h3 className="mb-3">Featured Movie/Series</h3>
            <div className="row">
              <div className="col-4">
                <div 
                  className="bg-light d-flex align-items-center justify-content-center text-muted border"
                  style={{ height: '200px' }}
                >
                  <div className="text-center">
                    <i className="bi bi-image fs-1"></i>
                    <div>🖼️</div>
                  </div>
                </div>
                {featuredContent?.year && (
                  <div className="text-center mt-2 small text-muted">
                    <strong>Year:</strong> {featuredContent.year}
                  </div>
                )}
              </div>
              <div className="col-8">
                {/* Title and basic info */}
                <div className="mb-3">
                  <h5 className="mb-2">{featuredContent?.title}</h5>
                  
                  {featuredContent?.genres && (
                    <div className="mb-2">
                      <strong className="small">Genres: </strong>
                      <span className="small text-muted">{featuredContent.genres}</span>
                    </div>
                  )}
                  
                  {featuredContent?.rating && (
                    <div className="mb-3">
                      <strong className="small">Rating: </strong>
                      <span className="small text-primary fw-bold">{featuredContent.rating}</span>
                    </div>
                  )}

                  {/* Plot */}
                  <div className="mb-3">
                    <h6>Plot</h6>
                    <p className="small text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                      {featuredContent?.plot}
                    </p>
                  </div>
                </div>

                {/* Cast */}
                <div>
                  <h6>Cast</h6>
                  <div className="small">
                    {featuredContent?.actors && featuredContent.actors.length > 0 ? (
                      featuredContent.actors.map((actor, index) => (
                        <div key={index} className="d-flex align-items-center mb-2">
                          {/* Actor Image */}
                          <div className="me-2" style={{ width: '40px', height: '40px' }}>
                            {actor.images && actor.images.length > 0 ? (
                              <img 
                                src={`https://image.tmdb.org/t/p/w185${actor.images[0].file_path}`}
                                alt={actor.backendName || actor.name}
                                className="rounded"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div 
                                className="d-flex align-items-center justify-content-center bg-light rounded"
                                style={{ width: '40px', height: '40px' }}
                              >
                                <i className="bi bi-person text-muted small"></i>
                              </div>
                            )}
                          </div>
                          {/* Actor Info */}
                          <div>
                            <div>
                              <strong>{actor.backendName || actor.name}</strong>
                              {actor.category && actor.category !== 'Actor' && (
                                <span className="text-info"> ({actor.category})</span>
                              )}
                            </div>
                            {actor.characters && (
                              <div className="small text-muted" style={{ fontSize: '0.75rem' }}>
                                as {actor.characters}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-muted">Cast information not available</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}