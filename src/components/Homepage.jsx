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
        // Get movies from multiple pages since we can use pageSize up to 200
        const allRatings = []
        const featuredCandidates = []
        const maxPages = 3 // Get 600 movies (3 pages × 200 = 600)
        
        console.log(`Fetching ${maxPages} pages of ratings (200 per page)...`)
        for (let page = 1; page <= maxPages; page++) {
          try {
            const ratingsResponse = await ApiService.getImdbRatings(page, 200)
            const pageRatings = ratingsResponse.items || ratingsResponse || []
            allRatings.push(...pageRatings)
            
            // Collect 10k+ vote candidates as we go
            const pageCandidates = pageRatings.filter(rating => (rating.numVotes || 0) >= 10000)
            featuredCandidates.push(...pageCandidates)
            
            console.log(`Fetched page ${page}, total ratings: ${allRatings.length}, featured candidates: ${featuredCandidates.length}`)
            
            // Small delay between pages
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            console.error(`Error fetching page ${page}:`, error)
            break
          }
        }
        
        console.log('Homepage - Total IMDB Ratings received:', allRatings.length)
        console.log('Homepage - Featured candidates (10k+ votes):', featuredCandidates.length)
        
        // Take top rated movies for main list (first 100 sorted by rating)
        const topRatedMovies = allRatings
          .filter(rating => (rating.numVotes || 0) >= 10000) // At least 1k votes
          .sort((a, b) => parseFloat(b.averageRating || 0) - parseFloat(a.averageRating || 0))
          .slice(0, 100) // Take top 100 for processing
        
        console.log('Homepage - Top rated movies for processing:', topRatedMovies.length)
        
        // Enrich with movie details and additional data (smaller batches to avoid server overload)
        const batchSize = 5  // Reduced batch size
        const enrichedMovies = []
        
        for (let i = 0; i < topRatedMovies.length; i += batchSize) {
          const batch = topRatedMovies.slice(i, i + batchSize)
          console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(topRatedMovies.length/batchSize)}`)
          
          const batchResults = await Promise.all(
            batch.map(async (rating, index) => {
              try {
                const tconst = rating.tconst
                
                // First check if the movie exists
                const movieData = await ApiService.getMovie(tconst).catch(() => null)
                
                // If movie doesn't exist in main table, skip additional calls
                if (!movieData) {
                  console.log(`Movie ${tconst} not found in main table, skipping additional calls`)
                  return {
                    id: tconst,
                    tconst: tconst,
                    title: `Movie ${i + index + 1}`,
                    rating: rating.averageRating || '0.0',
                    imdbRating: rating.averageRating,
                    imdbVotes: rating.numVotes || 0,
                    plot: 'Movie information not available',
                    poster: null,
                    genres: 'Unknown',
                    genresArray: [],
                    year: null,
                    titleType: null,
                    cast: []
                  }
                }
                
                // If movie exists, fetch additional data sequentially to reduce server load
                let movieGenres = null
                let cast = null
                let movieDetails = null
                
                try {
                  movieGenres = await ApiService.getMovieGenres(tconst)
                } catch (err) {
                  console.log(`Genres not available for ${tconst}`)
                }
                
                try {
                  cast = await ApiService.getMoviePeople(tconst)
                } catch (err) {
                  console.log(`Cast not available for ${tconst}`)
                }
                
                try {
                  movieDetails = await ApiService.getMovieDetails(tconst)
                } catch (err) {
                  console.log(`Details not available for ${tconst}`)
                }

                console.log('Cast data for', tconst, ':', cast)

                // Process genres data
                const genresArray = movieGenres?.items || movieGenres || []
                const genresString = genresArray.length > 0 
                  ? genresArray.map(g => g.genre || g).join(', ')
                  : 'Unknown'

                return {
                  id: tconst,
                  tconst: tconst,
                  title: movieData.primaryTitle || movieData.title || `Movie ${i + index + 1}`,
                  originalTitle: movieData.originalTitle,
                  rating: rating.averageRating || '0.0',
                  originalRating: movieData.averageRating,
                  imdbRating: rating.averageRating,
                  imdbVotes: rating.numVotes || 0,
                  plot: movieDetails?.plot || 'Plot information not available',
                  poster: movieDetails?.poster || movieData.poster || null,
                  genres: genresString,
                  genresArray: genresArray,
                  year: movieData.startYear,
                  endYear: movieData.endYear,
                  runtime: movieData.runtimeMinutes,
                  titleType: movieData.titleType,
                  cast: Array.isArray(cast) ? cast : [],
                  isAdult: movieData.isAdult
                }
              } catch (error) {
                console.error(`Error enriching movie ${rating.tconst}:`, error)
                return {
                  id: rating.tconst,
                  tconst: rating.tconst,
                  title: `Movie ${i + index + 1}`,
                  rating: rating.averageRating || '0.0',
                  imdbRating: rating.averageRating,
                  imdbVotes: rating.numVotes || 0,
                  poster: null,
                  genres: 'Unknown',
                  genresArray: [],
                  cast: []
                }
              }
            })
          )
          
          enrichedMovies.push(...batchResults)
          
          // Longer delay between batches to avoid overwhelming server
          if (i + batchSize < topRatedMovies.length) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }

        // Filter and sort the enriched movies (they should already have 1k+ votes)
        const filteredAndSortedMovies = enrichedMovies
          .filter(movie => {
            const votes = movie.imdbVotes || 0
            const rating = parseFloat(movie.imdbRating || movie.rating || 0)
            return votes >= 1000 && rating > 0 // Double check votes and rating
          })
          .sort((a, b) => {
            // Sort by IMDB rating (highest first)
            const ratingA = parseFloat(a.imdbRating || a.rating || 0)
            const ratingB = parseFloat(b.imdbRating || b.rating || 0)
            return ratingB - ratingA
          })
          .slice(0, 50) // Take top 50

        console.log(`Processed ${enrichedMovies.length} movies, filtered to ${filteredAndSortedMovies.length} with 10k+ votes`)
        setTopMovies(filteredAndSortedMovies)

        // Get random featured movie from the 10k+ vote candidates
        try {
          console.log(`Found ${featuredCandidates.length} movies with 10k+ votes for featured selection`)
          
          if (featuredCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * featuredCandidates.length)
            const randomRating = featuredCandidates[randomIndex]
            const randomTconst = randomRating.tconst
            console.log('Selected random featured movie:', randomTconst, 'with', randomRating.numVotes, 'votes')

            // Get the movie data for the featured selection
            const [movieData, movieGenres, movieDetails] = await Promise.all([
              ApiService.getMovie(randomTconst).catch(() => null),
              ApiService.getMovieGenres(randomTconst).catch(() => null),
              ApiService.getMovieDetails(randomTconst).catch(() => null)
            ])

            if (movieData || movieDetails) {
              // Determine content type display
              let contentType = 'Movie'
              if (movieData?.titleType) {
                switch (movieData.titleType.toLowerCase()) {
                  case 'tvseries':
                    contentType = 'TV Series'
                    break
                  case 'tvmovie':
                    contentType = 'TV Movie'
                    break
                  case 'tvspecial':
                    contentType = 'TV Special'
                    break
                  case 'tvepisode':
                    contentType = 'TV Episode'
                    break
                  case 'short':
                    contentType = 'Short Film'
                    break
                  case 'video':
                    contentType = 'Video'
                    break
                  default:
                    contentType = 'Movie'
                }
              }

              // Process genres
              const genresArray = movieGenres?.items || movieGenres || []
              const genresString = genresArray.length > 0 
                ? genresArray.map(g => g.genre || g).join(', ')
                : 'Unknown'

              setFeaturedContent({
                title: movieData?.primaryTitle || movieData?.title || movieDetails?.title || 'Featured Movie',
                plot: movieDetails?.plot || 'Plot information not available.',
                actors: [], // Simplified for now
                rating: randomRating.averageRating || '0.0',
                imdbVotes: randomRating.numVotes ? `${randomRating.numVotes.toLocaleString()} votes` : null,
                genres: genresString,
                year: movieData?.startYear,
                runtime: movieData?.runtimeMinutes ? `${movieData.runtimeMinutes} min` : null,
                titleType: movieData?.titleType,
                contentType: contentType,
                tconst: randomTconst,
                poster: movieDetails?.poster || null
              })
            } else {
              throw new Error('Featured movie data not available')
            }
          } else {
            throw new Error('No high-vote movies found for featured selection')
          }
        } catch (error) {
          console.error('Error fetching random featured movie:', error)
          // Use fallback
          if (filteredAndSortedMovies.length > 0) {
            const fallback = filteredAndSortedMovies[0]
            setFeaturedContent({
              title: fallback.title,
              plot: fallback.plot || 'Featured from top rated collection.',
              actors: [],
              rating: fallback.rating,
              genres: fallback.genres,
              year: fallback.year,
              tconst: fallback.tconst,
              poster: fallback.poster
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
    <div className="container-fluid mt-4 px-4">
      <div className="row">
        {/* Top 50 Rated Movies List */}
        <div className="col-12 col-lg-8">
          <div className="border p-3">
            <h3 className="mb-3">Top 50 Rated Movies (10k+ votes)</h3>
            <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              {topMovies.map((movie) => (
                <div key={movie.id} className="border-bottom pb-2 mb-2">
                  <div 
                    className="d-flex align-items-center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onViewChange('movie-details', { movieId: movie.tconst || movie.id })}
                  >
                    {/* Movie Poster */}
                    <div className="me-3" style={{ width: '60px', height: '80px', flexShrink: 0 }}>
                      {movie.poster ? (
                        <img 
                          src={movie.poster}
                          alt={movie.title}
                          className="img-fluid rounded"
                          style={{ width: '60px', height: '80px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="bg-light d-flex align-items-center justify-content-center rounded" style={{ width: '60px', height: '80px' }}>
                          <i className="bi bi-film text-muted"></i>
                        </div>
                      )}
                    </div>
                    
                    {/* Movie Info */}
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{movie.title}</h6>
                      <div className="text-muted small mb-1">
                        {movie.year} • ⭐ {movie.rating}
                        {movie.imdbVotes && (
                          <span> • {movie.imdbVotes.toLocaleString()} votes</span>
                        )}
                      </div>
                      {movie.genres && (
                        <div className="text-muted small">
                          {movie.genres}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Movie */}
        <div className="col-12 col-lg-4 mb-4">
          <div className="border p-3 h-100">
            <h3 className="mb-3">Featured Content</h3>
            {featuredContent ? (
              <div 
                style={{ cursor: 'pointer' }}
                onClick={() => onViewChange('movie-details', { movieId: featuredContent.tconst })}
              >
                <div className="row">
                  <div className="col-4">
                    {featuredContent?.poster ? (
                      <img 
                        src={featuredContent.poster}
                        alt={featuredContent.title}
                        className="img-fluid rounded"
                        style={{ height: '200px', width: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="bg-light d-flex align-items-center justify-content-center text-muted border rounded" style={{ height: '200px' }}>
                        <div className="text-center">
                          <i className="bi bi-image fs-1"></i>
                          <div>🖼️</div>
                        </div>
                      </div>
                    )}
                    {featuredContent?.year && (
                      <div className="text-center mt-2 small text-muted">
                        <strong>Year:</strong> {featuredContent.year}
                      </div>
                    )}
                  </div>
                  <div className="col-8">
                    <h5 className="mb-2">{featuredContent?.title}</h5>
                    {featuredContent?.contentType && (
                      <div className="mb-2">
                        <span className="badge bg-secondary small">{featuredContent.contentType}</span>
                      </div>
                    )}
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
                    <div className="mb-3">
                      <h6>Plot</h6>
                      <p className="small text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                        {featuredContent?.plot}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}