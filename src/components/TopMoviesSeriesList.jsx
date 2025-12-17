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
        // Get more items initially to allow for vote filtering
        const initialResponse = isMovies ? 
          await ApiService.getMoviesOnly(1, 200) : 
          await ApiService.getSeriesOnly(1, 200)
          
        const initialItems = initialResponse.items || initialResponse || []
        console.log(`${isMovies ? 'Movies' : 'Series'} received:`, initialItems.length)

        // Get IMDB ratings for filtering by vote count
        const itemsWithRatings = await Promise.all(
          initialItems.map(async (item) => {
            try {
              const imdbRating = await ApiService.getImdbRating(item.tconst)
              return {
                ...item,
                imdbRating: imdbRating?.averageRating || item.averageRating || '0.0',
                imdbVotes: imdbRating?.numVotes || 0
              }
            } catch (error) {
              return {
                ...item,
                imdbRating: item.averageRating || '0.0',
                imdbVotes: 0
              }
            }
          })
        )

        // Filter by minimum 2000 votes and sort by rating, take top 50
        const filteredItems = itemsWithRatings
          .filter(item => (item.imdbVotes || 0) >= 2000)
          .sort((a, b) => parseFloat(b.imdbRating || 0) - parseFloat(a.imdbRating || 0))
          .slice(0, 50)
          
        console.log(`Filtered to ${filteredItems.length} items with 2000+ votes`)

        // Transform data WITHOUT cast and detailed info first (for faster loading)
        const transformedItems = filteredItems.map((item, index) => ({
          id: item.tconst || item.id || index,
          tconst: item.tconst,
          title: item.primaryTitle || item.title || `${isMovies ? 'Movie' : 'Series'} ${index + 1}`,
          originalTitle: item.originalTitle,
          rating: item.imdbRating || item.averageRating || '0.0',
          imdbRating: item.imdbRating,
          imdbVotes: item.imdbVotes,
          actors: ['Loading cast...'], // Will be updated after cast loads
          genre: item.genres ? item.genres.split(',')[0] : (isMovies ? 'Action' : 'Drama'),
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

        // Then load detailed data asynchronously (poster, cast, and season/episode info)
        transformedItems.forEach(async (item, index) => {
          try {
            // Fetch poster and cast in parallel (rating already loaded)
            const [movieDetails, castData] = await Promise.all([
              ApiService.getMovieDetails(item.tconst).catch(() => null),
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
            
            // Update this item with poster and cast (rating already set)
            setItems(prevItems => 
              prevItems.map((prevItem, prevIndex) => 
                prevIndex === index ? 
                  { 
                    ...prevItem, 
                    actors: cast.length > 0 ? cast : ['Cast information unavailable'],
                    poster: movieDetails?.poster || null
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
        const mockItems = Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          title: `${isMovies ? 'Movie' : 'Series'} ${i + 1}`,
          rating: (9.5 - i * 0.2).toFixed(1),
          actors: ['Unable to load'],
          genre: isMovies ? 'Action' : 'Drama',
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
                  <strong>Episode Runtime</strong>
                  <div>
                    {item.runtime ? `${item.runtime} min` : 'N/A'}
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