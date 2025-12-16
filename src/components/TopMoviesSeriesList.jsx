import { useState, useEffect } from 'react'
import ApiService from '../services/ApiService'

export default function TopMoviesSeriesList({ type, onViewChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isMovies = type === 'movies'
  const title = isMovies ? 'Top movies' : 'Top series'

  useEffect(() => {
    const fetchTopItems = async () => {
      setLoading(true)
      setError(null)

      try {
        // Use new type-specific endpoints for faster loading
        const response = isMovies ? 
          await ApiService.getMoviesOnly(1, 7) : 
          await ApiService.getSeriesOnly(1, 7)
          
        const filteredItems = response.items || response || []
        console.log(`${isMovies ? 'Movies' : 'Series'} received:`, filteredItems.length)

        // Transform data WITHOUT cast and detailed info first (for faster loading)
        const transformedItems = filteredItems.map((item, index) => ({
          id: item.tconst || item.id || index,
          tconst: item.tconst,
          title: item.primaryTitle || item.title || `${isMovies ? 'Movie' : 'Series'} ${index + 1}`,
          originalTitle: item.originalTitle,
          rating: item.averageRating || '0.0',
          imdbRating: null, // Will be updated after IMDB rating loads
          imdbVotes: null,
          actors: ['Loading cast...'], // Will be updated after cast loads
          genre: item.genres ? item.genres.split(',')[0] : (isMovies ? 'Action' : 'Drama'),
          seasons: !isMovies ? (item.seasons || 'Unknown') : null,
          episodes: !isMovies ? (item.episodes || 'Unknown') : null,
          runtime: item.runtimeMinutes || 'Unknown',
          type: item.titleType === 'tvSeries' ? 'TV Series' : 
                item.titleType === 'tvMiniSeries' ? 'Mini Series' : 
                item.titleType === 'tvMovie' ? 'TV Movie' :
                item.titleType === 'tvSpecial' ? 'TV Special' :
                item.titleType === 'tvShort' ? 'TV Short' :
                item.titleType === 'tvEpisode' ? 'TV Episode' :
                item.titleType === 'videoGame' ? 'Video Game' :
                item.titleType === 'movie' ? 'Movie' :
                item.titleType === 'short' ? 'Short' :
                item.titleType === 'video' ? 'Video' :
                item.titleType || 'Unknown',
          titleType: item.titleType,
          poster: null, // Will be updated after poster loads
          year: item.startYear,
          endYear: item.endYear,
          isAdult: item.isAdult
        }))

        // Set items first for immediate display
        setItems(transformedItems)

        // Then load detailed data asynchronously (poster, rating, cast)
        transformedItems.forEach(async (item, index) => {
          try {
            // Fetch poster, rating and cast in parallel
            const [movieDetails, imdbRating, castData] = await Promise.all([
              ApiService.getMovieDetails(item.tconst).catch(() => null),
              ApiService.getImdbRating(item.tconst).catch(() => null),
              ApiService.getMoviePeople(item.tconst).catch(() => null)
            ])
            
            // Get backend person names for cast
            const cast = Array.isArray(castData) ? 
              await Promise.all(
                castData.filter(person => person.role === 'actor')
                        .slice(0, 3)
                        .map(async person => {
                          try {
                            const backendPersonData = await ApiService.getPersonDetails(person.nconst)
                            return backendPersonData?.name || person.primaryName || `Actor ${person.nconst}`
                          } catch (error) {
                            return person.primaryName || `Actor ${person.nconst}`
                          }
                        })
              ) : []
            
            // Update this item with poster, rating and cast
            setItems(prevItems => 
              prevItems.map((prevItem, prevIndex) => 
                prevIndex === index ? 
                  { 
                    ...prevItem, 
                    actors: cast.length > 0 ? cast : ['Cast information unavailable'],
                    poster: movieDetails?.poster || null,
                    imdbRating: imdbRating?.averageRating || prevItem.rating,
                    imdbVotes: imdbRating?.numVotes || null,
                    rating: imdbRating?.averageRating || prevItem.rating
                  } : 
                  prevItem
              )
            )
          } catch (error) {
            console.error(`Error fetching detailed data for ${item.tconst}:`, error)
            setItems(prevItems => 
              prevItems.map((prevItem, prevIndex) => 
                prevIndex === index ? 
                  { ...prevItem, actors: ['Information unavailable'] } : 
                  prevItem
              )
            )
          }
        })
      } catch (err) {
        console.error('Error fetching top items:', err)
        setError('Failed to load data')
        
        // Fallback mock data
        const mockItems = Array.from({ length: 7 }, (_, i) => ({
          id: i + 1,
          title: `${isMovies ? 'Movie' : 'Series'} ${i + 1}`,
          rating: (9.5 - i * 0.2).toFixed(1),
          actors: ['Unable to load'],
          genre: isMovies ? 'Action' : 'Drama',
          seasons: isMovies ? null : Math.floor(Math.random() * 5) + 1,
          episodes: isMovies ? null : Math.floor(Math.random() * 20) + 10,
          runtime: isMovies ? Math.floor(Math.random() * 60) + 90 : null,
          type: isMovies ? 'Movie' : 'Series'
        }))
        
        setItems(mockItems)
      } finally {
        setLoading(false)
      }
    }

    fetchTopItems()
  }, [isMovies])

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
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">Unable to Load {title}</h4>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4">{title}</h1>
      
      <div className="border p-3">
        {items.map((item) => (
          <div 
            key={item.id}
            className="border p-3 mb-3"
            style={{ cursor: 'pointer' }}
            onClick={() => onViewChange('movie-details', { movieId: item.tconst || item.id })}
          >
            <div className="row align-items-center">
              <div className="col-md-3">
                <strong>{item.title}</strong>
                <div className="small text-muted">
                  {item.year}
                  {item.endYear && item.endYear !== item.year && `-${item.endYear}`}
                  {item.isAdult && <span className="badge bg-danger ms-1 small">18+</span>}
                </div>
                <div className="small">
                  <span className={`badge small ${
                    item.titleType === 'movie' ? 'bg-success' : 
                    item.titleType === 'tvSeries' ? 'bg-primary' : 
                    item.titleType === 'tvMiniSeries' ? 'bg-warning text-dark' : 
                    item.titleType === 'tvMovie' ? 'bg-info' :
                    item.titleType === 'tvSpecial' ? 'bg-secondary' :
                    item.titleType === 'tvShort' ? 'bg-light text-dark' :
                    item.titleType === 'tvEpisode' ? 'bg-primary' :
                    item.titleType === 'short' ? 'bg-light text-dark' :
                    item.titleType === 'video' ? 'bg-dark' :
                    item.titleType === 'videoGame' ? 'bg-danger' : 'bg-secondary'
                  }`}>
                    {item.type}
                  </span>
                  <span className="text-muted ms-2">{item.runtime}min</span>
                </div>
              </div>
              <div className="col-md-2">
                <div>
                  <strong>Rating</strong>
                  <div>⭐ {item.rating}</div>
                  {item.imdbVotes && (
                    <div className="small text-muted">{item.imdbVotes.toLocaleString()} votes</div>
                  )}
                </div>
              </div>
              <div className="col-md-2">
                <div>
                  <strong>3 actors</strong>
                  <div className="small">{Array.isArray(item.actors) ? item.actors.join(', ') : 'Loading...'}</div>
                </div>
              </div>
              <div className="col-md-2">
                <div>
                  <strong>Genre</strong>
                  <div>{item.genre}</div>
                </div>
              </div>
              <div className="col-md-2">
                <div>
                  <strong>Number of {isMovies ? 'Runtime' : 'Seasons and episodes'}</strong>
                  <div>
                    {isMovies 
                      ? `${item.runtime} min`
                      : `${item.seasons} seasons, ${item.episodes} episodes`
                    }
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                {item.poster ? (
                  <img 
                    src={item.poster} 
                    alt={item.title}
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
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}